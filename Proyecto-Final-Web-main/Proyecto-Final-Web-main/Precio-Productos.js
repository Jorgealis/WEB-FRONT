// ============================================
// CONFIGURACIÓN
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbzDKW8gxhgGbcFRT6m69Bzt818eta3yADnDpA0MSnP7yRNlgQOSdwgRg4493WKI8DBYeA/exec';

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

// ============================================
// CARGAR PRODUCTOS DESDE GOOGLE SHEETS
// ============================================
async function cargarProductos() {
    try {
        // Petición GET a Google Sheets
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Obtener contenedores
        const heladosContainer = document.getElementById('helados-container');
        const postresContainer = document.getElementById('postres-container');
        
        heladosContainer.innerHTML = '';
        postresContainer.innerHTML = '';
        
        // Crear tarjeta por cada producto
        data.data.forEach(producto => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${producto.imagen}" alt="${producto.nombre}" />
                <h3>$${producto.precio}</h3>
                <h4>${producto.nombre}</h4>
                <p>${producto.descripcion}</p>
                <button class="btn-add-cart" data-id="${producto.ID}" data-precio="${producto.precio}">Order Now</button>
            `;
            
            // Separar por categoría
            if (producto.categoria === 'helados') {
                heladosContainer.appendChild(card);
            } else if (producto.categoria === 'postres') {
                postresContainer.appendChild(card);
            }
        });
        
        // Agregar funcionalidad a los botones
        agregarEventListeners();
        
        console.log('Productos cargados exitosamente');
    } catch (error) {
        console.error('Error cargando productos:', error);
        alert('Error al cargar los productos. Verifica la URL de la API.');
    }
}

// ============================================
// AGREGAR EVENT LISTENERS A BOTONES
// ============================================
function agregarEventListeners() {
    const botonesAgregar = document.querySelectorAll('.btn-add-cart');
    
    botonesAgregar.forEach(boton => {
        boton.addEventListener('click', (e) => {
            // Obtener info del producto
            const producto = e.target.parentElement;
            const productId = parseInt(e.target.getAttribute('data-id'));
            const productPrecio = parseInt(e.target.getAttribute('data-precio'));

            const infoProduct = {
                id: productId,
                quantity: 1,
                title: producto.querySelector('h4').textContent,
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

        // filter() mantiene todos excepto el eliminado
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
    
    // Abrir modal en lugar de prompts
    abrirModal();
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
// CONFIRMAR PEDIDO (ENVIAR A GOOGLE SHEETS)
// ============================================
formDatosCliente.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // FormData facilita obtener valores del formulario
    const formData = new FormData(formDatosCliente);
    const nombre = formData.get('nombre');
    const telefono = formData.get('telefono');
    const direccion = formData.get('direccion');
    
    // Calcular total con reduce (acumulador)
    const total = allProducts.reduce((sum, product) => {
        return sum + (product.price * product.quantity);
    }, 0);
    
    // Preparar objeto JSON según requisitos del proyecto
    const pedido = {
        nombre: nombre,
        telefono: telefono,
        direccion: direccion,
        productos: allProducts.map(p => ({
            id: p.id,
            precio: p.price,
            cantidad: p.quantity
        })),
        total: total
    };
    
    console.log('Pedido a enviar:', JSON.stringify(pedido, null, 2));
    
    try {
        // Cambiar texto del botón mientras envía
        const btnConfirmar = formDatosCliente.querySelector('.btn-confirmar');
        const textoOriginal = btnConfirmar.textContent;
        btnConfirmar.textContent = 'Enviando...';
        btnConfirmar.disabled = true;
        
        // Petición POST a Google Sheets
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(pedido)
        });
        
        if (response.ok) {
            cerrarModal();
            alert('¡Pedido realizado con éxito! Gracias por tu compra.\n\nRecibirás tu pedido pronto en: ' + direccion);
            
            // Vaciar carrito
            allProducts = [];
            showHTML();
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
        
        // Restaurar botón
        btnConfirmar.textContent = textoOriginal;
        btnConfirmar.disabled = false;
        
    } catch (error) {
        console.error('Error enviando pedido:', error);
        alert('Hubo un error al enviar el pedido. Por favor intenta nuevamente.');
        
        const btnConfirmar = formDatosCliente.querySelector('.btn-confirmar');
        btnConfirmar.textContent = 'Confirmar Pedido';
        btnConfirmar.disabled = false;
    }
});

// ============================================
// ACTUALIZAR VISTA DEL CARRITO
// ============================================
const showHTML = () => {
    // Si no hay productos, ocultar carrito
    if (!allProducts.length) {
        cartInfo.classList.add('hidden-cart');
        ordenarBtn.style.display = 'none';
        document.querySelector('.cart-empty').style.display = 'block';
        return;
    }
    
    // Mostrar carrito
    cartInfo.classList.remove('hidden-cart');
    ordenarBtn.style.display = 'block';
    document.querySelector('.cart-empty').style.display = 'none';
    rowProduct.innerHTML = '';

    let total = 0;
    let totalOfProducts = 0;

    // Crear HTML para cada producto en el carrito
    allProducts.forEach(product => {
        const containerProduct = document.createElement('div');
        containerProduct.classList.add('cart-product');

        containerProduct.innerHTML = `
            <div class="info-cart-product">
                <span class="cantidad-producto-carrito">${product.quantity}</span>
                <p class="titulo-producto-carrito">${product.title}</p>
                <span class="precio-producto-carrito">$${product.price}</span>
            </div>
            <img src="img/close-icon.png" alt="Icono de cierre" class="icon-close">
        `;

        rowProduct.append(containerProduct);
        
        total = total + (product.quantity * product.price);
        totalOfProducts = totalOfProducts + product.quantity;
    });

    // Actualizar totales
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
// INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
});