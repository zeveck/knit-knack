// gallery.js — the Gallery Wall (pegs laid out by code, pages, a plaque, Lights out), the Basket tab,
// and the piece close-up (rename, Knit again, Take down / Hang it). Doll Shelf is go('dolls').
import { el, ICON, go, registerScreen, openSheet, closeSheet, fmt, currentScreen } from './ui.js';
import { setKeyHandler } from './input.js';
import { fmtLen } from './scarfFacts.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { objectRender, fitCanvas, cellFor, trimmed } from './render.js';
import { isToy } from './plush.js';

let root, tab = 'wall', page = 0, arriving = null, afterDisplay = false, lightsOut = false;
let menuFn = () => {};
export const setMenu = (fn) => { menuFn = fn; };
// a short landscape phone hangs one row of pieces, big enough to see, rather than two rows of tiny ones
const perPage = () => (innerHeight < 500 && innerWidth > innerHeight ? { c: 5, r: 1 } : innerWidth >= 900 ? { c: 4, r: 3 } : { c: 2, r: 3 });
const wornBy = (gid) => Object.values(S.get().outfits || {}).some((o) => Object.values(o || {}).includes(gid));

function render() {
  root = document.querySelector('[data-screen="gallery"]');
  const s = S.get();
  const back = el('button', { class: 'icon-btn', 'aria-label': 'Back to the book', title: 'Back to the book' }); back.innerHTML = ICON.back;
  back.addEventListener('click', () => go('book'));
  const menu = el('button', { class: 'icon-btn', 'aria-label': 'Menu', title: 'Menu' }); menu.innerHTML = ICON.menu;
  menu.addEventListener('click', () => menuFn());
  const top = el('div', { class: 'gal-top' }, back, el('h2', { text: 'Gallery' }));
  if (S.isUnlocked('yarn:glow')) {
    const lo = el('button', { class: 'icon-btn', 'aria-label': 'Lights out', title: 'Lights out', 'aria-pressed': lightsOut ? 'true' : 'false' }); lo.innerHTML = ICON.moon;
    lo.addEventListener('click', () => { lightsOut = !lightsOut; audio.play('ui'); render(); });
    top.append(lo);
  }
  top.append(menu);
  const tabs = el('div', { class: 'gal-tabs' });
  for (const [id, label] of [['wall', 'Wall'], ['basket', `Basket${S.basket().length ? ` (${S.basket().length})` : ''}`], ['dolls', 'Doll Shelf']]) {
    const t = el('button', { class: 'tab' + (tab === id ? ' on' : ''), text: label });
    t.addEventListener('click', () => { if (id === 'dolls') { go('dolls'); return; } if (tab !== id) { tab = id; page = 0; audio.play('card'); render(); } });
    tabs.append(t);
  }
  root.replaceChildren(top, tabs);
  root.classList.toggle('night', lightsOut);
  if (tab === 'wall') renderWall(); else renderBasket();
  const cm = s.scarf.cm || 0;
  const np = S.wall().length + S.basket().length;
  root.append(el('div', { class: 'plaque', text: `${np} piece${np === 1 ? '' : 's'} · ${fmt(s.gallery.reduce((t, g) => t + g.yarns.length, 0))} stitches · scarf ${fmtLen(cm)}` }));
}

function renderWall() {
  const list = S.wall();
  const { c, r } = perPage();
  const n = c * r;
  const pages = Math.max(1, Math.ceil(list.length / n));
  page = Math.min(page, pages - 1);
  const wall = el('div', { class: 'wall' });
  const grid = el('div', { class: 'pegs', style: { gridTemplateColumns: `repeat(${c}, 1fr)`, gridTemplateRows: `repeat(${r}, 1fr)` } });
  const slice = list.slice(page * n, page * n + n);
  for (let i = 0; i < n; i++) {
    const g = slice[i];
    const peg = el('button', { class: 'peg' + (g ? '' : ' empty'), 'aria-label': g ? `${g.name}: see it up close` : 'An empty peg' });
    peg.append(el('span', { class: 'knob' }), el('span', { class: 'cord' }));
    const hang = el('div', { class: 'hang' });
    peg.append(hang);
    if (g) {
      peg.dataset.gid = g.id;
      const tag = el('span', { class: 'tag' }, g.name);
      if (wornBy(g.id)) tag.prepend(el('span', { class: 'icw', title: 'Worn by a doll', html: ICON.doll }));
      peg.append(tag);
      peg.addEventListener('click', () => detail(g.id));
      if (arriving === g.id) peg.classList.add('arrive');
    } else peg.disabled = true;
    grid.append(peg);
  }
  wall.append(grid);
  if (!list.length) wall.append(el('div', { class: 'empty-note', style: { position: 'absolute', left: '10%', right: '10%', top: '40%' }, text: 'Your wall is waiting. Finish a piece and pick "Display it" to hang it here.' }));
  if (pages > 1) {
    const l = el('button', { class: 'icon-btn wall-arrow l', 'aria-label': 'Previous wall' }); l.innerHTML = ICON.left;
    const rr = el('button', { class: 'icon-btn wall-arrow r', 'aria-label': 'Next wall' }); rr.innerHTML = ICON.right;
    l.disabled = page === 0; rr.disabled = page >= pages - 1;
    l.addEventListener('click', () => { page--; audio.play('page'); render(); });
    rr.addEventListener('click', () => { page++; audio.play('page'); render(); });
    wall.append(l, rr);
    // swipe
    let sx = null;
    wall.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    wall.addEventListener('pointerup', (e) => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 60) { if (d < 0 && page < pages - 1) page++; else if (d > 0 && page > 0) page--; else return; audio.play('page'); render(); } });
  }
  root.append(wall);
  if (afterDisplay) {
    const acts = el('div', { class: 'gal-actions' });
    const another = el('button', { class: 'btn primary', text: 'Knit another' });
    another.addEventListener('click', () => { afterDisplay = false; knitAnother(); });
    const bk = el('button', { class: 'btn', text: 'Back to the book' });
    bk.addEventListener('click', () => { afterDisplay = false; go('book'); });
    acts.append(another, bk);
    root.append(acts);
  }
  // draw the pieces once the pegs have their size
  requestAnimationFrame(() => {
    for (const peg of grid.querySelectorAll('[data-gid]')) {
      const g = S.galleryById(peg.dataset.gid); const p = g && S.patternById(g.pattern);
      if (!p) continue;
      const box = peg.querySelector('.hang');
      const w = box.clientWidth - 6, h = box.clientHeight - 4;
      if (w < 10 || h < 10) continue;
      box.replaceChildren(fitCanvas(trimmed(objectRender(g, p, cellFor(p, w, h, 3, 14))), w, h));
    }
    if (arriving) { setTimeout(() => audio.play('peg'), 700); arriving = null; }
  });
}

function renderBasket() {
  const list = S.basket();
  const box = el('div', { class: 'basket-list' });
  if (!list.length) box.append(el('div', { class: 'empty-note', text: 'The Basket is empty. Pieces you pick "Not now" for, or take down from the wall, wait here.' }));
  for (const g of list) {
    const pv = el('div', { class: 'pv' });
    const b = el('button', { class: 'bpiece', 'aria-label': `${g.name}: see it up close` }, pv, el('span', { class: 'nm' }, wornBy(g.id) ? el('span', { class: 'icw', title: 'Worn by a doll', html: ICON.doll }) : null, g.name));
    b.addEventListener('click', () => detail(g.id));
    pv.dataset.gid = g.id;
    box.append(b);
  }
  root.append(box);
  requestAnimationFrame(() => {
    for (const pv of box.querySelectorAll('[data-gid]')) {
      const g = S.galleryById(pv.dataset.gid); const p = g && S.patternById(g.pattern);
      if (p) pv.replaceChildren(fitCanvas(objectRender(g, p, cellFor(p, 130, 110, 3, 8)), 130, 110));
    }
  });
}

function detail(id) {
  const g = S.galleryById(id); const p = g && S.patternById(g.pattern);
  if (!g || !p) return;
  audio.play('card');
  const big = el('div', { class: 'big' });
  const input = el('input', { type: 'text', value: g.name, maxlength: 40, 'aria-label': 'Name' });
  const save = el('button', { class: 'btn small', text: 'Rename' });
  save.addEventListener('click', () => { g.name = input.value.trim() || p.name; S.saveNow(); audio.play('ui'); render(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save.click(); });
  const acts = el('div', { class: 'acts' });
  const again = el('button', { class: 'btn primary', text: 'Knit again' });
  again.addEventListener('click', () => { closeSheet(); if (S.getPiece(p.id)) go('knit', p.id); else go('caston', p.id); });
  const move = el('button', { class: 'btn', text: g.hung ? 'Take down' : g.shelf ? 'Hang it instead' : 'Hang it' });
  move.addEventListener('click', () => { if (g.hung) { S.takeDown(g.id); audio.play('card'); } else { S.hang(g.id); audio.play('peg'); } closeSheet(); render(); });
  acts.append(again, move);
  if (p.wear) { const d = el('button', { class: 'btn sage', text: 'Put it on a doll' }); d.addEventListener('click', () => { closeSheet(); go('dolls', g.id); }); acts.append(d); }
  if (isToy(p)) { const d = el('button', { class: 'btn sage', text: g.shelf ? 'See it on the shelf' : 'Sit it on the shelf' }); d.addEventListener('click', () => { closeSheet(); S.toShelf(g.id); audio.play('dress'); go('dolls', { shelf: g.id }); }); acts.append(d); }
  const used = new Set(g.yarns.map((y) => y.color + y.type)).size;
  const when = new Date(g.finished).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).replace(/ /g, '\u00a0');
  openSheet('piece', el('div', { class: 'detail' }, big, el('div', { class: 'rename' }, input, save),
    el('div', { class: 'facts', text: `${p.name} · ${fmt(g.yarns.length)} stitches · ${used} yarn${used > 1 ? 's' : ''} · finished ${when}${wornBy(g.id) ? ' · worn by a doll' : ''}` }), acts), { title: g.name });
  requestAnimationFrame(() => { const w = Math.min(big.clientWidth - 20, 520), h = Math.min(innerHeight * 0.45, 460); big.replaceChildren(fitCanvas(objectRender(g, p, cellFor(p, w, h, 4, 24)), w, h)); });
}

function knitAnother() {
  // the newest unlocked pattern not started yet, else the next unfinished one, else the book
  const n = S.patternsUnlocked();
  const s = S.get();
  for (let i = n - 1; i >= 0; i--) { const p = S.BOOK[i]; if (!s.finishedPatterns.includes(p.id)) { go(S.getPiece(p.id) ? 'knit' : 'caston', p.id); return; } }
  go('book');
}

registerScreen('gallery', {
  enter(arg) {
    tab = 'wall';
    if (arg && arg.display) {
      S.hang(arg.display); arriving = arg.display; afterDisplay = true; page = 0;
    } else if (arg && arg.tab) { tab = arg.tab; afterDisplay = false; } else afterDisplay = false;
    render();
    setKeyHandler((e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { menuFn(); return true; }
      if (e.key === 'ArrowRight') { page++; render(); return true; }
      if (e.key === 'ArrowLeft') { page = Math.max(0, page - 1); render(); return true; }
      if (e.key === 'm' || e.key === 'M') { window.__game && window.__game.toggleMute(); return true; }
      return false;
    });
    audio.music('gallery'); audio.ambience(false);
    toasts.pump();
  },
  leave() { setKeyHandler(null); },
});
window.addEventListener('resize', () => { if (currentScreen() === 'gallery') render(); });
