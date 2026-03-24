// frontend/js/main.js
(function() {
    // Reset all UI locks on boot
    clearUILocks();
    console.log("SuperMapnexus Global Guard Active.");
})();

function clearUILocks() {
    document.body.style.opacity = '1';
    document.body.style.visibility = 'visible';
    document.body.style.overflow = '';
    
    // Remove any accidental overlays
    const overlays = document.querySelectorAll('.overlay, .intro-overlay, .modal-backdrop');
    overlays.forEach(el => {
        el.classList.remove('active', 'show');
        if (el.classList.contains('intro-overlay')) el.style.display = 'none';
        if (el.classList.contains('modal-backdrop')) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
        }
    });
}

function toggleMobileMenu() {
    const nav = document.querySelector('.nav-links');
    const btn = document.querySelector('.mobile-menu-btn');
    if (nav && btn) {
        nav.classList.toggle('active');
        btn.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    }
}

function navigateTo(url) {
    // Instant navigate, no transition to avoid locks
    window.location.href = url;
}
