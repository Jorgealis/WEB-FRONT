// ============================================
// VARIABLES GLOBALES
// ============================================
const cartInfo = document.querySelector('.container-cart-products');
const rowProduct = document.querySelector('.row-product');
const ordenarBtn = document.getElementById('ordenar-btn');
const ordenarForm = document.getElementById('ordenar-form');
const valorTotal = document.querySelector('.total-pagar');
const countProducts = document.querySelector('#contador-productos');
const btnCart = document.querySelector('.container-cart-icon');
const cartProducts = document.querySelector('.container-cart-products');

// Variables del modal
const modalPedido = document.getElementById('modal-pedido');
const formDatosCliente = document.getElementById('form-datos-cliente');
const btnCancelar = document.getElementById('btn-cancelar');
const resumenProductos = document.getElementById('resumen-productos');
const totalModal = document.getElementById('total-modal');

// Array de productos en el carrito
let allProducts = [];
let clienteId = null;

// ============================================
// VERIFICAR AUTENTICACIÓN Y OBTENER CLIENTE ID
// ============================================
async function verificarAutenticacion() {
    if (!ApiService.isAuthenticated()) {
        alert('Debes iniciar sesión para hacer pedidos');
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const perfil = await ApiService.obtenerMiPerfil();
        clienteId = perfil.id;
        console.log('Cliente autenticado:', perfil);
        return true;
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        alert('Error al verificar tu sesión. Por favor, inicia sesión nuevamente.');
        window.location.href = 'login.html';
        return false;
    }
}

// ============================================
// CARGAR PRODUCTOS DESDE EL BACKEND
// ============================================
async function cargarProductos() {
    try {
        // Obtener productos del backend
        const productos = await ApiService.obtenerProductos();
        
        console.log('Productos cargados:', productos);
        
        // Obtener contenedores
        const heladosContainer = document.getElementById('helados-container');
        const postresContainer = document.getElementById('postres-container');
        
        heladosContainer.innerHTML = '';
        postresContainer.innerHTML = '';
        
        // Separar productos por categoría
        productos.forEach(producto => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${producto.imagenUrl || 'placeholder.jpg'}" alt="${producto.nombre}" onerror="this.src='placeholder.jpg'" />
                <h3>$${producto.precio}</h3>
                <h4>${producto.nombre}</h4>
                <p>${producto.descripcion || ''}</p>
                <button class="btn-add-cart" 
                    data-id="${producto.id}" 
                    data-precio="${producto.precio}"
                    data-nombre="${producto.nombre}">
                    Order Now
                </button>
            `;
            
            // Determinar categoría por ID (ajustar según tu BD)
            // Suponiendo: 1 = Helados, 2 = Postres
            if (producto.categoriaId === 1) {
                heladosContainer.appendChild(card);
            } else if (producto.categoriaId === 2) {
                postresContainer.appendChild(card);
            } else {
                // Por defecto, agregar a helados
                heladosContainer.appendChild(card);
            }
        });
        
        // Agregar funcionalidad a los botones
        agregarEventListeners();
        
        console.log('Productos renderizados exitosamente');
    } catch (error) {
        console.error('Error cargando productos:', error);
        alert('Error al cargar los productos. Verifica la conexión con el servidor.');
    }
}

// ============================================
// AGREGAR EVENT LISTENERS A BOTONES
// ============================================
function agregarEventListeners() {
    const botonesAgregar = document.querySelectorAll('.btn-add-cart');
    
    botonesAgregar.forEach(boton => {
        boton.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            const productPrecio = parseFloat(e.target.getAttribute('data-precio'));
            const productNombre = e.target.getAttribute('data-nombre');

            const infoProduct = {
                id: productId,
                quantity: 1,
                title: productNombre,
                price: productPrecio
            };

            // Verificar si ya existe en el carrito
            const exists = allProducts.some(p => p.id === infoProduct.id);

            if (exists) {
                // Si existe, aumentar cantidad
                allProducts = allProducts.map(p => {
                    if (p.id === infoProduct.id) {
                        p.quantity++;
                    }
                    return p;
                });
            } else {
                // Si no existe, agregarlo
                allProducts = [...allProducts, infoProduct];
            }
            
            // Actualizar vista del carrito
            showHTML();
        });
    });
}

// ============================================
// ELIMINAR PRODUCTOS DEL CARRITO
// ============================================
rowProduct.addEventListener('click', (e) => {
    if (e.target.classList.contains('icon-close')) {
        const product = e.target.parentElement;
        const title = product.querySelector('.titulo-producto-carrito').textContent;

        allProducts = allProducts.filter(p => p.title !== title);
        showHTML();
    }
});

// ============================================
// ABRIR MODAL PARA PEDIDO
// ============================================
function abrirModal() {
    resumenProductos.innerHTML = '';
    let total = 0;
    
    // Mostrar resumen de productos en el modal
    allProducts.forEach(producto => {
        const item = document.createElement('div');
        item.className = 'producto-resumen-item';
        item.innerHTML = `
            <div>
                <span class="producto-resumen-cantidad">${producto.quantity}x</span>
                <span class="producto-resumen-nombre">${producto.title}</span>
            </div>
            <span class="producto-resumen-precio">$${producto.price * producto.quantity}</span>
        `;
        resumenProductos.appendChild(item);
        total += producto.price * producto.quantity;
    });
    
    totalModal.textContent = `$${total}`;
    modalPedido.classList.add('active');
}

// ============================================
// CERRAR MODAL
// ============================================
function cerrarModal() {
    modalPedido.classList.remove('active');
    formDatosCliente.reset();
}

// ============================================
// BOTÓN "ORDENAR" DEL CARRITO
// ============================================
ordenarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (allProducts.length === 0) {
        alert('El carrito está vacío. Agrega productos para poder ordenar.');
        return;
    }
    
    // Verificar autenticación antes de abrir modal
    const autenticado = await verificarAutenticacion();
    if (autenticado) {
        abrirModal();
    }
});

// ============================================
// BOTÓN "CANCELAR" DEL MODAL
// ============================================
btnCancelar.addEventListener('click', () => {
    cerrarModal();
});

// ============================================
// CERRAR MODAL AL HACER CLIC FUERA
// ============================================
modalPedido.addEventListener('click', (e) => {
    if (e.target === modalPedido) {
        cerrarModal();
    }
});

// ============================================
// CONFIRMAR PEDIDO (ENVIAR AL BACKEND)
// ============================================
formDatosCliente.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(formDatosCliente);
    
    // Preparar objeto del pedido según el backend
    const pedido = {
        clienteId: clienteId,
        items: allProducts.map(p => ({
            productoId: p.id,
            cantidad: p.quantity
        }))
    };
    
    console.log('Pedido a enviar:', JSON.stringify(pedido, null, 2));
    
    try {
        const btnConfirmar = formDatosCliente.querySelector('.btn-confirmar');
        const textoOriginal = btnConfirmar.textContent;
        btnConfirmar.textContent = 'Enviando...';
        btnConfirmar.disabled = true;
        
        // Enviar pedido al backend
        const response = await ApiService.crearPedido(pedido);
        
        console.log('Respuesta del servidor:', response);
        
        cerrarModal();
        alert(`¡Pedido #${response.id} realizado con éxito!\n\nTotal: $${response.total}\nEstado: ${response.estado}\n\nGracias por tu compra.`);
        
        // Vaciar carrito
        allProducts = [];
        showHTML();
        
        btnConfirmar.textContent = textoOriginal;
        btnConfirmar.disabled = false;
        
    } catch (error) {
        console.error('Error enviando pedido:', error);
        alert('Hubo un error al enviar el pedido. Por favor intenta nuevamente.\n\n' + error.message);
        
        const btnConfirmar = formDatosCliente.querySelector('.btn-confirmar');
        btnConfirmar.textContent = 'Confirmar Pedido';
        btnConfirmar.disabled = false;
    }
});

// ============================================
// ACTUALIZAR VISTA DEL CARRITO
// ============================================
const showHTML = () => {
    if (!allProducts.length) {
        cartInfo.classList.add('hidden-cart');
        ordenarBtn.style.display = 'none';
        document.querySelector('.cart-empty').style.display = 'block';
        return;
    }
    
    cartInfo.classList.remove('hidden-cart');
    ordenarBtn.style.display = 'block';
    document.querySelector('.cart-empty').style.display = 'none';
    rowProduct.innerHTML = '';

    let total = 0;
    let totalOfProducts = 0;

    allProducts.forEach(product => {
        const containerProduct = document.createElement('div');
        containerProduct.classList.add('cart-product');

        containerProduct.innerHTML = `
            <div class="info-cart-product">
                <span class="cantidad-producto-carrito">${product.quantity}</span>
                <p class="titulo-producto-carrito">${product.title}</p>
                <span class="precio-producto-carrito">$${product.price}</span>
            </div>
            <img src="img/close-icon.png" alt="Icono de cierre" class="icon-close" onerror="this.style.display='none'">
        `;

        rowProduct.append(containerProduct);
        
        total = total + (product.quantity * product.price);
        totalOfProducts = totalOfProducts + product.quantity;
    });

    valorTotal.textContent = `$${total}`;
    countProducts.textContent = totalOfProducts;
};

// ============================================
// TOGGLE CARRITO (MOSTRAR/OCULTAR)
// ============================================
btnCart.addEventListener('click', () => {
    cartProducts.classList.toggle('hidden-cart');
});

// ============================================
// AGREGAR BOTÓN DE CERRAR SESIÓN AL HEADER
// ============================================
function agregarBotonCerrarSesion() {
    const header = document.querySelector('header');
    const nav = header.querySelector('nav');
    
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Cerrar Sesión';
    logoutBtn.className = 'btn-logout';
    logoutBtn.style.cssText = `
        padding: 10px 20px;
        background: #4b007d;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        margin-left: 20px;
    `;
    
    logoutBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            ApiService.logout();
        }
    });
    
    header.appendChild(logoutBtn);
}

// ============================================
// INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando aplicación...');
    
    // Verificar autenticación
    const autenticado = await verificarAutenticacion();
    
    if (autenticado) {
        // Agregar botón de cerrar sesión
        agregarBotonCerrarSesion();
        
        // Cargar productos
        await cargarProductos();
    }
});