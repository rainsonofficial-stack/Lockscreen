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

    /* 🔒 Disable image long-press menu ONLY */
    document.querySelectorAll('.slide img').forEach(img => {
        img.addEventListener('contextmenu', e => e.preventDefault());
        img.style.webkitTouchCallout = 'none';
    });
};

/* =========================
   MODE CHIPS (unchanged)
========================= */
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

/* =========================
   SECRET PEEK (FIXED)
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
    }, { passive: true });

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
        } else if (!document.getElementById('lock-page').classList.contains('hidden')) {
            document.getElementById('lock-page').classList.add('hidden');
            document.getElementById('setup-page').classList.remove('hidden');
        }
    }
});

/* =========================
   EVERYTHING BELOW: UNCHANGED
========================= */
/* PIN logic */
/* Password logic */
/* Pattern logic */
/* processEntry */
/* drawPeek */
/* updateTime */
