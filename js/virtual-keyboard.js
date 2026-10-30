/* ==========================================================================
   virtual-keyboard.js — on-screen QWERTY keyboard used as a learning aid.
   It highlights the next key (plus the Shift key to hold), flashes keys green
   or red as you type, tints keys by finger, and marks the home row.
   It never takes input itself; the physical keyboard does.
   ========================================================================== */
(function () {
  'use strict';

  const FINGERS = {
    LP: { name: 'left pinky', hand: 'L', color: '#b48cff' },
    LR: { name: 'left ring finger', hand: 'L', color: '#5aa2ff' },
    LM: { name: 'left middle finger', hand: 'L', color: '#2ed3b7' },
    LI: { name: 'left index finger', hand: 'L', color: '#7bd957' },
    T:  { name: 'thumb', hand: 'B', color: '#9aa0b4' },
    RI: { name: 'right index finger', hand: 'R', color: '#ffd24a' },
    RM: { name: 'right middle finger', hand: 'R', color: '#ff9a4d' },
    RR: { name: 'right ring finger', hand: 'R', color: '#ff6f91' },
    RP: { name: 'right pinky', hand: 'R', color: '#e86bd8' }
  };

  const HOME_KEYS = new Set(['a', 's', 'd', 'f', 'j', 'k', 'l', ';']);

  // [base, shifted, finger]  or  { id, label, finger, w }
  const k = (base, shift, finger) => ({ id: base, base, shift, label: base, finger, w: 1 });
  const special = (id, label, finger, w) => ({ id, label, base: null, shift: null, finger, w });

  const LAYOUT = [
    [k('`', '~', 'LP'), k('1', '!', 'LP'), k('2', '@', 'LR'), k('3', '#', 'LM'), k('4', '$', 'LI'), k('5', '%', 'LI'), k('6', '^', 'RI'), k('7', '&', 'RI'), k('8', '*', 'RM'), k('9', '(', 'RR'), k('0', ')', 'RP'), k('-', '_', 'RP'), k('=', '+', 'RP'), special('Backspace', 'Backspace', 'RP', 2)],
    [special('Tab', 'Tab', 'LP', 1.5), k('q', 'Q', 'LP'), k('w', 'W', 'LR'), k('e', 'E', 'LM'), k('r', 'R', 'LI'), k('t', 'T', 'LI'), k('y', 'Y', 'RI'), k('u', 'U', 'RI'), k('i', 'I', 'RM'), k('o', 'O', 'RR'), k('p', 'P', 'RP'), k('[', '{', 'RP'), k(']', '}', 'RP'), k('\\', '|', 'RP')],
    [special('CapsLock', 'Caps', 'LP', 1.8), k('a', 'A', 'LP'), k('s', 'S', 'LR'), k('d', 'D', 'LM'), k('f', 'F', 'LI'), k('g', 'G', 'LI'), k('h', 'H', 'RI'), k('j', 'J', 'RI'), k('k', 'K', 'RM'), k('l', 'L', 'RR'), k(';', ':', 'RP'), k("'", '"', 'RP'), special('Enter', 'Enter', 'RP', 2.2)],
    [special('ShiftLeft', 'Shift', 'LP', 2.3), k('z', 'Z', 'LP'), k('x', 'X', 'LR'), k('c', 'C', 'LM'), k('v', 'V', 'LI'), k('b', 'B', 'LI'), k('n', 'N', 'RI'), k('m', 'M', 'RI'), k(',', '<', 'RM'), k('.', '>', 'RR'), k('/', '?', 'RP'), special('ShiftRight', 'Shift', 'RP', 2.7)],
    [special(' ', 'Space', 'T', 7)]
  ];

  const IS_LETTER = /^[a-z]$/;

  function create(container) {
    const root = document.createElement('div');
    root.className = 'vk';
    root.setAttribute('aria-hidden', 'true');
    root.dataset.hands = 'on';
    root.dataset.fingers = TM.Settings.current().fingerGuide ? 'on' : 'off';

    const byChar = new Map();   // typed character -> { key, shifted }
    const byId = new Map();     // key id -> element
    const flashTimers = new Map();

    for (const row of LAYOUT) {
      const rowEl = document.createElement('div');
      rowEl.className = 'vk-row';
      for (const key of row) {
        const keyEl = document.createElement('div');
        keyEl.className = 'vk-key' + (HOME_KEYS.has(key.id) ? ' home' : '');
        keyEl.style.setProperty('--w', String(key.w));
        keyEl.style.setProperty('--finger', FINGERS[key.finger].color);
        keyEl.dataset.hand = FINGERS[key.finger].hand;
        keyEl.textContent = key.id.length === 1 && key.id !== ' ' ? (IS_LETTER.test(key.id) ? key.id.toUpperCase() : key.base) : key.label;
        rowEl.appendChild(keyEl);
        byId.set(key.id, keyEl);
        if (key.base) {
          byChar.set(key.base, { key, shifted: false });
          if (key.shift !== key.base) byChar.set(key.shift, { key, shifted: true });
        }
      }
      root.appendChild(rowEl);
    }
    byChar.set(' ', { key: LAYOUT[4][0], shifted: false });
    byChar.set('\n', { key: LAYOUT[2][12], shifted: false });
    container.textContent = '';
    container.appendChild(root);

    let highlighted = [];

    function clearNext() { highlighted.forEach((e) => e.classList.remove('next')); highlighted = []; }

    /** The Shift key to hold: opposite hand from the key being pressed. */
    function shiftIdFor(key) {
      return FINGERS[key.finger].hand === 'L' ? 'ShiftRight' : 'ShiftLeft';
    }

    function setNext(ch) {
      clearNext();
      if (ch === null || ch === undefined) return;
      const hit = byChar.get(ch);
      if (!hit) return;
      const keyEl = byId.get(hit.key.id);
      keyEl.classList.add('next');
      highlighted.push(keyEl);
      if (hit.shifted) {
        const shiftEl = byId.get(shiftIdFor(hit.key));
        shiftEl.classList.add('next');
        highlighted.push(shiftEl);
      }
    }

    function flashEl(el, cls) {
      if (!el) return;
      el.classList.remove('hit-ok', 'hit-bad');
      el.classList.add(cls);
      clearTimeout(flashTimers.get(el));
      flashTimers.set(el, setTimeout(() => el.classList.remove(cls), 170));
    }

    /** Flash the key for a typed character green (correct) or red (wrong). */
    function flash(ch, ok) {
      const hit = byChar.get(ch);
      if (!hit) return;
      flashEl(byId.get(hit.key.id), ok ? 'hit-ok' : 'hit-bad');
      if (hit.shifted) flashEl(byId.get(shiftIdFor(hit.key)), ok ? 'hit-ok' : 'hit-bad');
    }

    function flashSpecial(id, ok) { flashEl(byId.get(id), ok ? 'hit-ok' : 'hit-bad'); }

    /** Plain-language finger guidance for a character. */
    function describe(ch) {
      const hit = byChar.get(ch);
      if (!hit) return null;
      const finger = FINGERS[hit.key.finger];
      const name = ch === ' ' ? 'Space' : ch === '\n' ? 'Enter' : ch;
      let text = hit.key.finger === 'T' ? 'Press Space with either thumb.' : 'Press ' + name + ' with your ' + finger.name + '.';
      if (ch === '\n') text = 'Press Enter with your right pinky.';
      if (hit.shifted) {
        const shiftKey = shiftIdFor(hit.key) === 'ShiftLeft' ? 'left' : 'right';
        text = 'Hold ' + shiftKey + ' Shift with your ' + shiftKey + ' pinky, then press ' + name + ' with your ' + finger.name + '.';
      }
      return { text, finger: finger.name, key: name, shifted: hit.shifted };
    }

    // Keyboard events: show held Shift keys and Backspace presses.
    function onKeyDown(e) {
      if (e.key === 'Shift') byId.get(e.location === 2 ? 'ShiftRight' : 'ShiftLeft').classList.add('hit-ok');
      else if (e.key === 'Backspace') flashSpecial('Backspace', true);
      else if (e.key === 'Tab') flashSpecial('Tab', true);
      else if (e.key === 'CapsLock') flashSpecial('CapsLock', true);
    }
    function onKeyUp(e) {
      if (e.key === 'Shift') { byId.get('ShiftLeft').classList.remove('hit-ok'); byId.get('ShiftRight').classList.remove('hit-ok'); }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      flashTimers.forEach((t) => clearTimeout(t));
      flashTimers.clear();
      container.textContent = '';
    }

    return { setNext, flash, flashSpecial, describe, destroy, element: root };
  }

  /** Legend that explains finger colors, home-row dots and highlight colors. */
  function buildLegend(target) {
    target.textContent = '';
    for (const key of ['LP', 'LR', 'LM', 'LI', 'RI', 'RM', 'RR', 'RP']) {
      const f = FINGERS[key];
      const span = document.createElement('span');
      const dot = document.createElement('i');
      dot.style.setProperty('--c', f.color);
      span.append(dot, f.name.replace('left ', 'L ').replace('right ', 'R ').replace(' finger', ''));
      target.appendChild(span);
    }
    const note = document.createElement('span');
    note.textContent = 'Yellow key = press next. Dot = home row.';
    target.appendChild(note);
  }

  window.TM = window.TM || {};
  window.TM.Keyboard = { create, buildLegend, FINGERS, LAYOUT };
})();
