// book.js — the Pattern Book (cover, front page, chapter tabs, cards, "Read the pattern") and Cast On.
import { el, ICON, go, registerScreen, currentScreen, fmt, notice, openSheet, closeSheet } from './ui.js';
import { drawStack } from './scene.js';
import { setKeyHandler } from './input.js';
import { fmtLen } from './scarfFacts.js';
import { toggleMute } from './knit.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { chartOf, recordChart, suggestedSlots, patternRender, silhouette, fitCanvas, cellFor } from './render.js';
import { openPattern, openPicker } from './sheets.js';
import { paintBallInto, yarnName } from './yarn.js';

let menuFn = () => {};
export const setMenu = (fn) => { menuFn = fn; };
let chapter = 1;
let flipQueue = [];

const book = () => document.querySelector('[data-screen="book"]');
const castonEl = () => document.querySelector('[data-screen="caston"]');

function header(title, onBack) {
  const back = el('button', { class: 'icon-btn', 'aria-label': 'Back', title: 'Back' }); back.innerHTML = ICON.back;
  back.addEventListener('click', onBack);
  const menu = el('button', { class: 'icon-btn', 'aria-label': 'Menu (Esc)', title: 'Menu' }); menu.innerHTML = ICON.menu;
  menu.addEventListener('click', () => menuFn());
  return el('div', { class: 'topline' }, onBack ? back : null, el('h2', { text: title }), menu);
}

// ---------------------------------------------------------------- the book
function renderBook() {
  const s = S.get();
  const root = book();
  const page = el('div', { class: 'page' });
  // cover
  const ribbons = el('div', { class: 'ribbons', 'aria-label': 'Chapter ribbons' });
  S.CHAPTERS.forEach((name, i) => ribbons.append(el('span', { class: 'ribbon' + (S.chapterDone(i + 1) ? ' won' : '') + (s.bookComplete ? ' gold' : ''), title: `${name}${S.chapterDone(i + 1) ? ': ribbon earned' : ''}` })));
  const done = s.finishedPatterns.length;
  const cover = el('div', { class: 'cover' },
    el('h1', { text: s.bookComplete ? 'Pattern Book: complete!' : 'Pattern Book' }),
    el('div', { class: 'sub', text: `${done} of ${S.BOOK.length} patterns knit · ${fmt(s.lifetimeStitches)} stitches so far` }),
    ribbons);
  page.append(header('Knit Knack', null), cover);
  // big buttons
  const btns = el('div', { class: 'front-btns' });
  const last = s.lastPiece && S.getPiece(s.lastPiece) ? S.patternById(s.lastPiece) : null;
  if (last) {
    const p = S.getPiece(last.id);
    const b = el('button', { class: 'btn primary big continue' }, el('span', { class: 'icw', html: ICON.play }), el('span', { class: 'lbl' }, 'Continue', el('span', { class: 'sub', text: `${last.name} · ${Math.round((100 * p.yarns.length) / recordChart(p, last).total)}%` })));
    b.addEventListener('click', () => { audio.play('ui'); go('knit', last.id); });
    btns.append(b);
  }
  const big = (icon, label, sub, fn, badge, cls = '') => {
    const b = el('button', { class: 'btn ' + cls }, el('span', { class: 'icw', html: ICON[icon] }), el('span', { class: 'lbl' }, label, sub ? el('span', { class: 'sub', text: sub }) : null));
    if (badge) b.append(el('span', { class: 'badge', text: 'new' }));
    b.addEventListener('click', () => { audio.play('ui'); fn(); });
    return b;
  };
  const cm = s.scarf.cm || 0;
  btns.append(
    big('scarf', 'Infinite Scarf', cm ? `${fmtLen(cm)} long` : 'It never ends', () => go('scarf'), false, last ? 'wide' : ''),
    big('frame', 'Gallery', `${S.wall().length} on the wall`, () => go('gallery')),
    big('room', 'Cozy Room', 'Your friends', () => go('room')),
    big('bag', 'Knitting Bag', 'Your tools', () => go('bag'), bagHasNew()),
  );
  page.append(btns);
  // chapter tabs
  const tabs = el('div', { class: 'tabs', role: 'tablist' });
  S.CHAPTERS.forEach((name, i) => {
    const t = el('button', { class: 'tab' + (chapter === i + 1 ? ' on' : ''), role: 'tab', 'aria-selected': chapter === i + 1 ? 'true' : 'false' }, el('span', { class: 'n', text: i + 1 }), el('span', { class: 'nm', text: name }));
    t.setAttribute('aria-label', `Chapter ${i + 1}: ${name}`);
    t.addEventListener('click', () => { if (chapter !== i + 1) { chapter = i + 1; audio.play('page'); renderBook(); } });
    tabs.append(t);
  });
  page.append(tabs);
  page.append(el('h2', { class: 'chapter-title', text: `${chapter}. ${S.CHAPTERS[chapter - 1]}` }));
  const cards = el('div', { class: 'cards' });
  const unlockedN = S.patternsEarned();
  const list = S.BOOK.map((p, i) => ({ p, i })).filter((x) => x.p.chapter === chapter);
  for (const { p, i } of list) cards.append(card(p, i, unlockedN));
  if (!list.length) cards.append(el('p', { text: 'No patterns here yet.' }));
  page.append(cards);
  root.replaceChildren(page);
  // the newly unlocked cards flip over, with a chime (earned ones only: "Unlock everything" flips nothing)
  const fresh = [];
  for (let i = 0; i < unlockedN; i++) { const id = S.BOOK[i].id; if (!s.seenPatterns.includes(id)) { s.seenPatterns.push(id); if (s.piecesFinished > 0) fresh.push(id); } }
  if (fresh.length) {
    S.saveSoon();
    const visible = fresh.filter((id) => S.patternById(id).chapter === chapter);
    if (!visible.length && fresh.length) { chapter = S.patternById(fresh[0]).chapter; flipQueue = fresh; return renderBook(); }
    flipQueue = fresh;
  }
  if (flipQueue.length) {
    for (const id of flipQueue) { const c = root.querySelector(`[data-id="${id}"]`); if (c) { c.classList.add('flip'); setTimeout(() => c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300); } }
    flipQueue = [];
    setTimeout(() => audio.play('unlock'), 250);
    if (s.piecesFinished >= 1 && !s.tips.includes('pick')) { s.tips.push('pick'); notice('Pick your next pattern: the new card is open.'); }
  }
  // lazy previews (a few per frame)
  queuePreviews(root);
}
function bagHasNew() {
  const s = S.get();
  return S.UNLOCK_RULES.some((u) => !u.rule.start && ['needles', 'marker', 'counter', 'holder', 'decor', 'purl', 'room'].includes(u.kind) && S.ruleMet(u.rule) && !s.bagSeen.includes(u.id));
}

// a piece's size as its pattern says it: "40 sts around × 10 rnds" for a round piece (no join row, no
// filler columns), "24 sts × 12 rows" for a flat one
function sizeLine(chart) {
  if (!chart.round) return `${chart.width} sts × ${chart.height} rows`;
  let rnds = 0, rws = 0, widest = 0;
  for (let r = 1; r <= chart.height; r++) { const u = chart.rowNo(r).unit; if (u === 'Rnd') rnds++; else if (u === 'Row') rws++; if (chart.row(r).round) widest = Math.max(widest, chart.row(r).ring.length); }
  return `${chart.castOnCols.length || widest} sts around × ${rnds} rnds${rws ? ` and ${rws} rows` : ''}`;
}
function card(p, i, unlockedN) {
  const s = S.get();
  // with "Unlock everything" on nothing is locked; a piece on the needles or a pattern already knit stays open
  const locked = !S.patternUnlocked(p.id);
  const chart = chartOf(p);
  const pv = el('div', { class: 'pv' });
  // (Change 2) a piece on the needles from before its pattern's round edition reads and counts on its own chart
  const pieceChart = (pc) => (pc ? recordChart(pc, p) : chart);
  const c = el('div', { class: 'card' + (locked ? ' locked' : ''), 'data-id': p.id });
  if (locked) {
    pv.dataset.sil = p.id;
    const n = i - unlockedN + 1;
    c.append(pv, el('h3', { text: p.name }), el('div', { class: 'tech', text: p.technique || '' }),
      el('div', { class: 'lock-text' }, el('span', { class: 'icw', html: ICON.lock }), `Finish ${n} more piece${n > 1 ? 's' : ''} to unlock`));
    return c;
  }
  pv.dataset.pv = p.id;
  const piece = S.getPiece(p.id);
  const times = S.get().gallery.filter((g) => g.pattern === p.id).length;
  const meta = el('div', { class: 'meta' }, `${fmt(chart.total)} stitches`, times ? el('span', { class: 'done-tag', text: times > 1 ? `knit ${times}×` : 'knit' }) : null, p.wear ? el('span', { class: 'icw', title: 'Wearable', html: ICON.doll }) : null);
  const read = el('button', { class: 'read', text: 'Read the pattern' });
  read.addEventListener('click', (e) => { e.stopPropagation(); audio.play('card'); openPattern({ chart: pieceChart(piece), pattern: p, slots: piece ? piece.slots : suggestedSlots(p), currentIndex: piece ? piece.yarns.length : null }); });
  const btn = el('button', { class: 'card-open', style: { all: 'unset', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }, 'aria-label': `${p.name}${piece ? ', in progress' : ''}` }, pv, el('h3', { text: p.name }), el('div', { class: 'tech', text: p.blurb || p.technique || '' }), meta);
  btn.addEventListener('click', () => { audio.play('ui'); if (piece) go('knit', p.id); else go('caston', p.id); });
  c.append(btn);
  if (piece) { c.classList.add('started'); c.append(el('div', { class: 'prog' }, el('i', { style: { width: `${(100 * piece.yarns.length) / pieceChart(piece).total}%` } }))); }
  c.append(read);
  void s;
  return c;
}

let pvJob = 0;
function queuePreviews(root) {
  const job = ++pvJob;
  const items = [...root.querySelectorAll('[data-pv], [data-sil]')];
  const step = () => {
    if (job !== pvJob) return;
    const t0 = performance.now();
    while (items.length && performance.now() - t0 < 12) {
      const box = items.shift();
      const id = box.dataset.pv || box.dataset.sil;
      const p = S.patternById(id); if (!p) continue;
      const w = box.clientWidth || 150, h = box.clientHeight || 128;
      if (box.dataset.sil) box.replaceChildren(fitCanvas(silhouette(p, 8), w - 16, h - 16));
      else {
        const piece = S.getPiece(p.id);
        const slots = piece ? piece.slots : suggestedSlots(p);
        box.replaceChildren(fitCanvas(patternRender(p, slots, cellFor(p, w - 12, h - 12, 4, 10, true)), w - 12, h - 12));
      }
    }
    if (items.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Settings' "Unlock everything" switched: the cards open (or lock) at once
window.addEventListener('kk-unlocks', () => { if (currentScreen() === 'book') renderBook(); });
registerScreen('book', {
  enter(arg) {
    if (arg && arg.chapter) chapter = arg.chapter;
    renderBook();
    book().scrollTop = 0;
    setKeyHandler((e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { menuFn(); return true; }
      if (e.key === 'm' || e.key === 'M') { toggleMute(); return true; }
      if (e.key === 'ArrowRight' && chapter < 7) { chapter++; audio.play('page'); renderBook(); return true; }
      if (e.key === 'ArrowLeft' && chapter > 1) { chapter--; audio.play('page'); renderBook(); return true; }
      return false;
    });
    audio.music('nook'); audio.ambience(true);
    if (S.get().bookComplete && !S.get().bookCompleteShown) bookComplete();
    else toasts.pump();
  },
  leave() { setKeyHandler(null); pvJob++; cancelAnimationFrame(bcRaf); },
});

// ---------------------------------------------------------------- "Book complete" (shown once)
let bcRaf = 0;
function bookComplete() {
  const s = S.get();
  s.bookCompleteShown = true; S.saveNow();
  const c = el('canvas', { style: { width: '220px', height: '140px', display: 'block', margin: '0 auto' } });
  const box = el('div', { class: 'book-complete' },
    el('div', { class: 'gold-ribbon' }),
    el('h2', { text: 'Book complete!' }),
    el('p', { text: `You've knit all ${S.BOOK.length} patterns, ${fmt(s.lifetimeStitches)} stitches of them, one tap at a time. The book wears its gold ribbon now.` }),
    c);
  const ok = el('button', { class: 'btn primary big', text: 'Hooray!' });
  ok.addEventListener('click', () => closeSheet());
  box.append(ok);
  openSheet('complete', box, { title: '', onClose: () => { cancelAnimationFrame(bcRaf); toasts.pump(); } });
  audio.play('finish');
  setTimeout(() => { audio.play('mew'); if (s.equipped.purl.includes('bell')) audio.play('bell'); }, 700);
  setTimeout(() => audio.play('purr'), 1600);
  const t0 = performance.now();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = 220 * dpr; c.height = 140 * dpr;
  const g = c.getContext('2d');
  const draw = (t) => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, 220, 140);
    const fi = Math.floor((t - t0 - 500) / 125);
    const frame = fi >= 0 && fi < 8 ? [0, 1, 2, 1, 2, 3, 3, 3][fi] : 'sleep';
    drawStack(g, { x: 24, y: 34, w: 120, h: 102 }, { t, purl: frame, mirror: true, things: s.equipped.purl, holder: s.equipped.holder, yarn: s.recent[0] || { color: '#d9a441', type: 'wool' } });
    bcRaf = requestAnimationFrame(draw);
  };
  bcRaf = requestAnimationFrame(draw);
}

// ---------------------------------------------------------------- Cast On
let co = null;
function renderCastOn(p) {
  const root = castonEl();
  const chart = chartOf(p);
  if (!co || co.id !== p.id) co = { id: p.id, slots: suggestedSlots(p) };
  const page = el('div', { class: 'page' });
  page.append(header('Cast on', () => go('book', { chapter: p.chapter })));
  const pv = el('div', { class: 'caston-pv' });
  const info = el('div', { class: 'caston-info' });
  info.append(el('h2', { text: p.name, style: { color: 'var(--plum)', fontSize: '28px' } }), el('div', { class: 'src', text: p.blurb || p.technique || '' }),
    p.technique ? el('div', { class: 'facts', text: `New here: ${p.technique.charAt(0).toLowerCase()}${p.technique.slice(1)}` }) : null,
    el('div', { class: 'facts', text: `${sizeLine(chart)} · ${fmt(chart.total)} stitches${p.wear ? ' · wearable' : ''}` }));
  const used = [...chart.slotsUsed].sort();
  const names = { A: 'Main color', B: 'Contrast', C: 'Third color', D: 'Fourth color' };
  for (const [k, v] of Object.entries(p.slots || {})) if (v && typeof v === 'object' && v.label) names[k] = v.label;
  for (const slot of used) {
    const ball = el('canvas');
    const row = el('button', { class: 'slot-row', 'aria-label': `Change yarn ${slot}` }, el('span', { class: 'letter', text: slot }), ball, el('span', { class: 'nm' }, yarnName(co.slots[slot]), el('small', { text: names[slot] || '' })), el('span', { class: 'chg', text: 'Change' }));
    paintBallInto(ball, co.slots[slot], 44);
    row.addEventListener('click', () => openPicker({ title: `Yarn ${slot}: ${names[slot] || ''}`, current: co.slots[slot], onPick: (y) => { co.slots[slot] = y; renderCastOn(p); } }));
    info.append(row);
  }
  const read = el('button', { class: 'btn', text: 'Read the pattern' });
  read.addEventListener('click', () => { audio.play('card'); openPattern({ chart, pattern: p, slots: co.slots }); });
  const go1 = el('button', { class: 'btn primary big', text: 'Cast on' });
  go1.addEventListener('click', () => castOn(p));
  info.append(el('div', { class: 'caston-actions' }, go1, read));
  page.append(el('div', { class: 'caston-wrap' }, pv, info));
  root.replaceChildren(page);
  requestAnimationFrame(() => {
    // a phone held upright: a shorter preview, so the yarn rows fit above the pinned Cast on bar
    const w = Math.min(pv.clientWidth - 24, 560), h = phoneUpright() ? Math.max(130, Math.min(innerHeight * 0.24, 200)) : Math.max(240, Math.min(innerHeight * 0.5, 460));
    pv.replaceChildren(fitCanvas(patternRender(p, co.slots, cellFor(p, w, h, 4, 22, true)), w, h));
    scrollCue();
  });
}
const phoneUpright = () => innerWidth < 760 && innerHeight >= 500;
// the pinned Cast on bar casts a shadow up the page while there's more page under it
function scrollCue() {
  const r = castonEl();
  r.classList.toggle('more-below', r.scrollHeight - r.scrollTop - r.clientHeight > 24);
}
function castOn(p) {
  if (S.getPiece(p.id)) { go('knit', p.id); return; }
  S.startPiece(p, co.slots);
  for (const y of Object.values(co.slots).reverse()) S.pushRecent(y);
  co = null;
  go('knit', p.id);
}
registerScreen('caston', {
  enter(id) {
    const p = S.patternById(id);
    if (!p) { go('book'); return; }
    if (!S.patternUnlocked(p.id)) { notice('That pattern is still locked.'); go('book'); return; }
    renderCastOn(p);
    castonEl().scrollTop = 0;
    if (!castonEl()._cue) { castonEl()._cue = true; castonEl().addEventListener('scroll', scrollCue, { passive: true }); addEventListener('resize', scrollCue); }
    requestAnimationFrame(() => requestAnimationFrame(scrollCue));
    setKeyHandler((e) => {
      if (e.key === 'Escape') { go('book', { chapter: p.chapter }); return true; }
      if (e.key === 'm' || e.key === 'M') { toggleMute(); return true; }
      return false;
    });
    audio.music('nook');
  },
  leave() { setKeyHandler(null); },
});
export const castOnState = () => (co ? { id: co.id, slots: co.slots } : null);
