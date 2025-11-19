// ============================================
// CONFIGURACIÓN CENTRALIZADA DEL BACKEND
// ============================================

// Detectar automáticamente si estamos en desarrollo o producción
const CONFIG = {
    // Si estás en localhost, usa la URL local
    // Si estás en producción, usa la URL de Railway/Render/etc
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8080/api'
        : 'https://ojari-heladeria-production.up.railway.app/', // 👈 CAMBIA ESTO por tu URL de Railway
    
    // Otras configuraciones que puedas necesitar
    APP_NAME: 'Ojari Sabana',
    VERSION: '1.0.0'
};

// Exportar para uso global
window.CONFIG = CONFIG;

console.log('🚀 Configuración cargada:', {
    entorno: window.location.hostname === 'localhost' ? 'DESARROLLO' : 'PRODUCCIÓN',
    apiUrl: CONFIG.API_BASE_URL
});