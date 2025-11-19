// ============================================
// VARIABLES GLOBALES
// ============================================
let pedidosData = [];
let productosData = [];
let categoriasData = [];

// ============================================
// VERIFICAR AUTENTICACIÓN Y ROL
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    if (!ApiService.isAuthenticated()) {
        alert('Debes iniciar sesión para acceder al dashboard');
        window.location.href = 'login.html';
        return;
    }

    // Verificar que sea EMPLEADO o ADMIN
    const rol = ApiService.getUserRole();
    if (rol !== 'EMPLEADO' && rol !== 'ADMIN') {
        alert('No tienes permisos de empleado');
        window.location.href = 'index.html';
        return;
    }

    // Mostrar nombre del usuario
    const usuario = localStorage.getItem('usuario');
    document.getElementById('empleado-name').textContent = `👤 ${usuario}`;

    // Cargar datos iniciales
    await cargarCategorias();
    await cargarPedidosEmpleado();
    
    // Actualizar cada 30 segundos
    setInterval(cargarPedidosEmpleado, 30000);
});

// ============================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.content-section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const sectionName = btn.getAttribute('data-section');
        
        navBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`${sectionName}-section`).classList.add('active');
        
        if (sectionName === 'productos') {
            cargarProductosEmpleado();
        } else if (sectionName === 'pedidos') {
            cargarPedidosEmpleado();
        }
    });
});

// ============================================
// GESTIÓN DE PEDIDOS
// ============================================
async function cargarPedidosEmpleado() {
    try {
        const estado = document.getElementById('filter-estado-empleado').value;
        pedidosData = await ApiService.obtenerTodosPedidos(estado || null);
        
        calcularEstadisticas();
        renderizarPedidosEmpleado(pedidosData);
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        alert('Error al cargar pedidos');
    }
}

function calcularEstadisticas() {
    const hoy = new Date().toDateString();
    const pedidosHoy = pedidosData.filter(p => 
        new Date(p.fechaPedido).toDateString() === hoy
    );
    
    document.getElementById('stat-pendientes').textContent = 
        pedidosData.filter(p => p.estado === 'PENDIENTE').length;
    
    document.getElementById('stat-preparacion').textContent = 
        pedidosData.filter(p => p.estado === 'EN_PREPARACION').length;
    
    document.getElementById('stat-listos').textContent = 
        pedidosData.filter(p => p.estado === 'LISTO').length;
    
    document.getElementById('stat-total').textContent = pedidosHoy.length;
}

function renderizarPedidosEmpleado(pedidos) {
    const tbody = document.getElementById('pedidos-empleado-tbody');
    
    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No hay pedidos en este estado</td></tr>';
        return;
    }
    
    tbody.innerHTML = pedidos.map(p => {
        const fecha = new Date(p.fechaPedido);
        const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        const estadoClass = `badge-${p.estado.toLowerCase().replace('_', '')}`;
        
        return `
            <tr>
                <td><strong>#${p.id}</strong></td>
                <td>Cliente #${p.clienteId}</td>
                <td>${hora}</td>
                <td><strong>$${p.total.toLocaleString()}</strong></td>
                <td><span class="badge ${estadoClass}">${formatearEstado(p.estado)}</span></td>
                <td>
                    ${getBotonesAccion(p)}
                    <button class="btn-edit" onclick="verDetallePedido(${p.id})" style="margin-top: 5px;">
                        👁️ Ver Detalles
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getBotonesAccion(pedido) {
    switch(pedido.estado) {
        case 'PENDIENTE':
            return `
                <button class="btn-primary" onclick="cambiarEstadoPedido(${pedido.id}, 'EN_PREPARACION')" style="width: 100%;">
                    👨‍🍳 Iniciar Preparación
                </button>
            `;
        case 'EN_PREPARACION':
            return `
                <button class="btn-primary" onclick="cambiarEstadoPedido(${pedido.id}, 'LISTO')" style="width: 100%; background: var(--success);">
                    ✅ Marcar Listo
                </button>
            `;
        case 'LISTO':
            return `
                <button class="btn-primary" onclick="cambiarEstadoPedido(${pedido.id}, 'ENTREGADO')" style="width: 100%; background: var(--info);">
                    🚚 Marcar Entregado
                </button>
            `;
        default:
            return '<span style="color: #999;">Sin acciones</span>';
    }
}

function formatearEstado(estado) {
    const estados = {
        'PENDIENTE': 'Pendiente',
        'EN_PREPARACION': 'En Preparación',
        'LISTO': 'Listo',
        'ENTREGADO': 'Entregado',
        'CANCELADO': 'Cancelado'
    };
    return estados[estado] || estado;
}

async function cambiarEstadoPedido(pedidoId, nuevoEstado) {
    const mensajes = {
        'EN_PREPARACION': '¿Iniciar preparación del pedido?',
        'LISTO': '¿Marcar pedido como listo?',
        'ENTREGADO': '¿Confirmar que el pedido fue entregado?'
    };
    
    if (!confirm(mensajes[nuevoEstado] || '¿Cambiar estado del pedido?')) {
        return;
    }
    
    try {
        await ApiService.actualizarEstadoPedido(pedidoId, nuevoEstado);
        
        // Mostrar mensaje de éxito
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = '✅ Estado actualizado exitosamente';
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
        
        await cargarPedidosEmpleado();
    } catch (error) {
        console.error('Error actualizando estado:', error);
        alert('Error al actualizar el estado: ' + error.message);
    }
}

async function verDetallePedido(pedidoId) {
    try {
        const response = await fetch(`https://ojari-heladeria-production.up.railway.app/api/pedidos/${pedidoId}`, {
            headers: ApiService.getHeaders()
        });
        
        if (!response.ok) throw new Error('Error al obtener detalle');
        
        const pedido = await response.json();
        
        const modal = document.getElementById('modal-pedido-detalle');
        document.getElementById('pedido-detalle-id').textContent = pedido.id;
        
        const content = document.getElementById('pedido-detalle-content');
        content.innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 10px;">
                <p><strong>Cliente:</strong> #${pedido.clienteId}</p>
                <p><strong>Fecha:</strong> ${new Date(pedido.fechaPedido).toLocaleString('es-CO')}</p>
                <p><strong>Estado:</strong> <span class="badge badge-${pedido.estado.toLowerCase()}">${formatearEstado(pedido.estado)}</span></p>
            </div>
            
            <h3 style="margin-bottom: 15px; color: var(--primary);">📦 Productos del Pedido:</h3>
            <table class="data-table" style="margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${pedido.items.map(item => `
                        <tr>
                            <td><strong>${item.nombreProducto || 'Producto #' + item.productoId}</strong></td>
                            <td style="text-align: center; font-size: 1.2rem; color: var(--primary);"><strong>${item.cantidad}</strong></td>
                            <td>$${item.precioUnit.toLocaleString()}</td>
                            <td><strong>$${item.subtotal.toLocaleString()}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="text-align: right; font-size: 1.5rem; padding: 15px; background: var(--primary); color: white; border-radius: 10px;">
                <strong>TOTAL: $${pedido.total.toLocaleString()}</strong>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Error obteniendo detalle:', error);
        alert('Error al obtener detalle del pedido');
    }
}

function cerrarModalPedidoDetalle() {
    document.getElementById('modal-pedido-detalle').classList.remove('active');
}

// ============================================
// GESTIÓN DE PRODUCTOS (SOLO LECTURA)
// ============================================
async function cargarCategorias() {
    try {
        categoriasData = await ApiService.obtenerCategorias();
        
        const filterSelect = document.getElementById('filter-categoria-empleado');
        filterSelect.innerHTML = '<option value="">Todas las categorías</option>' +
            categoriasData.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

async function cargarProductosEmpleado() {
    try {
        productosData = await ApiService.obtenerProductos();
        renderizarProductosEmpleado(productosData);
    } catch (error) {
        console.error('Error cargando productos:', error);
        alert('Error al cargar productos');
    }
}

function renderizarProductosEmpleado(productos) {
    const tbody = document.getElementById('productos-empleado-tbody');
    
    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No hay productos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = productos.map(p => {
        const categoria = categoriasData.find(c => c.id === p.categoriaId);
        return `
            <tr>
                <td><img src="${p.imagenUrl || 'placeholder.jpg'}" alt="${p.nombre}" onerror="this.src='placeholder.jpg'"></td>
                <td><strong>${p.nombre}</strong></td>
                <td style="font-size: 1.2rem; color: var(--primary);"><strong>$${p.precio.toLocaleString()}</strong></td>
                <td>${categoria ? categoria.nombre : 'Sin categoría'}</td>
                <td>${p.descripcion || '-'}</td>
            </tr>
        `;
    }).join('');
}

function filtrarProductosEmpleado() {
    const categoriaId = document.getElementById('filter-categoria-empleado').value;
    
    let productosFiltrados = productosData;
    
    if (categoriaId) {
        productosFiltrados = productosFiltrados.filter(p => 
            p.categoriaId === parseInt(categoriaId)
        );
    }
    
    renderizarProductosEmpleado(productosFiltrados);
}

// Cerrar modal al hacer click fuera
document.getElementById('modal-pedido-detalle').addEventListener('click', (e) => {
    if (e.target.id === 'modal-pedido-detalle') {
        cerrarModalPedidoDetalle();
    }
});