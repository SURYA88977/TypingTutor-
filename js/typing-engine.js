/* ==========================================================================
   typing-engine.js — the reusable typing session used by tests, lessons and
   practice.

   How input works: a transparent <textarea> sits over the passage so the
   browser (and mobile keyboards) can focus it. Every keystroke is handled
   here and the textarea itself is never allowed to hold text, so the passage
   and the user's input cannot drift apart.

   Rules
   - A wrong character still advances the cursor; Backspace steps back and
     clears that position.
   - Navigation keys (arrows, Home, End, Tab, function keys) and Ctrl/Cmd
     shortcuts never count as typing.
   - Correct = positions that currently match. Attempts = every printable
     keystroke ever made, so corrected typos still count against accuracy.
   ========================================================================== */
(function () {
  'use strict';

  const EXTEND_THRESHOLD = 120;   // append more text when this few characters remain
  const MIN_ELAPSED_SECONDS = 1;  // floor for WPM so the first keystroke cannot spike the number

  /** Make pasted or custom text typeable on a normal keyboard. */
  function normalizeText(raw) {
    return String(raw)
      .replace(/\r\n?/g, '\n')
      .replace(/[‘’‛]/g, "'")
      .replace(/[“”‟]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/…/g, '...')
      .replace(/[ \t]/g, ' ')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function create(opts) {
    const passageEl = opts.passageEl;
    const inputEl = opts.inputEl;
    const stageEl = opts.stageEl;
    const overlayEl = opts.overlayEl || null;
    const duration = opts.duration || 0; // seconds; 0 means no countdown

    let text = '';
    let spans = [];
    let typed = [];            // per position: undefined | true | false
    let pos = 0;
    let correctAttempts = 0;
    let totalAttempts = 0;
    let wrongKeystrokes = 0;
    let startedAt = 0;
    let pausedTotal = 0;
    let pausedAt = 0;
    let state = 'idle';        // idle | running | paused | finished
    let timerId = null;
    let lastLine = -1;
    let destroyed = false;

    const listeners = [];
    function on(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      listeners.push(() => target.removeEventListener(type, fn, options));
    }

    /* ---------- rendering ---------- */
    function buildSpan(ch) {
      const s = document.createElement('span');
      s.className = ch === '\n' ? 'ch nl' : 'ch';
      s.textContent = ch;
      return s;
    }

    function renderAll() {
      passageEl.textContent = '';
      const frag = document.createDocumentFragment();
      spans = [];
      for (const ch of text) { const s = buildSpan(ch); spans.push(s); frag.appendChild(s); }
      passageEl.appendChild(frag);
      lastLine = -1;
      paintCursor();
      passageEl.scrollTop = 0;
    }

    function appendText(more) {
      const frag = document.createDocumentFragment();
      for (const ch of more) { const s = buildSpan(ch); spans.push(s); frag.appendChild(s); }
      passageEl.appendChild(frag);
      text += more;
    }

    function paintCursor() {
      const prev = passageEl.querySelector('.ch.cur');
      if (prev) prev.classList.remove('cur');
      const cur = spans[pos];
      if (cur) { cur.classList.add('cur'); keepInView(cur); }
      if (opts.onCursor) opts.onCursor(text[pos] === undefined ? null : text[pos]);
    }

    /** Keep the current line as the second visible line. */
    function keepInView(el) {
      const lineHeight = parseFloat(getComputedStyle(passageEl).lineHeight) || 40;
      const line = Math.round(el.offsetTop / lineHeight);
      if (line === lastLine) return;
      lastLine = line;
      passageEl.scrollTop = Math.max(0, (line - 1) * lineHeight);
    }

    function paintChar(i) {
      const s = spans[i];
      if (!s) return;
      s.classList.toggle('ok', typed[i] === true);
      s.classList.toggle('bad', typed[i] === false);
    }

    /* ---------- statistics ---------- */
    function elapsedSeconds() {
      if (!startedAt) return 0;
      const end = state === 'paused' ? pausedAt : performance.now();
      return Math.max(0, (end - startedAt - pausedTotal) / 1000);
    }

    function getStats(finalElapsed) {
      let correct = 0, incorrect = 0;
      for (let i = 0; i < pos; i++) { if (typed[i] === true) correct++; else if (typed[i] === false) incorrect++; }
      let elapsed = finalElapsed !== undefined ? finalElapsed : elapsedSeconds();
      if (duration) elapsed = Math.min(elapsed, duration);
      const calcSeconds = Math.max(elapsed, MIN_ELAPSED_SECONDS);
      const progress = duration
        ? Math.min(100, (elapsed / duration) * 100)
        : (text.length ? Math.min(100, (pos / text.length) * 100) : 0);
      return {
        elapsed,
        remaining: duration ? Math.max(0, duration - elapsed) : null,
        wpm: startedAt ? TM.Stats.calcWpm(correct, calcSeconds) : 0,
        cpm: startedAt ? TM.Stats.calcCpm(correct, calcSeconds) : 0,
        accuracy: TM.Stats.calcAccuracy(correctAttempts, totalAttempts),
        correct, incorrect,
        attempts: totalAttempts,
        errors: wrongKeystrokes,
        progress,
        position: pos,
        length: text.length
      };
    }

    function emitProgress() { if (opts.onProgress) opts.onProgress(getStats()); }

    /* ---------- timer: exactly one interval at a time ---------- */
    function stopTimer() { if (timerId !== null) { clearInterval(timerId); timerId = null; } }
    function startTimer() {
      stopTimer();
      timerId = setInterval(() => {
        if (state !== 'running') return;
        if (duration && elapsedSeconds() >= duration) { finish('time'); return; }
        emitProgress();
      }, 100);
    }

    /* ---------- lifecycle ---------- */
    function start() {
      state = 'running';
      startedAt = performance.now();
      pausedTotal = 0;
      startTimer();
      if (opts.onStart) opts.onStart();
    }

    function finish(reason) {
      if (state === 'finished') return; // guards against double completion
      stopTimer();
      const final = getStats(reason === 'time' ? duration : undefined);
      state = 'finished';
      inputEl.blur();
      updateOverlay();
      if (opts.onProgress) opts.onProgress(final);
      if (opts.onFinish) opts.onFinish(final, reason);
    }

    function pause() {
      if (state !== 'running') return false;
      state = 'paused';
      pausedAt = performance.now();
      updateOverlay();
      if (opts.onPause) opts.onPause();
      return true;
    }

    function resume() {
      if (state !== 'paused') return false;
      pausedTotal += performance.now() - pausedAt;
      state = 'running';
      updateOverlay();
      inputEl.focus({ preventScroll: true });
      if (opts.onResume) opts.onResume();
      return true;
    }

    function activate() {
      if (state === 'finished') return;
      if (state === 'paused') { resume(); return; }
      inputEl.focus({ preventScroll: true });
    }

    function updateOverlay() {
      if (!overlayEl) return;
      const focused = document.activeElement === inputEl;
      const show = state === 'paused' || (state === 'idle' && !focused);
      overlayEl.classList.toggle('show', show);
      overlayEl.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (opts.onOverlay) opts.onOverlay(state, show);
    }

    /* ---------- input ---------- */
    function handleChar(ch) {
      if (state === 'finished' || state === 'paused') return;
      if (pos >= text.length) return;
      if (state === 'idle') start();
      if (duration && elapsedSeconds() >= duration) { finish('time'); return; }

      const expected = text[pos];
      const ok = ch === expected;
      totalAttempts++;
      if (ok) correctAttempts++; else wrongKeystrokes++;
      typed[pos] = ok;
      paintChar(pos);
      pos++;
      paintCursor();

      if (opts.onKey) opts.onKey({ expected, typed: ch, correct: ok });
      if (!ok && stageEl) { stageEl.classList.remove('shake'); void stageEl.offsetWidth; stageEl.classList.add('shake'); }

      // Seamless continuation for timed texts
      if (text.length - pos < EXTEND_THRESHOLD && opts.onNeedMore) {
        const more = opts.onNeedMore();
        if (more) appendText(' ' + more);
      }
      emitProgress();
      if (pos >= text.length) finish('complete');
    }

    function handleBackspace(wholeWord) {
      if (state !== 'running' || pos === 0) return;
      let steps = 1;
      if (wholeWord) { // Ctrl/Alt+Backspace removes back to the start of the word
        while (pos - steps > 0 && text[pos - steps - 1] !== ' ' && text[pos - steps - 1] !== '\n') steps++;
      }
      for (let n = 0; n < steps && pos > 0; n++) {
        pos--;
        typed[pos] = undefined;
        paintChar(pos);
      }
      paintCursor();
      emitProgress();
    }

    function onKeyDown(e) {
      if (e.isComposing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (state === 'running') pause(); else if (state === 'paused') resume();
        return;
      }
      if (state === 'finished') { return; }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(true); }
        return; // leave other shortcuts (copy, reload) alone
      }
      if (e.key === 'Tab') return;           // keep keyboard navigation possible
      if (e.key === 'Backspace') { e.preventDefault(); if (state === 'paused') return; handleBackspace(e.altKey); return; }
      if (e.key === 'Enter') { e.preventDefault(); handleChar('\n'); return; }
      if (e.key.length === 1) { e.preventDefault(); handleChar(e.key); return; }
      if (e.key === 'Unidentified' || e.key === 'Process') return; // mobile: handled in the input event
      // Arrows, Home, End, Delete, F-keys, etc. are ignored and never counted
      if (e.key.startsWith('Arrow') || ['Home', 'End', 'PageUp', 'PageDown', 'Delete', 'Insert'].includes(e.key)) e.preventDefault();
    }

    /** Fallback for soft keyboards that report key "Unidentified". */
    function onInput() {
      const value = inputEl.value;
      inputEl.value = '';
      for (const ch of value) { if (ch === '\n' || (ch >= ' ' && ch <= '~')) handleChar(ch); }
    }

    function onBeforeInput(e) {
      if (e.inputType === 'deleteContentBackward' && inputEl.value === '') { e.preventDefault(); handleBackspace(false); }
    }

    function onStageClick(e) {
      if (e.target.closest('button')) return;
      activate();
    }

    function onBlur() {
      // Leaving the typing area mid-run pauses so the clock stays fair.
      if (state === 'running') pause(); else updateOverlay();
    }
    function onFocus() { if (state === 'paused') resume(); else updateOverlay(); }

    function onVisibility() { if (document.hidden && state === 'running') pause(); }

    on(inputEl, 'keydown', onKeyDown);
    on(inputEl, 'input', onInput);
    on(inputEl, 'beforeinput', onBeforeInput);
    on(inputEl, 'paste', (e) => e.preventDefault());
    on(inputEl, 'drop', (e) => e.preventDefault());
    on(inputEl, 'blur', onBlur);
    on(inputEl, 'focus', onFocus);
    on(stageEl, 'click', onStageClick);
    on(document, 'visibilitychange', onVisibility);

    /* ---------- public API ---------- */
    function reset(newText) {
      stopTimer();
      if (newText !== undefined) text = newText;
      typed = [];
      pos = 0;
      correctAttempts = 0; totalAttempts = 0; wrongKeystrokes = 0;
      startedAt = 0; pausedTotal = 0; pausedAt = 0;
      state = 'idle';
      inputEl.value = '';
      renderAll();
      updateOverlay();
      if (opts.onProgress) opts.onProgress(getStats());
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stopTimer();
      listeners.forEach((off) => off());
      listeners.length = 0;
    }

    return {
      reset, destroy, pause, resume, activate, finish: () => finish('manual'),
      getStats, getState: () => state, getText: () => text,
      isRunning: () => state === 'running',
      isFinished: () => state === 'finished',
      hasStarted: () => state !== 'idle',
      refreshOverlay: updateOverlay
    };
  }

  window.TM = window.TM || {};
  window.TM.Engine = { create, normalizeText, EXTEND_THRESHOLD, MIN_ELAPSED_SECONDS };
})();
