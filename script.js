let attemptCount = 0;
let forceSuccess = false;
let peekData = null;
let currentPattern = [];
let lastTap = 0;

// CONFIGURATION
let config = {
    mode: "pin4",
    successAt: 1,
    peekAt: 1,
    sendAt: 1,
    url: "PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE" 
};

// UI Elements
const setupPage = document.getElementById('setup-page');
const lockPage = document.getElementById('lock-page');
const homePage = document.getElementById('home-page');
const passInput = document.getElementById('pass-input');
const canvas = document.getElementById('pattern-canvas');
const ctx = canvas.getContext('2d');

// Initialize Performance
document.getElementById('start-app').addEventListener('click', () => {
    config.mode = document.getElementById('lock-type').value;
    config.successAt = parseInt(document.getElementById('success-try').value);
    config.peekAt = parseInt(document.getElementById('peek-try').value);
    config.sendAt = parseInt(document.getElementById('send-try').value);
    const customUrl = document.getElementById('script-url').value;
    if(customUrl) config.url = customUrl;

    setupPage.classList.add('hidden');
    lockPage.classList.remove('hidden');
    
    if(config.mode === 'pattern') {
        canvas.classList.remove('hidden');
    } else {
        passInput.classList.remove('hidden');
        document.getElementById('submit-btn').classList.remove('hidden');
        if(config.mode.includes('pin')) passInput.type = "number";
    }
});

// Force Success (Double Tap)
document.getElementById('secret-trigger').addEventListener('touchstart', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
        forceSuccess = !forceSuccess;
        navigator.vibrate(20);
        document.getElementById('active-dot').style.opacity = forceSuccess ? 0.5 : 0;
    }
    lastTap = now;
});

// Long Press Peek
let holdTimer;
document.getElementById('secret-trigger').addEventListener('touchstart', () => {
    holdTimer = setTimeout(() => {
        drawPeekMiniMap();
        document.getElementById('peek-display').classList.remove('hidden');
    }, 1500);
});
document.getElementById('secret-trigger').addEventListener('touchend', () => {
    clearTimeout(holdTimer);
    document.getElementById('peek-display').classList.add('hidden');
});

// Pattern Logic
const dots = [];
for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
        dots.push({ x: j * 100 + 50, y: i * 100 + 50, id: i * 3 + j });
    }
}

function drawDots() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 5;
    if (currentPattern.length > 0) {
        ctx.beginPath();
        ctx.moveTo(dots[currentPattern[0]].x, dots[currentPattern[0]].y);
        currentPattern.forEach(id => ctx.lineTo(dots[id].x, dots[id].y));
        ctx.stroke();
    }
    dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 10, 0, Math.PI*2);
        ctx.fillStyle = currentPattern.includes(dot.id) ? "#fff" : "rgba(255,255,255,0.3)";
        ctx.fill();
    });
}

canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    dots.forEach(dot => {
        const dist = Math.sqrt((x-dot.x)**2 + (y-dot.y)**2);
        if(dist < 30 && !currentPattern.includes(dot.id)) {
            currentPattern.push(dot.id);
            navigator.vibrate(10);
        }
    });
    drawDots();
});

canvas.addEventListener('touchend', () => {
    if(currentPattern.length > 0) submitPasscode(currentPattern, true);
    currentPattern = [];
    drawDots();
});

document.getElementById('submit-btn').addEventListener('click', () => {
    submitPasscode(passInput.value, false);
    passInput.value = "";
});

// Core Processing
function submitPasscode(val, isPattern) {
    attemptCount++;
    if (attemptCount === config.peekAt) peekData = isPattern ? [...val] : val;

    if (!isPattern && attemptCount === config.sendAt && config.url) {
        fetch(config.url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({passcode: val}) });
    }

    if (attemptCount === config.successAt || forceSuccess) {
        document.getElementById('unlock-sound').play();
        lockPage.classList.add('hidden');
        homePage.classList.remove('hidden');
    } else {
        document.getElementById('lock-container').classList.add('shake');
        navigator.vibrate([50, 50, 50]);
        setTimeout(() => document.getElementById('lock-container').classList.remove('shake'), 300);
    }
}

function drawPeekMiniMap() {
    const pCanvas = document.getElementById('peek-display');
    const pCtx = pCanvas.getContext('2d');
    pCtx.clearRect(0, 0, 80, 80);
    if (!peekData) return;

    if (Array.isArray(peekData)) {
        pCtx.strokeStyle = "#00ff00"; pCtx.lineWidth = 3;
        pCtx.beginPath();
        peekData.forEach((id, i) => {
            const x = (id % 3) * 20 + 20;
            const y = Math.floor(id / 3) * 20 + 20;
            if(i === 0) pCtx.moveTo(x,y); else pCtx.lineTo(x,y);
        });
        pCtx.stroke();
    } else {
        pCtx.fillStyle = "#00ff00"; pCtx.font = "16px Arial";
        pCtx.fillText(peekData, 10, 45);
    }
}
drawDots();

