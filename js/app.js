/* ==========================================================================
   app.js — startup and hash routing.
   Routes: #/dashboard  #/learn  #/learn/L3  #/test  #/practice  #/progress  #/settings
   ========================================================================== */
(function () {
  'use strict';

  const VIEWS = {
    dashboard: { title: 'Dashboard', enter: () => TM.Dashboard.render() },
    learn: { title: 'Learn to Type', enter: (param) => TM.Lessons.enter(param), leave: () => TM.Lessons.leave() },
    test: { title: 'Typing Test', enter: () => TM.Test.enter(), leave: () => TM.Test.leave() },
    practice: { title: 'Practice', enter: () => TM.Practice.enter(), leave: () => TM.Practice.leave() },
    progress: { title: 'Progress & Achievements', enter: () => TM.Achievements.renderProgress() },
    settings: { title: 'Settings', enter: () => TM.Settings.syncControls() }
  };

  let currentName = null;

  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const name = VIEWS[parts[0]] ? parts[0] : 'dashboard';
    const param = name === 'learn' && /^L\d{1,2}$/.test(parts[1] || '') ? parts[1] : null;
    return { name, param };
  }

  function route() {
    const { name, param } = parseHash();
    const previous = currentName && VIEWS[currentName];
    if (previous && previous.leave) previous.leave();
    currentName = name;

    document.querySelectorAll('.view').forEach((v) => {
      const active = v.dataset.view === name;
      v.hidden = !active;
      v.classList.toggle('entering', false);
      if (active) { void v.offsetWidth; v.classList.add('entering'); }
    });
    document.querySelectorAll('.nav-link').forEach((a) => {
      if (a.dataset.route === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = VIEWS[name].title + ' · TypeMaster';
    VIEWS[name].enter(param);
    TM.Dashboard.renderProgressChips();
    window.scrollTo(0, 0);

    // Move screen-reader focus to the page heading (not while a lesson player is taking focus)
    if (!param) {
      const heading = document.querySelector('.view[data-view="' + name + '"] h1');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
  }

  function refreshCurrent() {
    TM.Settings.apply();
    TM.Dashboard.renderProgressChips();
    if (currentName === 'dashboard') TM.Dashboard.render();
    else if (currentName === 'progress') TM.Achievements.renderProgress();
    else if (currentName === 'learn' && !parseHash().param) TM.Lessons.enter(null);
    else if (currentName === 'test') { TM.Test.leave(); TM.Test.enter(); }
  }

  function start() {
    TM.Settings.init();
    TM.Test.init();
    TM.Lessons.init();
    TM.Practice.init();
    TM.Dashboard.init();

    document.addEventListener('tm:data-changed', TM.Dashboard.renderProgressChips);
    document.addEventListener('tm:data-replaced', () => { TM.Achievements.check(); refreshCurrent(); });
    window.addEventListener('hashchange', route);

    if (!TM.Storage.isPersistent()) {
      TM.UI.toast('Progress will not be saved', 'This browser is blocking local storage, so data resets when you close the tab.', 'error');
    }
    TM.Achievements.check();
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
