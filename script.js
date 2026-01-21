let attemptCount = 0;
let forceSuccess = false;
let currentInput = "";
let peekStack = []; // History of tries
let lastTapTime = 0;
let holdTimer;
let globalTapCount = 0;
let globalTapTimer;
let homeTapCount = 0;
let homeTapTimer;
let homePeekVisible = false;

const config = { mode: "pin4", successAt: 1, peekAt: 1, sendAt: 1, url: "" };

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
    setupCarouselLoop();
};

window.addEventListener('touchstart', (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('canvas') || e.target.closest('.chip')) return;
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
        document.getElementById('pin-dots').innerHTML = '<div class="dot"></div>'.repeat(config.mode === 'pin4' ? 4 : 6);
        document.getElementById('pin-dots').classList.remove('hidden');
        document.getElementById('pin-pad').classList.remove('hidden');
    } else if (config.mode === 'password') {
        document.getElementById('password-tap-zone').classList.remove('hidden');
        const passInput = document.getElementById('hidden-pass-input');
        passInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                processEntry(passInput.value);
                passInput.blur();
            }
        };
    } else if (config.mode === 'pattern') {
        document.getElementById('pattern-canvas').classList.remove('hidden');
        drawDots(); 
    }
}

function setupCarouselLoop() {
    const container = document.getElementById('carousel-container');
    const totalSlides = 3;
    container.scrollLeft = window.innerWidth;
    container.addEventListener('scroll', () => {
        const x = container.scrollLeft;
        const width = window.innerWidth;
        if (x <= 0) container.scrollLeft = width * totalSlides;
        else if (x >= width * (totalSlides + 1)) container.scrollLeft = width;
    });
}

document.getElementById('secret-trigger-lock').addEventListener('touchstart', e => {
    const now = Date.now();
    if (now - lastTapTime < 300) {
        forceSuccess = !forceSuccess;
        if(navigator.vibrate) navigator.vibrate(30); 
        document.getElementById('active-dot').style.opacity = forceSuccess ? 0.8 : 0;
    }
    lastTapTime = now;
    holdTimer = setTimeout(() => {
        drawPeek('peek-display');
        document.getElementById('peek-display').classList.remove('hidden');
    }, 1000);
});

document.getElementById('secret-trigger-lock').addEventListener('touchend', () => {
    clearTimeout(holdTimer);
    document.getElementById('peek-display').classList.add('hidden');
});

document.getElementById('secret-trigger-home').addEventListener('touchstart', e => {
    homeTapCount++;
    clearTimeout(homeTapTimer);
    if (homeTapCount === 2) {
        homePeekVisible = !homePeekVisible;
        if(navigator.vibrate) navigator.vibrate(30);
        if (homePeekVisible) {
            drawPeek('peek-display-home');
            document.getElementById('peek-display-home').classList.remove('hidden');
        } else {
            document.getElementById('peek-display-home').classList.add('hidden');
        }
        homeTapCount = 0;
    } else {
        homeTapTimer = setTimeout(() => { homeTapCount = 0; }, 300);
    }
});

function processEntry(val, isPattern = false) {
    attemptCount++;
    peekStack.push({ attempt: attemptCount, data: isPattern ? val.split('-').map(Number) : val, isPattern: isPattern });

    if (attemptCount === config.sendAt && config.url) fetch(config.url, {method: 'POST', mode: 'no-cors', body: JSON.stringify({passcode: val})});
    
    if (attemptCount === config.successAt || forceSuccess) {
        document.getElementById('unlock-sound').play();
        document.getElementById('lock-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
        const container = document.getElementById('carousel-container');
        container.scrollTo({ left: window.innerWidth, behavior: 'instant' });
    } else {
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]); 
        document.getElementById('lock-content').classList.add('shake');
        setTimeout(() => document.getElementById('lock-content').classList.remove('shake'), 400);
        currentInput = "";
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('filled'));
        if(document.getElementById('hidden-pass-input')) document.getElementById('hidden-pass-input').value = "";
    }
}

function drawPeek(targetCanvasId) {
    const pCanvas = document.getElementById(targetCanvasId);
    const pCtx = pCanvas.getContext('2d');
    const rowH = 35;
    pCanvas.width = 110;
    pCanvas.height = Math.max(40, peekStack.length * rowH + 10);
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

    peekStack.forEach((item, idx) => {
        const yOff = idx * rowH;
        pCtx.strokeStyle = "white"; pCtx.fillStyle = "white"; pCtx.lineWidth = 1.5;
        pCtx.font = "12px Arial"; pCtx.textAlign = "left";
        pCtx.fillText(`${item.attempt}.`, 8, yOff + 22);

        if (item.isPattern) {
            item.data.forEach((id, i) => {
                const x = (id % 3) * 8 + 30; const y = Math.floor(id / 3) * 8 + (yOff + 10);
                if (i > 0) {
                    const prevId = item.data[i-1];
                    pCtx.beginPath();
                    pCtx.moveTo((prevId % 3) * 8 + 30, Math.floor(prevId / 3) * 8 + (yOff + 10));
                    pCtx.lineTo(x, y); pCtx.stroke();
                }
                pCtx.beginPath(); pCtx.arc(x, y, 1, 0, Math.PI * 2); pCtx.fill();
            });
        } else {
            pCtx.font = "bold 13px Courier New"; pCtx.fillText(item.data, 30, yOff + 22);
        }
    });
}

function updateTime() {
    const now = new Date();
    let hours = now.getHours() % 12 || 12;
    const timeStr = `${hours}:${now.getMinutes().toString().padStart(2, '0')}`;
    document.querySelectorAll('.clock').forEach(el => el.innerText = timeStr);
}

const canvas = document.getElementById('pattern-canvas');
const ctx = canvas.getContext('2d');
const dotsArray = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) dotsArray.push({ x: j * 100 + 50, y: i * 100 + 50, id: i * 3 + j });
let currentPattern = [];

function drawDots() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.strokeStyle = "white"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (currentPattern.length > 0) {
        ctx.beginPath(); ctx.moveTo(dotsArray[currentPattern[0]].x, dotsArray[currentPattern[0]].y);
        currentPattern.forEach(id => ctx.lineTo(dotsArray[id].x, dotsArray[id].y)); ctx.stroke();
    }
    dotsArray.forEach(d => {
        ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI*2);
        ctx.fillStyle = currentPattern.includes(d.id) ? "white" : "rgba(255,255,255,0.3)"; ctx.fill();
    });
}

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
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

