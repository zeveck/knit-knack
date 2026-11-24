// input.js — pointer and keyboard helpers shared by the screens.
//  - knit taps are pointerdowns (handled by the knitting screen), and stamp `lastKnit`;
//  - yarn-bar buttons, the preview card and toasts act on release (moved < 10 px) and ignore a press
//    that started within 250 ms of a knit tap;
//  - hold buttons repeat after 400 ms at 5 a second;
//  - one document-level capture keydown listener routes keys to the active screen;
//  - buttons are blurred after every pointer click (the focus ring is for keyboard focus only).

import { openSheetName, closeSheet } from './ui.js';

let lastKnit = -1e9;
export const markKnit = () => { lastKnit = performance.now(); };
export const sinceKnit = () => performance.now() - lastKnit;

const reportOpen = () => !!(window.gameReport && window.gameReport.isOpen());

// act on release; `fn(e)`
export function onRelease(el, fn, { guard = true } = {}) {
  let down = null;
  el.addEventListener('pointerdown', (e) => {
    if (reportOpen()) return;
    if (e.button > 0) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, ok: !guard || performance.now() - lastKnit >= 250 };
    e.stopPropagation();
  });
  el.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const d = down; down = null;
    e.stopPropagation();
    if (!d.ok || Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 10) return;
    fn(e);
  });
  el.addEventListener('pointercancel', () => { down = null; });
  // keyboard activation (Tab + Enter/Space on a focused button) still works, except on the knitting
  // screen where Space/Enter are taken by the capture listener before they reach the button
  el.addEventListener('click', (e) => { if (e.detail === 0) fn(e); });
}

// plain button: acts on click (screens other than the knitting surface)
export function onTap(el, fn) {
  el.addEventListener('click', (e) => { if (reportOpen()) return; fn(e); });
}

// press-and-hold: press() at once, then repeat() at 5/s after 400 ms; end() on release
export function onHold(el, { press, repeat, start, end }) {
  let timer = 0, iv = 0, active = null;
  const stop = () => {
    if (active === null) return;
    active = null; clearTimeout(timer); clearInterval(iv); timer = iv = 0;
    end && end();
  };
  el.addEventListener('pointerdown', (e) => {
    if (reportOpen() || e.button > 0) return;
    e.stopPropagation();
    if (active !== null) return;
    active = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch { /* */ }
    press && press();
    timer = setTimeout(() => { start && start(); iv = setInterval(() => repeat && repeat(), 200); }, 400);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, (e) => { if (e.pointerId === active) stop(); });
  el.addEventListener('click', (e) => { if (e.detail === 0) { press && press(); } });
  return stop;
}

// ---------------------------------------------------------------- keys
let keyHandler = null;
export function setKeyHandler(fn) { keyHandler = fn; }
export function initInput() {
  document.addEventListener('keydown', (e) => {
    if (reportOpen()) return;
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && t.type !== 'range';
    if (typing) { if (e.key === 'Escape') t.blur(); return; }
    // Escape closes an open sheet first, on every screen (never also leaving the screen or opening the menu)
    if (e.key === 'Escape' && openSheetName()) { e.preventDefault(); e.stopPropagation(); closeSheet(); return; }
    if (keyHandler && keyHandler(e) === true) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  // blur buttons after a pointer click, so Space/Enter never re-fire them
  document.addEventListener('pointerup', (e) => {
    const b = e.target && e.target.closest && e.target.closest('button, [role=button]');
    if (b) setTimeout(() => b.blur(), 0);
  }, true);
}
