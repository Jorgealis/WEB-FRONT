// ============================================
// SERVICIO DE API CENTRALIZADO
// ============================================

const API_BASE_URL = 'https://ojari-heladeria-production.up.railway.app/api';

class ApiService {
    // Obtener el token del localStorage
    static getToken() {
        return localStorage.getItem('token');
    }

    // Obtener headers con autenticación
    static getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    // Verificar si el usuario está autenticado
    static isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        // Verificar si el token no ha expirado
        try {
            const tokenData = this.parseJwt(token);
            const expiracion = tokenData.exp * 1000;
            return expiracion > Date.now();
        } catch (e) {
            return false;
        }
    }

    // Decodificar JWT
    static parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
    }

    // Obtener rol del usuario
    static getUserRole() {
        const token = this.getToken();
        if (!token) return null;
        
        try {
            const tokenData = this.parseJwt(token);
            // El rol viene como "ROLE_CLIENTE" en el token, extraemos solo "CLIENTE"
            const rol = tokenData.authorities?.[0]?.authority || tokenData.rol;
            return rol ? rol.replace('ROLE_', '') : null;
        } catch (e) {
            return null;
        }
    }

    // Obtener ID del usuario desde el token
    static getUserId() {
        const token = this.getToken();
        if (!token) return null;
        
        try {
            const tokenData = this.parseJwt(token);
            // Buscar el ID en diferentes posibles ubicaciones del token
            return tokenData.userId || tokenData.id || tokenData.clienteId || null;
        } catch (e) {
            return null;
        }
    }

    // Cerrar sesión
    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }

    // ============================================
    // PRODUCTOS
    // ============================================
    static async obtenerProductos(categoriaId = null) {
        try {
            let url = `${API_BASE_URL}/productos`;
            if (categoriaId) {
                url += `?categoriaId=${categoriaId}`;
            }
            
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener productos');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en obtenerProductos:', error);
            throw error;
        }
    }

    static async obtenerCategorias() {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener categorías');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en obtenerCategorias:', error);
            throw error;
        }
    }

    // ============================================
    // PEDIDOS
    // ============================================
    static async crearPedido(pedidoData) {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Debes iniciar sesión para crear un pedido');
            }
            
            // Si el pedido tiene clienteEmail en lugar de clienteId, intentar buscar el cliente primero
            if (pedidoData.clienteEmail && !pedidoData.clienteId) {
                console.log('🔍 Buscando cliente por email:', pedidoData.clienteEmail);
                
                try {
                    const responseCliente = await fetch(`${API_BASE_URL}/clientes/email/${pedidoData.clienteEmail}`, {
                        headers: this.getHeaders()
                    });
                    
                    if (responseCliente.ok) {
                        const cliente = await responseCliente.json();
                        pedidoData.clienteId = cliente.id;
                        delete pedidoData.clienteEmail;
                        console.log('✅ Cliente encontrado, ID:', cliente.id);
                    } else {
                        console.warn('⚠️ No se pudo obtener cliente por email');
                    }
                } catch (e) {
                    console.warn('⚠️ Error buscando cliente por email:', e.message);
                }
            }
            
            // Si aún no tenemos clienteId, intentar obtenerlo del token
            if (!pedidoData.clienteId) {
                const userId = this.getUserId();
                if (userId && !isNaN(userId)) {
                    pedidoData.clienteId = parseInt(userId);
                    console.log('✅ Usando ID del token:', pedidoData.clienteId);
                } else {
                    // Último recurso: obtener del token directamente
                    const token = this.getToken();
                    const tokenData = this.parseJwt(token);
                    
                    // Buscar cualquier campo numérico que pueda ser el ID
                    const posibleId = tokenData.userId || tokenData.id || tokenData.clienteId;
                    
                    if (posibleId && !isNaN(posibleId)) {
                        pedidoData.clienteId = parseInt(posibleId);
                        console.log('✅ ID encontrado en token:', pedidoData.clienteId);
                    } else {
                        throw new Error('No se pudo determinar el ID del cliente. El backend debe incluir el ID en el token JWT o proporcionar un endpoint /api/clientes/email/{email}');
                    }
                }
            }
            
            console.log('📦 Enviando pedido:', pedidoData);
            
            const response = await fetch(`${API_BASE_URL}/pedidos`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(pedidoData)
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Error al crear pedido');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en crearPedido:', error);
            throw error;
        }
    }

    static async obtenerMisPedidos() {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Debes iniciar sesión');
            }
            
            // Obtener el ID del cliente del token
            const clienteId = this.getUserId();
            
            if (!clienteId) {
                throw new Error('No se pudo obtener el ID del cliente del token');
            }
            
            const response = await fetch(`${API_BASE_URL}/pedidos/cliente/${clienteId}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener pedidos');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en obtenerMisPedidos:', error);
            throw error;
        }
    }

    // ============================================
    // CLIENTES
    // ============================================
    static async obtenerMiPerfil() {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Debes iniciar sesión');
            }
            
            const clienteId = this.getUserId();
            
            if (!clienteId) {
                throw new Error('No se pudo obtener el ID del cliente del token');
            }
            
            const response = await fetch(`${API_BASE_URL}/clientes/${clienteId}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener perfil');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en obtenerMiPerfil:', error);
            throw error;
        }
    }

    // ============================================
    // ADMIN - GESTIÓN DE PRODUCTOS
    // ============================================
    static async crearProducto(productoData) {
        try {
            const response = await fetch(`${API_BASE_URL}/productos`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(productoData)
            });
            
            if (!response.ok) {
                throw new Error('Error al crear producto');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en crearProducto:', error);
            throw error;
        }
    }

    static async actualizarProducto(id, productoData) {
        try {
            const response = await fetch(`${API_BASE_URL}/productos/${id}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(productoData)
            });
            
            if (!response.ok) {
                throw new Error('Error al actualizar producto');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en actualizarProducto:', error);
            throw error;
        }
    }

    static async eliminarProducto(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/productos/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar producto');
            }
            
            return true;
        } catch (error) {
            console.error('Error en eliminarProducto:', error);
            throw error;
        }
    }

    // ============================================
    // ADMIN/EMPLEADO - GESTIÓN DE PEDIDOS
    // ============================================
    static async obtenerTodosPedidos(estado = null) {
        try {
            let url = `${API_BASE_URL}/pedidos`;
            if (estado) {
                url += `/estado?estado=${estado}`;
            }
            
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener pedidos');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en obtenerTodosPedidos:', error);
            throw error;
        }
    }

    static async actualizarEstadoPedido(pedidoId, nuevoEstado) {
        try {
            const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estado?estado=${nuevoEstado}`, {
                method: 'PATCH',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al actualizar estado del pedido');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en actualizarEstadoPedido:', error);
            throw error;
        }
    }
}

// Exportar para uso global
window.ApiService = ApiService;