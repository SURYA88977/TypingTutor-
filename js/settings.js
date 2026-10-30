/* ==========================================================================
   settings.js — user settings: apply to the page, bind the Settings view,
   play optional sound effects, export / import / reset.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function current() { return TM.Storage.get().settings; }

  function update(patch) {
    Object.assign(TM.Storage.get().settings, patch);
    TM.Storage.save();
    apply();
  }

  /** Push the saved settings into the DOM so every one has a visible effect. */
  function apply() {
    const s = current();
    const root = document.documentElement;
    root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-reduce-motion', String(s.reduceMotion));
    root.style.setProperty('--type-size', s.fontSize + 'px');

    document.querySelectorAll('.passage').forEach((el) => {
      el.dataset.caret = s.caret;
      el.dataset.highlight = s.highlight;
    });
    const preview = $('settings-preview');
    if (preview) { preview.dataset.caret = s.caret; preview.dataset.highlight = s.highlight; }
    document.querySelectorAll('.vk').forEach((el) => { el.dataset.fingers = s.fingerGuide ? 'on' : 'off'; });

    const dark = s.theme === 'dark';
    const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
    ['theme-toggle', 'theme-toggle-m'].forEach((id) => {
      const btn = $(id);
      if (!btn) return;
      btn.setAttribute('aria-label', label);
      const use = btn.querySelector('use');
      if (use) use.setAttribute('href', dark ? '#i-sun' : '#i-moon');
    });
    const text = $('theme-toggle-label');
    if (text) text.textContent = dark ? 'Light theme' : 'Dark theme';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0f1014' : '#eef0f5');
  }

  function toggleTheme() {
    const root = document.documentElement;
    root.classList.add('theme-fade');
    update({ theme: current().theme === 'dark' ? 'light' : 'dark' });
    syncControls();
    setTimeout(() => root.classList.remove('theme-fade'), 350);
  }

  /* ---- sound: tiny Web Audio blips, created lazily after a user gesture ---- */
  let audioCtx = null;
  function beep(freq, ms, gain) {
    if (!current().sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const amp = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = audioCtx.currentTime;
      amp.gain.setValueAtTime(gain, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(amp).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + ms / 1000 + 0.02);
    } catch (e) { /* audio unavailable: ignore */ }
  }
  const Sound = {
    key: () => beep(520, 45, 0.04),
    error: () => beep(180, 110, 0.07),
    done: () => { beep(660, 140, 0.07); setTimeout(() => beep(880, 220, 0.07), 120); }
  };

  /* ---- Settings view bindings ---- */
  function syncControls() {
    const s = current();
    $('set-theme').checked = s.theme === 'dark';
    $('set-sound').checked = s.sound;
    $('set-motion').checked = s.reduceMotion;
    $('set-fontsize').value = String(s.fontSize);
    $('set-caret').value = s.caret;
    $('set-highlight').value = s.highlight;
    $('set-fingers').checked = s.fingerGuide;
    $('set-difficulty').value = s.difficulty;
    $('set-duration').value = String(s.duration);
    $('set-goal').value = String(s.dailyGoal);
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function init() {
    // font-size select: normalise odd saved sizes (24 from defaults) to nearest option
    if (![18, 22, 26, 30].includes(current().fontSize)) current().fontSize = 22;

    $('set-theme').addEventListener('change', (e) => update({ theme: e.target.checked ? 'dark' : 'light' }));
    $('set-sound').addEventListener('change', (e) => { update({ sound: e.target.checked }); Sound.done(); });
    $('set-motion').addEventListener('change', (e) => update({ reduceMotion: e.target.checked }));
    $('set-fontsize').addEventListener('change', (e) => update({ fontSize: Number(e.target.value) }));
    $('set-caret').addEventListener('change', (e) => update({ caret: e.target.value }));
    $('set-highlight').addEventListener('change', (e) => update({ highlight: e.target.value }));
    $('set-fingers').addEventListener('change', (e) => update({ fingerGuide: e.target.checked }));
    $('set-difficulty').addEventListener('change', (e) => update({ difficulty: e.target.value }));
    $('set-duration').addEventListener('change', (e) => update({ duration: Number(e.target.value) }));
    $('set-goal').addEventListener('change', (e) => {
      const n = Math.round(Number(e.target.value));
      if (Number.isFinite(n) && n >= 1 && n <= 240) update({ dailyGoal: n });
      else { e.target.value = String(current().dailyGoal); TM.UI.toast('Goal not changed', 'Enter a whole number from 1 to 240 minutes.', 'error'); }
    });

    $('theme-toggle').addEventListener('click', toggleTheme);
    $('theme-toggle-m').addEventListener('click', toggleTheme);

    $('btn-export').addEventListener('click', () => {
      download('typemaster-progress-' + TM.Storage.dayKey(Date.now()) + '.json', TM.Storage.exportJSON());
      TM.UI.toast('Progress exported', 'Your backup file is downloading.', 'success');
    });

    $('btn-import').addEventListener('click', () => $('import-file').click());
    $('import-file').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const text = await file.text();
      const check = TM.Storage.parseImport(text);
      if (!check.ok) { TM.UI.toast('Import failed', check.error, 'error'); return; }
      const sure = await TM.UI.confirm('Import this progress?', 'This replaces the progress and settings currently saved in this browser with the contents of ' + file.name + '.', 'Import');
      if (!sure) return;
      TM.Storage.importJSON(text);
      apply(); syncControls();
      document.dispatchEvent(new CustomEvent('tm:data-replaced'));
      TM.UI.toast('Progress imported', 'Your saved progress has been restored.', 'success');
    });

    $('btn-reset').addEventListener('click', async () => {
      const sure = await TM.UI.confirm('Reset all progress?', 'This permanently deletes your test history, lessons, practice time, achievements, and streak. Settings are kept. This cannot be undone.', 'Reset progress');
      if (!sure) return;
      TM.Storage.resetProgress();
      document.dispatchEvent(new CustomEvent('tm:data-replaced'));
      TM.UI.toast('Progress reset', 'You are starting fresh.', 'success');
    });

    apply();
    syncControls();
  }

  window.TM = window.TM || {};
  window.TM.Settings = { init, apply, current, update, syncControls, Sound };
})();
