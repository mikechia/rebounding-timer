(() => {
  'use strict';

  const STORAGE_KEY = 'rebounding-timer-state';
  const IDLE_MS = 4000;          // hide controls after this long while running
  const RESET_CONFIRM_MS = 3000; // second tap within this window resets
  const FLASH_MS = 700;

  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const digitalTime = $('digital-time');
  const analogTotal = $('analog-total');
  const arcFirst = $('arc-first');
  const arcSecond = $('arc-second');
  const hand = $('hand');
  const btnStart = $('btn-start');
  const btnReset = $('btn-reset');
  const btnMode = $('btn-mode');
  const wakeStatus = $('wake-status');

  const CIRC = 2 * Math.PI * 80;
  const HALF = CIRC / 2;

  // ---------- State (persisted so a reload doesn't lose the time) ----------
  let state = { running: false, startedAt: 0, accumulated: 0, mode: 'digital' };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) state = Object.assign(state, saved);
  } catch (_) { /* storage unavailable */ }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function elapsedMs() {
    return state.accumulated + (state.running ? Date.now() - state.startedAt : 0);
  }

  // ---------- Analog ticks: every 5 s, bold at 0/15/30/45 ----------
  const ticks = $('ticks');
  for (let s = 0; s < 60; s += 5) {
    const major = s % 15 === 0;
    const a = (s / 60) * 2 * Math.PI;
    const r1 = major ? 62 : 67, r2 = 72;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', (Math.sin(a) * r1).toFixed(2));
    line.setAttribute('y1', (-Math.cos(a) * r1).toFixed(2));
    line.setAttribute('x2', (Math.sin(a) * r2).toFixed(2));
    line.setAttribute('y2', (-Math.cos(a) * r2).toFixed(2));
    line.setAttribute('class', major ? 'tick major' : 'tick');
    ticks.appendChild(line);
  }

  // ---------- Rendering ----------
  function format(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  }

  let lastText = '';
  let lastHalf = Math.floor(elapsedMs() / 30000);

  function render() {
    const ms = elapsedMs();
    const totalSec = Math.floor(ms / 1000);
    const text = format(totalSec);
    if (text !== lastText) {
      lastText = text;
      digitalTime.textContent = text;
      digitalTime.classList.toggle('long', totalSec >= 3600);
      analogTotal.textContent = text;
    }

    // Smooth sweep within the current minute
    const secInMin = (ms % 60000) / 1000;
    hand.setAttribute('transform', `rotate(${(secInMin * 6).toFixed(2)})`);
    const first = Math.min(secInMin, 30) / 30 * HALF;
    const second = Math.max(secInMin - 30, 0) / 30 * HALF;
    arcFirst.setAttribute('stroke-dasharray', `${first} ${CIRC}`);
    arcSecond.setAttribute('stroke-dasharray', `${second} ${CIRC}`);

    // Flash on each new 30-second block
    const half = Math.floor(ms / 30000);
    if (state.running && half > lastHalf) flash();
    lastHalf = half;

    requestAnimationFrame(render);
  }

  function flash() {
    body.classList.add('flash');
    setTimeout(() => body.classList.remove('flash'), FLASH_MS);
  }

  function syncUi() {
    body.classList.toggle('mode-digital', state.mode === 'digital');
    body.classList.toggle('mode-analog', state.mode === 'analog');
    body.classList.toggle('paused', !state.running && elapsedMs() > 0);
    btnMode.textContent = state.mode === 'digital' ? 'Analog' : 'Digital';
    btnStart.textContent = state.running ? 'Pause' : (elapsedMs() > 0 ? 'Resume' : 'Start');
    btnStart.classList.toggle('running', state.running);
  }

  // ---------- Controls ----------
  btnStart.addEventListener('click', () => {
    if (state.running) {
      state.accumulated = elapsedMs();
      state.running = false;
    } else {
      state.startedAt = Date.now();
      state.running = true;
    }
    lastHalf = Math.floor(elapsedMs() / 30000);
    save();
    syncUi();
    requestWakeLock();
  });

  let resetTimer = null;
  btnReset.addEventListener('click', () => {
    if (!resetTimer) {
      btnReset.textContent = 'Tap to confirm';
      btnReset.classList.add('confirm');
      resetTimer = setTimeout(cancelReset, RESET_CONFIRM_MS);
      return;
    }
    cancelReset();
    state.running = false;
    state.accumulated = 0;
    state.startedAt = 0;
    lastHalf = 0;
    save();
    syncUi();
  });

  function cancelReset() {
    clearTimeout(resetTimer);
    resetTimer = null;
    btnReset.textContent = 'Reset';
    btnReset.classList.remove('confirm');
  }

  btnMode.addEventListener('click', () => {
    state.mode = state.mode === 'digital' ? 'analog' : 'digital';
    save();
    syncUi();
  });

  // ---------- Auto-hide controls while running ----------
  let idleTimer = null;
  function wake() {
    body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (state.running) body.classList.add('idle');
    }, IDLE_MS);
  }
  ['pointerdown', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, () => { wake(); requestWakeLock(); }, { passive: true })
  );

  // Spacebar / Enter toggles for keyboard users
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); btnStart.click(); }
  });

  // ---------- Keep the screen awake ----------
  let wakeLock = null;
  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      setWakeStatus(false, 'Screen may sleep');
      return;
    }
    if (wakeLock || document.visibilityState !== 'visible') return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      setWakeStatus(true, 'Screen stays on');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
        setWakeStatus(false, 'Tap to keep screen on');
      });
    } catch (_) {
      wakeLock = null;
      setWakeStatus(false, 'Tap to keep screen on');
    }
  }
  function setWakeStatus(ok, text) {
    wakeStatus.textContent = (ok ? '☀ ' : '⚠ ') + text;
    wakeStatus.classList.toggle('warn', !ok);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWakeLock();
  });

  // ---------- Offline support ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  syncUi();
  wake();
  requestWakeLock();
  requestAnimationFrame(render);
})();
