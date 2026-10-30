/* ==========================================================================
   practice.js — pressure-free practice: random words, sentences, paragraphs,
   home row, difficult keys and custom text, with an optional countdown.
   Practice never touches official test results; a finished run can be saved
   as a test only when the user chooses to.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el, setBar, statTile } = TM.UI;

  const HINTS = {
    words: 'A fresh set of everyday words each time.',
    sentences: 'Three complete sentences with punctuation.',
    paragraph: 'One short paragraph for building rhythm.',
    homerow: 'Words built from the home row only.',
    difficult: 'Words with Q, Z, X, J and other awkward keys.',
    custom: 'Paste or write your own text below.'
  };
  const MAX_CUSTOM = 5000;

  let mode = 'words';
  let customText = '';
  let engine = null;
  let lastResult = null;
  let sessionSaved = false;

  function generate() {
    const P = TM.Passages;
    switch (mode) {
      case 'sentences': return P.randomSentences(3);
      case 'paragraph': return P.randomParagraph();
      case 'homerow': return P.pickWords(P.WORDS.home, 30);
      case 'difficult': return P.pickWords(P.WORDS.difficult, 26);
      case 'custom': return customText;
      default: return P.pickWords(P.WORDS.common, 30);
    }
  }

  function countdownSeconds() {
    return $('practice-countdown-on').checked ? Number($('practice-countdown').value) : 0;
  }

  function renderLive(s) {
    $('practice-wpm').textContent = Math.round(s.wpm);
    $('practice-cpm').textContent = Math.round(s.cpm);
    $('practice-acc').textContent = Math.round(s.accuracy) + '%';
    $('practice-correct').textContent = s.correct;
    $('practice-wrong').textContent = s.incorrect;
    $('practice-errors').textContent = s.errors;
    if (s.remaining !== null) {
      $('practice-time').textContent = TM.Stats.formatClock(s.remaining);
      $('practice-timer-box').classList.toggle('low', s.remaining <= 10 && s.elapsed > 0);
    }
    setBar($('practice-bar'), s.progress);
  }

  function buildEngine(text) {
    if (engine) { engine.destroy(); engine = null; }
    const seconds = countdownSeconds();
    $('practice-timer-box').hidden = !seconds;
    $('practice-time').textContent = TM.Stats.formatClock(seconds);
    $('practice-result').hidden = true;
    lastResult = null;
    sessionSaved = false;

    engine = TM.Engine.create({
      passageEl: $('practice-passage'),
      inputEl: $('practice-input'),
      stageEl: $('practice-stage'),
      overlayEl: $('practice-overlay'),
      duration: seconds,
      onProgress: renderLive,
      // Countdown mode keeps feeding text of the same kind until time is up.
      onNeedMore: seconds && mode !== 'custom' ? () => generate() : (seconds && customText ? () => customText : null),
      onKey: (k) => { if (k.correct) TM.Settings.Sound.key(); else TM.Settings.Sound.error(); },
      onPause: () => setPauseLabel(true),
      onResume: () => setPauseLabel(false),
      onOverlay: (state) => {
        $('practice-overlay-title').textContent = state === 'paused' ? 'Paused' : 'Ready when you are';
        $('practice-overlay-text').textContent = state === 'paused' ? 'Click here or press Esc to continue.' : 'Click here and start typing.';
        $('practice-focus').textContent = state === 'paused' ? 'Resume' : 'Start typing';
      },
      onFinish: onFinish
    });
    TM.Settings.apply();
    engine.reset(text);
    setPauseLabel(false);
  }

  function setPauseLabel(paused) {
    const btn = $('practice-pause');
    btn.textContent = '';
    btn.append(TM.UI.icon(paused ? 'i-play' : 'i-pause'), paused ? 'Resume' : 'Pause');
  }

  function newText() {
    if (mode === 'custom' && !customText) {
      $('practice-custom-text').focus();
      TM.UI.toast('Add some text first', 'Type or paste text, then choose Practice this text.', 'info');
      return;
    }
    buildEngine(generate());
    engine.activate();
  }

  function onFinish(stats) {
    if (stats.attempts === 0) return;
    const data = TM.Storage.get();
    data.practice.push({
      id: TM.Storage.newId(), ts: Date.now(), mode,
      seconds: Math.round(stats.elapsed), wpm: TM.Stats.round1(stats.wpm),
      accuracy: TM.Stats.round1(stats.accuracy), chars: stats.attempts
    });
    TM.Storage.addActivity(stats.elapsed);
    TM.Storage.save();
    TM.Achievements.check();
    document.dispatchEvent(new CustomEvent('tm:data-changed'));
    lastResult = stats;
    TM.Settings.Sound.done();
    showResult(stats);
  }

  function showResult(stats) {
    const box = $('practice-result');
    box.textContent = '';
    const canSave = stats.elapsed >= 10;
    box.append(
      el('div', { class: 'lesson-result' },
        el('h3', { text: 'Practice complete' }),
        el('div', { class: 'stat-grid' },
          statTile('Speed', Math.round(stats.wpm), 'WPM'),
          statTile('Accuracy', Math.round(stats.accuracy) + '%'),
          statTile('Mistakes', String(stats.errors)),
          statTile('Time', TM.Stats.formatClock(stats.elapsed))),
        el('p', { class: 'save-note', text: 'This session counted toward your practice time. It is not part of your test history.' }),
        el('div', { class: 'btn-row' },
          el('button', { type: 'button', class: 'btn btn-primary', onclick: newText }, 'Practice again'),
          canSave ? el('button', { type: 'button', class: 'btn', id: 'practice-save-test', onclick: saveAsTest }, 'Save as a test result') : null)));
    box.hidden = false;
    TM.UI.announce('Practice complete. ' + Math.round(stats.wpm) + ' words per minute at ' + Math.round(stats.accuracy) + ' percent accuracy.');
  }

  /** Explicit opt-in: turns this practice run into an official test record. */
  function saveAsTest(e) {
    if (!lastResult || sessionSaved) return;
    sessionSaved = true;
    const s = lastResult;
    const data = TM.Storage.get();
    const nearest = [60, 120, 180, 240, 300].reduce((a, b) => (Math.abs(b - s.elapsed) < Math.abs(a - s.elapsed) ? b : a));
    data.tests.push({
      id: TM.Storage.newId(), ts: Date.now(),
      wpm: TM.Stats.round1(s.wpm), cpm: Math.round(s.cpm), accuracy: TM.Stats.round1(s.accuracy),
      correct: s.correct, incorrect: s.incorrect, attempts: s.attempts, errors: s.errors,
      seconds: Math.round(s.elapsed), duration: nearest, difficulty: TM.Settings.current().difficulty
    });
    TM.Storage.save();
    TM.Achievements.check();
    document.dispatchEvent(new CustomEvent('tm:data-changed'));
    e.currentTarget.disabled = true;
    e.currentTarget.textContent = 'Saved as a test result';
    TM.UI.toast('Saved as a test', 'It now appears in your test history.', 'success');
  }

  function setMode(next) {
    mode = next;
    $('practice-mode').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === mode)));
    $('practice-mode-hint').textContent = HINTS[mode];
    $('practice-custom').hidden = mode !== 'custom';
    if (mode === 'custom' && !customText) {
      if (engine) { engine.destroy(); engine = null; }
      $('practice-passage').textContent = '';
      $('practice-result').hidden = true;
      $('practice-custom-text').focus();
      return;
    }
    buildEngine(generate());
  }

  function init() {
    $('practice-mode').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (b) setMode(b.dataset.value);
    });

    const area = $('practice-custom-text');
    area.addEventListener('input', () => { $('practice-custom-count').textContent = area.value.length + ' / ' + MAX_CUSTOM; });
    $('practice-load-custom').addEventListener('click', () => {
      const cleaned = TM.Engine.normalizeText(area.value).slice(0, MAX_CUSTOM);
      if (cleaned.length < 5) { TM.UI.toast('Text is too short', 'Enter at least a few words to practice.', 'error'); return; }
      customText = cleaned;
      area.value = cleaned;
      $('practice-custom-count').textContent = cleaned.length + ' / ' + MAX_CUSTOM;
      buildEngine(customText);
      engine.activate();
    });

    $('practice-countdown-on').addEventListener('change', (e) => {
      $('practice-countdown').disabled = !e.target.checked;
      if (!(mode === 'custom' && !customText)) buildEngine(engine ? engine.getText() : generate());
    });
    $('practice-countdown').addEventListener('change', () => {
      if (!(mode === 'custom' && !customText)) buildEngine(engine ? engine.getText() : generate());
    });

    $('practice-new').addEventListener('click', newText);
    $('practice-restart').addEventListener('click', () => {
      if (!engine) return;
      buildEngine(engine.getText());
      engine.activate();
    });
    $('practice-pause').addEventListener('click', () => {
      if (!engine) return;
      if (engine.getState() === 'paused') engine.resume(); else engine.pause();
    });
    $('practice-clear').addEventListener('click', () => {
      if (mode === 'custom') {
        customText = ''; area.value = '';
        $('practice-custom-count').textContent = '0 / ' + MAX_CUSTOM;
        if (engine) { engine.destroy(); engine = null; }
        $('practice-passage').textContent = '';
        $('practice-result').hidden = true;
        ['wpm', 'cpm', 'correct', 'wrong', 'errors'].forEach((k) => { $('practice-' + k).textContent = '0'; });
        $('practice-acc').textContent = '100%';
        setBar($('practice-bar'), 0);
        area.focus();
      } else if (engine) {
        buildEngine(engine.getText());
      }
    });
    $('practice-focus').addEventListener('click', () => engine && engine.activate());
    $('practice-overlay').addEventListener('click', () => engine && engine.activate());
  }

  let pendingText = null;
  /** Queue text (e.g. the daily quote) to open in custom mode on the next visit. */
  function typeText(text) { pendingText = TM.Engine.normalizeText(text).slice(0, MAX_CUSTOM); }

  function enter() {
    if (pendingText) {
      customText = pendingText;
      pendingText = null;
      $('practice-custom-text').value = customText;
      $('practice-custom-count').textContent = customText.length + ' / ' + MAX_CUSTOM;
      setMode('custom');
      return;
    }
    if (!engine) setMode(mode);
  }
  function leave() {
    if (engine) { engine.destroy(); engine = null; }
  }

  window.TM = window.TM || {};
  window.TM.Practice = { init, enter, leave, typeText };
})();
