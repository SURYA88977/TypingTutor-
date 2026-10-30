/* ==========================================================================
   storage.js — versioned, validated LocalStorage persistence.

   Everything lives under one key as a single JSON document:
   {
     version, settings,
     tests:    [{ id, ts, wpm, cpm, accuracy, correct, incorrect, attempts, errors, seconds, duration, difficulty }],
     practice: [{ id, ts, mode, seconds, wpm, accuracy, chars }],
     lessons:  { [lessonId]: { completed, attempts, bestAccuracy, bestWpm, completedAt } },
     achievements: { [achievementId]: unlockTimestamp },
     activity: { "YYYY-MM-DD": secondsTyped }
   }
   Missing, malformed, or outdated data is repaired instead of crashing.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'typemaster.data';
  const SCHEMA_VERSION = 1;
  const MAX_TESTS = 500;
  const MAX_PRACTICE = 500;

  const DEFAULT_SETTINGS = Object.freeze({
    theme: 'dark',
    sound: false,
    reduceMotion: false,
    fontSize: 24,
    caret: 'block',
    highlight: 'full',
    fingerGuide: true,
    difficulty: 'easy',
    duration: 60,
    dailyGoal: 10
  });

  const SETTING_RULES = {
    theme: (v) => v === 'dark' || v === 'light',
    sound: (v) => typeof v === 'boolean',
    reduceMotion: (v) => typeof v === 'boolean',
    fontSize: (v) => [18, 22, 24, 26, 30].includes(v),
    caret: (v) => ['block', 'line', 'underline'].includes(v),
    highlight: (v) => ['full', 'subtle'].includes(v),
    fingerGuide: (v) => typeof v === 'boolean',
    difficulty: (v) => ['easy', 'medium', 'hard'].includes(v),
    duration: (v) => [60, 120, 180, 240, 300].includes(v),
    dailyGoal: (v) => Number.isInteger(v) && v >= 1 && v <= 240
  };

  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isNum = (v, min = 0, max = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

  function emptyData() {
    return {
      version: SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      tests: [],
      practice: [],
      lessons: {},
      achievements: {},
      activity: {}
    };
  }

  /* ---- sanitizers: keep only well-formed records ---- */
  function cleanSettings(raw) {
    const out = { ...DEFAULT_SETTINGS };
    if (!isObject(raw)) return out;
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (key in raw && SETTING_RULES[key](raw[key])) out[key] = raw[key];
    }
    return out;
  }

  function cleanTest(t) {
    if (!isObject(t)) return null;
    if (!isNum(t.ts) || !isNum(t.wpm, 0, 400) || !isNum(t.accuracy, 0, 100)) return null;
    if (!['easy', 'medium', 'hard'].includes(t.difficulty)) return null;
    return {
      id: typeof t.id === 'string' ? t.id.slice(0, 40) : String(t.ts),
      ts: t.ts,
      wpm: t.wpm,
      cpm: isNum(t.cpm, 0, 3000) ? t.cpm : Math.round(t.wpm * 5),
      accuracy: t.accuracy,
      correct: isNum(t.correct) ? Math.floor(t.correct) : 0,
      incorrect: isNum(t.incorrect) ? Math.floor(t.incorrect) : 0,
      attempts: isNum(t.attempts) ? Math.floor(t.attempts) : 0,
      errors: isNum(t.errors) ? Math.floor(t.errors) : 0,
      seconds: isNum(t.seconds, 0, 3600) ? t.seconds : 0,
      duration: [60, 120, 180, 240, 300].includes(t.duration) ? t.duration : 60,
      difficulty: t.difficulty
    };
  }

  function cleanPractice(p) {
    if (!isObject(p)) return null;
    if (!isNum(p.ts) || !isNum(p.seconds, 0, 86400)) return null;
    return {
      id: typeof p.id === 'string' ? p.id.slice(0, 40) : String(p.ts),
      ts: p.ts,
      mode: typeof p.mode === 'string' ? p.mode.slice(0, 20) : 'practice',
      seconds: p.seconds,
      wpm: isNum(p.wpm, 0, 400) ? p.wpm : 0,
      accuracy: isNum(p.accuracy, 0, 100) ? p.accuracy : 0,
      chars: isNum(p.chars) ? Math.floor(p.chars) : 0
    };
  }

  function cleanLessons(raw) {
    const out = {};
    if (!isObject(raw)) return out;
    for (const [id, v] of Object.entries(raw)) {
      if (!/^L\d{1,2}$/.test(id) || !isObject(v)) continue;
      out[id] = {
        completed: v.completed === true,
        attempts: isNum(v.attempts) ? Math.floor(v.attempts) : 0,
        bestAccuracy: isNum(v.bestAccuracy, 0, 100) ? v.bestAccuracy : 0,
        bestWpm: isNum(v.bestWpm, 0, 400) ? v.bestWpm : 0,
        completedAt: isNum(v.completedAt) ? v.completedAt : null
      };
    }
    return out;
  }

  function cleanAchievements(raw) {
    const out = {};
    if (!isObject(raw)) return out;
    for (const [id, ts] of Object.entries(raw)) {
      if (/^[a-z-]{2,30}$/.test(id) && isNum(ts)) out[id] = ts;
    }
    return out;
  }

  function cleanActivity(raw) {
    const out = {};
    if (!isObject(raw)) return out;
    for (const [day, secs] of Object.entries(raw)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && isNum(secs, 0, 86400 * 2)) out[day] = secs;
    }
    return out;
  }

  /** Turn any parsed value (current, older, or garbage) into valid current-schema data. */
  function normalize(raw) {
    const data = emptyData();
    if (!isObject(raw)) return data;
    // Version gate: unknown future versions are still read field-by-field defensively.
    data.settings = cleanSettings(raw.settings);
    data.tests = (Array.isArray(raw.tests) ? raw.tests : []).map(cleanTest).filter(Boolean).slice(-MAX_TESTS);
    data.practice = (Array.isArray(raw.practice) ? raw.practice : []).map(cleanPractice).filter(Boolean).slice(-MAX_PRACTICE);
    data.lessons = cleanLessons(raw.lessons);
    data.achievements = cleanAchievements(raw.achievements);
    data.activity = cleanActivity(raw.activity);
    return data;
  }

  function safeParse(text) {
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  /* ---- store ---- */
  let cache = null;
  let storageWorks = true;
  const listeners = new Set();

  function readFromDisk() {
    try {
      const text = window.localStorage.getItem(STORAGE_KEY);
      return text ? normalize(safeParse(text)) : emptyData();
    } catch (e) {
      storageWorks = false; // private mode or blocked storage: keep working in memory
      return emptyData();
    }
  }

  function get() {
    if (!cache) cache = readFromDisk();
    return cache;
  }

  function save() {
    const data = get();
    data.version = SCHEMA_VERSION;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      storageWorks = false;
    }
    listeners.forEach((fn) => { try { fn(data); } catch (err) { /* a bad listener must not block saving */ } });
  }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function replaceAll(raw) { cache = normalize(raw); save(); }

  /** Reset learning data but keep the user's settings. */
  function resetProgress() {
    const keep = get().settings;
    cache = emptyData();
    cache.settings = keep;
    save();
  }

  /* ---- export / import ---- */
  function exportJSON() {
    return JSON.stringify({ app: 'TypeMaster', exportedAt: new Date().toISOString(), data: get() }, null, 2);
  }

  /** Validate an exported file. Returns { ok, error, data }. */
  function parseImport(text) {
    if (typeof text !== 'string' || text.length > 5 * 1024 * 1024) return { ok: false, error: 'That file is too large to be a TypeMaster export.' };
    const parsed = safeParse(text);
    if (!isObject(parsed)) return { ok: false, error: 'That file is not valid JSON.' };
    if (parsed.app !== 'TypeMaster' || !isObject(parsed.data)) return { ok: false, error: 'This is not a TypeMaster export file.' };
    const d = parsed.data;
    if (!('tests' in d) && !('lessons' in d) && !('settings' in d)) return { ok: false, error: 'The file has no TypeMaster progress in it.' };
    if (d.tests !== undefined && !Array.isArray(d.tests)) return { ok: false, error: 'The test history in this file is damaged.' };
    return { ok: true, data: normalize(d) };
  }

  function importJSON(text) {
    const result = parseImport(text);
    if (!result.ok) return result;
    cache = result.data;
    save();
    return { ok: true };
  }

  /* ---- date helpers shared by streaks / activity ---- */
  function dayKey(ts) {
    const d = new Date(ts);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function addActivity(seconds, ts = Date.now()) {
    if (!isNum(seconds, 0.5)) return;
    const data = get();
    const key = dayKey(ts);
    data.activity[key] = Math.round(((data.activity[key] || 0) + seconds) * 10) / 10;
  }

  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  window.TM = window.TM || {};
  window.TM.Storage = {
    DEFAULT_SETTINGS, get, save, subscribe, replaceAll, resetProgress,
    exportJSON, importJSON, parseImport, normalize,
    dayKey, addActivity, newId,
    isPersistent: () => storageWorks
  };
})();
