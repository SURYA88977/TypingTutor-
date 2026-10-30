/* ==========================================================================
   statistics.js — typing math and aggregate statistics.

   Calculation rules (used everywhere so live and final numbers agree):
     WPM      = (correct characters / 5) / elapsed minutes
     CPM      = correct characters / elapsed minutes
     Accuracy = correct keystroke attempts / total keystroke attempts * 100
   "Correct characters" are characters in the passage that currently match.
   "Attempts" count every printable keystroke, including ones later corrected,
   so fixing a typo with Backspace still lowers accuracy.
   ========================================================================== */
(function () {
  'use strict';

  const WORD_LENGTH = 5; // the standard "word" used for WPM

  const safeDiv = (a, b) => (b > 0 && Number.isFinite(a / b) ? a / b : 0);

  function calcWpm(correctChars, elapsedSeconds) {
    return safeDiv(correctChars / WORD_LENGTH, elapsedSeconds / 60);
  }
  function calcCpm(correctChars, elapsedSeconds) {
    return safeDiv(correctChars, elapsedSeconds / 60);
  }
  /** Accuracy is 100 before the first keystroke so the UI never shows NaN. */
  function calcAccuracy(correctAttempts, totalAttempts) {
    if (totalAttempts <= 0) return 100;
    return Math.min(100, Math.max(0, (correctAttempts / totalAttempts) * 100));
  }

  const round1 = (n) => Math.round(n * 10) / 10;
  const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

  /* ---- aggregates, always derived from saved records ---- */
  function testSummary(tests) {
    const best = tests.reduce((m, t) => Math.max(m, t.wpm), 0);
    return {
      count: tests.length,
      bestWpm: best,
      avgWpm: mean(tests.map((t) => t.wpm)),
      avgAccuracy: mean(tests.map((t) => t.accuracy)),
      bestAccuracy: tests.reduce((m, t) => Math.max(m, t.accuracy), 0)
    };
  }

  function totalActivitySeconds(activity) {
    return Object.values(activity).reduce((a, b) => a + b, 0);
  }

  function addDays(date, n) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
    return d;
  }

  /** Current streak: consecutive active days ending today (or yesterday if today is still empty). */
  function currentStreak(activity, now = new Date()) {
    const has = (d) => (activity[TM.Storage.dayKey(d.getTime())] || 0) > 0;
    let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!has(cursor)) cursor = addDays(cursor, -1);
    let streak = 0;
    while (has(cursor)) { streak += 1; cursor = addDays(cursor, -1); }
    return streak;
  }

  /** Longest run of consecutive active days ever recorded. */
  function longestStreak(activity) {
    const days = Object.keys(activity).filter((k) => activity[k] > 0).sort();
    let best = 0, run = 0, prev = null;
    for (const key of days) {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (prev && TM.Storage.dayKey(addDays(prev, 1).getTime()) === key) run += 1; else run = 1;
      best = Math.max(best, run);
      prev = date;
    }
    return best;
  }

  /** Seconds per day for the last 7 days, oldest first. */
  function lastSevenDays(activity, now = new Date()) {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const date = addDays(now, -i);
      out.push({
        key: TM.Storage.dayKey(date.getTime()),
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        seconds: activity[TM.Storage.dayKey(date.getTime())] || 0,
        isToday: i === 0
      });
    }
    return out;
  }

  function todaySeconds(activity) {
    return activity[TM.Storage.dayKey(Date.now())] || 0;
  }

  function formatDuration(totalSeconds) {
    const s = Math.round(totalSeconds);
    if (s < 60) return s + 's';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
  }

  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.ceil(totalSeconds));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  window.TM = window.TM || {};
  window.TM.Stats = {
    WORD_LENGTH, calcWpm, calcCpm, calcAccuracy, round1, mean,
    testSummary, totalActivitySeconds, currentStreak, longestStreak,
    lastSevenDays, todaySeconds, formatDuration, formatClock, formatDate
  };
})();
