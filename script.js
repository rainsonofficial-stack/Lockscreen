let config = { mode: "pin4", successAt: 1, peekAt: 1, url: "" };
let attemptCount = 0;
let currentInput = "";
let peekData = null;
let tripleTapTime = 0;
let tapCount = 0;
let forceSuccess = false;

// 1. Triple Tap Logic
document.addEventListener('touchstart', () => {
    let now = Date.now();
    if (now - tripleTapTime < 500) {
        tapCount++;
        if (tapCount === 3) location.reload();
    } else {
        tapCount = 1;
    }
    tripleTapTime = now;
});

// 2. Setup
document.getElementById('start-app').addEventListener('click', () => {
    config.mode = document.getElementById('lock-type').value;
    config.successAt = parseInt(document.getElementById('success-try').value);
    config.peekAt = parseInt(document.getElementById('peek-try').value);
    config.url = document.getElementById('script-url').value;
    
    document.getElementById('setup-page').classList.add('hidden');
    document.getElementById('lock-page').classList.remove('hidden');
    
    // UI Init
    if (config.mode.includes('pin')) {
        const count = config.mode === 'pin4' ? 4 : 6;
        document.getElementById('pin-dots').innerHTML = '<div class="dot"></div>'.repeat(count);
        document.getElementById('pin-dots').classList.remove('hidden');
        document.getElementById('pin-pad').classList.remove('hidden');
    } else if (config.mode === 'password') {
        document.getElementById('password-zone').classList.remove('hidden');
        document.getElementById('pass-input-field').focus();
    } else {
        document.getElementById('pattern-canvas').classList.remove('hidden');
        initPattern();
    }
});

// 3. Keypad Input
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        let val = key.getAttribute('data-val');
        currentInput += val;
        let dots = document.querySelectorAll('.dot');
        if (dots[currentInput.length - 1]) dots[currentInput.length - 1].classList.add('filled');
        
        let limit = config.mode === 'pin4' ? 4 : 6;
        if (currentInput.length === limit) {
            setTimeout(() => checkPass(currentInput), 200);
        }
    });
});

// Password Enter
document.getElementById('pass-input-field').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPass(e.target.value);
});

function checkPass(val) {
    attemptCount++;
    if (attemptCount === config.peekAt) peekData = val;
    
    if (attemptCount === config.successAt || forceSuccess) {
        document.getElementById('lock-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
    } else {
        currentInput = "";
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('filled'));
        document.getElementById('pass-input-field').value = "";
        navigator.vibrate(100);
    }
}

// 4. Peek Logic (1 Second)
const triggers = ['lock-peek-zone', 'home-peek-zone'];
triggers.forEach(id => {
    let timer;
    const el = document.getElementById(id);
    const canvasId = id.includes('lock') ? 'peek-canvas-lock' : 'peek-canvas-home';
    
    el.addEventListener('touchstart', () => {
        timer = setTimeout(() => {
            renderPeek(canvasId);
            document.getElementById(canvasId).classList.remove('hidden');
        }, 1000);
    });
    el.addEventListener('touchend', () => {
        clearTimeout(timer);
        document.getElementById(canvasId).classList.add('hidden');
    });
});

function renderPeek(id) {
    const ctx = document.getElementById(id).getContext('2d');
    ctx.clearRect(0,0,100,100);
    if (!peekData) return;
    ctx.fillStyle = "white";
    if (typeof peekData === 'string') {
        ctx.font = "bold 20px Arial";
        ctx.fillText(peekData, 10, 50);
    } else {
        // Draw pattern with arrows
        ctx.strokeStyle = "white"; ctx.lineWidth = 2;
        ctx.beginPath();
        peekData.forEach((dot, i) => {
            let x = (dot % 3) * 30 + 20; let y = Math.floor(dot / 3) * 30 + 20;
            if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            // Simple dot for direction
            ctx.fillRect(x-1, y-1, 2, 2);
        });
        ctx.stroke();
    }
}

// 5. Pattern Logic
let dots = [];
let currentPath = [];
function initPattern() {
    const canvas = document.getElementById('pattern-canvas');
    const pCtx = canvas.getContext('2d');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) dots.push({ x: j*100+50, y: i*100+50, id: i*3+j });
    
    const draw = () => {
        pCtx.clearRect(0,0,300,300);
        pCtx.strokeStyle = "white"; pCtx.lineWidth = 4;
        if (currentPath.length > 0) {
            pCtx.beginPath();
            pCtx.moveTo(dots[currentPath[0]].x, dots[currentPath[0]].y);
            currentPath.forEach(id => pCtx.lineTo(dots[id].x, dots[id].y));
            pCtx.stroke();
        }
        dots.forEach(d => {
            pCtx.beginPath(); pCtx.arc(d.x, d.y, 8, 0, Math.PI*2);
            pCtx.fillStyle = currentPath.includes(d.id) ? "white" : "rgba(255,255,255,0.3)";
            pCtx.fill();
        });
    };
    
    canvas.addEventListener('touchmove', (e) => {
        let rect = canvas.getBoundingClientRect();
        let x = e.touches[0].clientX - rect.left;
        let y = e.touches[0].clientY - rect.top;
        dots.forEach(d => {
            if (Math.sqrt((x-d.x)**2 + (y-d.y)**2) < 30 && !currentPath.includes(d.id)) {
                currentPath.push(d.id);
                navigator.vibrate(10);
                draw();
            }
        });
    });
    
    canvas.addEventListener('touchend', () => {
        if (currentPath.length > 1) {
            peekData = [...currentPath];
            checkPass("pattern");
        }
        currentPath = []; draw();
    });
    draw();
}

function updateTime() {
    let now = new Date();
    document.getElementById('display-time').innerText = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
}
setInterval(updateTime, 1000);
updateTime();
