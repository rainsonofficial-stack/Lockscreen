let attemptCount = 0;
let forceSuccess = false;
let currentInput = "";
let peekData = null;
let lastTap = 0;
let tripleTapCheck = 0;

const config = {
    mode: "pin4",
    successAt: 1,
    peekAt: 1,
    sendAt: 1,
    url: "YOUR_URL_HERE"
};

// PERSISTENCE & TIME
window.onload = () => {
    const saved = localStorage.getItem('lockscreen_settings');
    if (saved) Object.assign(config, JSON.parse(saved));
    updateTime();
};

// TRIPLE TAP BACK GESTURE
document.addEventListener('touchstart', (e) => {
    const now = Date.now();
    if (now - tripleTapCheck < 500) {
        tripleTapCheck = now;
        lastTapCount++;
        if(lastTapCount === 3) {
            location.reload(); // Returns to setup
        }
    } else {
        lastTapCount = 1;
        tripleTapCheck = now;
    }
});

document.getElementById('start-app').addEventListener('click', () => {
    // Collect from inputs
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
    if (config.mode === 'password') {
        document.getElementById('password-tap-zone').classList.remove('hidden');
        document.getElementById('hidden-pass-input').focus();
    } else if (config.mode === 'pattern') {
        document.getElementById('pattern-canvas').classList.remove('hidden');
        drawDots();
    } else {
        const dots = config.mode === 'pin4' ? 4 : 6;
        document.getElementById('pin-dots').innerHTML = '<div class="dot"></div>'.repeat(dots);
        document.getElementById('pin-dots').classList.remove('hidden');
        document.getElementById('pin-pad').classList.remove('hidden');
    }
}

// SECRET PEEK (1 SECOND)
const triggers = ['secret-trigger-lock', 'secret-trigger-home'];
triggers.forEach(id => {
    const el = document.getElementById(id);
    const peekEl = id.includes('lock') ? 'peek-display' : 'peek-display-home';
    
    el.addEventListener('touchstart', () => {
        holdTimer = setTimeout(() => {
            drawPeek(peekEl);
            document.getElementById(peekEl).classList.remove('hidden');
        }, 1000); // Reduced to 1 second
    });
    el.addEventListener('touchend', () => {
        clearTimeout(holdTimer);
        document.getElementById(peekEl).classList.add('hidden');
    });
});

// PATTERN & ARROW LOGIC
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

function drawPeek(targetId) {
    const pCanvas = document.getElementById(targetId);
    const pCtx = pCanvas.getContext('2d');
    pCtx.clearRect(0, 0, 100, 100);
    if (!peekData) return;

    pCtx.strokeStyle = "white"; pCtx.fillStyle = "white";
    if (Array.isArray(peekData)) {
        // Draw the Mini-Pattern
        pCtx.lineWidth = 2;
        pCtx.beginPath();
        peekData.forEach((id, i) => {
            const x = (id % 3) * 20 + 20; const y = Math.floor(id / 3) * 20 + 20;
            if(i === 0) pCtx.moveTo(x,y); else pCtx.lineTo(x,y);
            // Draw small arrow for direction
            if(i > 0) drawArrow(pCtx, peekData[i-1], id);
        });
        pCtx.stroke();
    } else {
        pCtx.font = "bold 20px Arial"; pCtx.fillText(peekData, 10, 50);
    }
}

function drawArrow(ctx, startId, endId) {
    const x1 = (startId % 3) * 20 + 20; const y1 = Math.floor(startId / 3) * 20 + 20;
    const x2 = (endId % 3) * 20 + 20; const y2 = Math.floor(endId / 3) * 20 + 20;
    const midX = (x1 + x2) / 2; const midY = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX - 5 * Math.cos(angle - Math.PI / 6), midY - 5 * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX - 5 * Math.cos(angle + Math.PI / 6), midY - 5 * Math.sin(angle + Math.PI / 6));
}

function processEntry(val, isPattern = false) {
    attemptCount++;
    if (attemptCount === config.peekAt) peekData = isPattern ? val.split('-').map(Number) : val;
    if (attemptCount === config.successAt || forceSuccess) {
        document.getElementById('unlock-sound').play();
        document.getElementById('lock-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
    } else {
        navigator.vibrate([50, 50, 50]);
        currentInput = "";
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('filled'));
    }
}

document.querySelectorAll('.num').forEach(btn => {
    btn.addEventListener('click', () => {
        currentInput += btn.innerText[0];
        const dot = document.querySelectorAll('.dot')[currentInput.length - 1];
        if (dot) dot.classList.add('filled');
        const limit = config.mode === 'pin4' ? 4 : 6;
        if (currentInput.length === limit) setTimeout(() => processEntry(currentInput), 200);
    });
});

function updateTime() {
    const now = new Date();
    document.querySelector('.clock').innerText = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
}
