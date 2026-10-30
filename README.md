# TypeMaster

Typing tutor and speed test in plain HTML, CSS and JavaScript. No build step, no backend, no login.

## Run it

Open `index.html` in a browser, or serve the folder for a more realistic setup:

    python3 -m http.server 8000     # then visit http://localhost:8000

To deploy, upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).

## Structure

    index.html            page shell, all six views, dialogs
    css/style.css         tokens (dark and light), layout, buttons, forms
    css/components.css    typing stage, keyboard, lessons, charts, toasts
    css/responsive.css    tablet and mobile layouts
    css/animations.css    motion, with reduced-motion support
    js/storage.js         versioned LocalStorage, validation, import/export
    js/statistics.js      WPM, CPM, accuracy, streaks, aggregates
    js/settings.js        settings, theme, sound effects
    js/ui.js              toasts, confirm dialog, DOM helpers
    js/passages.js        original passages, quotes, word lists
    js/typing-engine.js   shared typing session (timer, input, highlighting)
    js/typing-test.js     timed test, results, feedback
    js/virtual-keyboard.js  on-screen keyboard and finger guide
    js/lessons.js         ten-level course and lesson player
    js/practice.js        practice modes
    js/achievements.js    achievements and Progress view
    js/dashboard.js       dashboard cards and canvas charts
    js/app.js             hash router and startup

## Calculations

- WPM = (correct characters / 5) / elapsed minutes
- CPM = correct characters / elapsed minutes
- Accuracy = correct keystrokes / total keystrokes. Corrected typos still count against it.
- Elapsed time is floored at 1 second for WPM so the first keystroke cannot produce a spike.
- Passages continue automatically: when fewer than 120 characters remain, the next passage is appended. No passage repeats until the whole pool has been used.

## Data

Everything is saved in LocalStorage under one key (`typemaster.data`). Use Settings to export a JSON backup, import one, or reset progress.
