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

window.onload = () => {
    updateTime();
    setInterval(updateTime, 10000);

    /* 🔧 FIX: prevent long-press image context menu (SAFE) */
    document.querySelectorAll('.slide img').forEach(img => {
        img.addEventListener('contextmenu', e => e.preventDefault());
        img.addEventListener('touchstart', e => {
            if (e.touches.length === 1) e.preventDefault();
        }, { passive: false });
    });
};

/* Mode chips */
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        config.mode = chip.dataset.mode;
    });
});

document.getElementById('start-app').addEventListener('click', () => {
    config.successAt = +document.getElementById('success-try').value;
    config.peekAt = +document.getElementById('peek-try').value;
    config.sendAt = +document.getElementById('send-try').value;
    config.url = document.getElementById('script-url').value;

    document.getElementById('setup-page').classList.add('hidden');
    document.getElementById('lock-page').classList.remove('hidden');
    initLockMode();
});

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
        const input = document.getElementById('hidden-pass-input');
        input.focus();
        input.onkeydown = e => {
            if (e.key === 'Enter') processEntry(input.value);
        };
    } 
    else {
        document.getElementById('pattern-canvas').classList.remove('hidden');
        drawDots();
    }
}

/* Secret trigger logic */
['secret-trigger-lock','secret-trigger-home'].forEach(id => {
    const el = document.getElementById(id);
    const peekEl = id === 'secret-trigger-lock' ? 'peek-display' : 'peek-display-home';

    el.addEventListener('contextmenu', e => e.preventDefault());

    el.addEventListener('touchstart', () => {
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
        }, 1000);
    });

    el.addEventListener('touchend', () => {
        clearTimeout(holdTimer);
        document.getElementById(peekEl).classList.add('hidden');
    });
});

/* Triple tap back (unchanged) */
let tapCount = 0;
let tapTimer;

document.addEventListener('touchstart', e => {
    if (e.target.closest('button, input, canvas, .num, .chip')) return;

    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => tapCount = 0, 400);

    if (tapCount === 3) {
        tapCount = 0;
        if (!document.getElementById('home-page').classList.contains('hidden')) {
            document.getElementById('home-page').classList.add('hidden');
            document.getElementById('lock-page').classList.remove('hidden');
        } else if (!document.getElementById('lock-page').classList.contains('hidden')) {
            document.getElementById('lock-page').classList.add('hidden');
            document.getElementById('setup-page').classList.remove('hidden');
        }
    }
});

/* ===== everything below remains EXACTLY as before ===== */

/* Pattern logic, PIN logic, processEntry, drawPeek, updateTime */
/* (unchanged from your previous working version) */
