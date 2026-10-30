/* ==========================================================================
   ui.js — small shared UI helpers: toasts, confirm dialog, screen-reader
   announcements, and DOM building shortcuts (no innerHTML with user text).
   ========================================================================== */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /** el('div', { class: 'x', text: 'hi' }, child1, child2) */
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? '' : String(value));
      }
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
    }
    return node;
  }

  function icon(id) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  /* ---- toasts ---- */
  const MAX_TOASTS = 4;
  function toast(title, message, kind = 'info', iconId) {
    const host = document.getElementById('toasts');
    if (!host) return;
    const iconName = iconId || ({ success: 'i-check', error: 'i-x', achievement: 'i-trophy', info: 'i-info' }[kind] || 'i-info');
    const node = el('div', { class: 'toast ' + kind, role: kind === 'error' ? 'alert' : 'status' },
      el('span', { class: 'toast-icon' }, icon(iconName)),
      el('div', null, el('strong', { text: title }), message ? el('span', { text: message }) : null));
    host.appendChild(node);
    while (host.children.length > MAX_TOASTS) host.firstElementChild.remove();
    const life = kind === 'achievement' ? 5200 : 3600;
    setTimeout(() => {
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 260);
    }, life);
  }

  /* ---- confirm dialog (returns a Promise<boolean>) ---- */
  function confirmDialog(title, message, okLabel) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('confirm-dialog');
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      document.getElementById('confirm-ok').textContent = okLabel || 'Confirm';
      const done = () => { dialog.removeEventListener('close', done); resolve(dialog.returnValue === 'ok'); };
      dialog.returnValue = 'cancel';
      dialog.addEventListener('close', done);
      dialog.showModal();
      document.getElementById('confirm-cancel').focus();
    });
  }

  /* ---- live-region announcements for screen readers ---- */
  function announce(message) {
    const region = document.getElementById('announcer');
    if (!region) return;
    region.textContent = '';
    setTimeout(() => { region.textContent = message; }, 50);
  }

  function setBar(barEl, percent) {
    const p = Math.max(0, Math.min(100, percent));
    barEl.firstElementChild.style.width = p + '%';
    barEl.setAttribute('aria-valuenow', String(Math.round(p)));
  }

  function statTile(label, value, sub) {
    return el('div', { class: 'stat' },
      el('span', { class: 'stat-label', text: label }),
      el('span', { class: 'stat-value' }, value),
      sub ? el('span', { class: 'stat-sub', text: sub }) : null);
  }

  window.TM = window.TM || {};
  window.TM.UI = { el, icon, toast, confirm: confirmDialog, announce, setBar, statTile };
})();
