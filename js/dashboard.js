/* ==========================================================================
   dashboard.js — the Dashboard view. Every number is computed from saved
   records; nothing here is hard-coded sample data.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el, icon, statTile } = TM.UI;

  const DIFF = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const CHART_POINTS = 20;

  function emptyBlock(message, linkText, href) {
    return el('div', { class: 'empty' }, el('p', null, message), linkText ? el('a', { class: 'btn btn-primary btn-sm', href }, linkText) : null);
  }

  /* ---------- stat cards ---------- */
  function renderStats(data, sum) {
    const grid = $('dash-stats');
    grid.textContent = '';
    const has = sum.count > 0;
    const dash = '–';
    const next = TM.Lessons.nextLesson();
    const level = next ? 'Level ' + (TM.Lessons.LESSONS.indexOf(next) + 1) : 'Complete';
    const streak = TM.Stats.currentStreak(data.activity);
    const num = (n, unit) => el('span', null, String(n), unit ? el('small', { text: unit }) : null);

    grid.append(
      statTile('Tests completed', num(sum.count)),
      statTile('Best speed', has ? num(Math.round(sum.bestWpm), 'WPM') : dash),
      statTile('Average speed', has ? num(Math.round(sum.avgWpm), 'WPM') : dash),
      statTile('Average accuracy', has ? num(Math.round(sum.avgAccuracy), '%') : dash),
      statTile('Practice time', num(TM.Stats.formatDuration(TM.Stats.totalActivitySeconds(data.activity)))),
      statTile('Lessons completed', num(TM.Lessons.completedCount(), 'of ' + TM.Lessons.LESSONS.length)),
      statTile('Learning level', num(level)),
      statTile('Current streak', num(streak, streak === 1 ? 'day' : 'days'))
    );
  }

  /* ---------- recommended lesson, daily goal ---------- */
  function renderRecommendation() {
    const box = $('dash-rec');
    box.textContent = '';
    const next = TM.Lessons.nextLesson();
    if (!next) {
      box.append(el('div', { class: 'rec-lesson' },
        el('h3', { text: 'You finished the course' }),
        el('p', { text: 'Keep your speed growing with a timed test at a higher difficulty.' }),
        el('div', { class: 'btn-row' }, el('a', { class: 'btn btn-primary', href: '#/test' }, 'Take a typing test'))));
      return;
    }
    const n = TM.Lessons.LESSONS.indexOf(next) + 1;
    const started = n > 1 || TM.Lessons.record(next.id).attempts > 0;
    box.append(el('div', { class: 'rec-lesson' },
      el('span', { class: 'pill accent', text: 'Level ' + n }),
      el('h3', { text: next.title }),
      el('p', { text: next.description }),
      el('div', { class: 'btn-row' },
        el('a', { class: 'btn btn-primary', href: '#/learn/' + next.id }, icon('i-play'), started ? 'Continue learning' : 'Start learning'),
        el('a', { class: 'btn', href: '#/learn' }, 'See all levels'))));
  }

  function renderGoal(data) {
    const goalMin = TM.Settings.current().dailyGoal;
    const doneMin = TM.Stats.todaySeconds(data.activity) / 60;
    const pct = Math.min(100, (doneMin / goalMin) * 100);
    const box = $('dash-goal');
    box.textContent = '';
    const ring = el('div', { class: 'goal-ring', role: 'img', 'aria-label': Math.round(pct) + ' percent of today\'s goal' },
      el('div', null, el('strong', { text: Math.floor(doneMin) + '/' + goalMin }), el('span', { text: 'minutes' })));
    ring.style.setProperty('--p', String(pct));
    const message = pct >= 100
      ? 'Goal reached. Anything more is a bonus.'
      : (goalMin - doneMin < 1 ? 'Less than a minute to go.' : Math.ceil(goalMin - doneMin) + ' more minutes to reach today\'s goal.');
    box.append(el('div', { class: 'goal-box' }, ring,
      el('div', null, el('p', null, el('strong', { text: pct >= 100 ? 'Done for today' : 'Keep going' })), el('p', { text: message }),
        el('p', { class: 'card-note', style: 'margin-top:8px' }, 'Change your goal in ', el('a', { href: '#/settings', text: 'Settings' }), '.'))));
  }

  /* ---------- canvas line charts ---------- */
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function drawLineChart(canvas, values, opts) {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 180;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = { l: 36, r: 10, t: 10, b: 20 };
    const w = width - pad.l - pad.r;
    const h = height - pad.t - pad.b;
    let min = Math.min(...values), max = Math.max(...values);
    if (opts.fixedMin !== undefined) min = opts.fixedMin; else min = Math.max(0, Math.floor((min - 5) / 5) * 5);
    if (opts.fixedMax !== undefined) max = opts.fixedMax; else max = Math.ceil((max + 5) / 5) * 5;
    if (max <= min) max = min + 5;

    const x = (i) => pad.l + (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
    const y = (v) => pad.t + h - ((v - min) / (max - min)) * h;

    ctx.font = '11px ' + cssVar('--mono');
    ctx.fillStyle = cssVar('--muted');
    ctx.strokeStyle = cssVar('--line-soft');
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 3; i++) {
      const v = min + ((max - min) * i) / 3;
      const yy = y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(width - pad.r, yy); ctx.stroke();
      ctx.fillText(String(Math.round(v)), pad.l - 6, yy);
    }

    const color = cssVar(opts.colorVar);
    // soft fill under the line
    if (values.length > 1) {
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
      grad.addColorStop(0, color + '33');
      grad.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.moveTo(x(0), y(values[0]));
      values.forEach((v, i) => ctx.lineTo(x(i), y(v)));
      ctx.lineTo(x(values.length - 1), pad.t + h);
      ctx.lineTo(x(0), pad.t + h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.beginPath();
    values.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
    values.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(x(i), y(v), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = cssVar('--surface');
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    });
    ctx.fillStyle = cssVar('--muted');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('older', pad.l, height - 4);
    ctx.textAlign = 'right';
    ctx.fillText('latest', width - pad.r, height - 4);
  }

  function renderCharts(data) {
    const recent = data.tests.slice(-CHART_POINTS);
    const defs = [
      { canvas: 'chart-wpm', empty: 'wpm-empty', note: 'wpm-note', values: recent.map((t) => t.wpm), colorVar: '--accent-strong', unit: ' WPM', opts: {} },
      { canvas: 'chart-acc', empty: 'acc-empty', note: 'acc-note', values: recent.map((t) => t.accuracy), colorVar: '--good', unit: '%', opts: { fixedMin: Math.max(0, Math.floor((Math.min(...recent.map((t) => t.accuracy), 100) - 5) / 5) * 5), fixedMax: 100 } }
    ];
    for (const d of defs) {
      const canvas = $(d.canvas);
      const emptyHost = $(d.empty);
      emptyHost.textContent = '';
      if (!d.values.length) {
        canvas.parentElement.hidden = true;
        $(d.note).textContent = '';
        emptyHost.append(emptyBlock('Your chart appears after your first typing test.', 'Take a test', '#/test'));
        continue;
      }
      canvas.parentElement.hidden = false;
      $(d.note).textContent = 'Last ' + d.values.length + (d.values.length === 1 ? ' test' : ' tests');
      canvas.setAttribute('aria-label', 'Line chart. Latest value ' + Math.round(d.values[d.values.length - 1]) + d.unit + ' across the last ' + d.values.length + ' tests.');
      drawLineChart(canvas, d.values, { colorVar: d.colorVar, ...d.opts });
    }
  }

  /* ---------- weekly activity ---------- */
  function renderWeek(data) {
    const days = TM.Stats.lastSevenDays(data.activity);
    const maxSec = Math.max(60, ...days.map((d) => d.seconds));
    const host = $('dash-week');
    host.textContent = '';
    for (const d of days) {
      const minutes = d.seconds / 60;
      const fill = el('div', { class: 'week-fill' });
      fill.style.height = d.seconds > 0 ? Math.max(6, (d.seconds / maxSec) * 100) + '%' : '0%';
      host.appendChild(el('div', { class: 'week-col' + (d.isToday ? ' today' : ''), role: 'img', 'aria-label': d.label + ': ' + (minutes < 1 && d.seconds > 0 ? 'under a minute' : Math.round(minutes) + ' minutes') },
        el('div', { class: 'week-track' }, fill),
        el('span', { class: 'week-val', text: d.seconds ? (minutes < 1 ? '<1' : String(Math.round(minutes))) : '0' }),
        el('span', { class: 'week-day', text: d.label })));
    }
  }

  /* ---------- history + achievements ---------- */
  function renderHistory(data) {
    const host = $('dash-history');
    host.textContent = '';
    if (!data.tests.length) {
      host.append(emptyBlock('No tests yet. Your results will be listed here.', 'Start your first test', '#/test'));
      return;
    }
    const rows = data.tests.slice(-8).reverse().map((t) => el('tr', null,
      el('td', { text: TM.Stats.formatDate(t.ts) }),
      el('td', { text: DIFF[t.difficulty] }),
      el('td', { text: (t.duration / 60) + ' min' }),
      el('td', { text: String(Math.round(t.wpm)) }),
      el('td', { text: Math.round(t.accuracy) + '%' })));
    host.append(el('div', { class: 'table-scroll' }, el('table', { class: 'history-table' },
      el('thead', null, el('tr', null, ['Date', 'Level', 'Length', 'WPM', 'Accuracy'].map((h) => el('th', { scope: 'col', text: h })))),
      el('tbody', null, rows))));
  }

  function renderAchievements() {
    const host = $('dash-ach');
    host.textContent = '';
    const list = TM.Achievements.recent(4);
    if (!list.length) {
      host.append(emptyBlock('Achievements you unlock will show up here. Finish a test or a lesson to earn your first.', 'Browse achievements', '#/progress'));
      return;
    }
    host.append(el('ul', { class: 'mini-ach' }, list.map((a) => el('li', null,
      el('span', { class: 'ach-badge on' }, icon(a.def.icon)),
      el('span', null, el('strong', { text: a.def.title }), ' ', el('span', { class: 'card-note', text: 'Unlocked ' + TM.Stats.formatDate(a.ts) }))))));
  }

  /* ---------- sidebar / header progress ---------- */
  function renderProgressChips() {
    const done = TM.Lessons.completedCount();
    const total = TM.Lessons.LESSONS.length;
    $('rail-progress-text').textContent = done + ' of ' + total;
    TM.UI.setBar($('rail-progress-bar'), (done / total) * 100);
    $('topbar-progress').textContent = done + '/' + total;
  }

  function greeting(sum) {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return part + '. ' + (sum.count ? 'Here is how your typing is going.' : 'Take your first test or start Level 1 to begin tracking your progress.');
  }

  function render() {
    const data = TM.Storage.get();
    const sum = TM.Stats.testSummary(data.tests);
    $('dash-greeting').textContent = greeting(sum);
    $('hero-quote').textContent = TM.Passages.quoteOfDay();
    renderStats(data, sum);
    renderRecommendation();
    renderGoal(data);
    renderWeek(data);
    renderHistory(data);
    renderAchievements();
    renderCharts(data); // draw last: needs layout to exist
    renderProgressChips();
  }

  function init() {
    $('btn-type-quote').addEventListener('click', () => {
      TM.Practice.typeText(TM.Passages.quoteOfDay());
      location.hash = '#/practice';
    });
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (!$('view-dashboard').hidden) renderCharts(TM.Storage.get()); }, 120);
    });
  }

  window.TM = window.TM || {};
  window.TM.Dashboard = { init, render, renderProgressChips };
})();
