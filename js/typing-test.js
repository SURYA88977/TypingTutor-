/* ==========================================================================
   typing-test.js — the timed Typing Test: setup, run, results, saving.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el, setBar, statTile } = TM.UI;

  const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const DURATIONS = [60, 120, 180, 240, 300];

  let selection = { difficulty: 'easy', duration: 60 };
  let lastDefaultsKey = '';
  let engine = null;
  let feeder = null;
  let runSaved = false;       // guards against saving one run twice
  let runSelection = null;

  const minutesLabel = (s) => (s / 60) + (s === 60 ? ' minute' : ' minutes');

  /* ---------- setup screen ---------- */
  function markPressed(groupId, value) {
    $(groupId).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === String(value))));
  }

  function syncSetup() {
    markPressed('test-difficulty', selection.difficulty);
    markPressed('test-duration', selection.duration);
    const best = TM.Stats.testSummary(TM.Storage.get().tests).bestWpm;
    $('test-best-note').textContent = best > 0 ? 'Your best so far: ' + Math.round(best) + ' WPM' : 'No tests yet. Your first one sets your baseline.';
  }

  function adoptDefaultsIfChanged() {
    const s = TM.Settings.current();
    const key = s.difficulty + '|' + s.duration;
    if (key !== lastDefaultsKey) {
      selection = { difficulty: s.difficulty, duration: s.duration };
      lastDefaultsKey = key;
    }
  }

  function showSetup() {
    $('test-setup').hidden = false;
    $('test-run').hidden = true;
    syncSetup();
  }

  /* ---------- run ---------- */
  function startRun() {
    leave();
    runSaved = false;
    runSelection = { ...selection };
    feeder = TM.Passages.createFeeder(runSelection.difficulty);

    $('test-setup').hidden = true;
    $('test-run').hidden = false;

    const pills = $('test-pills');
    pills.textContent = '';
    pills.append(
      el('span', { class: 'pill accent', text: DIFFICULTY_LABEL[runSelection.difficulty] }),
      el('span', { class: 'pill', text: minutesLabel(runSelection.duration) })
    );

    engine = TM.Engine.create({
      passageEl: $('test-passage'),
      inputEl: $('test-input'),
      stageEl: $('test-stage'),
      overlayEl: $('test-overlay'),
      duration: runSelection.duration,
      onProgress: renderLive,
      onNeedMore: () => feeder.next(),
      onKey: (k) => { if (k.correct) TM.Settings.Sound.key(); else TM.Settings.Sound.error(); },
      onStart: () => TM.UI.announce('Test started'),
      onPause: () => setPauseButton(true),
      onResume: () => setPauseButton(false),
      onOverlay: (state) => {
        $('test-overlay-title').textContent = state === 'paused' ? 'Paused' : 'Ready when you are';
        $('test-overlay-text').textContent = state === 'paused'
          ? 'Your clock is stopped. Click here or press Esc to continue.'
          : 'Start typing to begin. The countdown starts with your first key.';
        $('test-focus').textContent = state === 'paused' ? 'Resume' : 'Start typing';
      },
      onFinish: finishRun
    });
    TM.Settings.apply();
    engine.reset(feeder.next());
    setPauseButton(false);
    engine.activate();
  }

  function setPauseButton(paused) {
    const btn = $('test-pause');
    btn.textContent = '';
    btn.append(TM.UI.icon(paused ? 'i-play' : 'i-pause'), paused ? 'Resume' : 'Pause');
  }

  function renderLive(s) {
    $('test-time').textContent = TM.Stats.formatClock(s.remaining === null ? 0 : s.remaining);
    $('test-timer-box').classList.toggle('low', s.remaining !== null && s.remaining <= 10 && s.elapsed > 0);
    $('test-wpm').textContent = Math.round(s.wpm);
    $('test-cpm').textContent = Math.round(s.cpm);
    $('test-acc').textContent = Math.round(s.accuracy) + '%';
    $('test-correct').textContent = s.correct;
    $('test-wrong').textContent = s.incorrect;
    $('test-errors').textContent = s.errors;
    setBar($('test-bar'), s.progress);
    $('test-progress-text').textContent = Math.round(s.progress) + '% of time used';
  }

  /* ---------- finishing ---------- */
  function feedbackFor(result, previousBest, hadHistory) {
    const isRecord = hadHistory && result.wpm > previousBest;
    if (!hadHistory) {
      return { record: false, text: 'First test saved. This is your baseline, so every future test has something to beat. Aim for accuracy above 95% before chasing speed.' };
    }
    if (isRecord) return { record: true, text: 'Excellent: you set a new personal record. Keep your accuracy steady as your speed climbs.' };
    if (result.accuracy < 85) return { record: false, text: 'Focus on accuracy and proper finger placement. Slow down a little until mistakes fall below 5%; speed comes back quickly afterwards.' };
    if (result.wpm < 25) return { record: false, text: 'Good start. Keep your eyes on the text, use every finger, and practice a little each day. The Learn section has drills for each row.' };
    if (result.wpm < 45) return { record: false, text: 'You are improving. Continue practicing regularly and try to keep accuracy above 95% as you speed up.' };
    return { record: false, text: 'Strong typing. To keep growing, maintain your accuracy while nudging your speed up a few WPM at a time.' };
  }

  function finishRun(stats) {
    if (runSaved) return; // never save a run twice
    runSaved = true;

    const data = TM.Storage.get();
    const previousBest = TM.Stats.testSummary(data.tests).bestWpm;
    const hadHistory = data.tests.length > 0;

    const result = {
      id: TM.Storage.newId(),
      ts: Date.now(),
      wpm: TM.Stats.round1(stats.wpm),
      cpm: Math.round(stats.cpm),
      accuracy: TM.Stats.round1(stats.accuracy),
      correct: stats.correct,
      incorrect: stats.incorrect,
      attempts: stats.attempts,
      errors: stats.errors,
      seconds: Math.round(stats.elapsed),
      duration: runSelection.duration,
      difficulty: runSelection.difficulty
    };

    // Only keep runs where the user actually typed something.
    if (stats.attempts > 0) {
      data.tests.push(result);
      TM.Storage.addActivity(stats.elapsed);
      TM.Storage.save();
      TM.Achievements.check();
      document.dispatchEvent(new CustomEvent('tm:data-changed'));
    }

    const fb = feedbackFor(result, previousBest, hadHistory);
    showResults(result, previousBest, hadHistory, fb);
    TM.Settings.Sound.done();
  }

  function showResults(r, previousBest, hadHistory, fb) {
    $('res-wpm').textContent = Math.round(r.wpm);
    $('results-heading').textContent = DIFFICULTY_LABEL[r.difficulty] + ' test, ' + minutesLabel(r.duration) + ' · complete';
    $('res-record').hidden = !fb.record;
    const feedback = $('res-feedback');
    feedback.textContent = fb.text;
    feedback.classList.toggle('record', fb.record);

    const grid = $('res-grid');
    grid.textContent = '';
    grid.append(
      statTile('CPM', String(r.cpm)),
      statTile('Accuracy', r.accuracy.toFixed(1) + '%'),
      statTile('Correct characters', String(r.correct)),
      statTile('Incorrect characters', String(r.incorrect)),
      statTile('Total attempted', String(r.attempts), r.errors + ' mistakes made'),
      statTile('Time', TM.Stats.formatClock(r.seconds)),
      statTile('Difficulty', DIFFICULTY_LABEL[r.difficulty]),
      statTile('Duration', minutesLabel(r.duration))
    );

    let compare;
    if (!hadHistory) compare = 'No earlier tests to compare with yet.';
    else if (r.wpm > previousBest) compare = 'That is ' + TM.Stats.round1(r.wpm - previousBest) + ' WPM above your previous best of ' + TM.Stats.round1(previousBest) + '.';
    else if (r.wpm === previousBest) compare = 'You matched your best of ' + TM.Stats.round1(previousBest) + ' WPM.';
    else compare = 'Your best is ' + TM.Stats.round1(previousBest) + ' WPM, so this was ' + TM.Stats.round1(previousBest - r.wpm) + ' WPM below it.';
    $('res-compare').textContent = compare;

    const dialog = $('results-dialog');
    if (!dialog.open) dialog.showModal();
    $('res-again').focus();
    TM.UI.announce('Test complete. ' + Math.round(r.wpm) + ' words per minute at ' + Math.round(r.accuracy) + ' percent accuracy.');
  }

  /* ---------- leaving / cleanup ---------- */
  function leave() {
    if (engine) { engine.destroy(); engine = null; }
  }

  async function exitRun() {
    if (engine && engine.hasStarted() && !engine.isFinished()) {
      engine.pause();
      const sure = await TM.UI.confirm('Leave this test?', 'Your progress in this run will not be saved.', 'Leave test');
      if (!sure) { engine.resume(); return; }
    }
    leave();
    showSetup();
  }

  /* ---------- wiring ---------- */
  function init() {
    $('test-difficulty').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      selection.difficulty = b.dataset.value; syncSetup();
    });
    $('test-duration').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = Number(b.dataset.value);
      if (DURATIONS.includes(d)) { selection.duration = d; syncSetup(); }
    });
    $('test-start').addEventListener('click', startRun);
    $('test-restart').addEventListener('click', startRun);
    $('test-exit').addEventListener('click', exitRun);
    $('test-pause').addEventListener('click', () => {
      if (!engine) return;
      if (engine.getState() === 'paused') engine.resume(); else engine.pause();
    });
    $('test-focus').addEventListener('click', () => engine && engine.activate());
    $('test-overlay').addEventListener('click', () => engine && engine.activate());

    const dialog = $('results-dialog');
    $('res-again').addEventListener('click', () => { dialog.close(); startRun(); });
    $('res-change').addEventListener('click', () => { dialog.close(); leave(); showSetup(); });
    $('res-progress').addEventListener('click', () => { dialog.close(); leave(); location.hash = '#/progress'; });
    $('res-home').addEventListener('click', () => { dialog.close(); leave(); location.hash = '#/dashboard'; });

    document.addEventListener('tm:data-replaced', () => { lastDefaultsKey = ''; });
  }

  function enter() {
    adoptDefaultsIfChanged();
    if (!engine) showSetup();
  }

  window.TM = window.TM || {};
  window.TM.Test = { init, enter, leave, feedbackFor };
})();
