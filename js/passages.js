/* ==========================================================================
   passages.js — original typing texts and generators.

   Continuation rule for tests: a test starts with one passage. Whenever fewer
   than 120 characters remain, the next passage (never the one just used, and
   no repeats until the whole pool has been used) is appended after a space.
   ========================================================================== */
(function () {
  'use strict';

  const QUOTES = [
    'Small steps every day lead to remarkable progress.',
    'Consistency turns practice into progress.',
    'Focus on improvement, not perfection.',
    'Every mistake is an opportunity to learn.',
    'Discipline today creates confidence tomorrow.',
    'Keep practicing. Your future self will thank you.',
    'Slow is smooth, and smooth becomes fast.',
    'Accuracy first. Speed follows on its own.',
    'A calm mind types faster than a rushed one.',
    'Ten focused minutes beat an hour of distraction.',
    'You do not need to be fast today, only better than yesterday.',
    'Patience is a skill, and you are practicing it right now.'
  ];

  const TEST = {
    easy: [
      'The sun comes up and the day begins. We walk to the park and sit by the lake. A small dog runs past us, and we laugh. It is a good day to be outside.',
      'I like to start my day with a warm cup of tea. Then I read a few pages of a book. Small habits make a big change, and I keep them simple.',
      'We made a plan to learn a little each day. Some days are slow, and that is fine. What matters is that we show up and try again.',
      'My friend has a red bike and a blue hat. Every morning she rides down the long road to the market. She buys fresh bread and brings it home.',
      'The rain fell all night, and now the grass is green. Birds sing in the tall trees. I open the window and let the cool air come in.',
      'Good typing is like learning to ride a bike. At first it feels hard, but after a while your hands know what to do. Keep going and stay calm.',
      'It is nice to help others. When you share what you know, you learn it even better. Ask questions, listen well, and be kind to yourself.',
      'We cook dinner together on Friday nights. One of us cuts the food, and the other stirs the pot. The kitchen smells warm, and we all sit down to eat.',
      'A strong habit starts small. Pick one thing, do it each day, and do not skip. Soon it will feel as normal as brushing your teeth.',
      'The train was late, so I sat on a bench and watched the clouds. They moved slowly across the sky. I was in no hurry, and it felt good.'
    ],
    medium: [
      'Learning to type well is not about rushing. It is about building a steady rhythm, one keystroke at a time, until your fingers remember the path without any help from your eyes.',
      'On Monday morning, Priya opened her laptop, stretched her hands, and set a simple goal: no mistakes for one full paragraph. By Friday, she had done it three times, and she was proud.',
      'Every expert was once a beginner. The difference is that they kept going when progress felt slow, trusted the process, and treated each error as information instead of failure.',
      'Good habits are quiet. They do not announce themselves with fireworks; they show up as ordinary, repeated choices, like sitting down to practice even when you would rather scroll through your phone.',
      'When your focus drifts, notice it without judgment and return to the next word. That small act of returning, over and over, is the real skill behind concentration, in typing and in life.',
      'Our teacher, Mr. Alvarez, used to say, "Make it right first, then make it fast." He was correct: speed built on accuracy lasts, while speed built on guessing falls apart under pressure.',
      'Progress rarely moves in a straight line. Some weeks you improve quickly; other weeks you seem stuck. Keep showing up, because the plateau is often where your skills are quietly consolidating.',
      'Before a long session, relax your shoulders, keep your wrists level, and breathe slowly. Comfortable posture protects your hands and helps you stay accurate when the text gets longer.',
      'If a word trips you up, slow down and type it three times correctly. Repetition with care teaches your fingers the pattern, and soon the tricky word becomes just another easy one.',
      'Confidence does not arrive all at once. It grows from small wins: a clean sentence, a faster minute, a lesson completed. Collect those wins, and the bigger goals start to feel reachable.'
    ],
    hard: [
      'Persistence, unlike raw talent, is a discipline that compounds: after 30 days of deliberate practice, your error rate may fall by 40%, and after 90 days, the improvement becomes unmistakable, even to a skeptical observer.',
      'Researchers have observed that distributed practice (e.g., four 15-minute sessions rather than a single 60-minute marathon) produces more durable skill; consequently, a modest, regular routine outperforms sporadic heroics.',
      'The 2nd principle of efficient learning is feedback: without immediate, specific information about errors, even diligent repetition can entrench flawed habits, whereas precise correction accelerates mastery considerably.',
      'Meticulous typists rarely look at the keyboard; their kinesthetic memory, built through thousands of repetitions, maps each character to a precise finger movement, freeing attention for comprehension and composition.',
      'Consider this paradox: the more deliberately you slow down at 85% accuracy, the sooner you will surpass 95%. Haste amplifies mistakes, whereas patience, strangely, is the quickest route to genuine fluency.',
      'Between 9:00 a.m. and 11:30 a.m., many people experience peak alertness; scheduling demanding work, such as a 25-minute typing drill with strict accuracy targets, during that window can yield disproportionate gains.',
      'Resilience is not the absence of failure; it is the capacity to analyze what went wrong, adjust your approach, and re-engage without resentment. Each of the 12 lessons you complete reinforces that capacity.',
      'An ambitious goal, such as 80 words per minute at 98% accuracy, is best approached incrementally: raise your target by 5 WPM, consolidate it over several sessions, and only then advance to the next threshold.',
      'Ergonomics matter more than most learners expect: a neutral wrist posture, an elbow angle near 90 degrees, and regular breaks (every 20-30 minutes) reduce fatigue and sustain concentration throughout lengthy sessions.',
      'The ability to concentrate is trainable: eliminate notifications, define one clear objective, and commit to a fixed interval; after a few weeks, sustained attention feels less like a struggle and more like a habit.'
    ]
  };

  const WORDS = {
    common: ('the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us').split(' '),
    home: ['sad', 'dad', 'fad', 'lad', 'ask', 'asks', 'flask', 'salad', 'alfalfa', 'fall', 'all', 'lass', 'jag', 'dash', 'flash', 'slash', 'glass', 'gaga', 'shall', 'half', 'hall', 'shad', 'shag', 'skald', 'jakes', 'flasks', 'khaki', 'galah', 'hash', 'has', 'had', 'gas', 'lag', 'sag', 'dak', 'ska', 'ash', 'add', 'adds', 'dad', 'lass', 'fads', 'gash', 'sash'],
    difficult: ['quiz', 'zephyr', 'jazz', 'puzzle', 'exquisite', 'oxygen', 'vex', 'quick', 'jumpy', 'bizarre', 'whizz', 'fjord', 'zigzag', 'quartz', 'jukebox', 'pixel', 'waxy', 'hazy', 'maze', 'frozen', 'exam', 'box', 'qualify', 'zone', 'dazzle', 'crazy', 'lazy', 'extra', 'mix', 'wax', 'queen', 'squeeze', 'jovial', 'zealous', 'xylophone', 'complex', 'banjo', 'kayak', 'vivid', 'wizard']
  };

  const SENTENCES = [
    'The quick brown fox jumps over the lazy dog.',
    'Typing is a skill that grows with steady practice.',
    'Please close the window before you leave the room.',
    'Our team finished the project ahead of schedule.',
    'A clear mind and relaxed hands make for fewer errors.',
    'She packed a small bag and walked to the station.',
    'Reading a little every night improves your vocabulary.',
    'The library opens at nine and closes at six.',
    'He carefully measured the flour and added two eggs.',
    'Good questions are the beginning of good answers.',
    'We watched the storm roll in from the hills.',
    'Take a deep breath, set your hands, and begin again.',
    'The museum has a new exhibit about ancient maps.',
    'Practice makes progress, not perfection.',
    'They planted tomatoes, peppers, and basil in the garden.',
    'Every keystroke is a small step toward fluency.'
  ];

  const PARAGRAPHS = [
    'A good practice session is short, focused, and kind to your hands. Sit tall, keep your wrists floating above the keys, and let your eyes stay on the screen. When a mistake happens, do not react; simply correct it and continue with the next word.',
    'Many people believe that fast typists are simply gifted. In reality, they have repeated the same movements thousands of times until the movements became automatic. The path is open to anyone who is willing to practice with patience and attention.',
    'The best time to practice is the time you will actually do it. Some people prefer the quiet of early morning, while others like to type after dinner. Choose a regular slot, protect it, and let the habit carry you through the days when motivation is low.'
  ];

  /* ---- helpers ---- */
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Daily quote: stable for a calendar day, rotating through the list. */
  function quoteOfDay(date = new Date()) {
    const dayNumber = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
    return QUOTES[dayNumber % QUOTES.length];
  }

  /**
   * Passage feeder for one difficulty. next() returns passages without repeating
   * until the pool is exhausted, and never starts a new cycle with the passage
   * that just ended the previous one. `lastIndexByPool` survives across tests so
   * back-to-back tests do not open with the same passage.
   */
  const lastUsed = {};
  function createFeeder(pool) {
    const poolKey = pool;
    const list = TEST[poolKey];
    let queue = [];
    function refill() {
      queue = shuffle(list.map((_, i) => i));
      if (queue[0] === lastUsed[poolKey] && queue.length > 1) queue.push(queue.shift());
    }
    return {
      next() {
        if (!queue.length) refill();
        const idx = queue.shift();
        lastUsed[poolKey] = idx;
        return list[idx];
      }
    };
  }

  function pickWords(pool, count) {
    const out = [];
    let prev = '';
    while (out.length < count) {
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (w !== prev) { out.push(w); prev = w; }
    }
    return out.join(' ');
  }

  function randomSentences(count) {
    return shuffle(SENTENCES).slice(0, count).join(' ');
  }

  window.TM = window.TM || {};
  window.TM.Passages = {
    QUOTES, TEST, WORDS, SENTENCES, PARAGRAPHS,
    quoteOfDay, createFeeder, pickWords, randomSentences, shuffle,
    randomParagraph: () => PARAGRAPHS[Math.floor(Math.random() * PARAGRAPHS.length)]
  };
})();
