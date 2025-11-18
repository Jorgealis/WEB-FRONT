// Carrusel automático adaptado a tus clases: .carrusel, .slide, .dot, .puntos
document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('.carrusel');
    const slides = Array.from(document.querySelectorAll('.slide'));
    const dots = Array.from(document.querySelectorAll('.dot'));

    if (!carousel || slides.length === 0 || dots.length === 0) {
        console.log('No se encontraron los elementos del carrusel');
        return;
    }

    // Asegura que el primer slide tenga la clase active al inicio
    slides[0].classList.add('active');

    let current = 0;
    const delay = 4000;
    let timer = null;
    let isPaused = false;

    function goTo(index) {
        const idx = (index + slides.length) % slides.length;
        slides.forEach((s, i) => {
            const active = i === idx;
            s.classList.toggle('active', active);
            s.setAttribute('aria-hidden', active ? 'false' : 'true');
        });
        dots.forEach((d, i) => {
            d.classList.toggle('active', i === idx);
            d.setAttribute('aria-pressed', i === idx ? 'true' : 'false');
        });
        current = idx;
    }

    function nextSlide() {
        goTo(current + 1);
    }

    function prevSlide() {
        goTo(current - 1);
    }

    function start() {
        stop();
        timer = setInterval(() => {
            if (!isPaused) nextSlide();
        }, delay);
    }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    // Dots click
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = Number(dot.dataset.index);
            if (!Number.isNaN(idx)) goTo(idx);
        });
    });

    // Pause on hover / focus
    carousel.addEventListener('mouseenter', () => { isPaused = true; });
    carousel.addEventListener('mouseleave', () => { isPaused = false; });
    carousel.addEventListener('focusin', () => { isPaused = true; });
    carousel.addEventListener('focusout', () => { isPaused = false; });

    // Swipe support (básico)
    let startX = 0;
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isPaused = true;
    }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diff = endX - startX;
        if (Math.abs(diff) > 30) {
            if (diff < 0) nextSlide();
            else prevSlide();
        }
        isPaused = false;
    });

    // Visibility API pausa cuando la pestaña no está visible
    document.addEventListener('visibilitychange', () => {
        isPaused = document.hidden;
    });

    // Inicializar
    goTo(0);
    start();

    console.log('Carrusel inicializado correctamente');
});