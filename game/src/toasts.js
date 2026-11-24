// toasts.js — unlock toasts, one at a time, 4 s each, with "Use it". Each shows exactly once
// (state.takeToast() adds it to seenUnlocks as it shows).
import { el, ICON, go, notice, onSheet, openSheetName, onScreenChange } from './ui.js';
import * as S from './state.js';
import * as audio from './audio.js';
import { onRelease } from './input.js';

let showing = null, held = false, anchorEl = null;
const host = () => document.getElementById('toasts');
const listeners = [];
export const onUse = (fn) => listeners.push(fn);
// hold toasts back (the Finished celebration); release pumps the queue
export function hold(on) { held = !!on; if (!held) pump(); }
// position over an element (the progress line on the knitting screens), or null: below the screen's header
export function anchor(elm) { anchorEl = elm || null; place(); }
const visible = (e) => !!(e && e.isConnected && e.getClientRects().length);
function place() {
  const h = host();
  const scr = document.querySelector('[data-screen]:not([hidden])');
  const how = scr && scr.querySelector('.howlong');
  if (!how && visible(anchorEl)) {
    const r = anchorEl.getBoundingClientRect();
    h.style.setProperty('--tl', r.left + 'px'); h.style.setProperty('--tt', (r.top + r.height / 2 - 22) + 'px'); h.style.setProperty('--tw', r.width + 'px');
    h.classList.add('over');
    return;
  }
  h.classList.remove('over');
  // clear of the header, its Back / Menu buttons and the tabs under it: just below them
  const bars = scr ? [...scr.querySelectorAll(how ? '.how-top' : '.gal-top, .gal-tabs, .topline, .bag-tabs, .topbar')].filter(visible) : [];
  const top = bars.reduce((m, b) => Math.max(m, b.getBoundingClientRect().bottom + 8), 8);
  h.style.setProperty('--tb', top + 'px');
}
addEventListener('resize', () => { if (showing) place(); });
onScreenChange(() => { if (showing) requestAnimationFrame(place); });
// a sheet or modal open: the toast waits (its clock stopped), and the queue too
let paused = false;
onSheet((open) => {
  if (open) {
    paused = true; host().classList.add('wait');
    if (showing) clearTimeout(showing.timer);
  } else {
    // a sheet closing as another opens (openSheet closes the old one first) must not flash a toast
    setTimeout(() => {
      if (openSheetName()) return;
      paused = false; host().classList.remove('wait');
      if (showing) { place(); clearTimeout(showing.timer); showing.timer = setTimeout(close, 3000); } else pump();
    }, 0);
  }
});
const blocked = () => held || paused || !!openSheetName() || !!(window.gameReport && window.gameReport.isOpen && window.gameReport.isOpen());
export function pump() {
  if (showing || blocked()) return;
  place();
  // 3 or more at once: one toast for all of them
  if (S.pendingToasts().length >= 3) {
    const n = S.pendingToasts().length;
    while (S.takeToast()) { /* each joins seenUnlocks */ }
    const look = el('button', { text: 'Look' });
    const t = el('div', { class: 'toast', role: 'status' }, el('span', { class: 'icw', html: ICON.star }), el('span', { class: 't', text: `${n} new things in your Knitting Bag` }), look);
    onRelease(look, () => { audio.play('ui'); close(); go('bag'); });
    t.addEventListener('pointerdown', (e) => e.stopPropagation());
    host().append(t);
    showing = { t, u: { id: `many:${n}` }, timer: setTimeout(close, 4000) };
    audio.play('unlock');
    return;
  }
  const u = S.takeToast();
  if (!u) return;
  const use = el('button', { text: 'Use it' });
  const iconSpan = el('span', { class: 'icw', html: ICON.star });
  const t = el('div', { class: 'toast', role: 'status' }, iconSpan, el('span', { class: 't', text: S.toastTitle(u) }));
  const usable = ['needles', 'marker', 'counter', 'holder', 'decor', 'purl', 'doll'].includes(u.kind);
  if (usable) t.append(use);
  onRelease(use, () => { S.useUnlock(u); audio.play('ui'); listeners.forEach((f) => f(u)); close(); });
  t.addEventListener('pointerdown', (e) => e.stopPropagation());
  host().append(t);
  showing = { t, u, timer: setTimeout(close, 4000) };
  audio.play('unlock');
  // the first unlock: where new things live (once)
  if (usable && !S.get().tips.includes('bag')) { S.get().tips.push('bag'); S.saveSoon(); notice('New things go in your Knitting Bag. Tap "Use it" to try one now.', 5000); }
}
function close() {
  if (!showing) return;
  const { t, timer } = showing; showing = null;
  clearTimeout(timer);
  t.classList.add('out');
  setTimeout(() => { t.remove(); pump(); }, 300);
}
export const queueState = () => ({ showing: showing ? showing.u.id : null, queued: S.pendingToasts().slice(), held });
