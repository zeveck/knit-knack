// dolls.js — the Doll Shelf (a gallery tab: wooden shelves of dolls in their outfits, locked dolls as
// silhouettes with how to meet them) and the dressing view (the doll large, slot buttons with what's
// worn, a sheet of finished pieces per slot, "Take off", arrows between dolls).
// go('dolls') = the shelf; go('dolls', galleryId) = dressing view with that piece put on;
// go('dolls', {doll}) or go('dress', dollId) = dressing view for a doll.
import { el, ICON, go, registerScreen, openSheet, closeSheet, currentScreen } from './ui.js';
import { setKeyHandler, onTap } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { pieceRender, fitCanvas, cellFor } from './render.js';
import { loadDolls, dressedDoll, composeDoll, outfitOf, dollSilhouette, dollBounds, dollSize, DOLLS, DOLL_NAMES, DOLL_ABOUT, SLOTS, SLOT_NAMES, slotsOf, itemSlot, dollFor } from './worn.js';
import { store as scarfStore } from './scarfStore.js';

let root = null, mode = 'shelf', page = 0, doll = 'pip', fromFinished = null, anim = null, menuFn = () => {};
export const setMenu = (fn) => { menuFn = fn; };
const here = () => ['dolls', 'dress'].includes(currentScreen());
const dpr = () => Math.min(3, window.devicePixelRatio || 1);
const unlocked = (d) => S.isUnlocked(`doll:${d}`);
const ruleOf = (d) => S.ruleById(`doll:${d}`);
// "to meet <name>" never breaks, so a name is never left alone on the last line
function lockText(d) { return lockText0(d).replace(/ (to meet) (\S+)$/, '\u00a0$1\u00a0$2'); }
function lockText0(d) {
  const r = ruleOf(d).rule;
  if (r.firstWearable) return 'Finish your first wearable (a wristwarmer or a headband) to meet Pip';
  if (r.pattern) return `Finish the ${S.findPattern(r.pattern)?.name || r.pattern} to meet ${DOLL_NAMES[d]}`;
  if (r.chapter) return `Finish chapter ${r.chapter} to meet ${DOLL_NAMES[d]}`;
  return `${S.remainingText(r)} to meet ${DOLL_NAMES[d]}`;
}
const perPage = () => (innerWidth >= 900 ? 7 : innerHeight < 500 ? 4 : innerWidth < 600 ? 2 : 3);
// how far a doll (arms out) may span across its own shelf cell: a touch past it, never into the next doll
const SPAN = 1.06;
const visBox = (d, shelf) => { const b = dollBounds(d); return { visH: (b.y1 - b.y0) + (shelf ? 70 : 120), visW: (b.x1 - b.x0) + 40 }; };

function header() {
  const back = el('button', { class: 'icon-btn', 'aria-label': mode === 'dress' ? 'Back to the shelf' : 'Back to the book', title: 'Back' }); back.innerHTML = ICON.back;
  back.addEventListener('click', () => { audio.play('ui'); backOut(); });
  const menu = el('button', { class: 'icon-btn', 'aria-label': 'Menu', title: 'Menu' }); menu.innerHTML = ICON.menu;
  menu.addEventListener('click', () => menuFn());
  const top = el('div', { class: 'gal-top' }, back, el('h2', { text: mode === 'dress' ? `Dressing ${DOLL_NAMES[doll]}` : 'Gallery' }), menu);
  const tabs = el('div', { class: 'gal-tabs' });
  for (const [id, label] of [['wall', 'Wall'], ['basket', `Basket${S.basket().length ? ` (${S.basket().length})` : ''}`], ['dolls', 'Doll Shelf']]) {
    const t = el('button', { class: 'tab' + (id === 'dolls' ? ' on' : ''), text: label });
    t.addEventListener('click', () => { if (id === 'dolls') { if (mode !== 'shelf') { mode = 'shelf'; render(); } return; } audio.play('card'); go('gallery', { tab: id }); });
    tabs.append(t);
  }
  return [top, tabs];
}
function backOut() {
  if (mode === 'dress') {
    if (fromFinished) { const gid = fromFinished; fromFinished = null; go('gallery', { display: gid }); return; }
    mode = 'shelf'; render(); return;
  }
  go('book');
}

// ---------------------------------------------------------------- the shelf
function renderShelf() {
  const n = perPage();
  const pages = Math.ceil(DOLLS.length / n);
  page = Math.max(0, Math.min(page, pages - 1));
  const list = DOLLS.slice(page * n, page * n + n);
  const shelf = el('div', { class: 'doll-shelf' });
  const row = el('div', { class: 'shelf-row' + (pages > 1 ? '' : ' one'), style: { gridTemplateColumns: `repeat(${n}, 1fr)` } });
  for (const d of list) {
    const ok = unlocked(d);
    const cv = el('canvas', { class: 'doll-cv' });
    const cell = el('button', { class: 'doll-cell' + (ok ? '' : ' locked'), 'aria-label': ok ? `${DOLL_NAMES[d]}: dress` : `${DOLL_NAMES[d]} (locked)`, 'data-doll': d },
      el('div', { class: 'doll-stage' }, cv), el('div', { class: 'board' }),
      el('span', { class: 'tag' }, ok ? DOLL_NAMES[d] : '?'),
      ok ? null : el('span', { class: 'lock-note' }, el('span', { class: 'icw', html: ICON.lock }), lockText(d)));
    if (ok) cell.addEventListener('click', () => { audio.play('ui'); doll = d; mode = 'dress'; render(); });
    else cell.addEventListener('click', () => audio.play('ui', { gain: 0.5 }));
    row.append(cell);
  }
  shelf.append(row);
  if (pages > 1) {
    const l = el('button', { class: 'icon-btn wall-arrow l', 'aria-label': 'Previous shelf' }); l.innerHTML = ICON.left;
    const r = el('button', { class: 'icon-btn wall-arrow r', 'aria-label': 'Next shelf' }); r.innerHTML = ICON.right;
    l.disabled = page === 0; r.disabled = page >= pages - 1;
    l.addEventListener('click', () => turn(-1)); r.addEventListener('click', () => turn(1));
    shelf.append(l, r, el('div', { class: 'shelf-dots' }, ...Array.from({ length: pages }, (_, i) => el('i', { class: i === page ? 'on' : '' }))));
    swipe(shelf, (d) => turn(d));
  }
  root.append(shelf);
  requestAnimationFrame(() => drawShelf(row));
}
function turn(d) { const pages = Math.ceil(DOLLS.length / perPage()); const p = page + d; if (p < 0 || p >= pages) return; page = p; audio.play('page'); render(); }
function swipe(elm, fn) {
  let sx = null, sy = 0;
  elm.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  elm.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) fn(dx < 0 ? 1 : -1); });
}
async function drawShelf(row) {
  await loadDolls();
  // when the dolls are limited by their width (phones), the row shrinks to their height so they stand
  // mid-screen on the shelf, not low under a tall empty wall
  const st0 = row.querySelector('.doll-stage');
  if (st0 && !row.style.height) {
    const cw = st0.clientWidth, sh = st0.clientHeight;
    let need = 0;
    for (const cell of row.querySelectorAll('.doll-cell')) { const v = visBox(cell.dataset.doll, true); need = Math.max(need, (cw * SPAN * v.visH) / v.visW); }
    if (cw > 10 && need + 12 < sh) row.style.height = `${Math.round(row.clientHeight - (sh - need - 12))}px`;
  }
  for (const cell of row.querySelectorAll('.doll-cell')) {
    const d = cell.dataset.doll; const cv = cell.querySelector('canvas'); const stage = cell.querySelector('.doll-stage');
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 10 || h < 10) continue;
    paintDoll(cv, d, w, h, { silhouette: !unlocked(d), shelf: true });
  }
}
// draw a doll (cropped to its visible box, standing on the bottom edge) into a canvas of w×h CSS px
function paintDoll(cv, d, w, h, { silhouette = false, anim: an = null, shelf = false } = {}) {
  const r = dpr();
  const wide = shelf ? 1.7 : 1;
  const cellW = w;
  w = Math.round(w * wide);
  cv.width = Math.round(w * r); cv.height = Math.round(h * r);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  if (shelf) cv.style.left = `${-((wide - 1) / 2) * 100 / wide * wide}%`;
  const g = cv.getContext('2d');
  const b = dollBounds(d);
  const [fw, fh] = dollSize(d);
  // purl sits: smaller than the standing dolls on the shelf
  const { visH, visW } = visBox(d, shelf);
  let k = Math.min((h * r) / visH, ((shelf ? cellW * SPAN : w) * r) / visW);
  if (d === 'purl' && shelf) k *= 0.82;
  const c = silhouette ? dollSilhouette(d, k) : an ? composeDoll(d, outfitOf(d), k, { anim: an }) : dressedDoll(d, k);
  const x = (cv.width - fw * k) / 2, y = cv.height - b.y1 * k - 4 * r;
  // contact shadow on the shelf
  g.save(); g.fillStyle = 'rgba(30,12,20,0.35)'; g.filter = 'blur(3px)';
  g.beginPath(); g.ellipse(cv.width / 2, cv.height - 6 * r, (b.x1 - b.x0) * k * 0.36, 7 * r, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.drawImage(c, x, y);
  void fh;
}

// ---------------------------------------------------------------- the dressing view
function renderDress() {
  const wrapEl = el('div', { class: 'dress' });
  const stage = el('div', { class: 'dress-stage' });
  const cv = el('canvas', { class: 'doll-cv' });
  stage.append(cv);
  const unl = DOLLS.filter(unlocked);
  if (unl.length > 1) {
    const i = unl.indexOf(doll);
    const l = el('button', { class: 'icon-btn wall-arrow l', 'aria-label': 'Previous doll' }); l.innerHTML = ICON.left;
    const r = el('button', { class: 'icon-btn wall-arrow r', 'aria-label': 'Next doll' }); r.innerHTML = ICON.right;
    l.addEventListener('click', () => { doll = unl[(i - 1 + unl.length) % unl.length]; audio.play('page'); render(); });
    r.addEventListener('click', () => { doll = unl[(i + 1) % unl.length]; audio.play('page'); render(); });
    stage.append(l, r);
    swipe(stage, (d) => { doll = unl[(i + d + unl.length) % unl.length]; audio.play('page'); render(); });
  }
  stage.append(el('div', { class: 'dress-name' }, el('b', { text: DOLL_NAMES[doll] }), ` · ${DOLL_ABOUT[doll]}`));
  const slots = el('div', { class: 'slot-btns' + (doll === 'purl' ? ' two' : '') });
  const outfit = outfitOf(doll);
  for (const s of slotsOf(doll)) {
    const it = outfit[s];
    const th = el('span', { class: 'th' });
    const b = el('button', { class: 'slot-btn' + (it ? ' worn' : ''), 'aria-label': `${SLOT_NAMES[s]}: ${it ? 'change' : 'empty'}`, 'data-slot': s }, th, el('span', { class: 'nm' }, SLOT_NAMES[s], el('small', { text: it ? itemName(it) : 'empty' })));
    b.addEventListener('click', () => { audio.play('ui'); openSlot(s); });
    slots.append(b);
    if (it) requestAnimationFrame(() => thumbInto(th, it, 44, 40));
  }
  wrapEl.append(stage, slots);
  root.append(wrapEl);
  requestAnimationFrame(() => drawDress());
}
function itemName(it) { if (it === 'scarf') return 'Infinite Scarf'; const g = S.galleryById(it.gid); return g ? g.name : ''; }
function thumbInto(box, it, w, h) {
  if (it === 'scarf') { box.replaceChildren(el('span', { class: 'icw', html: ICON.scarf })); return; }
  const g = S.galleryById(it.gid); const p = g && S.patternById(g.pattern); if (!p) return;
  box.replaceChildren(fitCanvas(pieceRender(g, p, cellFor(p, w, h, 2, 6)), w, h));
}
async function drawDress() {
  await loadDolls();
  const stage = root.querySelector('.dress-stage'); if (!stage) return;
  const cv = stage.querySelector('canvas');
  const w = stage.clientWidth, h = stage.clientHeight - 6;
  if (w < 10 || h < 10) return;
  if (anim) {
    const t0 = anim.t0, slot = anim.slot;
    const step = (t) => {
      if (!here() || mode !== 'dress') { anim = null; return; }
      const p = Math.min(1, (t - t0) / 380);
      paintDoll(cv, doll, w, h, { anim: { slot, p } });
      if (p < 1) requestAnimationFrame(step); else { anim = null; paintDoll(cv, doll, w, h); }
    };
    requestAnimationFrame(step);
  } else paintDoll(cv, doll, w, h);
}

function piecesFor(slot) {
  const s = S.get();
  const list = s.gallery.filter((g) => { const p = S.patternById(g.pattern); return p && p.wear && p.wear.slot === slot; })
    .sort((a, b) => (b.hung - a.hung) || (b.finished - a.finished));
  return list;
}
function openSlot(slot) {
  const outfit = outfitOf(doll);
  const cur = outfit[slot];
  const box = el('div', { class: 'slot-sheet' });
  const grid = el('div', { class: 'slot-grid' });
  const list = piecesFor(slot);
  const add = (label, sub, thumb, worn, fn) => {
    const pv = el('div', { class: 'pv' });
    const b = el('button', { class: 'slot-piece' + (worn ? ' on' : '') }, pv, el('span', { class: 'nm', text: label }), sub ? el('small', { text: sub }) : null);
    if (worn) b.append(el('span', { class: 'tick icw', html: ICON.check }));
    b.addEventListener('click', fn);
    grid.append(b);
  };
  for (const g of list) {
    const p = S.patternById(g.pattern);
    add(g.name, g.hung ? 'on the wall' : 'in the Basket', null, cur && cur.gid === g.id, () => { closeSheet(); dress(doll, g.id); });
  }
  if (slot === 'neck' && scarfStore.n > 0) add('Infinite Scarf', `${fmtLen(scarfStore.cm())} long`, null, cur === 'scarf', () => { closeSheet(); dress(doll, 'scarf'); });
  // thumbnails
  requestAnimationFrame(() => requestAnimationFrame(() => {
    grid.querySelectorAll('.slot-piece').forEach((b, i) => {
      const pv = b.querySelector('.pv');
      if (i < list.length) { const g = list[i]; const p = S.patternById(g.pattern); pv.replaceChildren(fitCanvas(pieceRender(g, p, cellFor(p, 96, 80, 2, 8)), 96, 80)); }
      else pv.replaceChildren(el('span', { class: 'icw big', html: ICON.scarf }));
    });
  }));
  if (!grid.children.length) box.append(el('p', { class: 'empty-note dark', text: slot === 'neck' ? 'Nothing for the neck yet. Finish a cowl or the Braided Scarf Panel, or knit the Infinite Scarf.' : `Nothing for the ${SLOT_NAMES[slot].toLowerCase()} yet. Finish a wearable from the book and it will be here.` }));
  box.append(grid);
  if (cur) {
    const off = el('button', { class: 'btn', text: 'Take off' });
    off.addEventListener('click', () => { closeSheet(); undress(doll, slot); });
    box.append(el('div', { class: 'slot-acts' }, off));
  }
  openSheet('slot', box, { title: `${DOLL_NAMES[doll]}: ${SLOT_NAMES[slot]}` });
}
const fmtLen = (cm) => (cm >= 100 ? `${(cm / 100).toFixed(cm >= 1000 ? 1 : 2)} m` : `${Math.round(cm)} cm`);

// put a piece on (gallery id or 'scarf'), returns true if it fits
export function dress(d, gid, { quiet = false } = {}) {
  const slot = gid === 'scarf' ? 'neck' : itemSlot({ gid });
  if (!slot || !slotsOf(d).includes(slot)) return false;
  const s = S.get();
  (s.outfits[d] = s.outfits[d] || {})[slot] = gid;
  s.lastDoll = d;
  S.saveSoon();
  if (!quiet) {
    audio.play('dress');
    if (d === 'purl' && s.equipped.purl.includes('bell')) setTimeout(() => audio.play('bell', { gain: 0.6 }), 160);
    if (here() && mode === 'dress' && doll === d) { anim = { slot, t0: performance.now() }; render(); }
  }
  return true;
}
export function undress(d, slot) {
  const o = S.get().outfits[d]; if (!o || !o[slot]) return;
  delete o[slot]; S.saveSoon(); audio.play('card', { gain: 0.7 });
  if (here()) render();
}

function render() {
  if (!root) return;
  root.replaceChildren(...header());
  root.classList.toggle('dressing', mode === 'dress');
  if (mode === 'dress') renderDress(); else renderShelf();
}

function enter(arg, prev) {
  root = document.querySelector('[data-screen="dolls"]');
  root.className = 'screen gallery-screen dolls-screen';
  fromFinished = null;
  if (typeof arg === 'string' && arg.startsWith('g')) {
    // "Put it on a doll": the last-dressed doll that has its slot, else Pip
    const slot = itemSlot({ gid: arg });
    doll = slot ? dollFor(slot) : 'pip';
    if (!S.isUnlocked(`doll:${doll}`)) doll = 'pip';
    mode = 'dress';
    if (prev === 'finished') fromFinished = arg;
    render();
    loadDolls().then(() => dress(doll, arg));
  } else if (arg && (arg.doll || typeof arg === 'string')) {
    doll = arg.doll || arg; mode = 'dress'; render();
  } else { mode = 'shelf'; render(); }
  setKeyHandler((e) => {
    if (e.key === 'Escape') { if (mode === 'dress') backOut(); else menuFn(); return true; }
    if (e.key === 'p' || e.key === 'P') { menuFn(); return true; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const d = e.key === 'ArrowRight' ? 1 : -1;
      if (mode === 'shelf') turn(d); else { const unl = DOLLS.filter(unlocked); const i = unl.indexOf(doll); doll = unl[(i + d + unl.length) % unl.length]; render(); }
      return true;
    }
    if (e.key === 'm' || e.key === 'M') { window.__game && window.__game.toggleMute(); return true; }
    return false;
  });
  audio.music('gallery'); audio.ambience(false);
  toasts.pump();
}
registerScreen('dolls', { enter, leave() { setKeyHandler(null); anim = null; } });
registerScreen('dress', { el: 'dolls', enter: (arg, prev) => enter({ doll: (arg && arg.doll) || arg || S.get().lastDoll || 'pip' }, prev), leave() { setKeyHandler(null); anim = null; } });
window.addEventListener('resize', () => { if (here()) render(); });
export const dollsState = () => ({ mode, doll, page });
void SLOTS; void onTap;
