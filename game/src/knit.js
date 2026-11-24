// knit.js — the knitting screen: taps → stitches, rip back, the yarn bar, the wording strip, tips,
// the basket slot, the preview card, the three layouts.
import { Work } from './work.js';
import { stripWording, wordingCursor } from './chart.js';
import { el, $, ICON, go, openSheet, closeSheet, openSheetName, registerScreen, currentScreen, fmt } from './ui.js';
import { onRelease, onHold, markKnit, setKeyHandler } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { chartOf, suggestedSlots, pieceRender } from './render.js';
import { yarnName, paintBallInto, sameYarn, normYarn } from './yarn.js';
import { drawNook, drawStack, stackLayout } from './scene.js';
import { openPicker, openPattern, openGlossary } from './sheets.js';
import { previewCard } from './previewCard.js';

let root = null, dom = {}, work = null;
let pattern = null, chart = null, piece = null;
let layout = '', finishing = false, taps = 0;
let lastTapT = -1e9, ballRot = 0;
let backdrop = null, backdropKey = '';
let stripKey = '';
let chipTimer = 0, undoSnap = null;
let heldKey = null, holdIv = 0, pointerHolds = new Map();
let menuFn = () => {};
export const setMenu = (fn) => { menuFn = fn; };

// ---------------------------------------------------------------- DOM (built once)
function build() {
  root = document.querySelector('[data-screen="knit"]');
  const ib = (name, label, cls = 'icon-btn') => { const b = el('button', { class: cls, 'aria-label': label, title: label }); b.innerHTML = ICON[name]; return b; };
  dom.canvas = el('canvas', { class: 'work', 'aria-label': 'Your knitting. Tap anywhere to knit a stitch.' });
  dom.fx = el('canvas', { class: 'work fx', 'aria-hidden': 'true' });
  dom.menu = ib('menu', 'Menu (Esc)');
  dom.progLine = el('div', { class: 'prog-line' });
  dom.progBar = el('i');
  dom.chips = el('div', { class: 'chip-host' });
  dom.progress = el('div', { class: 'progress' }, dom.progLine, el('div', { class: 'prog-bar' }, dom.progBar), dom.chips);
  dom.zoomOut = ib('minus', 'Zoom out (−)');
  dom.zoomIn = ib('plus', 'Zoom in (+)');
  dom.mute = ib('sound', 'Mute (M)');
  dom.rip = el('button', { class: 'rip-btn', 'aria-label': 'Rip back one stitch (Backspace)', title: 'Rip back (Backspace)' });
  dom.rip.innerHTML = ICON.rip + '<span>Rip back</span>';
  dom.top = el('header', { class: 'topbar' }, dom.menu, dom.progress, el('div', { class: 'zoom' }, dom.zoomOut, dom.zoomIn), dom.mute, dom.rip);
  dom.hint = el('div', { class: 'hint' }, el('span', { class: 'icw', html: ICON.hand }), 'Tap anywhere to knit');
  dom.tip = el('div', { class: 'tip', hidden: true });
  dom.workArea = el('div', { class: 'work-area' }, dom.hint, dom.tip);
  dom.basketCanvas = el('canvas');
  dom.basketSlot = el('div', { class: 'basket-slot' }, dom.basketCanvas);
  dom.pvCanvas = el('canvas');
  dom.pvBtn = el('button', { class: 'preview-card', 'aria-label': 'What you are making (V)', title: 'What you are making (V)' }, dom.pvCanvas);
  dom.pvSlot = el('div', { class: 'preview-slot' }, dom.pvBtn);
  dom.words = el('div', { class: 'words' });
  dom.q = el('button', { class: 'q', 'aria-label': 'Pattern glossary (G)', title: 'Pattern glossary (G)' }); dom.q.innerHTML = ICON.help;
  dom.strip = el('div', { class: 'strip' }, dom.words, dom.q);
  dom.bar = el('div', { class: 'yarnbar' });
  dom.panel = el('aside', { class: 'panel' }, dom.strip, dom.bar);
  root.append(dom.canvas, dom.fx, dom.top, dom.workArea, dom.basketSlot, dom.pvSlot, dom.panel);

  // yarn bar buttons (kept for the screen's life; only their balls are repainted)
  dom.skeins = ['A', 'B', 'C', 'D'].map((slot, i) => {
    const c = el('canvas');
    const b = el('button', { class: 'ybtn skein', 'aria-label': `Yarn ${slot} (${i + 1})`, title: `Yarn ${slot} (${i + 1})` }, c, el('span', { class: 'slot', text: slot }));
    b._c = c; b._slot = slot;
    onRelease(b, () => pickSlot(slot));
    return b;
  });
  dom.follow = el('button', { class: 'ybtn follow', 'aria-label': 'Follow chart (C)', title: 'Follow chart (C)' }, el('span', { class: 'icw', html: ICON.book }), 'Follow chart');
  onRelease(dom.follow, () => followChart());
  dom.basketBtn = el('button', { class: 'ybtn basket-btn', 'aria-label': 'Any yarn from the basket (Y)', title: 'Any yarn (Y)' },
    el('span', { class: 'bk' }, el('img', { src: 'assets/sprites/basket-back.png', alt: '' }), el('img', { src: 'assets/sprites/basket-front.png', alt: '' })));
  onRelease(dom.basketBtn, () => pickBasket());
  dom.recent = [0, 1, 2, 3, 4].map((i) => {
    const c = el('canvas');
    const b = el('button', { class: 'ybtn recent', 'aria-label': `Recent yarn ${i + 1} (${i + 5})` }, c);
    b._c = c;
    onRelease(b, () => useRecent(i));
    return b;
  });

  // buttons
  dom.menu.addEventListener('click', () => menuFn());
  dom.zoomIn.addEventListener('click', () => { work.zoomIn(); audio.play('ui', { gain: 0.5 }); });
  dom.zoomOut.addEventListener('click', () => { work.zoomOut(); audio.play('ui', { gain: 0.5 }); });
  dom.mute.addEventListener('click', () => toggleMute());
  dom.q.addEventListener('click', () => openGlossary(chart, pattern));
  onRelease(dom.pvBtn, () => previewCard.open());
  onHold(dom.rip, {
    press: () => { ripOne(true); },
    start: () => audio.ripLoopStart(),
    repeat: () => ripOne(false),
    end: () => audio.ripLoopStop(),
  });

  // every pointerdown that isn't on a button knits, right away; every pointer counts
  root.addEventListener('pointerdown', (e) => {
    if (window.gameReport && window.gameReport.isOpen()) return;
    if (currentScreen() !== 'knit' || openSheetName()) return;
    if (e.target.closest('button, input, a, .toast, .chip')) return;
    e.preventDefault();
    const r = knitOne();
    if (r) { const b = root.getBoundingClientRect(); flyers.push({ x: e.clientX - b.left, y: e.clientY - b.top, t0: performance.now(), color: (piece && piece.yarns[r.index] || currentYarn()).color }); }
    if (S.get().settings.hold) startPointerHold(e.pointerId);
  });
  const endHold = (e) => { const t = pointerHolds.get(e.pointerId); if (t) { clearTimeout(t.to); clearInterval(t.iv); pointerHolds.delete(e.pointerId); } };
  root.addEventListener('pointerup', endHold); root.addEventListener('pointercancel', endHold);
  root.addEventListener('wheel', (e) => {
    if (openSheetName()) return;
    e.preventDefault();
    const now = performance.now();
    if (now - (root._wz || 0) < 180) return;
    root._wz = now;
    if (e.deltaY < 0) work.zoomIn(); else if (e.deltaY > 0) work.zoomOut();
  }, { passive: false });
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keyup', (e) => { if (heldKey && e.code === heldKey) { heldKey = null; clearInterval(holdIv); } });

  work = new Work(dom.canvas, {
    dpr: Math.min(3, window.devicePixelRatio || 1),
    minFit: 8, maxFit: 28,
    fitBox: () => fitBox(),
    ballPoint: () => ballPoint(),
    background: (g, w, h) => drawBackdrop(g, w, h),
  });
  window.addEventListener('resize', () => { if (currentScreen() === 'knit') relayout(); });
}

function startPointerHold(id) {
  const to = setTimeout(() => { const t = pointerHolds.get(id); if (t) t.iv = setInterval(() => knitOne(), 1000 / 6); }, 300);
  pointerHolds.set(id, { to, iv: 0 });
}

// ---------------------------------------------------------------- layout
function pickLayout() {
  const w = innerWidth, h = innerHeight;
  if (h < 500 && w > h) return 'land';
  if (w >= 900 && w > h * 1.05) return 'desk';
  return 'port';
}
function relayout() {
  const l = pickLayout();
  if (l !== layout) {
    layout = l;
    root.classList.remove('lay-port', 'lay-land', 'lay-desk');
    root.classList.add(`lay-${l}`);
    fillBar();
  }
  root.classList.toggle('big-buttons', !!S.get().settings.big && l !== 'land');
  work.setMaxFit(layout === 'desk' ? 46 : 28);
  const r = dom.basketSlot.getBoundingClientRect();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  dom.basketCanvas.width = Math.round(r.width * dpr); dom.basketCanvas.height = Math.round(r.height * dpr);
  backdropKey = '';
  work.resize();
  previewCard.invalidate();
  toasts.anchor(dom.progress);
}
const relRect = (elm) => { const a = elm.getBoundingClientRect(), b = root.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }; };
function fitBox() {
  const r = relRect(dom.workArea);
  const p = layout === 'port' ? 8 : 12;
  const box = { x: r.x + p, y: r.y + p, w: Math.max(40, r.w - p * 2), h: Math.max(40, r.h - p * 2) };
  // on a phone held upright a wide, short piece sits low, just above the basket band, not adrift mid-screen
  if (layout === 'port' && chart && !chart.endless) {
    const cp = Math.max(8, Math.min(28, box.w / (chart.width + 5), box.h / ((chart.height + 3.2) * 0.72)));
    const need = (chart.height + 3.2) * 0.72 * cp;
    if (need < box.h) { box.y += box.h - need; box.h = need; }
  }
  return box;
}
// the basket body box inside the slot (slot-relative), sized so Purl's head fits above it
function basketBox(sw, sh) {
  const bh = sh * 0.74;
  let bw = bh * (468 / 396);
  const total = bw * 1.55;
  const k = total > sw ? sw / total : 1;
  const w = bw * k, h = bh * k;
  return { x: layout === 'desk' ? (sw - w * 1.55) / 2 + 4 : 4, y: sh - h - 3, w, h };
}
function ballPoint() {
  const s = relRect(dom.basketSlot);
  const b = basketBox(s.w, s.h);
  const L = stackLayout(b, S.get().equipped.holder);
  return { x: s.x + L.ball.x, y: s.y + L.ball.y - L.ball.size * 0.1 };
}

// ---------------------------------------------------------------- backdrop: the nook, blurred and dimmed in code
function drawBackdrop(g, w, h) {
  const key = `${Math.round(w)}x${Math.round(h)}|${S.get().equipped.decor.join(',')}`;
  if (key !== backdropKey || !backdrop) {
    backdropKey = key;
    const c = backdrop || document.createElement('canvas');
    const sc = 0.5; // blurred anyway: half resolution is plenty
    c.width = Math.max(2, Math.round(w * sc)); c.height = Math.max(2, Math.round(h * sc));
    const b = c.getContext('2d');
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height;
    drawNook(tmp.getContext('2d'), c.width, c.height, { decor: S.get().equipped.decor, photo: newestPhoto() });
    b.filter = 'blur(5px) saturate(0.9)';
    b.drawImage(tmp, -8, -8, c.width + 16, c.height + 16);
    b.filter = 'none';
    b.fillStyle = 'rgba(36,18,44,0.5)'; b.fillRect(0, 0, c.width, c.height);
    backdrop = c;
  }
  g.drawImage(backdrop, 0, 0, w, h);
  drawGhost(g);
}
// a faint ghost of the finished shape behind the work, so you can see what you're making
let ghostSegs = null, ghostChart = null;
// the outline of the chart's shape layer, as merged edge segments in grid units: x = column line, y = row line
// (row line b is the top of row b; the bottom of row 1 is line 0)
function ghostOutline() {
  if (ghostChart === chart && ghostSegs) return ghostSegs;
  const on = (r, c) => r >= 1 && r <= chart.height && c >= 0 && c < chart.width && !!chart.cell(r, c);
  const hz = new Map(), vt = new Map(); // key line -> sorted list of unit starts
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  for (let r = 1; r <= chart.height; r++) for (let c = 0; c < chart.width; c++) {
    if (!on(r, c)) continue;
    if (!on(r + 1, c)) push(hz, r, c);
    if (!on(r - 1, c)) push(hz, r - 1, c);
    if (!on(r, c - 1)) push(vt, c, r);
    if (!on(r, c + 1)) push(vt, c + 1, r);
  }
  const segs = [];
  const merge = (m, horiz) => {
    for (const [k, list] of m) {
      list.sort((x, y) => x - y);
      let s0 = list[0], prev = list[0];
      for (let i = 1; i <= list.length; i++) {
        if (i < list.length && list[i] === prev + 1) { prev = list[i]; continue; }
        if (horiz) segs.push({ h: true, y: k, x0: s0, x1: prev + 1 });
        else segs.push({ h: false, x: k, r0: s0, r1: prev }); // rows r0..r1
        if (i < list.length) { s0 = prev = list[i]; }
      }
    }
  };
  merge(hz, true); merge(vt, false);
  ghostChart = chart; ghostSegs = segs;
  return segs;
}
// a faint ghost of the finished shape behind the work: a dashed outline of the real silhouette, a whisper of fill
function drawGhost(g) {
  const G = chart && work ? work.geometry() : null;
  if (!G) return;
  const lineY = (b) => G.rowT(b + 1) + G.ch; // top of row b+1 == bottom of row b... line b sits under row b+1
  g.save();
  // fill: one rect per run, very faint
  g.beginPath();
  for (let r = 1; r <= chart.height; r++) for (const run of chart.row(r).runs) g.rect(G.colL(run.a), G.rowT(r), G.colL(run.b + 1) - G.colL(run.a), G.ch);
  g.fillStyle = 'rgba(246,236,217,0.05)'; g.fill();
  // outline
  g.beginPath();
  for (const sg of ghostOutline()) {
    if (sg.h) { const y = lineY(sg.y); g.moveTo(G.colL(sg.x0), y); g.lineTo(G.colL(sg.x1), y); }
    else { const x = G.colL(sg.x); g.moveTo(x, G.rowT(sg.r1)); g.lineTo(x, G.rowT(sg.r0) + G.ch); }
  }
  g.lineWidth = Math.max(1, Math.min(2, G.cp * 0.08));
  g.setLineDash([Math.max(2, G.cp * 0.18), Math.max(3, G.cp * 0.26)]);
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(246,236,217,0.32)'; g.stroke();
  g.restore();
}
function newestPhoto() {
  if (!S.get().equipped.decor.includes('frame')) return null;
  const w = S.wall()[0] || S.get().gallery[S.get().gallery.length - 1];
  if (!w) return null;
  const p = S.patternById(w.pattern);
  return p ? pieceRender(w, p, 3) : null;
}

// ---------------------------------------------------------------- the basket slot (drawn by the always-on loop)
const flyers = [];
let castAnim = null, sparkleRow = null;
// the effects overlay: cast-on reveal, the little loop flying from the tap to the needle, every-10th-row sparkle
function drawFx(t) {
  const c = dom.fx;
  const busy = flyers.length || castAnim || sparkleRow;
  if (!busy) { if (c._dirty) { c.getContext('2d').clearRect(0, 0, c.width, c.height); c._dirty = false; } return; }
  const dpr = work.dpr;
  const w = work.vw, h = work.vh;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); c._dirty = true;
  const G = work.geometry();
  if (castAnim && G && backdrop) {
    const p = (t - castAnim.t0) / 520;
    if (p >= 1) castAnim = null;
    else {
      // cover the cast-on row and its needle, then uncover it right to left: loops appear along the needle
      const x0 = G.colL(-3), x1 = G.colL(chart.width + 3), y0 = G.rowT(1) - G.ch * 1.4, y1 = G.rowT(1) + G.ch * 1.9;
      const edge = x1 - (x1 - x0) * Math.min(1, p * 1.1);
      const sx = backdrop.width / w, sy = backdrop.height / h;
      const cw = edge - x0;
      if (cw > 0) {
        g.drawImage(backdrop, x0 * sx, y0 * sy, cw * sx, (y1 - y0) * sy, x0, y0, cw, y1 - y0);
        g.save(); g.beginPath(); g.rect(x0, y0, cw, y1 - y0); g.clip(); drawGhost(g); g.restore();
      }
      g.fillStyle = 'rgba(255,240,200,0.8)';
      g.beginPath(); g.arc(edge, G.rowT(1) + G.ch * 0.2, G.cp * 0.18, 0, Math.PI * 2); g.fill();
    }
  }
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    const p = (t - f.t0) / 200;
    const tip = work.needleTip();
    if (p >= 1 || !tip) { flyers.splice(i, 1); continue; }
    const q = 1 - Math.pow(1 - p, 2);
    const x = f.x + (tip.x - f.x) * q, y = f.y + (tip.y - f.y) * q - Math.sin(q * Math.PI) * 30;
    g.strokeStyle = f.color; g.globalAlpha = 1 - p * 0.5; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(x, y, 5 * (1 - p * 0.5), 7 * (1 - p * 0.5), 0.4, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
  }
  if (sparkleRow && G) {
    const p = (t - sparkleRow.t0) / 800;
    if (p >= 1) sparkleRow = null;
    else {
      const R = chart.row(sparkleRow.r);
      for (const col of R.cols) {
        const ph = (p * 3 + col * 0.37) % 1;
        const a = Math.sin(ph * Math.PI) * (1 - p);
        const x = G.colC(col), y = G.rowT(sparkleRow.r) + G.ch * 0.3, s = G.cp * 0.22 * a + 0.5;
        g.fillStyle = `rgba(255,246,210,${a})`;
        g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.5, y); g.lineTo(x, y + s * 2); g.lineTo(x - s * 0.5, y); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(x - s * 2, y); g.lineTo(x, y + s * 0.5); g.lineTo(x + s * 2, y); g.lineTo(x, y - s * 0.5); g.closePath(); g.fill();
      }
    }
  }
}
export function castOnAnim() { castAnim = { t0: performance.now() }; }

export function frame(t) {
  if (currentScreen() !== 'knit' || !piece) return;
  drawFx(t);
  const c = dom.basketCanvas;
  if (!c.width) return;
  const g = c.getContext('2d');
  const dpr = c.width / Math.max(1, dom.basketSlot.getBoundingClientRect().width);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sw = c.width / dpr, sh = c.height / dpr;
  const b = basketBox(sw, sh);
  const since = t - lastTapT;
  ballRot = since < 600 ? Math.sin(since / 40) * Math.exp(-since / 200) * (3 * Math.PI / 180) : 0;
  const prog = chart ? piece.yarns.length / chart.total : 0;
  const e = S.get().equipped;
  drawStack(g, b, { t, mirror: layout !== 'desk', things: e.purl, holder: e.holder, yarn: currentYarn(), ballScale: 1 - 0.22 * prog, ballRot, dpr });
}

// ---------------------------------------------------------------- yarns
function currentIndex() { return piece ? piece.yarns.length : 0; }
function nextYarn(i = currentIndex()) {
  if (!piece.follow && piece.free) return piece.free;
  const L = chart.locate(Math.min(i, chart.total - 1));
  return (L && piece.slots[L.entry.slot]) || piece.slots.A || Object.values(piece.slots)[0];
}
const currentYarn = () => (piece && chart ? nextYarn() : { color: '#9e2a3a', type: 'wool' });
function slotsUsed() { return [...chart.slotsUsed].filter((s) => 'ABCD'.includes(s)).sort(); }

function fillBar() {
  if (!chart) return;
  const used = slotsUsed();
  const items = [];
  for (const b of dom.skeins) if (used.includes(b._slot)) items.push(b);
  items.push(dom.follow, dom.basketBtn, ...dom.recent);
  dom.bar.replaceChildren(...items);
  refreshBar();
}
function refreshBar() {
  if (!piece) return;
  const size = layout === 'desk' ? 46 : S.get().settings.big && layout !== 'land' ? 50 : 44;
  const nextSlot = piece.follow ? (chart.locate(Math.min(currentIndex(), chart.total - 1)) || { entry: { slot: 'A' } }).entry.slot : null;
  for (const b of dom.skeins) {
    const y = piece.slots[b._slot];
    if (y) paintBallInto(b._c, y, size);
    b.classList.toggle('next', b._slot === nextSlot);
    b.title = `Yarn ${b._slot}: ${y ? yarnName(y) : ''}`;
  }
  dom.follow.classList.toggle('on', !!piece.follow);
  dom.follow.setAttribute('aria-pressed', piece.follow ? 'true' : 'false');
  const rec = S.get().recent;
  dom.recent.forEach((b, i) => {
    const y = rec[i];
    paintBallInto(b._c, y || null, size);
    b.classList.toggle('empty', !y);
    b.classList.toggle('active-free', !!y && !piece.follow && sameYarn(y, piece.free));
    b.title = y ? `${yarnName(y)} (${i + 5})` : '';
  });
  work.setNextYarn(currentYarn());
}

function changeYarn(fn, label, yarn) {
  undoSnap = { slots: { ...piece.slots }, follow: piece.follow, free: piece.free, recent: S.get().recent.slice() };
  fn();
  audio.play('yarn');
  refreshBar();
  S.saveSoon();
  showChip(label, yarn);
}
function showChip(label, yarn) {
  clearTimeout(chipTimer);
  const undo = el('button', { text: 'Undo' });
  const chip = el('div', { class: 'chip' }, el('span', { class: 'dot', style: { background: yarn ? yarn.color : 'transparent' } }), el('span', { class: 't', text: label }), undo);
  onRelease(undo, () => doUndo());
  dom.chips.replaceChildren(chip);
  chipTimer = setTimeout(() => { dom.chips.replaceChildren(); undoSnap = null; }, 4000);
}
function doUndo() {
  if (!undoSnap) return;
  piece.slots = undoSnap.slots; piece.follow = undoSnap.follow; piece.free = undoSnap.free; S.get().recent = undoSnap.recent;
  undoSnap = null; clearTimeout(chipTimer); dom.chips.replaceChildren();
  audio.play('yarn', { rate: 0.9 });
  refreshBar(); S.saveSoon();
}
function pickSlot(slot) {
  if (!piece || !piece.slots[slot] && !slotsUsed().includes(slot)) return;
  openPicker({
    title: `Yarn ${slot}${slot === 'A' ? ' (main)' : ''}`, current: piece.slots[slot] || piece.slots.A,
    onPick: (y) => changeYarn(() => { piece.slots[slot] = y; S.pushRecent(y); }, `${slot}: ${yarnName(y)}${piece.follow ? '' : ' (when following the chart)'}`, y),
  });
}
function pickBasket() {
  if (!piece) return;
  openPicker({
    title: 'Any yarn (Freestyle)', current: currentYarn(),
    onPick: (y) => changeYarn(() => { piece.follow = false; piece.free = y; S.pushRecent(y); }, `Freestyle: ${yarnName(y)}`, y),
  });
}
function useRecent(i) {
  const y = S.get().recent[i];
  if (!y || !piece) return;
  if (!piece.follow && sameYarn(piece.free, y)) return;
  changeYarn(() => { piece.follow = false; piece.free = y; }, `Freestyle: ${yarnName(y)}`, y);
}
function followChart() {
  if (!piece || piece.follow) { if (piece) showChip('Following the chart', currentYarn()); return; }
  changeYarn(() => { piece.follow = true; }, 'Following the chart', null);
}

// ---------------------------------------------------------------- knitting
export function knitOne({ animate = true } = {}) {
  if (!piece || finishing || !chart) return null;
  const i = currentIndex();
  if (i >= chart.total) return null;
  const yarn = nextYarn(i);
  const res = work.knit(yarn, { animate });
  if (!res) return null;
  piece.yarns[i] = yarn;
  piece.updated = Date.now();
  S.get().lifetimeStitches += 1;
  markKnit();
  previewCard.stamp(i);
  if (animate) {
    lastTapT = performance.now();
    const R = chart.row(res.r);
    const purl = R.rs ? res.stitch === 'p' : res.stitch !== 'p';
    audio.tick({ purl, high: res.r % 10 === 0 });
    audio.vibrate(S.get().settings.vibrate);
    taps++;
    if (taps === 3) dom.hint.classList.add('fade');
    hud();
  }
  if (res.rowEnd) {
    if (animate) {
      setTimeout(() => { audio.play('row'); audio.play('counter', { gain: 0.8 }); }, 130);
      if (res.r % 10 === 0) sparkleRow = { r: res.r, t0: performance.now() + 120 };
      if (res.r === 1) tip('turn', 'The work turns. Now you knit back the other way.');
      if (res.r === 2) tip('yarn', 'Tap a yarn below to change color, any time, on any stitch.');
      afterCounts();
    }
    S.saveNow();
  } else if (animate) S.saveSoon();
  if (res.finished && animate) finishPiece();
  return res;
}
function afterCounts() {
  if (S.checkUnlocks().length) toasts.pump();
}
function ripOne(single) {
  if (!piece || finishing || !piece.yarns.length) return;
  const r = work.rip();
  if (!r) return;
  piece.yarns.length = r.index;
  previewCard.stamp(r.index);
  if (single) audio.play('rip');
  lastTapT = performance.now();
  hud();
  S.saveSoon();
}

function finishPiece() {
  finishing = true;
  toasts.hold(true);
  work.finish();
  const g = S.finishPiece(piece, pattern);
  S.checkUnlocks();
  hud();
  setTimeout(() => { finishing = false; piece = null; go('finished', g.id); }, 650);
  return g;
}

// fast knitting for the debug hook: real tap path, no animation or sound, one save at the end
export function knitMany(n, { fast = false } = {}) {
  let last = null;
  for (let k = 0; k < n; k++) {
    if (!piece || finishing) break;
    if (fast) {
      const i = currentIndex();
      if (i >= chart.total) break;
      const res = knitOne({ animate: false });
      if (!res) break;
      last = res;
      if (res.rowEnd) S.checkUnlocks();
      if (res.finished) { hud(); refreshBar(); S.saveNow(); toasts.pump(); return finishPiece(); }
    } else last = knitOne();
  }
  if (fast) { hud(); refreshBar(); S.saveNow(); toasts.pump(); }
  return last;
}
export function ripMany(n) { for (let k = 0; k < n; k++) ripOne(k === 0); }

// ---------------------------------------------------------------- the HUD
function hud() {
  if (!chart || !piece) return;
  const i = currentIndex();
  const done = i >= chart.total;
  const L = chart.locate(Math.min(i, chart.total - 1));
  dom.progLine.innerHTML = '';
  dom.progLine.append(el('b', { text: pattern.name }), ` · Row ${L.r} of ${chart.height} · ${fmt(i)} / ${fmt(chart.total)} stitches`);
  dom.progBar.style.width = `${(100 * i) / chart.total}%`;
  // wording strip (rebuilt only when its row or cursor changes)
  const w = stripWording(chart, L.r, L.k);
  const cur = done ? { token: -1 } : wordingCursor(w, L.k);
  const key = `${L.r}|${w.part}|${cur.token}|${cur.rep}|${cur.st}|${done}`;
  if (key !== stripKey) {
    stripKey = key;
    const frag = document.createDocumentFragment();
    frag.append(el('span', { class: 'lbl', text: w.label + ':' }), ' ');
    const m = w.text.match(/^with \w, /);
    if (m) frag.append(m[0]);
    w.tokens.forEach((t, j) => {
      if (j) frag.append(t.glue || ', ');
      frag.append(el('span', { class: 'tok' + (t.rep ? ' rep' : '') + (j === cur.token ? ' cur' : ''), text: t.text }));
    });
    if (w.countChanged && L.r > 1) frag.append(` (${w.count} sts)`);
    if (cur.reps) frag.append(el('span', { class: 'cnt', text: `rep ${cur.rep} of ${cur.reps} · st ${cur.st} of ${cur.of}` }));
    dom.words.replaceChildren(frag);
  }
  if (piece.follow) refreshNext();
}
let lastNextSlot = null;
function refreshNext() {
  const L = chart.locate(Math.min(currentIndex(), chart.total - 1));
  const s = L ? L.entry.slot : 'A';
  if (s !== lastNextSlot) { lastNextSlot = s; refreshBar(); }
}

// ---------------------------------------------------------------- tips (once each, never blocking)
let tipTimer = 0;
export function tip(id, text, ms = 6500) {
  const s = S.get();
  if (s.tips.includes(id)) return false;
  s.tips.push(id); S.saveSoon();
  dom.tip.replaceChildren(el('span', { class: 'icw', html: ICON.info }), el('span', { text }));
  dom.tip.hidden = false; dom.tip.classList.remove('out');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { dom.tip.classList.add('out'); setTimeout(() => { dom.tip.hidden = true; }, 450); }, ms);
  audio.play('card', { gain: 0.6 });
  return true;
}

// ---------------------------------------------------------------- mute
export function toggleMute() {
  const st = S.get().settings;
  const m = !(st.musicMuted && st.sfxMuted);
  st.musicMuted = m; st.sfxMuted = m;
  audio.setMuted(m, m);
  refreshMute();
  S.saveSoon();
}
export function refreshMute() {
  if (!dom.mute) return;
  const st = S.get().settings;
  const m = st.musicMuted && st.sfxMuted;
  dom.mute.innerHTML = m ? ICON.mute : ICON.sound;
  dom.mute.setAttribute('aria-label', m ? 'Unmute (M)' : 'Mute (M)');
}

// ---------------------------------------------------------------- keys
function onKey(e) {
  const k = e.key, code = e.code;
  const st = S.get().settings;
  if (openSheetName()) {
    if (k === 'Escape') { closeSheet(); return true; }
    if (k === ' ' || k === 'Enter' || k === 'k' || k === 'K') return openSheetName() === 'preview' ? (closeSheet(), true) : false;
    if ((k === 'v' || k === 'V') && openSheetName() === 'preview') { closeSheet(); return true; }
    if ((k === 'g' || k === 'G') && openSheetName() === 'glossary') { closeSheet(); return true; }
    return false;
  }
  if (k === ' ' || k === 'Enter' || k === 'k' || k === 'K') {
    if (e.repeat) return true;
    knitOne();
    if (st.hold) { heldKey = code; clearInterval(holdIv); holdIv = setInterval(() => { if (heldKey) knitOne(); else clearInterval(holdIv); }, 1000 / 6); }
    return true;
  }
  if (k === 'Backspace' || k === 'u' || k === 'U') {
    if (e.repeat) return true;
    ripOne(true);
    return true;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (k >= '1' && k <= '4') { const used = slotsUsed(); const s = used[+k - 1]; if (s) pickSlot(s); return true; }
  if (k >= '5' && k <= '9') { useRecent(+k - 5); return true; }
  if (k === 'y' || k === 'Y') { pickBasket(); return true; }
  if (k === 'c' || k === 'C') { followChart(); return true; }
  if (k === '+' || k === '=') { work.zoomIn(); return true; }
  if (k === '-' || k === '_') { work.zoomOut(); return true; }
  if (k === '0') { work.setZoom(0); return true; }
  if (k === 'v' || k === 'V') { previewCard.open(); return true; }
  if (k === 'g' || k === 'G') { openGlossary(chart, pattern); return true; }
  if (k === 'm' || k === 'M') { toggleMute(); return true; }
  if (k === 'Escape' || k === 'p' || k === 'P') { menuFn(); return true; }
  if (k === 'r' || k === 'R') { openPattern({ chart, pattern, slots: piece.slots, currentRow: chart.locate(Math.min(currentIndex(), chart.total - 1)).r }); return true; }
  return false;
}

// ---------------------------------------------------------------- enter / leave
function equipWork() {
  const e = S.get().equipped;
  work.setNeedles(e.needles); work.setMarkers(e.marker); work.setCounter(e.counter);
  audio.setNeedles(e.needles);
}
export function enter(patternId) {
  if (!root) build();
  pattern = S.patternById(patternId) || S.BOOK[0];
  chart = chartOf(pattern);
  piece = S.getPiece(pattern.id);
  if (!piece) piece = S.startPiece(pattern, suggestedSlots(pattern));
  for (const k of Object.keys(suggestedSlots(pattern))) if (!piece.slots[k]) piece.slots[k] = suggestedSlots(pattern)[k];
  S.get().lastPiece = pattern.id;
  finishing = false; stripKey = ''; lastNextSlot = null; taps = 0;
  dom.hint.hidden = S.get().tips.includes('hint');
  dom.hint.classList.remove('fade');
  if (!dom.hint.hidden) { S.get().tips.push('hint'); }
  dom.tip.hidden = true;
  layout = '';
  root.hidden = false; // measure with the screen showing
  relayout();
  equipWork();
  const castOn = piece.castOn ? normYarn(piece.castOn) : piece.slots.A;
  work.load(chart, { yarns: piece.yarns, done: piece.yarns.length, castOnYarn: castOn, nextYarn: currentYarn() });
  work.setZoom(0);
  previewCard.load(chart, pattern, piece);
  previewCard.attach(dom.pvCanvas);
  if (!S.get().recent.length) for (const y of Object.values(piece.slots).reverse()) S.pushRecent(y);
  fillBar(); hud(); refreshMute();
  setKeyHandler(onKey);
  audio.music('nook'); audio.ambience(true);
  if (slotsUsed().length >= 2) tip('follow', 'Follow chart switches yarns for you. Pick any yarn to knit your own way.');
  toasts.anchor(dom.progress);
  toasts.hold(false);
  if (piece.yarns.length === 0) { audio.play('caston'); castOnAnim(); }
  S.saveNow();
}
export function leave() {
  setKeyHandler(null);
  clearInterval(holdIv); heldKey = null;
  audio.ripLoopStop();
  toasts.anchor(null);
  previewCard.detach(dom.pvCanvas);
  if (piece) { piece.updated = Date.now(); S.saveNow(); }
}

export function onEquipChange() { if (work) { equipWork(); backdropKey = ''; work._kick && work._kick(); } }

export function knitState() {
  if (!work || !chart || !piece) return { pattern: pattern ? pattern.id : null };
  const ws = work.state();
  const i = currentIndex();
  const L = chart.locate(Math.min(i, chart.total - 1));
  return {
    pattern: pattern.id, pieceId: piece.id, row: L.r, rs: chart.row(L.r).rs, stitch: i, total: chart.total,
    yarn: currentYarn(), mode: piece.follow ? 'follow' : 'freestyle', slots: piece.slots,
    zoom: ws.zoom, cellPx: +ws.cellPx.toFixed(2), fabricCanvas: ws.fabricCanvas, layout,
    previewCard: previewCard.state(dom.pvCanvas), fitBox: fitBox(), needle: ws.needle,
  };
}
export function setSlotYarn(slot, y) { if (!piece) return false; piece.slots[slot] = y; S.pushRecent(y); refreshBar(); S.saveSoon(); return true; }
export function setFreestyle(y) { if (!piece) return false; piece.follow = false; piece.free = y; S.pushRecent(y); refreshBar(); S.saveSoon(); return true; }
export const activePiece = () => piece;

registerScreen('knit', { enter: (id) => enter(id), leave });
