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
    config.successAt = +success-try.value;
    config.peekAt = +peek-try.value;
    config.sendAt = +send-try.value;
    config.url = script-url.value;

    setup-page.classList.add('hidden');
    lock-page.classList.remove('hidden');
    initLockMode();
});

function hideAllModes() {
    pin-dots.classList.add('hidden');
    pin-pad.classList.add('hidden');
    password-tap-zone.classList.add('hidden');
    pattern-canvas.classList.add('hidden');
}

function initLockMode() {
    hideAllModes();

    if (config.mode.includes('pin')) {
        const dots = config.mode === 'pin4' ? 4 : 6;
        pin-dots.innerHTML = '<div class="dot"></div>'.repeat(dots);
        pin-dots.classList.remove('hidden');
        pin-pad.classList.remove('hidden');
    }
    else if (config.mode === 'password') {
        password-tap-zone.classList.remove('hidden');
        hidden-pass-input.focus();
        hidden-pass-input.onkeydown = e => {
            if (e.key === 'Enter') processEntry(e.target.value);
        };
    }
    else {
        pattern-canvas.classList.remove('hidden');
        drawDots();
    }
}

/* Secret peek (disable context menu) */
['secret-trigger-lock','secret-trigger-home'].forEach(id => {
    const el = document.getElementById(id);
    const peek = id === 'secret-trigger-lock' ? 'peek-display' : 'peek-display-home';

    el.addEventListener('contextmenu', e => e.preventDefault());

    el.addEventListener('touchstart', () => {
        const now = Date.now();
        if (now - lastTap < 300) {
            forceSuccess = !forceSuccess;
            navigator.vibrate(20);
            active-dot.style.opacity = forceSuccess ? 0.8 : 0;
        }
        lastTap = now;

        holdTimer = setTimeout(() => {
            drawPeek(peek);
            document.getElementById(peek).classList.remove('hidden');
        }, 1000);
    });

    el.addEventListener('touchend', () => {
        clearTimeout(holdTimer);
        document.getElementById(peek).classList.add('hidden');
    });
});

/* Triple tap back — OUTSIDE interactive elements only */
let tapCount = 0, tapTimer;

document.addEventListener('touchstart', e => {
    if (e.target.closest('button, input, canvas, .num, .chip')) return;

    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => tapCount = 0, 400);

    if (tapCount === 3) {
        tapCount = 0;
        if (!home-page.classList.contains('hidden')) {
            home-page.classList.add('hidden');
            lock-page.classList.remove('hidden');
        } else if (!lock-page.classList.contains('hidden')) {
            lock-page.classList.add('hidden');
            setup-page.classList.remove('hidden');
        }
    }
});

/* Pattern + rest of your original logic BELOW (unchanged) */
/* … unchanged code continues exactly as before … */
