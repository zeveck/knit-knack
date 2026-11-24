// scarf.js — the Infinite Scarf: the knitting HUD on the real Work renderer with an endless chart, the
// rolling length counter and the next goal, a stitch-pattern picker (applied from the next row), the
// milestone ribbons and fact cards, and "How long is it?" (the scarf standing upright beside the last
// thing it passed and the next one, at one shared scale, under a sky that darkens with height).
import { Work } from './work.js';
import { stripWording, wordingCursor, parseChart } from './chart.js';
import { el, ICON, go, openSheet, closeSheet, openSheetName, registerScreen, currentScreen, fmt } from './ui.js';
import { onRelease, onHold, markKnit, setKeyHandler } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { yarnName, paintBallInto, sameYarn, normYarn } from './yarn.js';
import { drawNook, drawStack, stackLayout } from './scene.js';
import { openPicker } from './sheets.js';
import { renderSwatch } from './work.js';
import { store, scarfChart, segmentChart, scarfRowSpec, SCARF_PATTERNS, WIDTH, SCARF_W_CM, CHUNK } from './scarfStore.js';
import { MILESTONES, SOMEDAY, GOALS, FACTS, factSlots, slotCard, goalAfter, lastPassed, fmtLen } from './scarfFacts.js';
import { setScarfSource } from './worn.js';

let root = null, dom = {}, work = null, chart = null, layout = '', built = false;
let lastTapT = -1e9, menuFn = () => {}, rafOn = false, backdrop = null, backdropKey = '';
let heldKey = null, holdIv = 0, cardTimer = 0, ribbonTimer = 0, how = null;
export const setMenu = (fn) => { menuFn = fn; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dprOf = () => Math.min(3, window.devicePixelRatio || 1);
const GOAL_TEXT = { eiffel: 'taller than the Eiffel Tower', burj: 'taller than the Burj Khalifa', everest: 'taller than Mount Everest', space: 'up to the edge of space', iss: 'up to the space station', earth: 'long enough to wrap round the Earth', moon: 'all the way to the Moon' };
export const goalText = (m) => (m.sil ? GOAL_TEXT[m.sil] : `taller than ${m.name}`);

// ---------------------------------------------------------------- boot: load the store, keep the save in step
let ready = null;
export function init() {
  if (ready) return ready;
  ready = store.load().then(() => {
    const s = S.get();
    // a reset save (no scarf in it, fewer lifetime stitches than the scarf has) clears the scarf too
    if (!(s.scarf.stitches > 0) && store.n > 0 && s.lifetimeStitches < store.n) return store.reset();
    return null;
  }).then(() => {
    sync();
    store.onSave((ok) => { if (!ok) import('./ui.js').then((u) => u.notice("Couldn't save just now. Your knitting is still here.")); });
    setScarfSource(() => ({
      version: `${store.rows()}|${store.runs.length}|${store.table.length}`,
      rows: Math.min(store.rows(), 400), totalRows: store.rows(),
      segment: (n) => segmentChart(store.runs, 1, n, (i) => store.yarnAt(i)),
    }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) store.saveNow(); });
    window.addEventListener('pagehide', () => store.saveNow());
  });
  return ready;
}
function sync() {
  const sc = S.get().scarf;
  sc.stitches = store.n; sc.rows = store.rows(); sc.cm = store.cm();
  sc.best = Math.max(sc.best || 0, sc.cm);
  if (!store.n && sc.current) store.current = normYarn(sc.current);
}

// ---------------------------------------------------------------- DOM
function build() {
  root = document.querySelector('[data-screen="scarf"]');
  root.className = 'screen knit-screen scarf-screen';
  const ib = (name, label, cls = 'icon-btn') => { const b = el('button', { class: cls, 'aria-label': label, title: label }); b.innerHTML = ICON[name]; return b; };
  dom.canvas = el('canvas', { class: 'work', 'aria-label': 'Your Infinite Scarf. Tap anywhere to knit a stitch.' });
  dom.menu = ib('menu', 'Menu (Esc)');
  dom.progLine = el('div', { class: 'prog-line' });
  dom.progBar = el('i');
  dom.chips = el('div', { class: 'chip-host' });
  dom.progress = el('div', { class: 'progress' }, dom.progLine, el('div', { class: 'prog-bar' }, dom.progBar), dom.chips);
  dom.zoomOut = ib('minus', 'Zoom out (−)'); dom.zoomIn = ib('plus', 'Zoom in (+)');
  dom.mute = ib('sound', 'Mute (M)');
  dom.rip = el('button', { class: 'rip-btn', 'aria-label': 'Rip back one stitch (Backspace)', title: 'Rip back (Backspace)' });
  dom.rip.innerHTML = ICON.rip + '<span>Rip back</span>';
  dom.top = el('header', { class: 'topbar' }, dom.menu, dom.progress, el('div', { class: 'zoom' }, dom.zoomOut, dom.zoomIn), dom.mute, dom.rip);
  dom.cardHost = el('div', { class: 'scarf-pop' });
  dom.workArea = el('div', { class: 'work-area' }, dom.cardHost);
  dom.basketCanvas = el('canvas');
  dom.basketSlot = el('div', { class: 'basket-slot' }, dom.basketCanvas);
  // the length counter, in the preview card's slot
  dom.digits = el('div', { class: 'digits', 'aria-live': 'off' });
  dom.unit = el('span', { class: 'unit' });
  dom.next = el('div', { class: 'next' });
  dom.howBtn = el('button', { class: 'how-btn', 'aria-label': 'How long is it? (H)' }, el('span', { class: 'icw', html: ICON.scarf }), 'How long is it?');
  dom.len = el('div', { class: 'scarf-len' }, el('div', { class: 'num' }, dom.digits, dom.unit), dom.next, dom.howBtn);
  dom.pvSlot = el('div', { class: 'preview-slot' }, dom.len);
  dom.words = el('div', { class: 'words' });
  dom.strip = el('div', { class: 'strip' }, dom.words);
  dom.bar = el('div', { class: 'yarnbar' });
  dom.panel = el('aside', { class: 'panel' }, dom.strip, dom.bar);
  root.replaceChildren(dom.canvas, dom.top, dom.workArea, dom.basketSlot, dom.pvSlot, dom.panel);

  dom.skein = el('button', { class: 'ybtn skein', 'aria-label': 'Scarf yarn (1)', title: 'Scarf yarn (1)' }, el('canvas'));
  onRelease(dom.skein, () => pickYarn());
  dom.stitchBtn = el('button', { class: 'ybtn follow stitch-btn', 'aria-label': 'Stitch pattern (S)', title: 'Stitch pattern (S)' }, el('span', { class: 'icw', html: ICON.book }), el('span', { class: 'sp' }));
  onRelease(dom.stitchBtn, () => pickPattern());
  dom.basketBtn = el('button', { class: 'ybtn basket-btn', 'aria-label': 'Any yarn from the basket (Y)', title: 'Any yarn (Y)' },
    el('span', { class: 'bk' }, el('img', { src: 'assets/sprites/basket-back.png', alt: '' }), el('img', { src: 'assets/sprites/basket-front.png', alt: '' })));
  onRelease(dom.basketBtn, () => pickYarn(true));
  dom.recent = [0, 1, 2, 3, 4].map((i) => { const b = el('button', { class: 'ybtn recent', 'aria-label': `Recent yarn ${i + 1} (${i + 5})` }, el('canvas')); onRelease(b, () => useRecent(i)); return b; });
  dom.bar.append(dom.skein, dom.stitchBtn, dom.basketBtn, ...dom.recent);

  dom.menu.addEventListener('click', () => menuFn());
  dom.zoomIn.addEventListener('click', () => { work.zoomIn(); audio.play('ui', { gain: 0.5 }); });
  dom.zoomOut.addEventListener('click', () => { work.zoomOut(); audio.play('ui', { gain: 0.5 }); });
  dom.mute.addEventListener('click', () => { window.__game.toggleMute(); refreshMute(); });
  onRelease(dom.howBtn, () => openHow(), { guard: true });
  onHold(dom.rip, { press: () => ripOne(true), start: () => audio.ripLoopStart(), repeat: () => ripOne(false), end: () => audio.ripLoopStop() });

  root.addEventListener('pointerdown', (e) => {
    if (window.gameReport && window.gameReport.isOpen()) return;
    if (currentScreen() !== 'scarf' || openSheetName() || how) return;
    if (e.target.closest('button, input, a, .toast, .chip, .howlong, .scarf-pop .card')) return;
    e.preventDefault();
    knitOne();
  });
  root.addEventListener('wheel', (e) => {
    if (openSheetName() || how) return;
    e.preventDefault();
    const t = performance.now(); if (t - (root._wz || 0) < 180) return; root._wz = t;
    if (e.deltaY < 0) work.zoomIn(); else if (e.deltaY > 0) work.zoomOut();
  }, { passive: false });
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keyup', (e) => { if (heldKey && e.code === heldKey) { heldKey = null; clearInterval(holdIv); } });
  work = new Work(dom.canvas, {
    dpr: dprOf(), minFit: 8, maxFit: 28,
    fitBox: () => { const r = relRect(dom.workArea); const p = layout === 'port' ? 8 : 12; return { x: r.x + p, y: r.y + p, w: Math.max(40, r.w - p * 2), h: Math.max(40, r.h - p * 2) }; },
    ballPoint: () => ballPoint(),
    background: (g, w, h) => drawBackdrop(g, w, h),
  });
  window.addEventListener('resize', () => { if (currentScreen() === 'scarf') relayout(); if (how) how.resize = true; });
  built = true;
}
const relRect = (elm) => { const a = elm.getBoundingClientRect(), b = root.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }; };
function pickLayout() { const w = innerWidth, h = innerHeight; if (h < 500 && w > h) return 'land'; if (w >= 900 && w > h * 1.05) return 'desk'; return 'port'; }
function relayout() {
  const l = pickLayout();
  if (l !== layout) { layout = l; root.classList.remove('lay-port', 'lay-land', 'lay-desk'); root.classList.add(`lay-${l}`); }
  work.setMaxFit(layout === 'desk' ? 46 : 28);
  const r = dom.basketSlot.getBoundingClientRect(); const d = dprOf();
  dom.basketCanvas.width = Math.round(r.width * d); dom.basketCanvas.height = Math.round(r.height * d);
  backdropKey = '';
  work.resize();
  toasts.anchor(dom.progress);
  refreshBar();
}
function basketBox(sw, sh) {
  const bh = sh * 0.74; const bw = bh * (468 / 396); const total = bw * 1.55; const k = total > sw ? sw / total : 1;
  const w = bw * k, h = bh * k;
  return { x: layout === 'desk' ? (sw - w * 1.55) / 2 + 4 : 4, y: sh - h - 3, w, h };
}
function ballPoint() {
  const s = relRect(dom.basketSlot); const b = basketBox(s.w, s.h);
  const L = stackLayout(b, S.get().equipped.holder);
  return { x: s.x + L.ball.x, y: s.y + L.ball.y - L.ball.size * 0.1 };
}
function drawBackdrop(g, w, h) {
  const key = `${Math.round(w)}x${Math.round(h)}|${S.get().equipped.decor.join(',')}`;
  if (key !== backdropKey || !backdrop) {
    backdropKey = key;
    const c = backdrop || document.createElement('canvas');
    c.width = Math.max(2, Math.round(w * 0.5)); c.height = Math.max(2, Math.round(h * 0.5));
    const b = c.getContext('2d');
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height;
    drawNook(tmp.getContext('2d'), c.width, c.height, { decor: S.get().equipped.decor });
    b.filter = 'blur(5px) saturate(0.9)'; b.drawImage(tmp, -8, -8, c.width + 16, c.height + 16); b.filter = 'none';
    b.fillStyle = 'rgba(36,18,44,0.5)'; b.fillRect(0, 0, c.width, c.height);
    backdrop = c;
  }
  g.drawImage(backdrop, 0, 0, w, h);
}

// ---------------------------------------------------------------- the work
function loadWork() {
  chart = scarfChart(store.runs);
  const yarns = store.yarnsArray();
  work.load(chart, { yarns, done: store.n, castOnYarn: store.n ? store.yarnAt(0) : store.current, nextYarn: store.current });
}
const rowNow = () => Math.floor(store.n / WIDTH) + 1;

export function knitOne({ animate = true } = {}) {
  if (!work || !chart) return null;
  const y = store.current;
  const res = work.knit(y, { animate });
  if (!res) return null;
  store.push(y);
  S.get().lifetimeStitches += 1;
  sync();
  markKnit();
  if (animate) {
    lastTapT = performance.now();
    const R = chart.row(res.r);
    audio.tick({ purl: R.rs ? res.stitch === 'p' : res.stitch !== 'p', high: res.r % 10 === 0 });
    audio.vibrate(S.get().settings.vibrate);
    hud();
  }
  if (res.rowEnd) {
    if (animate) setTimeout(() => { audio.play('row'); audio.play('counter', { gain: 0.8 }); }, 130);
    afterRow(animate);
    store.saveNow(); S.saveSoon();
  } else if (animate) { store.saveSoon(); S.saveSoon(); }
  return res;
}
function ripOne(single) {
  if (!work || !store.n) return;
  const r = work.rip(); if (!r) return;
  store.pop(); sync();
  if (single) audio.play('rip');
  hud(); store.saveSoon(); S.saveSoon();
}

// milestones and facts passed since the best length so far
let lastBest = null;
function afterRow(animate) {
  const sc = S.get().scarf;
  const before = lastBest ?? sc.prevBest ?? 0;
  const cm = store.cm();
  if (cm > before) {
    const ms = MILESTONES.filter((m) => m.cm > before && m.cm <= cm);
    const slots = factSlots(cm + 1).map((c, j) => ({ c, j })).filter((x) => x.c > before && x.c <= cm);
    if (ms.length) ribbon(ms[ms.length - 1]);
    else if (slots.length) factCard(slots[slots.length - 1].j);
    sc.prevBest = cm; lastBest = cm;
  }
  if (S.checkUnlocks().length) toasts.pump();
  if (how) how.dirty = true;
  void animate;
}

// ---------------------------------------------------------------- HUD
function hud() {
  if (!root || currentScreen() !== 'scarf') return;
  const cm = store.cm();
  const r = rowNow();
  dom.progLine.replaceChildren(el('b', { text: 'Infinite Scarf' }), ` · Row ${fmt(r)} · ${fmt(store.n)} stitch${store.n === 1 ? '' : 'es'}`);
  const g = goalAfter(cm), l = lastPassed(cm);
  const from = l ? l.cm : 0;
  dom.progBar.style.width = g ? `${clamp((100 * (cm - from)) / (g.cm - from), 0, 100)}%` : '100%';
  setDigits(cm);
  dom.next.textContent = g ? `${fmtLen(Math.max(1, Math.ceil(g.cm - cm)))} to go: ${goalText(g)}` : 'Past the Moon!';
  // wording strip
  const L = chart.locate(store.n);
  let html = null;
  try {
    const w = stripWording(chart, L.r, L.k);
    const cur = wordingCursor(w, L.k);
    const frag = document.createDocumentFragment();
    frag.append(el('span', { class: 'lbl', text: w.label + ':' }), ' ');
    w.tokens.forEach((t, j) => { if (j) frag.append(t.glue || ', '); frag.append(el('span', { class: 'tok' + (t.rep ? ' rep' : '') + (j === cur.token ? ' cur' : ''), text: t.text })); });
    if (cur.reps) frag.append(el('span', { class: 'cnt', text: `rep ${cur.rep} of ${cur.reps} · st ${cur.st} of ${cur.of}` }));
    html = frag;
  } catch { html = document.createTextNode(`Row ${L.r}`); }
  const key = `${L.r}|${L.k}|${store.runs.length}`;
  if (dom.words._k !== key) { dom.words._k = key; dom.words.replaceChildren(html); }
  dom.stitchBtn.querySelector('.sp').textContent = SCARF_PATTERNS[queuedOrCurrent()].name;
}
const queuedOrCurrent = () => store.patternAtRow(rowNow() + (store.n % WIDTH ? 1 : 0));

// big rolling digits: each digit is a column of 0-9 that slides
let digitFmt = '';
function setDigits(cm) {
  let txt, unit;
  if (cm >= 100000) { txt = (cm / 100000).toFixed(cm >= 1e7 ? 0 : 2); unit = 'km'; }
  else if (cm >= 100) { txt = (cm / 100).toFixed(cm >= 10000 ? 1 : 2); unit = 'm'; }
  else { txt = String(Math.floor(cm)); unit = 'cm'; }
  const shape = txt.replace(/\d/g, '0') + unit;
  if (shape !== digitFmt) {
    digitFmt = shape;
    dom.digits.replaceChildren(...[...txt].map((ch) => {
      if (!/\d/.test(ch)) return el('span', { class: 'sep', text: ch });
      const col = el('span', { class: 'col' }, ...Array.from({ length: 10 }, (_, d) => el('span', { text: String(d) })));
      return el('span', { class: 'dg' }, col);
    }));
    dom.unit.textContent = unit;
  }
  const cols = dom.digits.querySelectorAll('.dg .col');
  let k = 0;
  for (const ch of txt) if (/\d/.test(ch)) { cols[k].style.transform = `translateY(${-+ch}em)`; k++; }
  dom.digits.setAttribute('aria-label', `${txt} ${unit}`);
}

function refreshBar() {
  const size = layout === 'desk' ? 46 : 44;
  paintBallInto(dom.skein.querySelector('canvas'), store.current, size);
  dom.skein.title = `Scarf yarn: ${yarnName(store.current)} (1)`;
  const rec = S.get().recent;
  dom.recent.forEach((b, i) => { const y = rec[i]; paintBallInto(b.querySelector('canvas'), y || null, size); b.classList.toggle('empty', !y); b.classList.toggle('active-free', !!y && sameYarn(y, store.current)); });
  if (work) work.setNextYarn(store.current);
}
function setYarn(y, chip = true) {
  store.current = y; S.get().scarf.current = y; S.pushRecent(y);
  store.metaDirty = true; store.saveSoon(); S.saveSoon();
  refreshBar();
  if (chip) { audio.play('yarn'); showChip(`Scarf: ${yarnName(y)}`, y); }
}
function showChip(label, yarn) {
  const chip = el('div', { class: 'chip' }, el('span', { class: 'dot', style: { background: yarn ? yarn.color : 'transparent' } }), el('span', { class: 't', text: label }));
  dom.chips.replaceChildren(chip);
  clearTimeout(dom.chips._t); dom.chips._t = setTimeout(() => dom.chips.replaceChildren(), 4000);
}
function pickYarn(basket = false) { openPicker({ title: basket ? 'Any yarn' : 'Scarf yarn', current: store.current, onPick: (y) => setYarn(y) }); }
function useRecent(i) { const y = S.get().recent[i]; if (y && !sameYarn(y, store.current)) setYarn(y); }

// ---------------------------------------------------------------- stitch patterns
export function setPattern(p, { quiet = false } = {}) {
  if (!SCARF_PATTERNS[p]) return false;
  if (!S.isUnlocked(`scarf:${p}`)) return false;
  const midRow = store.n % WIDTH !== 0;
  store.setPattern(p, rowNow() + (midRow ? 1 : 0));
  store.saveSoon();
  if (work && built) { loadWork(); hud(); }
  if (!quiet) { audio.play('ui'); showChip(`${SCARF_PATTERNS[p].name}${midRow ? ', from the next row' : ''}`, null); }
  return true;
}
function pickPattern() {
  const box = el('div', { class: 'stitch-picker' });
  const midRow = store.n % WIDTH !== 0;
  box.append(el('p', { class: 'sp-note', text: midRow ? 'A new stitch pattern starts from the next row.' : 'A new stitch pattern starts from this row.' }));
  const grid = el('div', { class: 'sp-grid' });
  const now = queuedOrCurrent();
  for (const [id, P] of Object.entries(SCARF_PATTERNS)) {
    const ok = S.isUnlocked(`scarf:${id}`);
    const pv = el('div', { class: 'pv' });
    const b = el('button', { class: 'sp-card' + (id === now ? ' on' : '') + (ok ? '' : ' locked'), 'aria-label': `${P.name}${ok ? '' : ' (locked)'}` }, pv, el('b', { text: P.name }), el('small', { text: ok ? P.note : S.remainingText(S.ruleById(`scarf:${id}`).rule) }));
    if (id === now) b.append(el('span', { class: 'tick icw', html: ICON.check }));
    if (ok) b.addEventListener('click', () => { closeSheet(); setPattern(id); });
    grid.append(b);
    requestAnimationFrame(() => {
      const runs = [{ row: 1, pattern: id }];
      const seg = segmentChart(runs, 1, 12, () => store.current);
      const c = renderSwatch(seg.chart, { yarnAt: () => store.current, cellPx: 10 * Math.min(2, dprOf()), background: null, bindOff: false }).canvas;
      c.style.width = c.width / Math.min(2, dprOf()) / 1.2 + 'px'; if (!ok) c.style.filter = 'grayscale(1) brightness(0.6)';
      pv.replaceChildren(c);
    });
  }
  box.append(grid);
  openSheet('stitch', box, { title: 'Stitch pattern' });
}

// ---------------------------------------------------------------- ribbons and fact cards
function ribbon(m) {
  if (currentScreen() !== 'scarf' || !dom.cardHost) return;
  audio.play('milestone');
  const im = el('img', { src: `assets/cmp/${m.img}.webp`, alt: '' });
  const r = el('div', { class: 'ribbon-pop' }, im, el('div', {}, el('b', { text: `Taller than ${m.name.replace(/^(a|an|the) /, (x) => x)}!` }), el('span', { text: m.unlock ? `${fmtLen(m.cm)} · ${m.unlock} unlocked` : fmtLen(m.cm) })));
  dom.cardHost.querySelectorAll('.ribbon-pop').forEach((x) => x.remove());
  dom.cardHost.append(r);
  clearTimeout(ribbonTimer); ribbonTimer = setTimeout(() => { r.classList.add('out'); setTimeout(() => r.remove(), 400); }, 4200);
}
function factCard(j) {
  if (currentScreen() !== 'scarf' || !dom.cardHost) return;
  audio.play('card', { gain: 0.8 });
  const c = slotCard(j);
  const card = el('button', { class: 'card fact-pop', 'aria-label': 'Close the fact' }, el('span', { class: 'hd', text: c.kind === 'fact' ? 'Knitting fact' : 'Your scarf' }), el('span', { class: 'tx', text: c.kind === 'fact' ? c.text : statText(c.n) }));
  onRelease(card, () => { card.classList.add('out'); setTimeout(() => card.remove(), 300); });
  dom.cardHost.querySelectorAll('.fact-pop').forEach((x) => x.remove());
  dom.cardHost.append(card);
  clearTimeout(cardTimer); cardTimer = setTimeout(() => { card.classList.add('out'); setTimeout(() => card.remove(), 400); }, 8000);
}
// scarf stats worked out from the save, so a card never stops coming
export function statText(n) {
  const k = n % 7;
  const cm = store.cm();
  if (k === 0) return `That's ${fmt(store.n)} stitches in your scarf.`;
  if (k === 1) { const c = new Set(store.table.map((y) => y.color)); return `You've used ${c.size} colour${c.size === 1 ? '' : 's'} in your scarf.`; }
  if (k === 2) {
    let best = 0, run = 0, prev = -1;
    for (let i = 0; i < store.n; i++) { const j = store.idx[i]; run = j === prev ? run + 1 : 1; prev = j; if (run > best) best = run; }
    return `Your longest stripe is ${fmtLen(best / WIDTH)}.`;
  }
  if (k === 3) return `${fmt(store.rows())} rows: about ${Math.max(1, Math.round(store.n / 3 / 60))} minutes of tapping at 3 taps a second.`;
  if (k === 4) { const t = new Set(store.table.map((y) => y.type)); return `Your scarf has ${t.size} kind${t.size === 1 ? '' : 's'} of yarn in it.`; }
  if (k === 5) return `You've changed stitch pattern ${store.runs.length - 1} time${store.runs.length === 2 ? '' : 's'}.`;
  const g = goalAfter(cm);
  return g ? `${fmtLen(cm)} long: ${Math.floor((100 * cm) / g.cm)}% of the way ${goalText(g).replace('taller than', 'to')}.` : `${fmtLen(cm)} long.`;
}

// ---------------------------------------------------------------- basket slot and frame loop
function loop(t) {
  if (currentScreen() !== 'scarf') { rafOn = false; return; }
  requestAnimationFrame(loop);
  const c = dom.basketCanvas;
  if (c.width) {
    const g = c.getContext('2d'); const d = c.width / Math.max(1, dom.basketSlot.getBoundingClientRect().width);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(d, 0, 0, d, 0, 0);
    const since = t - lastTapT;
    const rot = since < 600 ? Math.sin(since / 40) * Math.exp(-since / 200) * (3 * Math.PI / 180) : 0;
    const e = S.get().equipped;
    drawStack(g, basketBox(c.width / d, c.height / d), { t, mirror: layout !== 'desk', things: e.purl, holder: e.holder, yarn: store.current, ballScale: 0.9, ballRot: rot, dpr: d });
  }
  if (how) drawHow(t);
}
function refreshMute() { const st = S.get().settings; const m = st.musicMuted && st.sfxMuted; dom.mute.innerHTML = m ? ICON.mute : ICON.sound; }

// ---------------------------------------------------------------- keys
function onKey(e) {
  const k = e.key;
  if (openSheetName()) { if (k === 'Escape') { closeSheet(); return true; } return false; }
  if (how) { if (k === 'Escape' || k === 'h' || k === 'H') { closeHow(); return true; } return false; }
  if (k === ' ' || k === 'Enter' || k === 'k' || k === 'K') {
    if (e.repeat) return true;
    knitOne();
    if (S.get().settings.hold) { heldKey = e.code; clearInterval(holdIv); holdIv = setInterval(() => { if (heldKey) knitOne(); else clearInterval(holdIv); }, 1000 / 6); }
    return true;
  }
  if (k === 'Backspace' || k === 'u' || k === 'U') { if (!e.repeat) ripOne(true); return true; }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (k === '1') { pickYarn(); return true; }
  if (k >= '5' && k <= '9') { useRecent(+k - 5); return true; }
  if (k === 'y' || k === 'Y') { pickYarn(true); return true; }
  if (k === 's' || k === 'S') { pickPattern(); return true; }
  if (k === 'h' || k === 'H') { openHow(); return true; }
  if (k === '+' || k === '=') { work.zoomIn(); return true; }
  if (k === '-' || k === '_') { work.zoomOut(); return true; }
  if (k === '0') { work.setZoom(0); return true; }
  if (k === 'm' || k === 'M') { window.__game.toggleMute(); refreshMute(); return true; }
  if (k === 'Escape' || k === 'p' || k === 'P') { menuFn(); return true; }
  return false;
}

// ---------------------------------------------------------------- enter / leave
async function enter() {
  if (!built) build();
  root.hidden = false;
  layout = '';
  relayout();
  await init();
  const e = S.get().equipped;
  work.setNeedles(e.needles); work.setMarkers(e.marker); work.setCounter(e.counter); audio.setNeedles(e.needles);
  loadWork();
  lastBest = S.get().scarf.best || store.cm();
  S.get().scarf.prevBest = lastBest;
  relayout(); hud(); refreshMute();
  setKeyHandler(onKey);
  audio.music('scarf'); audio.ambience(false);
  toasts.anchor(dom.progress); toasts.hold(false); toasts.pump();
  if (!rafOn) { rafOn = true; requestAnimationFrame(loop); }
  if (!store.n) { audio.play('caston'); showChip('Cast on 12 stitches. Tap to knit!', store.current); }
}
function leave() {
  setKeyHandler(null); clearInterval(holdIv); heldKey = null; audio.ripLoopStop(); toasts.anchor(null);
  closeHow(true);
  store.saveNow(); S.saveNow();
}
registerScreen('scarf', { enter: () => { enter(); }, leave });

// ---------------------------------------------------------------- the debug hook: rows through the same data path, no animation
export async function addRows(n, yarn, pattern) {
  await init();
  const onScreen = currentScreen() === 'scarf' && work && chart;
  if (yarn) setYarn(typeof yarn === 'string' ? normYarn(yarn) : normYarn(yarn), false);
  if (pattern) {
    if (!S.isUnlocked(`scarf:${pattern}`)) return { error: `stitch pattern ${pattern} is locked` };
    const midRow = store.n % WIDTH !== 0;
    store.setPattern(pattern, rowNow() + (midRow ? 1 : 0));
  }
  const y = store.current;
  const before = S.get().scarf.best || 0;
  lastBest = before;
  const total = Math.max(0, Math.round(n)) * WIDTH;
  for (let i = 0; i < total; i++) {
    store.push(y);
    S.get().lifetimeStitches += 1;
    if (store.n % WIDTH === 0 && store.n % (WIDTH * 25) === 0) S.checkUnlocks();
  }
  sync();
  afterRow(false);
  if (onScreen) { loadWork(); hud(); }
  await store.saveNow(); S.saveNow();
  toasts.pump();
  return { rows: store.rows(), stitches: store.n, cm: store.cm() };
}
export const scarfState = () => ({ stitches: store.n, rows: store.rows(), cm: store.cm(), runs: store.runs.slice(), yarns: store.table.length, current: store.current, pattern: store.patternAtRow(rowNow()), fabricCanvas: work && work.state().fabricCanvas, zoom: work && work.state().zoom, cellPx: work && work.state().cellPx, how: how ? { scale: how.s, target: how.target, pair: how.pairKey } : null });
export const scarfWork = () => work;

// ================================================================ "How long is it?"
const IMGS = {};
function cmpImg(name) {
  if (IMGS[name]) return IMGS[name].ok ? IMGS[name].im : null;
  const im = new Image(); IMGS[name] = { im, ok: false };
  im.onload = () => { IMGS[name].ok = true; if (how) how.dirty = true; };
  im.src = `assets/cmp/${name}.webp`;
  return null;
}
const ASPECT = { // trimmed width / height of each picture (assets/cmp)
  'cmp-01-mug': 906 / 845, 'cmp-02-pencil': 132 / 1024, 'cmp-03-ruler': 179 / 1024, 'cmp-04-bowling-pin': 369 / 1024, 'cmp-05-kitchen-table': 811 / 925,
  'cmp-06-guitar': 411 / 1024, 'cmp-07-emperor-penguin': 543 / 1024, 'cmp-08-grown-up': 248 / 1024, 'cmp-09-front-door': 494 / 1024, 'cmp-10-basketball-hoop': 385 / 1024,
  'cmp-11-double-decker-bus': 606 / 1024, 'cmp-12-giraffe': 560 / 1024, 'cmp-13-house': 823 / 970, 'cmp-14-diving-tower': 512 / 1024, 'cmp-15-brachiosaurus': 509 / 1024,
  'cmp-16-oak': 1004 / 985, 'cmp-17-blue-whale': 447 / 1024, 'cmp-18-statue-of-liberty': 393 / 1024, 'cmp-19-leaning-tower-of-pisa': 334 / 1024, 'cmp-20-coast-redwood': 235 / 1024,
};
const SIL_ASPECT = { eiffel: 0.38, burj: 0.14, everest: 2.6, space: 0.5, iss: 0.6, earth: 1, moon: 1 };
const widthOf = (m) => (m ? m.cm * (m.img ? ASPECT[m.img] : SIL_ASPECT[m.sil] || 0.5) : 0);

function openHow() {
  if (how) return;
  audio.play('card');
  const box = el('div', { class: 'howlong' });
  const back = el('button', { class: 'btn small', 'aria-label': 'Back to knitting (H)' }, el('span', { class: 'icw', html: ICON.back }), 'Keep knitting');
  back.addEventListener('click', () => closeHow());
  const cv = el('canvas', { class: 'how-cv' });
  const stage = el('div', { class: 'how-stage' }, cv);
  const cards = el('div', { class: 'how-cards' });
  box.append(el('div', { class: 'how-top' }, back, el('h2', { text: 'How long is it?' }), el('span', { class: 'how-len' })), el('div', { class: 'how-body' }, stage, cards));
  root.append(box);
  how = { box, cv, stage, cards, s: 0, target: 0, anim: null, pairKey: '', dirty: true, resize: true, cardsKey: '' };
}
function closeHow(silent) {
  if (!how) return;
  how.box.remove(); how = null;
  if (!silent) audio.play('ui', { gain: 0.6 });
}
function pairOf(cm) {
  const next = goalAfter(cm);
  const last = lastPassed(cm);
  return { last, next };
}
function drawHow(t) {
  const H = how;
  const cm = store.cm();
  const { last, next } = pairOf(cm);
  const key = `${last ? last.cm : 0}|${next ? next.cm : 0}`;
  const r = H.stage.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const d = dprOf();
  if (H.resize || H.cv.width !== Math.round(r.width * d)) { H.cv.width = Math.round(r.width * d); H.cv.height = Math.round(r.height * d); H.resize = false; H.dirty = true; }
  const W = r.width, Ht = r.height;
  const ruler = 46;
  const Wc = W - ruler - 10;
  // the shared scale: the taller of scarf and next goal into 80% of the height, and all three side by side
  // (real widths, 4% gaps) into 92% of the width
  const tall = Math.max(cm, next ? next.cm : cm, 1);
  const hFit = (Ht * 0.8) / tall;
  const sumW = SCARF_W_CM + widthOf(last) + widthOf(next);
  const wFit = (Wc * 0.92 - Wc * 0.08) / Math.max(1, sumW);
  const target = Math.min(hFit, wFit);
  if (!H.s) H.s = target;
  if (key !== H.pairKey) {
    if (H.pairKey) H.anim = { from: H.s, to: target, t0: t };
    H.pairKey = key; H.dirty = true;
  }
  if (H.anim) {
    const p = clamp((t - H.anim.t0) / 600, 0, 1); const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    H.anim.to = target;
    H.s = Math.exp(Math.log(H.anim.from) + (Math.log(H.anim.to) - Math.log(H.anim.from)) * e);
    if (p >= 1) H.anim = null;
    H.dirty = true;
  } else if (Math.abs(H.s - target) > 1e-9) { H.s = target; H.dirty = true; }
  H.target = target;
  const ck = `${Math.floor(cm)}|${key}`;
  if (ck !== H.cardsKey) { H.cardsKey = ck; howCards(cm, last, next); H.dirty = true; }
  if (!H.dirty) return;
  H.dirty = false;
  const g = H.cv.getContext('2d');
  g.setTransform(d, 0, 0, d, 0, 0);
  const s = H.s;
  const ground = Ht * 0.9;
  sky(g, W, Ht, ground, s);
  // positions: last | scarf | next, centred in the content area
  const gap = Wc * 0.04;
  const lw = widthOf(last) * s, sw = SCARF_W_CM * s, nw = widthOf(next) * s;
  const total = lw + sw + nw + (last ? gap : 0) + gap;
  let x = ruler + 6 + (Wc - total) / 2;
  if (last) { drawThing(g, last, x, ground, s, cm); x += lw + gap; }
  const sx = x; x += sw + gap;
  if (next) drawThing(g, next, x, ground, s, cm);
  drawScarfUpright(g, sx, ground, s, cm, d);
  drawRuler(g, ruler, ground, s, Ht);
  H.box.querySelector('.how-len').textContent = fmtLen(cm);
}
function altColor(cm) {
  // lamplit room, then sky, then cloud height, then night and stars
  const stops = [[0, [92, 62, 74]], [240, [122, 86, 92]], [400, [136, 176, 214]], [10000, [104, 152, 204]], [100000, [66, 106, 170]], [1000000, [36, 58, 118]], [5000000, [16, 22, 60]], [20000000, [6, 8, 24]]];
  const a = Math.max(0, cm);
  for (let i = 1; i < stops.length; i++) {
    if (a <= stops[i][0]) {
      const [c0, k0] = stops[i - 1], [c1, k1] = stops[i];
      const f = c0 === 0 ? a / c1 : Math.log(a / c0) / Math.log(c1 / c0);
      const ff = clamp(f, 0, 1);
      return `rgb(${k0.map((v, j) => Math.round(v + (k1[j] - v) * ff)).join(',')})`;
    }
  }
  return 'rgb(6,8,24)';
}
function sky(g, W, H, ground, s) {
  for (let y = 0; y < ground; y += 3) { g.fillStyle = altColor((ground - y) / s); g.fillRect(0, y, W, 3.5); }
  const topAlt = ground / s;
  // clouds at about 1 to 3 km
  for (let i = 0; i < 9; i++) {
    const alt = 100000 + ((i * 37) % 9) * 25000;
    const y = ground - alt * s; if (y < -40 || y > ground) continue;
    const x = ((i * 173) % 100) / 100 * W; const rw = 40 + (i % 3) * 22;
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * rw * 0.35, y + Math.sin(k * 2) * 5, rw * 0.4, rw * 0.22, 0, 0, Math.PI * 2); g.fill(); }
  }
  // stars above about 20 km
  if (topAlt > 1500000) {
    for (let i = 0; i < 90; i++) {
      const x = ((i * 97) % 100) / 100 * W, alt = Math.exp(Math.log(1500000) + ((i * 53) % 100) / 100 * Math.log(topAlt / 1500000 * 4));
      const y = ground - alt * s; if (y < 0 || y > ground) continue;
      const a = clamp(Math.log(alt / 1500000) / 2, 0, 0.9);
      g.fillStyle = `rgba(255,250,230,${a})`; g.fillRect(x, y, 1.6, 1.6);
    }
  }
  // the room: a wall and a wooden floor while the view is about room height
  const room = clamp(1 - (topAlt - 300) / 400, 0, 1);
  if (room > 0) {
    g.save(); g.globalAlpha = room;
    const lamp = g.createRadialGradient(W * 0.15, ground * 0.1, 0, W * 0.2, ground * 0.3, W * 0.9);
    lamp.addColorStop(0, 'rgba(255,214,150,0.45)'); lamp.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = lamp; g.fillRect(0, 0, W, ground);
    g.restore();
  }
  // ground
  const gr = g.createLinearGradient(0, ground, 0, H);
  if (room > 0.5) { gr.addColorStop(0, '#8a5a34'); gr.addColorStop(1, '#5a3a20'); } else { gr.addColorStop(0, '#5f7a52'); gr.addColorStop(1, '#3d5236'); }
  g.fillStyle = gr; g.fillRect(0, ground, W, H - ground);
  g.fillStyle = 'rgba(255,240,210,0.35)'; g.fillRect(0, ground, W, 1.5);
}
function drawThing(g, m, x, ground, s, cm) {
  const h = m.cm * s, w = widthOf(m) * s;
  if (m.img) {
    const im = cmpImg(m.img);
    g.save(); g.fillStyle = 'rgba(20,10,20,0.3)'; g.beginPath(); g.ellipse(x + w / 2, ground, w * 0.55, Math.max(2, w * 0.06), 0, 0, Math.PI * 2); g.fill(); g.restore();
    if (im) g.drawImage(im, x, ground - h, w, h);
    else { g.fillStyle = 'rgba(40,20,40,0.4)'; g.fillRect(x, ground - h, w, h); }
  } else silhouette(g, m.sil, x, ground, w, h);
  // its label under the ground line
  g.save();
  g.font = '600 13px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f6ecd9';
  const passed = m.cm <= cm;
  const label = `${m.name.replace(/, stood.*$/, '').replace(/ \(.*\)$/, '')} · ${fmtLen(m.cm)}`;
  g.fillText(label, x + w / 2, ground + 18, Math.max(120, w * 1.4));
  g.font = '500 11px Fredoka, sans-serif'; g.fillStyle = passed ? '#c9e0b4' : '#f2d48a';
  g.fillText(passed ? 'passed!' : 'next', x + w / 2, ground + 33);
  g.restore();
}
function silhouette(g, kind, x, ground, w, h) {
  g.save(); g.fillStyle = 'rgba(30,22,50,0.82)'; g.strokeStyle = 'rgba(246,236,217,0.5)'; g.lineWidth = 1;
  const cx = x + w / 2, top = ground - h;
  g.beginPath();
  if (kind === 'eiffel') { g.moveTo(cx, top); g.lineTo(cx + w * 0.08, top + h * 0.35); g.lineTo(cx + w * 0.22, top + h * 0.62); g.lineTo(cx + w * 0.5, ground); g.lineTo(cx + w * 0.2, ground); g.quadraticCurveTo(cx, ground - h * 0.25, cx - w * 0.2, ground); g.lineTo(cx - w * 0.5, ground); g.lineTo(cx - w * 0.22, top + h * 0.62); g.lineTo(cx - w * 0.08, top + h * 0.35); g.closePath(); }
  else if (kind === 'burj') { g.moveTo(cx, top); g.lineTo(cx + w * 0.12, top + h * 0.3); g.lineTo(cx + w * 0.28, top + h * 0.6); g.lineTo(cx + w * 0.5, ground); g.lineTo(cx - w * 0.5, ground); g.lineTo(cx - w * 0.3, top + h * 0.55); g.lineTo(cx - w * 0.1, top + h * 0.25); g.closePath(); }
  else if (kind === 'everest') { g.moveTo(x, ground); g.lineTo(cx - w * 0.15, top + h * 0.3); g.lineTo(cx, top); g.lineTo(cx + w * 0.2, top + h * 0.4); g.lineTo(x + w, ground); g.closePath(); }
  else if (kind === 'earth' || kind === 'moon') { g.arc(cx, ground - h / 2, h / 2, 0, Math.PI * 2); }
  else { g.rect(cx - w * 0.04, top, w * 0.08, h); }
  g.fill(); g.stroke();
  if (kind === 'everest') { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(cx - w * 0.1, top + h * 0.2); g.lineTo(cx, top); g.lineTo(cx + w * 0.12, top + h * 0.24); g.closePath(); g.fill(); }
  if (kind === 'space' || kind === 'iss') { g.setLineDash([6, 5]); g.strokeStyle = 'rgba(246,236,217,0.7)'; g.beginPath(); g.moveTo(0, top); g.lineTo(x + w * 3, top); g.stroke(); }
  g.restore();
}
function drawRuler(g, rw, ground, s, H) {
  g.save();
  g.fillStyle = 'rgba(246,230,190,0.92)'; g.fillRect(4, 0, rw - 12, ground);
  g.strokeStyle = 'rgba(80,50,30,0.8)'; g.fillStyle = '#4a2c14'; g.font = '600 10px Fredoka, sans-serif'; g.textAlign = 'left';
  const steps = [1, 2, 5]; let step = 1;
  outer: for (let e = 0; e < 12; e++) for (const k of steps) { step = k * Math.pow(10, e); if (step * s >= 46) break outer; }
  for (let v = 0, i = 0; ground - v * s > -2 && i < 400; v += step, i++) {
    const y = ground - v * s;
    g.lineWidth = 1; g.beginPath(); g.moveTo(rw - 8, y); g.lineTo(rw - 20, y); g.stroke();
    const half = ground - (v + step / 2) * s; g.beginPath(); g.moveTo(rw - 8, half); g.lineTo(rw - 14, half); g.stroke();
    if (v > 0 && y > 10) g.fillText(fmtLen(v), 6, y + 3.5, rw - 22);
  }
  g.restore();
}
// the scarf, standing on its cast-on edge: real stitches when rows are big enough, else the per-stitch strip
const segCache = new Map();
function drawScarfUpright(g, x, ground, s, cm, d) {
  const rows = Math.ceil(store.n / WIDTH);
  if (!rows) return;
  const rowPx = s; // 1 cm a row
  const w = SCARF_W_CM * s, h = (store.n / WIDTH) * s;
  // a soft shadow
  g.save(); g.fillStyle = 'rgba(20,10,20,0.3)'; g.beginPath(); g.ellipse(x + w / 2, ground, w * 0.9, Math.max(2, w * 0.12), 0, 0, Math.PI * 2); g.fill(); g.restore();
  if (rowPx * d >= 3) {
    const seg = 50;
    const W = clamp(Math.round((SCARF_W_CM / WIDTH) * s * d), 3, 40);
    const visTop = Math.max(1, Math.floor((ground - g.canvas.height / d) / s));
    for (let r0 = 1; r0 <= rows; r0 += seg) {
      const r1 = Math.min(rows, r0 + seg - 1);
      if (ground - r1 * s > g.canvas.height / d + 50 && r1 < visTop) continue;
      const last = r1 === rows;
      const key = `${r0}|${W}|${last ? store.n + '|' + store.version : ''}|${store.runs.length}`;
      let b = segCache.get(key);
      if (!b) {
        const sc = segmentChart(store.runs, r0, r1, (i) => store.yarnAt(i));
        const res = renderSwatch(sc.chart, { yarnAt: sc.yarnAt, cellPx: W, castOnYarn: sc.castOnYarn, background: null, shadow: false, margin: W, bindOff: false });
        b = { c: res.canvas, W: res.W, H: res.H, x0: W, y0: W + 0.4 * res.H, rows: sc.rows, first: sc.fake ? sc.r0 - 1 : 1 };
        segCache.set(key, b); if (segCache.size > 20) segCache.delete(segCache.keys().next().value);
      }
      // source rows r0..r1 of the scarf -> bake rows (r - first + 1)
      const bTop = (r) => b.y0 + (b.rows - (r - b.first + 1)) * b.H;
      const sy0 = bTop(r1) - (last ? b.H * 0.6 : 0), sy1 = bTop(r0) + b.H + (r0 === 1 ? b.H * 0.8 : 0);
      const dy0 = ground - r1 * s - (last ? 0.6 * s : 0), dy1 = ground - (r0 - 1) * s + (r0 === 1 ? 0.8 * s : 0);
      const kx = w / (WIDTH * b.W);
      g.drawImage(b.c, b.x0 - b.W * 0.6, sy0, WIDTH * b.W + b.W * 1.2, sy1 - sy0, x - b.W * 0.6 * kx, dy0, w + b.W * 1.2 * kx, dy1 - dy0);
    }
  } else {
    const st = store.strips();
    g.save(); g.imageSmoothingEnabled = true;
    for (let i = 0; i < st.list.length; i++) {
      const lo = i * st.R, n = Math.min(st.R, rows - lo); if (n <= 0) break;
      const top = ground - (lo + n) * s, hh = n * s;
      if (top > g.canvas.height || top + hh < -10) continue;
      g.drawImage(st.list[i], 0, st.R - n, WIDTH, n, x, top, w, hh);
    }
    // roundness and a knitted sheen
    const sh = g.createLinearGradient(x, 0, x + w, 0);
    sh.addColorStop(0, 'rgba(30,10,30,0.35)'); sh.addColorStop(0.35, 'rgba(255,240,220,0.12)'); sh.addColorStop(0.6, 'rgba(30,10,30,0)'); sh.addColorStop(1, 'rgba(30,10,30,0.4)');
    g.fillStyle = sh; g.fillRect(x, ground - h, w, h);
    g.restore();
  }
  // Purl's basket at the foot, like a beanstalk growing out of it (about 45 cm wide)
  const bw = Math.max(26, 45 * s), bh = bw * (396 / 468);
  if (bw < (g.canvas.width / d) * 0.6) {
    const e = S.get().equipped;
    g.save(); g.beginPath(); g.rect(x - bw * 2, ground - bh * 3, bw * 4 + w, bh * 3 + 40); g.clip();
    drawStack(g, { x: x + w / 2 - bw * 0.35, y: ground - bh * 0.62, w: bw, h: bh }, { things: e.purl, holder: 'floor', yarn: store.current, purl: 'sleep', dpr: d });
    g.restore();
  }
}

function howCards(cm, last, next) {
  const box = how.cards;
  const out = [];
  const pic = (m) => el('img', { src: `assets/cmp/${m.img}.webp`, alt: '' });
  if (last) out.push(el('div', { class: 'hcard passed' }, pic(last), el('div', {}, el('h3', { text: `Taller than ${last.name}` }), el('p', { text: last.fact }))));
  if (next) {
    const sv = next.img ? pic(next) : silCanvas(next);
    out.push(el('div', { class: 'hcard next' }, sv, el('div', {}, el('h3', { text: `Next: ${goalText(next)}` }), el('small', { text: `${fmtLen(Math.max(1, next.cm - cm))} to go` }), el('p', { text: next.fact }))));
  }
  const slots = factSlots(cm + 1).map((c, j) => ({ c, j })).filter((x) => x.c <= cm);
  const facts = slots.filter((x) => x.j < FACTS.length), stats = slots.filter((x) => x.j >= FACTS.length);
  if (facts.length) {
    out.push(el('h3', { class: 'hsec', text: `Knitting facts you've found (${facts.length} of ${FACTS.length})` }));
    for (const x of facts.slice().reverse()) out.push(el('div', { class: 'hcard fact' }, el('span', { class: 'at', text: fmtLen(x.c) }), el('p', { text: FACTS[x.j] })));
  } else out.push(el('p', { class: 'hnote', text: `Knit to ${fmtLen(factSlots()[0])} for your first knitting fact.` }));
  if (stats.length) {
    out.push(el('h3', { class: 'hsec', text: 'Your scarf' }));
    for (const x of stats.slice(-8).reverse()) out.push(el('div', { class: 'hcard stat' }, el('span', { class: 'at', text: fmtLen(x.c) }), el('p', { text: statText(x.j - FACTS.length) })));
  }
  out.push(el('h3', { class: 'hsec', text: 'Someday…' }));
  for (const m of SOMEDAY) out.push(el('div', { class: 'hcard someday' + (m.cm <= cm ? ' passed' : '') }, silCanvas(m), el('div', {}, el('h3', { text: `${goalText(m)[0].toUpperCase()}${goalText(m).slice(1)}` }), el('small', { text: m.cm <= cm ? 'Done!' : `${fmtLen(m.cm - cm)} to go` }), el('p', { text: m.fact }))));
  box.replaceChildren(...out);
}
function silCanvas(m) {
  const c = el('canvas', { width: 120, height: 120, class: 'sil' });
  const g = c.getContext('2d');
  const asp = SIL_ASPECT[m.sil] || 0.5;
  const h = asp > 1 ? 100 / asp : 100, w = h * asp;
  const bg = g.createLinearGradient(0, 0, 0, 120); bg.addColorStop(0, '#2a2a5a'); bg.addColorStop(1, '#6a8ac0'); g.fillStyle = bg; g.fillRect(0, 0, 120, 120);
  silhouette(g, m.sil, 60 - w / 2, 112, w, h);
  return c;
}
void MILESTONES; void GOALS; void CHUNK; void scarfRowSpec; void parseChart; void fmtLen;
