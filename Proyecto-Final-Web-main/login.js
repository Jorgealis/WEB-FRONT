// ============================================
// CONFIGURACIÓN
// ============================================
const API_BASE_URL = 'https://ojari-heladeria-production.up.railway.app/api';

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const messageBox = document.getElementById('message-box');

// ============================================
// FUNCIONALIDAD DE TABS
// ============================================
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        // Remover clase active de todos
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Agregar clase active al seleccionado
        btn.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Limpiar mensajes
        hideMessage();
    });
});

// ============================================
// FUNCIONES DE MENSAJES
// ============================================
function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';
}

function hideMessage() {
    messageBox.style.display = 'none';
    messageBox.className = 'message-box';
}

// ============================================
// LOGIN
// ============================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const loginData = {
        usuario: formData.get('usuario'),
        contrasena: formData.get('contrasena')
    };
    
    console.log('Intentando login con:', loginData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login exitoso:', data);
            
            // Guardar token en localStorage
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('usuario', loginData.usuario);
            
            showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
            
            // Redirigir según el rol
            setTimeout(() => {
                // Decodificar el token para obtener el rol
                const tokenData = parseJwt(data.accessToken);
                console.log('Token decodificado:', tokenData);
                
                // El rol viene en authorities como "ROLE_ADMIN", "ROLE_EMPLEADO", etc.
                const authorities = tokenData.authorities || [];
                let rol = 'CLIENTE'; // Por defecto
                
                if (authorities.length > 0) {
                    // Extraer el rol del formato "ROLE_ADMIN" -> "ADMIN"
                    const authority = authorities[0].authority || authorities[0];
                    rol = authority.replace('ROLE_', '');
                }
                
                console.log('Rol detectado:', rol);
                
                if (rol === 'ADMIN') {
                    window.location.href = 'admin-dashboard.html';
                } else if (rol === 'EMPLEADO') {
                    window.location.href = 'empleado-dashboard.html';
                } else {
                    window.location.href = 'Precio-Productos.html';
                }
            }, 1500);
            
        } else {
            const error = await response.text();
            console.error('Error en login:', error);
            showMessage('Usuario o contraseña incorrectos', 'error');
        }
        
    } catch (error) {
        console.error('Error de conexión:', error);
        showMessage('Error de conexión con el servidor. Verifica que el backend esté corriendo.', 'error');
    }
});

// ============================================
// REGISTRO
// ============================================
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const registerData = {
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        telefono: formData.get('telefono'),
        direccion: formData.get('direccion'),
        usuario: formData.get('usuario'),
        contrasena: formData.get('contrasena')
    };
    
    console.log('Intentando registro con:', registerData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register-cliente`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registerData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Registro exitoso:', data);
            
            showMessage('¡Registro exitoso! Ahora puedes iniciar sesión.', 'success');
            
            // Cambiar a tab de login después de 2 segundos
            setTimeout(() => {
                document.querySelector('[data-tab="login"]').click();
                registerForm.reset();
            }, 2000);
            
        } else {
            const error = await response.text();
            console.error('Error en registro:', error);
            showMessage('Error en el registro. Verifica que el email no esté registrado.', 'error');
        }
        
    } catch (error) {
        console.error('Error de conexión:', error);
        showMessage('Error de conexión con el servidor. Verifica que el backend esté corriendo.', 'error');
    }
});

// ============================================
// FUNCIÓN PARA DECODIFICAR JWT
// ============================================
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error decodificando token:', e);
        return {};
    }
}

// ============================================
// VERIFICAR SI YA HAY SESIÓN ACTIVA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    if (token) {
        // Si ya hay token, verificar si es válido
        const tokenData = parseJwt(token);
        const expiracion = tokenData.exp * 1000; // Convertir a milisegundos
        
        if (expiracion > Date.now()) {
            showMessage('Ya tienes una sesión activa. Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = 'Precio-Productos.html';
            }, 1500);
        } else {
            // Token expirado, limpiar
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
        }
    }
});