/* ==========================================================================
   achievements.js — achievement definitions, automatic unlocking (each one is
   awarded exactly once), and the Progress view.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el, icon, setBar } = TM.UI;

  // progress(data) returns [current, goal] so locked cards can show how close you are.
  const DEFS = [
    { id: 'first-test', title: 'First Test', desc: 'Complete your first typing test.', icon: 'i-play',
      progress: (d) => [d.tests.length, 1] },
    { id: 'getting-started', title: 'Getting Started', desc: 'Complete three typing tests.', icon: 'i-timer',
      progress: (d) => [d.tests.length, 3] },
    { id: 'consistent-learner', title: 'Consistent Learner', desc: 'Complete seven lessons.', icon: 'i-book',
      progress: (d) => [Object.values(d.lessons).filter((l) => l.completed).length, 7] },
    { id: 'speed-starter', title: 'Speed Starter', desc: 'Reach 20 WPM in a test.', icon: 'i-bolt',
      progress: (d) => [bestWpm(d), 20] },
    { id: 'speed-builder', title: 'Speed Builder', desc: 'Reach 40 WPM in a test.', icon: 'i-bolt',
      progress: (d) => [bestWpm(d), 40] },
    { id: 'speed-master', title: 'Speed Master', desc: 'Reach 60 WPM in a test.', icon: 'i-flame',
      progress: (d) => [bestWpm(d), 60] },
    { id: 'accuracy-expert', title: 'Accuracy Expert', desc: 'Reach 95% accuracy in a test.', icon: 'i-target',
      progress: (d) => [bestAcc(d), 95] },
    { id: 'perfect-focus', title: 'Perfect Focus', desc: 'Finish a test with 100% accuracy.', icon: 'i-star',
      progress: (d) => [d.tests.some((t) => t.accuracy >= 100 && t.attempts >= 20) ? 1 : 0, 1] },
    { id: 'practice-streak', title: 'Practice Streak', desc: 'Practice on three consecutive days.', icon: 'i-flame',
      progress: (d) => [TM.Stats.longestStreak(d.activity), 3] },
    { id: 'dedicated-typist', title: 'Dedicated Typist', desc: 'Complete ten typing tests.', icon: 'i-trophy',
      progress: (d) => [d.tests.length, 10] }
  ];

  function bestWpm(d) { return d.tests.reduce((m, t) => Math.max(m, t.wpm), 0); }
  function bestAcc(d) { return d.tests.reduce((m, t) => Math.max(m, t.accuracy), 0); }

  const byId = (id) => DEFS.find((a) => a.id === id);

  /**
   * Unlock every achievement whose condition is now met and that has not been
   * awarded before. Returns the newly unlocked definitions.
   */
  function check() {
    const data = TM.Storage.get();
    const fresh = [];
    for (const def of DEFS) {
      if (data.achievements[def.id]) continue; // already awarded: never repeat
      const [value, goal] = def.progress(data);
      if (value >= goal) {
        data.achievements[def.id] = Date.now();
        fresh.push(def);
      }
    }
    if (fresh.length) {
      TM.Storage.save();
      fresh.forEach((def, i) => setTimeout(() => {
        TM.UI.toast('Achievement unlocked', def.title + ': ' + def.desc, 'achievement', def.icon);
      }, 450 + i * 500));
      justUnlocked = new Set([...justUnlocked, ...fresh.map((d) => d.id)]);
    }
    return fresh;
  }

  let justUnlocked = new Set();

  /* ---------- Progress view ---------- */
  function renderProgress() {
    const data = TM.Storage.get();
    const sum = TM.Stats.testSummary(data.tests);
    const lessonsDone = TM.Lessons.completedCount();
    const unlockedCount = Object.keys(data.achievements).length;

    const summary = $('progress-summary');
    summary.textContent = '';
    summary.append(
      summaryCard('Achievements', unlockedCount + ' of ' + DEFS.length, (unlockedCount / DEFS.length) * 100),
      summaryCard('Lessons completed', lessonsDone + ' of ' + TM.Lessons.LESSONS.length, (lessonsDone / TM.Lessons.LESSONS.length) * 100),
      summaryCard('Best speed', sum.count ? Math.round(sum.bestWpm) + ' WPM' : 'No tests yet', Math.min(100, (sum.bestWpm / 60) * 100), 'Toward 60 WPM')
    );

    const grid = $('ach-grid');
    grid.textContent = '';
    for (const def of DEFS) {
      const unlockedAt = data.achievements[def.id];
      const [value, goal] = def.progress(data);
      const pct = Math.min(100, (value / goal) * 100);
      const card = el('article', { class: 'ach-card ' + (unlockedAt ? 'unlocked' : 'locked') + (justUnlocked.has(def.id) ? ' just-unlocked' : '') },
        el('span', { class: 'ach-badge' }, icon(unlockedAt ? def.icon : 'i-lock')),
        el('div', null,
          el('h3', { text: def.title }),
          el('p', { text: def.desc }),
          unlockedAt
            ? el('p', { class: 'ach-date', text: 'Unlocked ' + TM.Stats.formatDate(unlockedAt) })
            : el('div', { class: 'ach-bar' },
                el('div', { class: 'bar', role: 'progressbar', 'aria-label': def.title + ' progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)) }, el('i', { style: 'width:' + pct + '%' })),
                el('p', { class: 'ach-date', text: 'Locked. ' + formatProgress(def, value, goal) }))));
      grid.appendChild(card);
    }
    justUnlocked = new Set();
  }

  function formatProgress(def, value, goal) {
    const v = Math.min(value, goal);
    if (def.id.startsWith('speed')) return Math.round(v) + ' of ' + goal + ' WPM';
    if (def.id === 'accuracy-expert') return Math.round(v) + '% of ' + goal + '%';
    if (def.id === 'practice-streak') return v + ' of ' + goal + ' days in a row';
    return Math.floor(v) + ' of ' + goal;
  }

  function summaryCard(label, value, pct, note) {
    return el('div', { class: 'card card-tight' },
      el('p', { class: 'card-note', text: label }),
      el('p', { class: 'stat-value', text: value, style: 'margin:6px 0 12px' }),
      el('div', { class: 'bar' }, el('i', { style: 'width:' + Math.max(0, Math.min(100, pct)) + '%' })),
      note ? el('p', { class: 'stat-sub', text: note, style: 'margin-top:8px' }) : null);
  }

  /** Most recent unlocks, newest first, for the dashboard. */
  function recent(limit) {
    const data = TM.Storage.get();
    return Object.entries(data.achievements)
      .map(([id, ts]) => ({ def: byId(id), ts }))
      .filter((x) => x.def)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);
  }

  window.TM = window.TM || {};
  window.TM.Achievements = { DEFS, check, renderProgress, recent };
})();
