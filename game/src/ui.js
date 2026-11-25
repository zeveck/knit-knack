// ui.js — the screen router, sheets, small DOM helpers and the icon set (inline SVG, so every
// symbol shows on every device).

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
// Big screens (e.g. 1920×1080): the book, cast-on and bag pages scale up to use the room (CSS zoom on
// .page); canvases on them render at this extra scale so they stay sharp.
export const pageZoom = () => (innerWidth >= 1500 ? Math.max(1, Math.min(1.45, innerWidth / 1300, innerHeight / 820)) : 1);
const applyZoom = () => document.documentElement.style.setProperty('--pz', String(Math.round(pageZoom() * 100) / 100));
applyZoom(); addEventListener('resize', applyZoom);
export const fmt = (n) => Math.round(n).toLocaleString('en-US');
// The instruction card: a long row first grows to its full height (three lines; two on a landscape
// phone; the card itself is always that tall, so it never jumps), then shrinks (never below `floor`);
// if it still doesn't fit it scrolls, never cut, so the current stitch is always in view.
export function fitStrip(w, land) {
  w.style.fontSize = ''; w.style.webkitLineClamp = ''; w.style.display = ''; w.style.overflowY = ''; w.style.maxHeight = '';
  w.scrollTop = 0;
  const over = () => w.scrollHeight > w.clientHeight + 1 || w.scrollWidth > w.clientWidth + 1;
  const lines = land ? 2 : 3;
  if (over()) w.style.webkitLineClamp = String(lines);
  let px = parseFloat(getComputedStyle(w).fontSize);
  const floor = land ? 19 : 18;
  while (over() && px > floor) { px -= 1; w.style.fontSize = `${px}px`; }
  if (over()) {
    const lh = parseFloat(getComputedStyle(w).lineHeight) || px * 1.1;
    w.style.webkitLineClamp = 'unset'; w.style.display = 'block'; w.style.overflowY = 'auto'; w.style.maxHeight = `${Math.floor(lh * lines)}px`;
    const cur = w.querySelector('.cur');
    // scrolled by whole lines, the current stitch's line in view (the second of three, or the first of two)
    if (cur) {
      const off = cur.getBoundingClientRect().top - w.getBoundingClientRect().top + w.scrollTop;
      const line = Math.floor((off + lh * 0.5) / lh);
      w.scrollTop = Math.max(0, (line - (lines > 2 ? 1 : 0)) * lh);
    }
  }
}
// keep words together with no-break spaces, breaking only after commas ("k2 A", "3 times", "to end", "Black wool")
export const nb = (t) => String(t).replace(/([^,]) /g, '$1\u00a0');

const P = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}><path d="${d}"/></svg>`;
export const ICON = {
  menu: P('M4 7h16M4 12h16M4 17h16', 'class="ic stroke"'),
  plus: P('M12 5v14M5 12h14', 'class="ic stroke"'),
  minus: P('M5 12h14', 'class="ic stroke"'),
  close: P('M6 6l12 12M18 6L6 18', 'class="ic stroke"'),
  left: P('M15 5l-7 7 7 7', 'class="ic stroke"'),
  right: P('M9 5l7 7-7 7', 'class="ic stroke"'),
  back: P('M14 6l-6 6 6 6M8 12h12', 'class="ic stroke"'),
  sound: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="fill" d="M4 9h4l5-4v14l-5-4H4z"/><path class="stroke" d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="fill" d="M4 9h4l5-4v14l-5-4H4z"/><path class="stroke" d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
  rip: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="stroke" d="M9 7H5V3"/><path class="stroke" d="M5.5 7.5A8 8 0 1 1 4 13"/></svg>',
  undo: P('M9 7H5V3M5.5 7.5A8 8 0 1 1 4 13', 'class="ic stroke"'),
  help: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="stroke" d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3"/><circle class="fill" cx="12" cy="18" r="1.3"/></svg>',
  book: P('M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5', 'class="ic stroke"'),
  check: P('M5 12.5l4.5 4.5L19 7.5', 'class="ic stroke"'),
  lock: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><rect class="fill" x="5" y="10.5" width="14" height="10" rx="2.5"/><path class="stroke" d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="fill" d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8L3.6 9.6l5.8-.8z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="fill" d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
  doll: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><circle class="fill" cx="12" cy="6" r="3.2"/><path class="fill" d="M8 10.5h8l1.5 6h-3l-.5 5h-4l-.5-5h-3z"/></svg>',
  hand: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="stroke" d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 6.5-6 6.5-2.5 0-4-1.2-5.5-3.5L4 13.5a1.5 1.5 0 0 1 2.5-1.6L8 14"/></svg>',
  yarn: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><circle class="stroke" cx="12" cy="12" r="8"/><path class="stroke" d="M5 9c4 0 9 2 13 7M6 15c3-3 8-6 13-6M9 4.8c2 3 3 9 1.5 15"/></svg>',
  basket: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="stroke" d="M3 10h18l-2 9H5zM7 10l3-6M17 10l-3-6M8 14v2M12 14v2M16 14v2"/></svg>',
  bug: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><rect class="stroke" x="7.5" y="8" width="9" height="12" rx="4.5"/><path class="stroke" d="M9 8a3 3 0 0 1 6 0M12 12v6M3.5 13h4M16.5 13h4M5 8.5l2.5 2M19 8.5l-2.5 2M5 19l2.5-2M19 19l-2.5-2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><circle class="stroke" cx="12" cy="12" r="3"/><path class="stroke" d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/></svg>',
  play: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="fill" d="M8 5l11 7-11 7z"/></svg>',
  scarf: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="stroke" d="M7 3h6v13l-3 5H7zM13 8l4 2v9l-4-3"/></svg>',
  frame: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><rect class="stroke" x="4" y="6" width="16" height="14" rx="1.5"/><path class="stroke" d="M9 6l3-3 3 3M7.5 16.5l3.5-4 3 3 2-2 2.5 3"/></svg>',
  bag: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="stroke" d="M5 9h14l-1.2 11H6.2zM9 9V7a3 3 0 0 1 6 0v2"/></svg>',
  info: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><circle class="stroke" cx="12" cy="12" r="8.5"/><path class="stroke" d="M12 11v6"/><circle class="fill" cx="12" cy="7.8" r="1.2"/></svg>',
  room: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path class="stroke" d="M6 11V8.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V11M4.5 11a1.5 1.5 0 0 1 1.5 1.5V15h12v-2.5a1.5 1.5 0 0 1 3 0V18H3v-5.5A1.5 1.5 0 0 1 4.5 11zM5.5 18v2M18.5 18v2"/></svg>',
  moon: P('M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z', 'class="ic stroke"'),
};
export const icon = (name) => { const s = document.createElement('span'); s.className = 'icw'; s.innerHTML = ICON[name] || ''; return s; };

// ---------------------------------------------------------------- the router
const screens = new Map();
let current = null, currentArg = null;
const hooks = { change: [] };
export function registerScreen(name, impl) { screens.set(name, impl); }
export const currentScreen = () => current;
export const currentArgOf = () => currentArg;
export const onScreenChange = (fn) => hooks.change.push(fn);

export function go(name, arg) {
  const next = screens.get(name);
  if (!next) { console.warn('no screen', name); return; }
  const prev = current ? screens.get(current) : null;
  const prevName = current;
  closeSheet(true);
  // open the next before hiding the current, in the same frame (no flash)
  const nextEl = document.querySelector(`[data-screen="${next.el || name}"]`);
  if (prev && prev.leave) prev.leave(name);
  current = name; currentArg = arg;
  if (next.enter) next.enter(arg, prevName);
  // its enter sent us somewhere else (e.g. a locked pattern's Cast On goes back to the book): that won
  if (current !== name || currentArg !== arg) return;
  if (nextEl) {
    nextEl.hidden = false;
    // a scrolling page opens at its top (a hidden element keeps its old scroll offset otherwise)
    if (name !== prevName) { nextEl.scrollTop = 0; nextEl.scrollLeft = 0; }
  }
  for (const s of document.querySelectorAll('[data-screen]')) if (s !== nextEl) s.hidden = true;
  hooks.change.forEach((f) => f(name, prevName));
}

// ---------------------------------------------------------------- sheets (pickers, glossary, menu…)
let sheet = null; // {name, el, onClose}
let openedAt = -1e9;
// listeners told when a sheet opens (true) or closes (false): the toasts wait while one is open
const sheetHooks = [];
export const onSheet = (fn) => sheetHooks.push(fn);
export const openSheetName = () => (sheet ? sheet.name : null);
export function openSheet(name, content, { onClose, cls = '', title = '', modal = true } = {}) {
  closeSheet(true);
  const layer = document.getElementById('sheet-layer');
  const card = el('div', { class: `sheet ${cls}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || name });
  if (title) {
    const head = el('div', { class: 'sheet-head' }, el('h2', { text: title }));
    const x = el('button', { class: 'icon-btn sheet-x', 'aria-label': 'Close' }); x.innerHTML = ICON.close;
    x.addEventListener('click', () => closeSheet());
    head.append(x);
    card.append(head);
  }
  card.append(content);
  layer.innerHTML = '';
  layer.append(card);
  layer.hidden = false;
  layer.dataset.modal = modal ? '1' : '0';
  sheet = { name, el: card, onClose };
  openedAt = performance.now();
  requestAnimationFrame(() => card.classList.add('in'));
  sheetHooks.forEach((f) => f(true));
  return card;
}
export function closeSheet(silent) {
  if (!sheet) return false;
  const s = sheet; sheet = null;
  const layer = document.getElementById('sheet-layer');
  layer.hidden = true; layer.innerHTML = '';
  if (s.onClose) s.onClose(silent);
  if (!sheet) sheetHooks.forEach((f) => f(false));
  return true;
}
export function initSheets() {
  const layer = document.getElementById('sheet-layer');
  // the click that follows the tap that opened a sheet must not land on what the sheet put under the finger
  layer.addEventListener('click', (e) => { if (performance.now() - openedAt < 450) { e.stopPropagation(); e.preventDefault(); } }, true);
  // a pointerdown outside the sheet closes it and is consumed (no stitch)
  layer.addEventListener('pointerdown', (e) => {
    if (window.gameReport && window.gameReport.isOpen()) return;
    if (sheet && !sheet.el.contains(e.target)) { e.preventDefault(); e.stopPropagation(); closeSheet(); }
  });
}

// ---------------------------------------------------------------- confirm-ish helpers
export function notice(text, ms = 3500) {
  const n = document.getElementById('notice');
  n.textContent = text; n.hidden = false; n.classList.add('show');
  // on the knitting screens it sits at the top of the work, clear of the yarn bar (and under a tip)
  const scr = document.querySelector('.knit-screen:not([hidden])');
  const wa = scr && scr.querySelector('.work-area');
  if (wa && wa.getClientRects().length) {
    const tipEl = wa.querySelector('.tip:not([hidden]):not(.out)');
    const r = wa.getBoundingClientRect();
    n.style.top = `${(tipEl ? tipEl.getBoundingClientRect().bottom : r.top) + 12}px`; n.style.bottom = 'auto';
    n.style.left = `${r.left + r.width / 2}px`; n.style.maxWidth = `${Math.min(r.width - 16, innerWidth * 0.92)}px`;
  } else { n.style.top = ''; n.style.bottom = ''; n.style.left = ''; n.style.maxWidth = ''; }
  clearTimeout(n._t); n._t = setTimeout(() => { n.classList.remove('show'); n.hidden = true; }, ms);
}
