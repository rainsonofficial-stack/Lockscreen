let config = { mode: "pin4", successAt: 1, peekAt: 1, url: "" };
let attemptCount = 0;
let currentInput = "";
let peekData = null;
let tapLog = 0;
let lastTapTime = 0;

// 1. Triple Tap Global Reset
document.addEventListener('touchstart', (e) => {
    let now = Date.now();
    if (now - lastTapTime < 400) {
        tapLog++;
        if (tapLog === 3) location.reload();
    } else {
        tapLog = 1;
    }
    lastTapTime = now;
});

// 2. Setup Initialization
document.getElementById('start-app').addEventListener('click', () => {
    config.mode = document.getElementById('lock-type').value;
    config.successAt = parseInt(document.getElementById('success-try').value);
    config.peekAt = parseInt(document.getElementById('peek-try').value);
    config.url = document.getElementById('script-url').value;
    
    document.getElementById('setup-page').classList.add('hidden');
    document.getElementById('lock-page').classList.remove('hidden');
    
    if (config.mode.includes('pin')) {
        const count = config.mode === 'pin4' ? 4 : 6;
        document.getElementById('pin-dots').innerHTML = '<div class="dot"></div>'.repeat(count);
        document.getElementById('pin-dots').classList.remove('hidden');
        document.getElementById('keypad').classList.remove('hidden');
    } else if (config.mode === 'password') {
        document.getElementById('password-wrapper').classList.remove('hidden');
        document.getElementById('pass-field').focus();
    } else {
        document.getElementById('pattern-canvas').classList.remove('hidden');
        initPattern();
    }
});

// 3. Input Handling
document.querySelectorAll('.key').forEach(el => {
    el.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevents ghost clicks
        let val = el.getAttribute('data-val');
        currentInput += val;
        
        let dots = document.querySelectorAll('.dot');
        if (dots[currentInput.length - 1]) dots[currentInput.length - 1].classList.add('filled');
        
        let limit = config.mode === 'pin4' ? 4 : 6;
        if (currentInput.length === limit) {
            setTimeout(() => processPass(currentInput), 250);
        }
    });
});

document.getElementById('pass-field').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processPass(e.target.value);
});

function processPass(val) {
    attemptCount++;
    if (attemptCount === config.peekAt) peekData = val;
    
    if (attemptCount === config.successAt) {
        document.getElementById('lock-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
    } else {
        // Fail Animation
        navigator.vibrate(100);
        currentInput = "";
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('filled'));
        document.getElementById('pass-field').value = "";
    }
}

// 4. Peek Logic (1 Second)
['lock-trigger', 'home-trigger'].forEach(id => {
    let timer;
    const trigger = document.getElementById(id);
    const canvasId = id.includes('lock') ? 'peek-lock' : 'peek-home';
    
    trigger.addEventListener('touchstart', () => {
        timer = setTimeout(() => {
            renderPeek(canvasId);
            document.getElementById(canvasId).classList.remove('hidden');
        }, 1000);
    });
    trigger.addEventListener('touchend', () => {
        clearTimeout(timer);
        document.getElementById(canvasId).classList.add('hidden');
    });
});

function renderPeek(id) {
    const ctx = document.getElementById(id).getContext('2d');
    ctx.clearRect(0,0,100,100);
    if (!peekData) return;
    
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    
    if (typeof peekData === 'string' && !peekData.includes('-')) {
        ctx.font = "bold 22px Arial";
        ctx.fillText(peekData, 10, 50);
    } else {
        // Draw pattern with direction indicators
        let path = Array.isArray(peekData) ? peekData : peekData.split('-').map(Number);
        ctx.lineWidth = 2; ctx.beginPath();
        path.forEach((dot, i) => {
            let x = (dot % 3) * 30 + 20; let y = Math.floor(dot/3) * 30 + 20;
            if(i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            ctx.fillRect(x-2, y-2, 4, 4); // Dot for position
        });
        ctx.stroke();
    }
}

// 5. Pattern Logic
function initPattern() {
    const canvas = document.getElementById('pattern-canvas');
    const pCtx = canvas.getContext('2d');
    const pDots = [];
    let path = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pDots.push({ x: j*100+50, y: i*100+50, id: i*3+j });
    
    const draw = () => {
        pCtx.clearRect(0,0,300,300);
        pCtx.strokeStyle = "white"; pCtx.lineWidth = 4;
        if (path.length > 0) {
            pCtx.beginPath();
            pCtx.moveTo(pDots[path[0]].x, pDots[path[0]].y);
            path.forEach(id => pCtx.lineTo(pDots[id].x, pDots[id].y));
            pCtx.stroke();
        }
        pDots.forEach(d => {
            pCtx.beginPath(); pCtx.arc(d.x, d.y, 8, 0, Math.PI*2);
            pCtx.fillStyle = path.includes(d.id) ? "white" : "rgba(255,255,255,0.3)";
            pCtx.fill();
        });
    };
    
    canvas.addEventListener('touchmove', (e) => {
        let rect = canvas.getBoundingClientRect();
        let x = e.touches[0].clientX - rect.left;
        let y = e.touches[0].clientY - rect.top;
        pDots.forEach(d => {
            if (Math.sqrt((x-d.x)**2 + (y-d.y)**2) < 30 && !path.includes(d.id)) {
                path.push(d.id);
                navigator.vibrate(10);
                draw();
            }
        });
    });
    
    canvas.addEventListener('touchend', () => {
        if (path.length > 1) {
            peekData = [...path];
            processPass(path.join('-'));
        }
        path = []; draw();
    });
    draw();
}

function updateTime() {
    let now = new Date();
    document.getElementById('clock').innerText = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
}
setInterval(updateTime, 1000);
updateTime();
