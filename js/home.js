(function () {
    // ---------- STARS ----------
    const starsContainer = document.getElementById('starsContainer');
    for (let i = 0; i < 90; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = 1.5 + Math.random() * 3.8;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.setProperty('--duration', (3 + Math.random() * 5) + 's');
        star.style.animationDelay = (Math.random() * 4) + 's';
        star.style.opacity = 0.3 + Math.random() * 0.7;
        starsContainer.appendChild(star);
    }


})();
