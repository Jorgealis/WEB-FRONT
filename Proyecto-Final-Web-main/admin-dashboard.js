// ============================================
// VARIABLES GLOBALES
// ============================================
let productosData = [];
let categoriasData = [];
let pedidosData = [];
let productoEditando = null;

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

    // Verificar que sea ADMIN
    const rol = ApiService.getUserRole();
    if (rol !== 'ADMIN') {
        alert('No tienes permisos de administrador');
        window.location.href = 'index.html';
        return;
    }

    // Mostrar nombre del usuario
    const usuario = localStorage.getItem('usuario');
    document.getElementById('admin-name').textContent = `👤 ${usuario}`;

    // Cargar datos iniciales
    await cargarCategorias();
    await cargarProductos();
});

// ============================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.content-section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const sectionName = btn.getAttribute('data-section');
        
        // Remover active de todos
        navBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        // Activar seleccionado
        btn.classList.add('active');
        document.getElementById(`${sectionName}-section`).classList.add('active');
        
        // Cargar datos de la sección
        if (sectionName === 'productos') {
            cargarProductos();
        } else if (sectionName === 'pedidos') {
            cargarPedidos();
        } else if (sectionName === 'categorias') {
            renderizarCategorias();
        }
    });
});

// ============================================
// GESTIÓN DE PRODUCTOS
// ============================================
async function cargarProductos() {
    try {
        productosData = await ApiService.obtenerProductos();
        renderizarProductos(productosData);
    } catch (error) {
        console.error('Error cargando productos:', error);
        alert('Error al cargar productos');
    }
}

function renderizarProductos(productos) {
    const tbody = document.getElementById('productos-tbody');
    
    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No hay productos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = productos.map(p => {
        const categoria = categoriasData.find(c => c.id === p.categoriaId);
        return `
            <tr>
                <td>${p.id}</td>
                <td><img src="${p.imagenUrl || 'placeholder.jpg'}" alt="${p.nombre}" onerror="this.src='placeholder.jpg'"></td>
                <td><strong>${p.nombre}</strong></td>
                <td>$${p.precio.toLocaleString()}</td>
                <td>${categoria ? categoria.nombre : 'Sin categoría'}</td>
                <td>${p.descripcion || '-'}</td>
                <td>
                    <button class="btn-edit" onclick="editarProducto(${p.id})">
                        ✏️ Editar
                    </button>
                    <button class="btn-delete" onclick="eliminarProducto(${p.id}, '${p.nombre}')">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filtrarProductos() {
    const searchText = document.getElementById('search-productos').value.toLowerCase();
    const categoriaId = document.getElementById('filter-categoria').value;
    
    let productosFiltrados = productosData;
    
    // Filtrar por texto
    if (searchText) {
        productosFiltrados = productosFiltrados.filter(p => 
            p.nombre.toLowerCase().includes(searchText) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(searchText))
        );
    }
    
    // Filtrar por categoría
    if (categoriaId) {
        productosFiltrados = productosFiltrados.filter(p => 
            p.categoriaId === parseInt(categoriaId)
        );
    }
    
    renderizarProductos(productosFiltrados);
}

// ============================================
// MODAL DE PRODUCTO
// ============================================
function abrirModalProducto(productoId = null) {
    const modal = document.getElementById('modal-producto');
    const titulo = document.getElementById('modal-producto-titulo');
    const form = document.getElementById('form-producto');
    
    form.reset();
    productoEditando = productoId;
    
    if (productoId) {
        // EDITAR
        titulo.textContent = 'Editar Producto';
        const producto = productosData.find(p => p.id === productoId);
        
        document.getElementById('producto-id').value = producto.id;
        document.getElementById('producto-nombre').value = producto.nombre;
        document.getElementById('producto-precio').value = producto.precio;
        document.getElementById('producto-categoria').value = producto.categoriaId;
        document.getElementById('producto-descripcion').value = producto.descripcion || '';
        document.getElementById('producto-imagen').value = producto.imagenUrl || '';
    } else {
        // NUEVO
        titulo.textContent = 'Nuevo Producto';
        document.getElementById('producto-id').value = '';
    }
    
    modal.classList.add('active');
}

function cerrarModalProducto() {
    document.getElementById('modal-producto').classList.remove('active');
    productoEditando = null;
}

// Editar producto
function editarProducto(id) {
    abrirModalProducto(id);
}

// Eliminar producto
async function eliminarProducto(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        await ApiService.eliminarProducto(id);
        alert('Producto eliminado exitosamente');
        await cargarProductos();
    } catch (error) {
        console.error('Error eliminando producto:', error);
        alert('Error al eliminar el producto: ' + error.message);
    }
}

// Guardar producto (crear o actualizar)
document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productoData = {
        nombre: document.getElementById('producto-nombre').value,
        precio: parseFloat(document.getElementById('producto-precio').value),
        categoriaId: parseInt(document.getElementById('producto-categoria').value),
        descripcion: document.getElementById('producto-descripcion').value,
        imagenUrl: document.getElementById('producto-imagen').value
    };
    
    try {
        if (productoEditando) {
            // ACTUALIZAR
            await ApiService.actualizarProducto(productoEditando, productoData);
            alert('Producto actualizado exitosamente');
        } else {
            // CREAR
            await ApiService.crearProducto(productoData);
            alert('Producto creado exitosamente');
        }
        
        cerrarModalProducto();
        await cargarProductos();
    } catch (error) {
        console.error('Error guardando producto:', error);
        alert('Error al guardar el producto: ' + error.message);
    }
});

// ============================================
// GESTIÓN DE CATEGORÍAS
// ============================================
async function cargarCategorias() {
    try {
        categoriasData = await ApiService.obtenerCategorias();
        
        // Llenar select de filtro de productos
        const filterSelect = document.getElementById('filter-categoria');
        filterSelect.innerHTML = '<option value="">Todas las categorías</option>' +
            categoriasData.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        
        // Llenar select del formulario de producto
        const productoSelect = document.getElementById('producto-categoria');
        productoSelect.innerHTML = '<option value="">Seleccionar...</option>' +
            categoriasData.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        
        renderizarCategorias();
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

function renderizarCategorias() {
    const grid = document.getElementById('categorias-grid');
    
    if (categoriasData.length === 0) {
        grid.innerHTML = '<div class="loading-cell">No hay categorías registradas</div>';
        return;
    }
    
    grid.innerHTML = categoriasData.map(c => `
        <div class="categoria-card">
            <h3>${c.nombre}</h3>
            <p>ID: ${c.id}</p>
        </div>
    `).join('');
}

function abrirModalCategoria() {
    document.getElementById('modal-categoria').classList.add('active');
}

function cerrarModalCategoria() {
    document.getElementById('modal-categoria').classList.remove('active');
    document.getElementById('form-categoria').reset();
}

// Guardar categoría
document.getElementById('form-categoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('categoria-nombre').value;
    
    try {
        const response = await fetch(`https://ojari-heladeria-production.up.railway.app/api/categorias`, {
            method: 'POST',
            headers: ApiService.getHeaders(),
            body: JSON.stringify({ nombre })
        });
        
        if (!response.ok) {
            throw new Error('Error al crear categoría');
        }
        
        alert('Categoría creada exitosamente');
        cerrarModalCategoria();
        await cargarCategorias();
    } catch (error) {
        console.error('Error creando categoría:', error);
        alert('Error al crear la categoría: ' + error.message);
    }
});

// ============================================
// GESTIÓN DE PEDIDOS
// ============================================
async function cargarPedidos() {
    try {
        const estado = document.getElementById('filter-estado').value;
        pedidosData = await ApiService.obtenerTodosPedidos(estado || null);
        renderizarPedidos(pedidosData);
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        alert('Error al cargar pedidos');
    }
}

function renderizarPedidos(pedidos) {
    const tbody = document.getElementById('pedidos-tbody');
    
    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No hay pedidos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = pedidos.map(p => {
        const fecha = new Date(p.fechaPedido).toLocaleString('es-CO');
        const estadoClass = `badge-${p.estado.toLowerCase().replace('_', '')}`;
        
        return `
            <tr>
                <td><strong>#${p.id}</strong></td>
                <td>Cliente #${p.clienteId}</td>
                <td>${fecha}</td>
                <td><strong>$${p.total.toLocaleString()}</strong></td>
                <td><span class="badge ${estadoClass}">${p.estado}</span></td>
                <td>
                    <select onchange="cambiarEstadoPedido(${p.id}, this.value)" class="btn-estado">
                        <option value="">Cambiar estado...</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_PREPARACION">En Preparación</option>
                        <option value="LISTO">Listo</option>
                        <option value="ENTREGADO">Entregado</option>
                        <option value="CANCELADO">Cancelado</option>
                    </select>
                    <button class="btn-edit" onclick="verDetallePedido(${p.id})">
                        👁️ Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function cambiarEstadoPedido(pedidoId, nuevoEstado) {
    if (!nuevoEstado) return;
    
    if (!confirm(`¿Cambiar estado del pedido #${pedidoId} a ${nuevoEstado}?`)) {
        return;
    }
    
    try {
        await ApiService.actualizarEstadoPedido(pedidoId, nuevoEstado);
        alert('Estado actualizado exitosamente');
        await cargarPedidos();
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
            <div style="margin-bottom: 20px;">
                <p><strong>Cliente:</strong> #${pedido.clienteId}</p>
                <p><strong>Fecha:</strong> ${new Date(pedido.fechaPedido).toLocaleString('es-CO')}</p>
                <p><strong>Estado:</strong> <span class="badge badge-${pedido.estado.toLowerCase()}">${pedido.estado}</span></p>
            </div>
            
            <h3 style="margin-bottom: 15px; color: var(--primary);">Productos:</h3>
            <table class="data-table" style="margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${pedido.items.map(item => `
                        <tr>
                            <td>${item.nombreProducto || 'Producto #' + item.productoId}</td>
                            <td>${item.cantidad}</td>
                            <td>$${item.precioUnit.toLocaleString()}</td>
                            <td><strong>$${item.subtotal.toLocaleString()}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="text-align: right; font-size: 1.3rem; color: var(--primary);">
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

// Cerrar modales al hacer click fuera
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});