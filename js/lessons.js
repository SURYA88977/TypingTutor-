/* ==========================================================================
   lessons.js — the ten-level touch typing course: lesson content, unlocking,
   the lesson player and the level list.

   Completion rule: every exercise in a lesson must reach the lesson's target
   accuracy (and target WPM when one is set). Passing the last exercise
   completes the lesson and unlocks the next one. Completed lessons can be
   replayed at any time.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { el, icon, setBar, statTile } = TM.UI;
  const P = () => TM.Passages;

  /* ---------- course content ---------- */
  // exercise: { title, text: string | () => string, timed?: seconds, targetWpm?: number }
  const LESSONS = [
    {
      id: 'L1', title: 'Typing Fundamentals',
      description: 'Meet the home row and learn where your fingers rest.',
      objective: 'Rest your fingers on A S D F and J K L ; and press each home-row key without looking down.',
      instructions: [
        'Sit upright with your feet flat and your screen at eye level. Keep elbows near 90 degrees and wrists floating, not resting on the desk.',
        'Place your left fingers on A S D F and your right fingers on J K L ;. Your thumbs hover over the Space bar. Feel the small bumps on F and J.',
        'Press each key with its own finger, then return to the home row. The keyboard below shows the finger for every key.',
        'Look at the screen, not your hands. Accuracy matters more than speed right now.'
      ],
      targetAccuracy: 90, targetWpm: null,
      exercises: [
        { title: 'Home row keys', text: 'asdf jkl; asdf jkl; fjfj dkdk slsl a;a; fdsa ;lkj fdsa ;lkj' },
        { title: 'Finger pairs', text: 'ff jj dd kk ss ll aa ;; fj dk sl a; fj dk sl a; jf kd ls ;a jf kd ls ;a' },
        { title: 'First words', text: 'add ask all fall dad sad lad flask salad alas lass fads a sad lad asks dad' }
      ]
    },
    {
      id: 'L2', title: 'Top Row',
      description: 'Reach up to Q W E R T Y U I O P and combine them with the home row.',
      objective: 'Reach the top row with the correct finger and return to the home row every time.',
      instructions: [
        'Keep your fingers curved. Reach up from the home row, press, and come straight back.',
        'Left hand covers Q W E R T. Right hand covers Y U I O P. Your index fingers also reach one column inward.',
        'Watch the yellow key on the keyboard and match the finger color.'
      ],
      targetAccuracy: 90, targetWpm: null,
      exercises: [
        { title: 'Top row drill', text: 'qq ww ee rr tt yy uu ii oo pp qwert yuiop qwert yuiop qwer tyui op' },
        { title: 'Short words', text: 'the type write your were pipe pure tire tower power quiet poetry output trophy jewel flower wolf yes pass paper sky' },
        { title: 'Word flow', text: 'the pilot rose at eight her father quit the jury our poetry is quite fair she tossed the paper' }
      ]
    },
    {
      id: 'L3', title: 'Bottom Row',
      description: 'Learn Z X C V B N M and put all three letter rows together.',
      objective: 'Type with every letter row and keep your hands anchored to the home row.',
      instructions: [
        'Curl your fingers down and back toward the palm to reach the bottom row.',
        'Left hand covers Z X C V B. Right hand covers N M. Use the index fingers for V B and N M.',
        'Now every letter is in play, so keep your rhythm even instead of rushing.'
      ],
      targetAccuracy: 90, targetWpm: null,
      exercises: [
        { title: 'Bottom row drill', text: 'zz xx cc vv bb nn mm zxcv bnm zxcv bnm zxc vbn m zxcv bnm' },
        { title: 'Mixed rows', text: 'zoom box cave verb numb climb crumb vixen calm zinc cabin vector bench mix next noun mango exam' },
        { title: 'Common words', text: 'come back when you can make some more of them but not too much we can bring the news' }
      ]
    },
    {
      id: 'L4', title: 'Home Row Mastery',
      description: 'Slow, clean repetition to lock in the home row.',
      objective: 'Reach high accuracy using only home-row keys, with relaxed and steady rhythm.',
      instructions: [
        'This level rewards accuracy. Go slower than you want to.',
        'If you miss a key, notice which finger was responsible and press the next one deliberately.',
        'Keep wrists level and shoulders relaxed.'
      ],
      targetAccuracy: 95, targetWpm: null,
      exercises: [
        { title: 'Repeated drills', text: 'asdf jkl; fjdk sla; gh gh fg hj gf jh asdfg hjkl; asdfg hjkl; ghfj dsla' },
        { title: 'Home row words', text: 'had gas gag hag hash half hall glass flask shall dash flash slash alfalfa salad ask has lag sag jag' },
        { title: 'Home row phrases', text: 'dad has a glass; a lass falls flat; shall dad ask half a flask; a sad lad has a salad' }
      ]
    },
    {
      id: 'L5', title: 'Full Alphabet',
      description: 'Mixed alphabet practice with everyday vocabulary and longer lines.',
      objective: 'Type every letter smoothly in real words and full lines.',
      instructions: [
        'Let your eyes read one or two words ahead of your fingers.',
        'Pangrams use every letter, so they are a quick check of your whole alphabet.',
        'Keep rhythm steady between words; the space bar is part of the rhythm.'
      ],
      targetAccuracy: 92, targetWpm: null,
      exercises: [
        { title: 'Pangrams', text: 'the quick brown fox jumps over the lazy dog pack my box with five dozen liquor jugs sphinx of black quartz judge my vow' },
        { title: 'Common vocabulary', text: 'about after again always because before between could every first great house large little might never other place right small sound still think three through under water where which world would write young' },
        { title: 'Longer sentences', text: 'a calm mind types faster than a rushed one so take your time and let each word arrive before you start the next one' }
      ]
    },
    {
      id: 'L6', title: 'Capitalization',
      description: 'Use the Shift key with the opposite hand for capitals and proper nouns.',
      objective: 'Capitalize letters smoothly by holding Shift with the pinky of the opposite hand.',
      instructions: [
        'To capitalize a letter on the left, hold the right Shift with your right pinky. For the right side, use the left Shift.',
        'Press Shift, tap the letter, and release both together. Do not leave Shift down.',
        'The keyboard highlights the Shift key to use.'
      ],
      targetAccuracy: 92, targetWpm: null,
      exercises: [
        { title: 'Shift drills', text: 'Aa Ss Dd Ff Jj Kk Ll Qq Pp Ww Ee Oo Ii Tt Yy Uu A S D F J K L Q W E R T Y U I O P' },
        { title: 'Names and places', text: 'Anna Bob Carl Dana Emma Frank Grace Henry Isla Jack Kara Liam Maya Noah Paris London Tokyo Cairo Lima Oslo Delhi Sydney Toronto' },
        { title: 'Sentence starts', text: 'My name is Sam. I live in Oslo. We visit Paris in June. Maya and Liam walk to Lima Park. Today is Monday.' }
      ]
    },
    {
      id: 'L7', title: 'Numbers and Symbols',
      description: 'Number row, common symbols and punctuation.',
      objective: 'Reach the number row and punctuation keys without losing your place on the home row.',
      instructions: [
        'Use the finger directly above the home-row key: 1 for the left pinky up to 0 for the right pinky.',
        'Symbols above the numbers need Shift, just like capital letters.',
        'Slow down on symbols. Precision first, then speed.'
      ],
      targetAccuracy: 90, targetWpm: null,
      exercises: [
        { title: 'Number row', text: '1234567890 1234567890 0987654321 13579 24680 12 34 56 78 90' },
        { title: 'Math', text: '12 + 34 = 46; 90 - 45 = 45; 6 * 7 = 42; 100 / 4 = 25; (8 + 2) * 5 = 50' },
        { title: 'Symbols', text: '! @ # $ % ^ & * ( ) - _ = + [ ] { } ; : \' " , . < > / ? |' },
        { title: 'Real-world text', text: 'Email sam@example.com about the $25.50 order (15% off) #deal. Call 555-0142 before 6:30 p.m. or visit shop #12 at 4th Street!' }
      ]
    },
    {
      id: 'L8', title: 'Words and Sentences',
      description: 'Frequently used English words, sentences, spaces and punctuation.',
      objective: 'Type everyday English with a steady rhythm and clean punctuation.',
      instructions: [
        'Aim for the same pace on every keystroke. Even rhythm beats bursts of speed.',
        'Type punctuation with the same confidence as letters.',
        'Each retry gives you fresh text.'
      ],
      targetAccuracy: 93, targetWpm: 15,
      exercises: [
        { title: 'Frequent words', text: () => P().pickWords(P().WORDS.common, 24) },
        { title: 'Sentences', text: () => P().randomSentences(3) },
        { title: 'Paragraph rhythm', text: () => P().randomParagraph() }
      ]
    },
    {
      id: 'L9', title: 'Speed Building',
      description: 'Timed drills with rising speed targets.',
      objective: 'Raise your speed gradually while keeping accuracy above the target.',
      instructions: [
        'Each drill is timed and the targets rise: 20, 25, then 30 WPM.',
        'If accuracy drops, ease off a little. A clean 25 beats a messy 35.',
        'Text keeps flowing until time is up.'
      ],
      targetAccuracy: 94, targetWpm: 20,
      exercises: [
        { title: 'Warm-up sprint', timed: 30, targetWpm: 20, text: () => P().pickWords(P().WORDS.common, 40) },
        { title: 'Steady push', timed: 30, targetWpm: 25, text: () => P().pickWords(P().WORDS.common, 40) },
        { title: 'Speed run', timed: 45, targetWpm: 30, text: () => P().randomSentences(4) }
      ]
    },
    {
      id: 'L10', title: 'Advanced Typing',
      description: 'Long passages, difficult vocabulary and a final typing assessment.',
      objective: 'Combine speed, accuracy, punctuation and numbers in long, demanding text.',
      instructions: [
        'Read ahead and keep your eyes moving. Resist the urge to look at the keys.',
        'The final assessment is a 60-second timed run at 30 WPM and 96% accuracy.',
        'Pass it and you have completed the course.'
      ],
      targetAccuracy: 96, targetWpm: 25,
      exercises: [
        { title: 'Long passage', text: () => P().TEST.hard[Math.floor(Math.random() * 5)] },
        { title: 'Numbers and punctuation', text: () => P().TEST.hard[5 + Math.floor(Math.random() * 5)] },
        { title: 'Final assessment', timed: 60, targetWpm: 30, text: () => P().TEST.hard[Math.floor(Math.random() * P().TEST.hard.length)] }
      ]
    }
  ];

  /* ---------- progress helpers ---------- */
  const byId = (id) => LESSONS.find((l) => l.id === id) || null;
  const record = (id) => TM.Storage.get().lessons[id] || { completed: false, attempts: 0, bestAccuracy: 0, bestWpm: 0, completedAt: null };
  const isCompleted = (id) => record(id).completed;
  function isUnlocked(id) {
    const index = LESSONS.findIndex((l) => l.id === id);
    return index === 0 || (index > 0 && isCompleted(LESSONS[index - 1].id));
  }
  const completedCount = () => LESSONS.filter((l) => isCompleted(l.id)).length;
  /** First lesson that is unlocked but not yet completed; null when the course is finished. */
  const nextLesson = () => LESSONS.find((l) => !isCompleted(l.id)) || null;
  const targetWpmFor = (lesson, ex) => (ex.targetWpm !== undefined ? ex.targetWpm : lesson.targetWpm);

  /* ---------- level list ---------- */
  function renderList() {
    const grid = $('level-grid');
    grid.textContent = '';
    const next = nextLesson();
    LESSONS.forEach((lesson, i) => {
      const done = isCompleted(lesson.id);
      const unlocked = isUnlocked(lesson.id);
      const rec = record(lesson.id);
      const isNext = next && next.id === lesson.id;
      const status = done ? el('span', { class: 'pill good' }, icon('i-check'), 'Completed')
        : !unlocked ? el('span', { class: 'pill' }, icon('i-lock'), 'Locked')
        : el('span', { class: 'pill accent', text: isNext ? 'Up next' : 'Unlocked' });
      status.querySelector && status.querySelectorAll('svg').forEach((s) => { s.style.width = '14px'; s.style.height = '14px'; });

      const meta = done
        ? 'Best accuracy ' + Math.round(rec.bestAccuracy) + '%' + (rec.bestWpm ? ', best speed ' + Math.round(rec.bestWpm) + ' WPM' : '')
        : 'Target accuracy ' + lesson.targetAccuracy + '%' + (lesson.targetWpm ? ', ' + lesson.targetWpm + ' WPM' : '') + '. ' + lesson.exercises.length + ' exercises.';

      const card = el('button', {
        type: 'button',
        class: 'level-card' + (done ? ' done' : '') + (isNext ? ' next' : ''),
        disabled: !unlocked,
        'aria-label': 'Level ' + (i + 1) + ': ' + lesson.title + '. ' + (done ? 'Completed.' : unlocked ? 'Unlocked.' : 'Locked. Complete the previous level first.'),
        onclick: () => { location.hash = '#/learn/' + lesson.id; }
      },
        el('div', { class: 'level-top' }, el('span', { class: 'level-num', text: String(i + 1) }), status),
        el('h3', { text: lesson.title }),
        el('p', { text: lesson.description }),
        el('span', { class: 'level-meta', text: meta }));
      grid.appendChild(card);
    });
  }

  /* ---------- lesson player ---------- */
  let current = null;   // { lesson, index, engine, keyboard, passes: [] }

  function teardownPlayer() {
    if (!current) return;
    if (current.engine) current.engine.destroy();
    if (current.keyboard) current.keyboard.destroy();
    current = null;
  }

  function showPlay(show) {
    $('lesson-play').hidden = !show;
    $('lesson-result').hidden = show;
  }

  function openLesson(id) {
    const lesson = byId(id);
    if (!lesson || !isUnlocked(id)) { location.replace('#/learn'); return; }
    teardownPlayer();
    $('learn-list').hidden = true;
    $('learn-lesson').hidden = false;

    $('lesson-title').textContent = 'Level ' + (LESSONS.indexOf(lesson) + 1) + ': ' + lesson.title;
    $('lesson-desc').textContent = lesson.description;
    $('lesson-objective').textContent = lesson.objective;
    const ol = $('lesson-instructions');
    ol.textContent = '';
    lesson.instructions.forEach((t) => ol.appendChild(el('li', { text: t })));

    const meta = $('lesson-meta');
    meta.textContent = '';
    const pills = [
      el('span', { class: 'pill accent', text: 'Target accuracy ' + lesson.targetAccuracy + '%' }),
      lesson.targetWpm ? el('span', { class: 'pill', text: 'Target ' + lesson.targetWpm + ' WPM' }) : null,
      el('span', { class: 'pill', text: lesson.exercises.length + ' exercises' }),
      isCompleted(id) ? el('span', { class: 'pill good', text: 'Completed' }) : el('span', { class: 'pill', text: 'In progress' })
    ].filter(Boolean);
    meta.append(...pills);

    current = { lesson, index: 0, engine: null, keyboard: TM.Keyboard.create($('lesson-keyboard')), passes: [], finished: false };
    TM.Keyboard.buildLegend($('vk-legend'));
    TM.Settings.apply();
    showPlay(true);
    startExercise(0); // focus stays on the typing area so keystrokes land there
  }

  function startExercise(index) {
    const ctx = current;
    if (!ctx) return;
    if (ctx.engine) { ctx.engine.destroy(); ctx.engine = null; }
    ctx.index = index;
    ctx.finished = false;
    const lesson = ctx.lesson;
    const ex = lesson.exercises[index];
    const text = typeof ex.text === 'function' ? ex.text() : ex.text;

    $('lesson-exercise-title').textContent = ex.title;
    $('lesson-exercise-count').textContent = 'Exercise ' + (index + 1) + ' of ' + lesson.exercises.length;
    setBar($('lesson-bar'), (ctx.passes.filter(Boolean).length / lesson.exercises.length) * 100);
    $('lesson-timer-box').hidden = !ex.timed;
    $('lesson-time').textContent = TM.Stats.formatClock(ex.timed || 0);

    ctx.engine = TM.Engine.create({
      passageEl: $('lesson-passage'),
      inputEl: $('lesson-input'),
      stageEl: $('lesson-stage'),
      overlayEl: $('lesson-overlay'),
      duration: ex.timed || 0,
      onProgress: renderLive,
      onNeedMore: ex.timed ? () => P().pickWords(P().WORDS.common, 14) : null,
      onCursor: (ch) => { ctx.keyboard.setNext(ch); renderTip(ch); },
      onKey: (k) => {
        ctx.keyboard.flash(k.typed, k.correct);
        if (k.correct) TM.Settings.Sound.key(); else TM.Settings.Sound.error();
      },
      onOverlay: (state) => {
        $('lesson-overlay-title').textContent = state === 'paused' ? 'Paused' : 'Ready when you are';
        $('lesson-overlay-text').textContent = state === 'paused'
          ? 'Click here or press Esc to continue.'
          : (ex.timed ? 'The timer starts with your first key.' : 'Click here and start typing.');
        $('lesson-focus').textContent = state === 'paused' ? 'Resume' : 'Start typing';
      },
      onFinish: (stats) => finishExercise(stats)
    });
    TM.Settings.apply();
    ctx.engine.reset(text);
    ctx.engine.activate();
  }

  function renderTip(ch) {
    const tip = $('vk-tip');
    const info = current && ch !== null ? current.keyboard.describe(ch) : null;
    tip.textContent = info ? info.text : '';
  }

  function renderLive(s) {
    $('lesson-wpm').textContent = Math.round(s.wpm);
    $('lesson-acc').textContent = Math.round(s.accuracy) + '%';
    $('lesson-errors').textContent = s.errors;
    if (s.remaining !== null) $('lesson-time').textContent = TM.Stats.formatClock(s.remaining);
  }

  function finishExercise(stats) {
    const ctx = current;
    if (!ctx || ctx.finished) return;
    ctx.finished = true;
    if (stats.attempts === 0) { showPlay(true); return; }

    const lesson = ctx.lesson;
    const ex = lesson.exercises[ctx.index];
    const needWpm = targetWpmFor(lesson, ex);
    const accOk = stats.accuracy >= lesson.targetAccuracy;
    const wpmOk = !needWpm || stats.wpm >= needWpm;
    const passed = accOk && wpmOk;

    TM.Storage.addActivity(stats.elapsed);
    const rec = TM.Storage.get().lessons[lesson.id] || (TM.Storage.get().lessons[lesson.id] = { completed: false, attempts: 0, bestAccuracy: 0, bestWpm: 0, completedAt: null });
    rec.attempts += 1;
    TM.Settings.Sound.done();

    if (passed) ctx.passes[ctx.index] = { accuracy: stats.accuracy, wpm: stats.wpm };
    const last = ctx.index === lesson.exercises.length - 1;
    const lessonDone = passed && last && ctx.passes.filter(Boolean).length === lesson.exercises.length;

    let wasFirstCompletion = false;
    if (lessonDone) {
      const avgAcc = TM.Stats.mean(ctx.passes.map((p) => p.accuracy));
      const avgWpm = TM.Stats.mean(ctx.passes.map((p) => p.wpm));
      wasFirstCompletion = !rec.completed;
      rec.completed = true;
      rec.completedAt = rec.completedAt || Date.now();
      rec.bestAccuracy = Math.max(rec.bestAccuracy, TM.Stats.round1(avgAcc));
      rec.bestWpm = Math.max(rec.bestWpm, TM.Stats.round1(avgWpm));
    }
    TM.Storage.save();
    TM.Achievements.check();
    document.dispatchEvent(new CustomEvent('tm:data-changed'));

    if (passed && !last) {
      TM.UI.toast('Exercise complete', Math.round(stats.accuracy) + '% accuracy at ' + Math.round(stats.wpm) + ' WPM.', 'success');
      TM.UI.announce('Exercise complete. Starting the next one.');
      setTimeout(() => { if (current === ctx) startExercise(ctx.index + 1); }, 700);
      return;
    }
    showLessonResult(ctx, stats, { passed, accOk, wpmOk, needWpm, lessonDone, wasFirstCompletion });
  }

  function reqRow(ok, text) {
    return el('li', null, el('span', { class: 'req-mark ' + (ok ? 'pass' : 'fail'), text: ok ? '✓' : '✕', 'aria-hidden': 'true' }), el('span', { text: (ok ? 'Met: ' : 'Not yet: ') + text }));
  }

  function showLessonResult(ctx, stats, r) {
    const lesson = ctx.lesson;
    const box = $('lesson-result');
    box.textContent = '';
    const index = LESSONS.indexOf(lesson);
    const nextL = LESSONS[index + 1] || null;

    const title = r.lessonDone ? (nextL ? 'Level ' + (index + 1) + ' complete' : 'Course complete') : r.passed ? 'Exercise passed' : 'Almost there';
    const body = r.lessonDone
      ? (nextL ? 'Nice work. Level ' + (index + 2) + ' (' + nextL.title + ') is now unlocked.' : 'You finished all ten levels. Keep your skills sharp with timed tests and practice.')
      : 'Retry the exercise and aim for the targets below.';

    box.append(
      el('div', { class: 'lesson-result' },
        el('h3', { text: title }),
        el('p', { text: body, style: 'color:var(--text-soft)' }),
        el('div', { class: 'stat-grid' },
          statTile('Accuracy', Math.round(stats.accuracy) + '%'),
          statTile('Speed', Math.round(stats.wpm), 'WPM'),
          statTile('Mistakes', String(stats.errors))),
        el('ul', { class: 'req-list' },
          reqRow(r.accOk, 'accuracy of ' + lesson.targetAccuracy + '% or more'),
          r.needWpm ? reqRow(r.wpmOk, 'speed of ' + r.needWpm + ' WPM or more') : null),
        el('div', { class: 'btn-row' },
          r.lessonDone && nextL ? el('button', { type: 'button', class: 'btn btn-primary', onclick: () => { location.hash = '#/learn/' + nextL.id; } }, 'Next lesson') : null,
          el('button', { type: 'button', class: r.passed ? 'btn' : 'btn btn-primary', onclick: () => retry(ctx, r.lessonDone) }, icon('i-restart'), r.lessonDone ? 'Retry lesson' : 'Retry exercise'),
          el('button', { type: 'button', class: 'btn', onclick: () => { location.hash = '#/learn'; } }, 'All levels'))));
    showPlay(false);
    TM.UI.announce(title + '. Accuracy ' + Math.round(stats.accuracy) + ' percent, ' + Math.round(stats.wpm) + ' words per minute.');
    box.querySelector('button').focus();
    if (r.lessonDone) { TM.UI.toast(title, nextL ? 'Next level unlocked.' : 'You have finished every level.', 'success'); }
  }

  function retry(ctx, wholeLesson) {
    if (current !== ctx) return;
    if (wholeLesson) ctx.passes = [];
    showPlay(true);
    startExercise(wholeLesson ? 0 : ctx.index);
  }

  function leave() { teardownPlayer(); }

  /** route: '#/learn' or '#/learn/L3' */
  function enter(param) {
    if (param) { openLesson(param); return; }
    teardownPlayer();
    $('learn-lesson').hidden = true;
    $('learn-list').hidden = false;
    renderList();
  }

  function init() {
    $('lesson-back').addEventListener('click', () => { location.hash = '#/learn'; });
    $('lesson-restart-ex').addEventListener('click', () => { if (current) { showPlay(true); startExercise(current.index); } });
    $('lesson-focus').addEventListener('click', () => current && current.engine && current.engine.activate());
    $('lesson-overlay').addEventListener('click', () => current && current.engine && current.engine.activate());
    document.addEventListener('tm:data-replaced', () => { if (!$('learn-list').hidden) renderList(); });
  }

  window.TM = window.TM || {};
  window.TM.Lessons = { LESSONS, init, enter, leave, isCompleted, isUnlocked, completedCount, nextLesson, record, byId };
})();
