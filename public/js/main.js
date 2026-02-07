/**
 * Salis Official - Main Interactions
 * Theme: Luxury Tech
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initRippleEffect();
    initStickyHeader();
});

/* --- 1. Scroll Animations --- */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Run once
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-up, .fade-in, .scale-up');
    animatedElements.forEach(el => observer.observe(el));
}

/* --- 2. Button Ripple Effect --- */
function initRippleEffect() {
    const buttons = document.querySelectorAll('.btn-ripple');
    buttons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            let x = e.clientX - e.target.offsetLeft;
            let y = e.clientY - e.target.offsetTop;
            let ripple = document.createElement('span');
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            this.appendChild(ripple);
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

/* --- 3. Header Behavior --- */
function initStickyHeader() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}
