// room.js — the cozy room (Change 3, CHANGE_3.md): a painted room (room-land / room-port, with their surfaces
// from room-*.json) where finished dolls, the cat, toys, pillows, blankets and unlocked room pieces are
// arranged by dragging them from "Your things", a code-drawn wooden tray. Each thing is rendered once at
// the room's scale (a room-only cache, freed on leaving) and placed by CSS transforms; furniture fronts
// are <img>s drawn over the things on them. Rules (sizes, surfaces, packing, fitting) are roomRules.js.
// go('room', {hold: ref}) opens it with a thing in hand ("Tap a place in the room").
import { el, ICON, go, registerScreen, openSheet, closeSheet, currentScreen, openSheetName, onSheet } from './ui.js';
import { setKeyHandler } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { galTabs } from './galTabs.js';
import * as R from './roomRules.js';
import { loadDolls, composeDoll, dressedDoll, outfitOf, dollSize, DOLL_NAMES, drapeOnto } from './worn.js';
import { renderSwatch } from './work.js';
import { recordChart, pieceRender } from './render.js';
import { plushify, toyEyes, isToy } from './plush.js';
import { detail as galleryDetail } from './gallery.js';
import { coatNow } from './catCoat.js';
import { store as scarfStore } from './scarfStore.js';

let root = null, menuFn = () => {};
export const setMenu = (fn) => { menuFn = fn; };
const here = () => currentScreen() === 'room';
const DPR = () => Math.min(2, window.devicePixelRatio || 1);
const qs = new URLSearchParams(location.search);
const SURF = qs.has('surfaces'), FILL = SURF && qs.has('fill');

// ---------------------------------------------------------------- the art
const ART = { land: null, port: null, pieces: {}, frame: null, fronts: {} };
let artP = null;
const loadImg = (src) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
export function loadRoomArt() {
  if (artP) return artP;
  artP = (async () => {
    const pics = await Promise.all(['land', 'port'].map(async (o) => {
      let json = null;
      try { json = await (await fetch(`assets/bg/room-${o}.json`)).json(); } catch { json = null; }
      const img = await loadImg(`assets/bg/room-${o}.webp`);
      return { o, json, img };
    }));
    for (const p of pics) ART[p.o] = p;
    const jobs = [];
    for (const p of pics) for (const [id, f] of Object.entries((p.json && p.json.fronts) || {})) jobs.push(loadImg(`assets/bg/${f.file}`).then((im) => { ART.fronts[`${p.o}|${id}`] = im; }));
    for (const it of Object.keys(R.PIECES)) if (it !== 'frame') jobs.push(loadImg(`assets/items/room-${it}.png`).then((im) => { ART.pieces[it] = im; }));
    jobs.push(loadImg('assets/items/decor-frame.png').then((im) => { ART.frame = im; }));
    await Promise.all(jobs);
    return ART;
  })();
  return artP;
}
export const pieceImage = (item) => (item === 'frame' ? ART.frame : ART.pieces[item]) || null;
// each sprite's opaque box in its own px (measured from the art), for the feet and hit boxes
const PIECE_BOX = { books: [6, 4, 338, 270], chest: [6, 9, 447, 374], garland: [5, 5, 460, 171], lamp: [5, 7, 287, 945], plant: [7, 5, 291, 412], table: [6, 8, 335, 475], teaset: [6, 6, 344, 265], frame: [5, 5, 310, 315] };

// ---------------------------------------------------------------- geometry (pure: the Bag's preview uses it too)
// the picture for an area: room-land when it's wider than tall
export const pictureFor = (w, h) => (w > h ? 'land' : 'port');
function lineGeom(J, sid, W, H) {
  const s = J.surfaces[sid]; if (!s || !s.line) return null;
  const [[x0, y0], [x1, y1]] = s.line;
  return { p0: [x0 * W, y0 * H], p1: [x1 * W, y1 * H], U: s.scale * H, cap: R.SURFACES[sid].capacity };
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// where each saved thing stands: {feet [x, y], U (px per ru)} for lines, {box} for hooks, {quads} for drapes
export function placements(pic, W, H, list) {
  const J = ART[pic] && ART[pic].json; if (!J) return new Map();
  const out = new Map();
  for (const sid of R.SURFACE_IDS) {
    const Sf = R.SURFACES[sid], js = J.surfaces[sid]; if (!js) continue;
    const on = list.filter((e) => e.surface === sid);
    if (Sf.kind === 'line') {
      const G = lineGeom(J, sid, W, H);
      for (const it of R.packSurface(on, sid)) out.set(it.e, { sid, feet: lerp(G.p0, G.p1, it.t / G.cap), U: G.U, t: it.t });
    } else if (Sf.kind === 'hook') {
      const [x, y, w, h] = js.box;
      for (const e of on) out.set(e, { sid, box: [x * W, y * H, w * W, h * H] });
    } else {
      for (const e of on) out.set(e, { sid, quads: js.parts.map((q) => q.map(([x, y]) => [x * W, y * H])), over: js.over });
    }
  }
  return out;
}
// the Bag's Room tab preview: room-land with the room pieces now placed (sprites only)
export function drawRoomPreview(g, w, h) {
  const A = ART.land; if (!A || !A.img) return;
  const iw = A.img.naturalWidth, ih = A.img.naturalHeight;
  // a small thumbnail of the whole room, the strip around it in the room's own blurred colours
  const s = Math.min(w / iw, h / ih), W = iw * s, H = ih * s, ox = (w - W) / 2, oy = (h - H) / 2;
  g.save(); g.filter = 'blur(14px) brightness(0.6)'; g.drawImage(A.img, -w * 0.1, -h * 0.1, w * 1.2, h * 1.2); g.restore();
  g.save(); g.shadowColor = 'rgba(20,8,16,0.5)'; g.shadowBlur = 12; g.drawImage(A.img, ox, oy, W, H); g.restore();
  const list = S.get().room.filter((e) => R.kindOf(e.ref) === 'piece' && R.available(e.ref));
  const pl = placements('land', W, H, list);
  for (const e of list) {
    const p = pl.get(e); const it = e.ref.slice(6); const im = pieceImage(it); if (!p || !im) continue;
    const bx = PIECE_BOX[it];
    if (p.box) {
      const [x, y, bw, bh] = p.box; const k = Math.min(bw / im.width, bh / im.height);
      if (it === 'frame') drawFramed(g, ox + x + (bw - im.width * k) / 2, oy + y + (bh - im.height * k) / 2, im.width * k, im.height * k);
      else g.drawImage(im, ox + x + (bw - im.width * k) / 2, oy + y + (bh - im.height * k) / 2, im.width * k, im.height * k);
      continue;
    }
    const k = (R.PIECES[it].h * p.U) / (bx[3] - bx[1]);
    g.save(); g.translate(ox + p.feet[0], oy + p.feet[1]); if (e.flip) g.scale(-1, 1);
    g.drawImage(im, -((bx[0] + bx[2]) / 2) * k, -bx[3] * k, im.width * k, im.height * k);
    g.restore();
  }
}
// the framed picture: the empty frame with the newest gallery piece in its inner box (as the nook's)
function newestPiece() { const gs = S.get().gallery; let n = null; for (const g of gs) if (!n || g.finished > n.finished) n = g; return n; }
function drawFramed(g, x, y, w, h) {
  if (ART.frame) g.drawImage(ART.frame, x, y, w, h);
  const n = newestPiece(); const p = n && S.patternById(n.pattern);
  if (!p) return;
  let photo = null;
  try { photo = pieceRender(n, p, 4); } catch { photo = null; }
  if (!photo || !photo.width) return;
  const ix = x + w * 0.2, iy = y + h * 0.2, iw = w * 0.6, ih = h * 0.6;
  const k = Math.min(iw / photo.width, ih / photo.height);
  g.fillStyle = '#efe4cf'; g.fillRect(ix, iy, iw, ih);
  g.drawImage(photo, ix + (iw - photo.width * k) / 2, iy + (ih - photo.height * k) / 2, photo.width * k, photo.height * k);
}

// ---------------------------------------------------------------- rendering things (the room-only cache)
// info: {el: canvas|img, bw, bh, ax, ay (the feet, bmp px), ppr (bmp px per ru), trim [x0, y0, x1, y1], hook}
const cache = new Map();
let kDev = 0; // the room scale: device px per ru on the rug
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
function alphaBox(c) {
  const w = c.width, h = c.height; const d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < x0 ? [0, 0, w, h] : [x0, y0, x1 + 1, y1 + 1];
}
const dollSig = (id) => {
  const purlDressed = id !== 'purl' || S.isUnlocked('doll:purl');
  const o = purlDressed ? outfitOf(id) : {};
  const sig = Object.entries(o).map(([s, v]) => `${s}:${v === 'scarf' ? 'scarf' : v.gid}`).sort().join(',');
  const sv = o.neck === 'scarf' ? `${scarfStore.n}|${scarfStore.runs ? scarfStore.runs.length : 0}` : '';
  return { o, key: `${sig}|${sv}|${id === 'purl' ? `${coatNow()}|${S.get().equipped.purl.join('+')}` : ''}` };
};
function renderKey(ref, pic) {
  const k = R.kindOf(ref);
  if (k === 'doll' || k === 'purl') return `d|${ref}|${dollSig(ref.slice(5)).key}`;
  if (k === 'piece') return ref === 'piece:frame' ? `f|${(newestPiece() || {}).id || ''}` : `p|${ref}`;
  if (k === 'blanket') return `b|${ref}|${pic || ''}`;
  return `g|${ref}|${(S.galleryById(ref) || {}).name || ''}`;
}
function renderThing(ref) {
  const key = renderKey(ref);
  if (cache.has(key)) return cache.get(key);
  let info = null;
  try { info = renderNew(ref); } catch (e) { console.warn('room render', ref, e); }
  if (info) cache.set(key, info);
  return info;
}
function renderNew(ref) {
  const kind = R.kindOf(ref);
  if (kind === 'doll' || kind === 'purl') {
    const id = ref.slice(5);
    const { o } = dollSig(id);
    if (kind === 'doll') {
      const k = kDev / 624; // 1 ru = 624 doll px (ground 724, Pip's crown 100)
      const c = composeDoll(id, o, k, { noLabel: true });
      const [fw] = dollSize(id);
      return { el: c, bw: c.width, bh: c.height, ax: (fw / 2) * k, ay: 724 * k, ppr: kDev, trim: alphaBox(c) };
    }
    const k = (0.8 * kDev) / 490; // the sitting cat: 490 px from the ground (496) to her ear tips
    const c = composeDoll('purl', o, k, { noLabel: true });
    return { el: c, bw: c.width, bh: c.height, ax: 268 * k, ay: 496 * k, ppr: kDev, trim: alphaBox(c) };
  }
  if (kind === 'piece') {
    const it = ref.slice(6); const im = pieceImage(it); if (!im) return null;
    const bx = PIECE_BOX[it];
    if (it === 'frame') {
      const c = mk(im.width, im.height); drawFramed(c.getContext('2d'), 0, 0, im.width, im.height);
      return { el: c, bw: c.width, bh: c.height, ax: c.width / 2, ay: bx[3], ppr: bx[3] - bx[1], trim: bx, hook: true };
    }
    const img = new Image(); img.src = im.src; img.draggable = false; img.alt = '';
    const P = R.PIECES[it];
    return { el: img, bw: im.width, bh: im.height, ax: (bx[0] + bx[2]) / 2, ay: bx[3] - (P.h ? 4 : 0), ppr: P.h ? (bx[3] - bx[1]) / P.h : bx[3] - bx[1], trim: bx, hook: !!P.hook };
  }
  // a toy (plush, with its eyes) or a pillow (plush), or a blanket's flat stand-in (in hand and in the tray)
  const g = S.galleryById(ref); const p = g && S.patternById(g.pattern); if (!p) return null;
  const chart = recordChart(g, p);
  const { h } = R.sizeOf(ref);
  const ys = g.yarns; const yarnAt = (i) => ys[i] || ys[ys.length - 1] || { color: '#9e2a3a', type: 'wool' };
  if (kind === 'blanket') {
    const W = Math.max(3, Math.round((0.9 * kDev) / Math.max(chart.width, chart.height * 0.72)));
    const flat = renderSwatch(chart, { yarnAt, cellPx: W, castOnYarn: g.castOn || ys[0], background: null }).canvas;
    const tb = alphaBox(flat);
    return { el: flat, bw: flat.width, bh: flat.height, ax: (tb[0] + tb[2]) / 2, ay: tb[3], ppr: (tb[3] - tb[1]) / 0.8, trim: tb };
  }
  const W = Math.max(2, Math.round((h * kDev) / (chart.height * 0.72 + 3.6)));
  const flat = renderSwatch(chart, { yarnAt, cellPx: W, castOnYarn: g.castOn || ys[0], background: null }).canvas;
  let eyes = [];
  if (isToy(p)) {
    const H = Math.round(W * 0.72), m = Math.round(W * 0.6);
    eyes = toyEyes(p, chart, g.slots).map((e) => ({ x: m + e.c * W + W / 2, y: m + 0.4 * H + (chart.height - e.r) * H + H * 0.55, color: e.color }));
  }
  const pl = plushify(flat, { cell: W, eyes }).canvas;
  flat.width = flat.height = 0;
  const tb = alphaBox(pl);
  return { el: pl, bw: pl.width, bh: pl.height, ax: (tb[0] + tb[2]) / 2, ay: tb[3] - (tb[3] - tb[1]) * 0.04, ppr: (tb[3] - tb[1]) / h, trim: tb };
}
// a blanket on a drape: its two parts, rendered for this picture at the room scale
function renderDrape(ref, sid) {
  const key = `b|${ref}|${pic}|${sid}`;
  if (cache.has(key)) return cache.get(key);
  const J = ART[pic].json.surfaces[sid]; if (!J) return null;
  const RH = (kDev / R_UNIT()) , RW = RH * aspect();
  const mesh = J.parts.map((q) => q.map(([x, y]) => [x * RW, y * RH]));
  const g = S.galleryById(ref); const p = g && S.patternById(g.pattern);
  const chart = p && recordChart(g, p);
  // about 3 stitches across a doll's body
  const cell = Math.max(3, Math.round(kDev / 16));
  let parts = null;
  try { parts = drapeOnto(ref, mesh, cell); } catch (e) { console.warn('drape', e); }
  void chart;
  if (!parts) return null;
  const info = { parts, RW, RH, over: J.over };
  cache.set(key, info);
  return info;
}
function freeCache() {
  for (const info of cache.values()) {
    if (info.el && info.el.tagName === 'CANVAS') { info.el.width = info.el.height = 0; }
    if (info.parts) for (const p of info.parts) { p.canvas.width = p.canvas.height = 0; }
  }
  cache.clear();
}

// ---------------------------------------------------------------- the screen's state
let pic = 'land', box = { w: 0, h: 0, x: 0, y: 0 }, side = false;
let dom = null; // {top, body, stage, box, tray, list, head, msg, soft, bar, svg}
const things = new Map(); // key -> {ref, e (entry), btn, vis, bob, info, part2}
let held = null; // {ref, key, entry (in the room) or null, via 'pointer' | 'key', pointerId, el, gx, gy, sid, t}
let armed = null; // tap-then-tap: {ref, entry|null}
let selected = null; // key
let press = null; // a pointer press not yet a drag
let fillList = null; // ?surfaces&fill: a display-only room
let tipOpen = false;
const list = () => fillList || S.get().room;
const keyOf = (e) => e.key || e.ref;
const visibleEntry = (e) => (fillList ? true : R.available(e.ref));
const R_UNIT = () => (ART[pic] && ART[pic].json ? ART[pic].json.surfaces.rug.scale : 0.2);
const aspect = () => { const s = ART[pic] && ART[pic].json && ART[pic].json.size; return s ? s[0] / s[1] : 1.5; };
const U_RUG = () => R_UNIT() * box.h;

function say(text, ms = 2600) {
  if (!dom) return;
  dom.msg.textContent = text; dom.msg.classList.add('show');
  clearTimeout(dom.msg._t); dom.msg._t = setTimeout(() => dom && dom.msg.classList.remove('show'), ms);
}
function speak(text) { if (dom) { dom.live.textContent = ''; requestAnimationFrame(() => { if (dom) dom.live.textContent = text; }); } }

// ---------------------------------------------------------------- render the screen
function shortLand() { return innerHeight < 500 && innerWidth > innerHeight; }
function render() {
  root = document.querySelector('[data-screen="room"]');
  cancelHeld(true);
  const back = el('button', { class: 'icon-btn', 'aria-label': 'Back to the book', title: 'Back to the book' }); back.innerHTML = ICON.back;
  back.addEventListener('click', () => { audio.play('ui'); go('book'); });
  const menu = el('button', { class: 'icon-btn', 'aria-label': 'Menu', title: 'Menu' }); menu.innerHTML = ICON.menu;
  menu.addEventListener('click', () => menuFn());
  side = shortLand();
  const tabs = galTabs('room', (id) => id === 'room');
  const top = el('div', { class: 'gal-top' }, back, el('h2', { text: 'Gallery' }));
  if (side) top.append(tabs);
  top.append(menu);
  const stage = el('div', { class: 'room-stage' });
  const bx = el('div', { class: 'room-box' });
  const msg = el('div', { class: 'room-msg', 'aria-hidden': 'true' });
  const live = el('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  stage.append(bx, msg, live);
  const listEl = el('div', { class: 'tray-list' });
  const tidy = el('button', { class: 'btn small tray-tidy', text: 'Tidy up' });
  tidy.addEventListener('click', () => { audio.play('ui'); confirmTidy(); });
  const head = el('div', { class: 'tray-head' }, el('span', { class: 'tray-title', text: 'Your things' }), tidy);
  const tray = el('div', { class: 'tray', 'aria-label': 'Your things' }, listEl, head);
  const body = el('div', { class: 'room-body' + (side ? ' side' : '') }, stage, tray);
  root.className = 'screen gallery-screen room-screen' + (side ? ' side' : '');
  root.replaceChildren(top, ...(side ? [] : [tabs]), body);
  dom = { top, body, stage, box: bx, tray, list: listEl, head, msg, live, soft: null, bar: null, svg: null };
  things.clear();
  // the room's box: the picture contained in the stage
  const sr = stage.getBoundingClientRect();
  const want = pictureFor(sr.width, sr.height);
  pic = ART[want] && ART[want].json ? want : (ART.land && ART.land.json ? 'land' : want);
  const a = aspect();
  const w = Math.min(sr.width, sr.height * a), h = w / a;
  box = { w, h, x: (sr.width - w) / 2, y: (sr.height - h) / 2 };
  Object.assign(bx.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${w}px`, height: `${h}px` });
  const A = ART[pic];
  if (A && A.img) bx.append(el('img', { class: 'room-bg', src: A.img.src, alt: 'A cozy room: a window seat under a snowy window, two shelves on the wall, an armchair and a braided rug', draggable: 'false' }));
  // the fronts (drawn over the things on their furniture)
  const L = (sid) => R.LAYERS.indexOf(sid);
  for (const [id, f] of Object.entries((A && A.json && A.json.fronts) || {})) {
    const im = ART.fronts[`${pic}|${id}`]; if (!im) continue;
    const layer = id === 'chair' ? 'chair' : id;
    bx.append(el('img', { class: 'room-front', src: im.src, alt: '', draggable: 'false', style: { left: `${f.offset[0] * w}px`, top: `${f.offset[1] * h}px`, width: `${f.size[0] * w}px`, height: `${f.size[1] * h}px`, zIndex: L(layer) * 100 + 80 } }));
  }
  // the room scale: rendered once (again only if it grows by more than a quarter)
  const k = Math.min(600, U_RUG() * DPR());
  if (!kDev || k > kDev * 1.25) { freeCache(); kDev = k; }
  for (const e of list()) if (visibleEntry(e)) addThing(e);
  layout();
  renderTray();
  softLine();
  if (SURF) drawSurfaces();
  // the dressing of the cat and the dolls may have changed while away: those re-render by their keys
  bindPointers();
}

function addThing(e) {
  const ref = e.ref, key = keyOf(e);
  const kind = R.kindOf(ref);
  const btn = el('button', { class: 'rt', 'data-key': key, draggable: 'false', type: 'button' });
  const vis = el('span', { class: 'rt-vis' });
  const shadow = el('span', { class: 'rt-shadow' });
  const bob = el('span', { class: 'rt-bob' });
  vis.append(shadow, bob); btn.append(vis);
  const T = { ref, key, e, btn, vis, bob, shadow, info: null, part2: null, kind };
  if (kind === 'blanket' && R.SURFACES[e.surface] && R.SURFACES[e.surface].kind === 'drape') {
    const D = renderDrape(ref, e.surface);
    T.drape = D;
    btn.classList.add('rt-drape');
    if (D) {
      bob.append(D.parts[0].canvas);
      const p2 = el('span', { class: 'rt-drape2', 'data-key': key }); p2.append(D.parts[1].canvas);
      T.part2 = p2; dom.box.append(p2);
    }
  } else {
    T.info = renderThing(ref);
    if (T.info) {
      // one bitmap per thing; a second copy (only ?surfaces&fill shows any) draws its own
      let pic0 = T.info.el;
      if (pic0.isConnected) {
        if (pic0.tagName === 'CANVAS') { const c = mk(pic0.width, pic0.height); c.getContext('2d').drawImage(pic0, 0, 0); pic0 = c; } else pic0 = pic0.cloneNode();
      }
      bob.append(pic0);
    }
    if (T.info && T.info.hook) btn.classList.add('rt-hook');
  }
  dom.box.append(btn);
  btn.addEventListener('focus', () => { if (!held && !press) select(key, { quiet: true, focus: false }); });
  things.set(key, T);
  label(T);
  return T;
}
function label(T) {
  const where = T.e && R.SURFACES[T.e.surface] ? R.SURFACES[T.e.surface].name : 'the room';
  const on = T.e && R.SURFACES[T.e.surface] && ['hook', 'drape'].includes(R.SURFACES[T.e.surface].kind) ? (T.e.surface === 'frame-hook' ? 'on the wall' : T.e.surface === 'garland-hook' ? 'in the window' : `over ${where}`) : `on ${where}`;
  T.btn.setAttribute('aria-label', `${R.nameOf(T.ref)}, ${on}`);
}
function removeThing(key) {
  const T = things.get(key); if (!T) return;
  T.btn.remove(); if (T.part2) T.part2.remove();
  things.delete(key);
  if (selected === key) deselect();
}

// place every thing (transforms and sizes only)
function layout() {
  if (!dom) return;
  const pl = placements(pic, box.w, box.h, list().filter(visibleEntry));
  const U0 = U_RUG();
  const order = [];
  for (const T of things.values()) {
    if (held && held.key === T.key) continue;
    const p = pl.get(T.e); if (!p) continue;
    const li = R.LAYERS.indexOf(R.SURFACES[T.e.surface].layer);
    if (p.quads) { placeDrape(T, p, li); order.push([li, -1, T]); continue; }
    if (p.box) {
      const info = T.info; if (!info) continue;
      const [x, y, bw, bh] = p.box;
      const k = Math.min(bw / info.bw, bh / info.bh);
      const S0 = k * info.ppr;
      position(T, [x + bw / 2, y + (bh + info.bh * k) / 2 - (info.bh - info.ay) * k], S0, U0, li * 100 + 10, false);
      order.push([li, x, T]);
      continue;
    }
    position(T, p.feet, p.U, U0, li * 100 + 10 + Math.min(60, T.e.z), T.e.flip);
    order.push([li, p.feet[0], T]);
  }
  // tab order: back to front, left to right (never moving a focused thing: its focus would drop)
  if (!dom.box.contains(document.activeElement)) {
    order.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const [, , T] of order) dom.box.append(T.btn);
    if (dom.bar && selected && things.get(selected)) things.get(selected).btn.after(dom.bar);
  }
  if (dom.bar && selected) placeBar();
  if (SURF) drawSurfaces();
}
// a thing's button: its hit box (at least 44 × 44, centred on the feet) translated, its picture scaled
function position(T, feet, U, U0, z, flip) {
  const info = T.info; if (!info) return;
  T.feet = feet; T.U = U;
  const k = U / info.ppr, k0 = U0 / info.ppr, s = U / U0;
  let [x0, y0, x1, y1] = info.trim;
  let l = (x0 - info.ax) * k, r = (x1 - info.ax) * k; if (flip) [l, r] = [-r, -l];
  const t = (y0 - info.ay) * k, b = (y1 - info.ay) * k;
  let hw = r - l, hh = b - t, hx = feet[0] + l, hy = feet[1] + t;
  if (hw < 44) { hx -= (44 - hw) / 2; hw = 44; }
  if (hh < 44) { hy -= (44 - hh) / 2; hh = 44; }
  T.hit = [hx, hy, hw, hh];
  const st = T.btn.style;
  st.width = `${hw}px`; st.height = `${hh}px`; st.transform = `translate(${hx}px, ${hy}px)`; st.zIndex = z;
  const v = T.vis.style;
  v.width = `${info.bw * k0}px`; v.height = `${info.bh * k0}px`;
  v.left = `${feet[0] - hx - info.ax * k0}px`; v.top = `${feet[1] - hy - info.ay * k0}px`;
  v.transformOrigin = `${info.ax * k0}px ${info.ay * k0}px`;
  v.transform = `scale(${flip ? -s : s}, ${s})`;
  T.bob.style.transformOrigin = `${info.ax * k0}px ${info.ay * k0}px`;
  if (!info.hook && !T.shadowSet) {
    const { foot } = T.kind ? R.sizeOf(T.ref) : { foot: 0.6 };
    const sw = foot * U0 * 1.05, sh = Math.max(4, U0 * 0.09);
    Object.assign(T.shadow.style, { width: `${sw}px`, height: `${sh}px`, left: `${info.ax * k0 - sw / 2}px`, top: `${info.ay * k0 - sh * 0.6}px`, display: 'block' });
  } else if (info.hook) T.shadow.style.display = 'none';
}
function placeDrape(T, p, li) {
  const D = T.drape; if (!D) return;
  const f = box.w / D.RW;
  const [a, b] = D.parts;
  T.hit = null;
  const st = T.btn.style;
  st.width = `${a.canvas.width * f}px`; st.height = `${a.canvas.height * f}px`;
  st.transform = `translate(${a.x * f}px, ${a.y * f}px)`; st.zIndex = li * 100 + (D.over[0] ? 90 : 5);
  Object.assign(T.vis.style, { left: '0px', top: '0px', width: '100%', height: '100%', transform: 'none' });
  T.shadow.style.display = 'none';
  const s2 = T.part2.style;
  s2.width = `${b.canvas.width * f}px`; s2.height = `${b.canvas.height * f}px`;
  s2.transform = `translate(${b.x * f}px, ${b.y * f}px)`; s2.zIndex = li * 100 + (D.over[1] ? 90 : 6);
  const r = (o) => [o.x * f, o.y * f, o.canvas.width * f, o.canvas.height * f];
  const A = r(a), B = r(b);
  T.hit = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[0] + A[2], B[0] + B[2]) - Math.min(A[0], B[0]), Math.max(A[1] + A[3], B[1] + B[3]) - Math.min(A[1], B[1])];
}

// ---------------------------------------------------------------- Your things
function trayRefs() {
  const inRoom = new Set(S.get().room.map((e) => e.ref));
  return R.allThings().filter((t) => !inRoom.has(t.ref));
}
let trayQueue = [], trayRaf = 0;
function renderTray() {
  if (!dom) return;
  const L = dom.list;
  const keep = L.scrollLeft, keepY = L.scrollTop;
  L.replaceChildren();
  const items = trayRefs();
  let sec = null;
  trayQueue = [];
  for (const t of items) {
    if (t.sec !== sec) { sec = t.sec; L.append(el('span', { class: 'tray-sec', 'aria-hidden': 'true', text: sec })); }
    const cv = el('canvas', { class: 'ti-cv', width: 1, height: 1 });
    const b = el('button', { class: 'ti' + (armed && armed.ref === t.ref ? ' lifted' : ''), 'data-tref': t.ref, type: 'button', 'aria-label': `${R.nameOf(t.ref)}, in your things` }, cv);
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); keyPickFromTray(t.ref); } });
    L.append(b);
    trayQueue.push([t.ref, cv]);
  }
  if (!items.length) L.append(el('span', { class: 'tray-empty', text: "Everything's in the room" }));
  L.scrollLeft = keep; L.scrollTop = keepY;
  cancelAnimationFrame(trayRaf);
  const step = () => {
    trayRaf = 0;
    const t0 = performance.now();
    while (trayQueue.length && performance.now() - t0 < 12) { const [ref, cv] = trayQueue.shift(); if (cv.isConnected) thumbInto(ref, cv); }
    if (trayQueue.length && here()) trayRaf = requestAnimationFrame(step);
  };
  trayRaf = requestAnimationFrame(step);
}
function thumbInto(ref, cv) {
  const info = renderThing(ref); if (!info) return;
  const d = Math.min(2, window.devicePixelRatio || 1), size = 64;
  cv.width = size * d; cv.height = size * d; cv.style.width = cv.style.height = `${size}px`;
  const g = cv.getContext('2d');
  const [x0, y0, x1, y1] = info.trim;
  const k = Math.min((size * d * 0.92) / (x1 - x0), (size * d * 0.92) / (y1 - y0));
  g.imageSmoothingQuality = 'high';
  g.drawImage(info.el, x0, y0, x1 - x0, y1 - y0, (cv.width - (x1 - x0) * k) / 2, (cv.height - (y1 - y0) * k) / 2, (x1 - x0) * k, (y1 - y0) * k);
}

// the first visit's soft line, while there's no doll and no toy yet
function softLine() {
  if (!dom) return;
  if (dom.soft) { dom.soft.remove(); dom.soft = null; }
  const hasDoll = R.DOLLS.some((d) => d !== 'purl' && S.isUnlocked(`doll:${d}`));
  const hasToy = S.get().gallery.some((g) => R.kindOf(g.id) === 'toy');
  if (hasDoll || hasToy || fillList) return;
  const J = ART[pic] && ART[pic].json; if (!J) return;
  const rug = J.surfaces.rug.line;
  const s = el('div', { class: 'room-soft', text: S.catText("Purl's saving you a seat. Finish a wearable to meet Pip, or a toy from chapter 6, and bring them here.") });
  s.style.left = `${box.w * 0.06}px`; s.style.right = `${box.w * 0.06}px`; s.style.top = `${rug[0][1] * box.h - U_RUG() * 0.15}px`;
  dom.box.append(s); dom.soft = s;
}

// the tip card, once
function showTip() {
  const s = S.get();
  if (s.tips.includes('room') || FILL) return;
  s.tips.push('room'); S.saveSoon();
  const cv = el('canvas', { width: 120, height: 96 });
  const card = el('div', { class: 'room-tip howto-card', role: 'note' }, cv, el('div', {}, el('h3', { text: 'Your cozy room' }), el('p', { text: 'Drag things from Your things into the room. Tap one to bring it forward.' })));
  root.append(card); tipOpen = true;
  requestAnimationFrame(() => drawTipArt(cv));
  const close = () => { tipOpen = false; card.classList.add('out'); setTimeout(() => card.remove(), 250); removeEventListener('pointerdown', close, true); removeEventListener('keydown', close, true); };
  setTimeout(() => { addEventListener('pointerdown', close, true); addEventListener('keydown', close, true); }, 50);
}
function drawTipArt(cv) {
  const d = Math.min(2, window.devicePixelRatio || 1);
  cv.width = 120 * d; cv.height = 96 * d; cv.style.width = '120px'; cv.style.height = '96px';
  const g = cv.getContext('2d'); g.scale(d, d);
  // the tray, a thing lifted from it along a dotted arc, and the rug it lands on
  g.fillStyle = '#8a5a34'; g.beginPath(); g.roundRect ? g.roundRect(6, 70, 54, 20, 6) : g.rect(6, 70, 54, 20); g.fill();
  g.fillStyle = '#b07a48'; g.fillRect(9, 72, 48, 3);
  g.fillStyle = '#c0485a'; g.beginPath(); g.ellipse(92, 82, 24, 7, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e2b54e'; g.lineWidth = 2; g.beginPath(); g.ellipse(92, 82, 17, 4.5, 0, 0, Math.PI * 2); g.stroke();
  g.setLineDash([3, 4]); g.strokeStyle = '#6b5468'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, 66); g.quadraticCurveTo(55, 10, 88, 54); g.stroke(); g.setLineDash([]);
  // a little doll
  const doll = (x, y, s) => { g.fillStyle = '#f0c9a6'; g.beginPath(); g.arc(x, y - 18 * s, 6 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9e2a3a'; g.beginPath(); g.moveTo(x - 7 * s, y); g.lineTo(x - 4 * s, y - 12 * s); g.lineTo(x + 4 * s, y - 12 * s); g.lineTo(x + 7 * s, y); g.closePath(); g.fill(); };
  doll(92, 80, 1.1);
  g.globalAlpha = 0.45; doll(33, 70, 0.8); g.globalAlpha = 1;
  // a hand
  g.fillStyle = '#fbf4e6'; g.strokeStyle = '#3b2738'; g.lineWidth = 1.6;
  g.beginPath(); g.ellipse(103, 64, 6, 9, -0.5, 0, Math.PI * 2); g.fill(); g.stroke();
}

// ---------------------------------------------------------------- selection and the button bar
function select(key, { quiet = false, focus = false } = {}) {
  const T = things.get(key); if (!T) return;
  if (selected && selected !== key) { const P = things.get(selected); if (P) P.btn.classList.remove('sel'); }
  selected = key;
  T.btn.classList.add('sel');
  if (!quiet) {
    T.bob.classList.remove('hop'); void T.bob.offsetWidth; T.bob.classList.add('hop');
    audio.play('peg', { gain: 0.45 });
    if (!fillList && R.bringToFront(S.get().room, T.ref)) { S.saveNow(); layout(); }
  }
  showBar(T);
  if (focus) T.btn.focus();
}
function deselect() {
  if (selected) { const T = things.get(selected); if (T) T.btn.classList.remove('sel'); }
  selected = null;
  if (dom && dom.bar) { dom.bar.remove(); dom.bar = null; }
}
function closerKind(ref) {
  const k = R.kindOf(ref);
  if (k === 'doll' || k === 'purl' || k === 'toy' || k === 'pillow' || k === 'blanket') return true;
  return ref === 'piece:frame' && !!newestPiece();
}
function showBar(T) {
  if (dom.bar) dom.bar.remove();
  const bar = el('div', { class: 'rbar', role: 'toolbar', 'aria-label': `${R.nameOf(T.ref)}` });
  const b = (label, fn) => { const x = el('button', { class: 'btn small', type: 'button', text: label }); x.addEventListener('click', (e) => { e.stopPropagation(); audio.play('ui'); fn(); }); bar.append(x); return x; };
  b('Move', () => arm(T.ref));
  if (R.turns(T.ref)) b('Turn', () => turn(T.key));
  if (closerKind(T.ref)) b('Look closer', () => lookCloser(T.ref));
  b('Put away', () => putAway(T.key));
  T.btn.after(bar);
  dom.bar = bar;
  placeBar();
}
function placeBar() {
  const T = things.get(selected); const bar = dom.bar; if (!T || !bar || !T.hit) return;
  const [hx, hy, hw] = T.hit;
  const bw = bar.offsetWidth || 260, bh = bar.offsetHeight || 44;
  let x = hx + hw / 2 - bw / 2, y = hy - bh - 6;
  x = Math.max(4 - box.x, Math.min(box.w + box.x - bw - 4, x));
  if (y < 4 - box.y) y = hy + Math.min(T.hit[3], 60) + 6;
  bar.style.transform = `translate(${x}px, ${y}px)`;
}
function turn(key) {
  const T = things.get(key); if (!T || fillList) return;
  T.e.flip = !T.e.flip; S.saveNow(); layout();
}
function putAway(key) {
  const T = things.get(key); if (!T) return;
  if (!fillList) { const L = S.get().room; const i = L.indexOf(T.e); if (i >= 0) L.splice(i, 1); S.saveNow(); }
  removeThing(key);
  audio.play('card', { gain: 0.6 });
  speak('Put away');
  layout(); renderTray(); softLine();
}

// ---------------------------------------------------------------- placing (drops, taps, keys, the debug hook)
// where a drop lands: the surface for these feet (box px), and the others near enough to try next
function surfacesAt(ref, fx, fy) {
  const J = ART[pic].json;
  const hookish = R.isHookThing(ref) || R.goesOnDrape(ref);
  const cands = [];
  if (hookish) {
    for (const sid of R.SURFACE_IDS) {
      const Sf = R.SURFACES[sid]; if (Sf.kind === 'line') continue;
      const js = J.surfaces[sid];
      let bb;
      if (js.box) bb = [js.box[0] * box.w, js.box[1] * box.h, js.box[2] * box.w, js.box[3] * box.h];
      else { const pts = js.parts.flat().map(([x, y]) => [x * box.w, y * box.h]); const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; }
      const dx = Math.max(bb[0] - fx, 0, fx - bb[0] - bb[2]), dy = Math.max(bb[1] - fy, 0, fy - bb[1] - bb[3]);
      cands.push({ sid, d: Math.hypot(dx, dy), t: 0.5 });
    }
    cands.sort((a, b) => a.d - b.d);
    const accept = cands.filter((c) => R.SURFACES[c.sid].accepts.includes(R.acceptKey(ref)));
    if (accept.length && accept[0].d <= 60) return { primary: accept[0], cands: accept.filter((c) => c.d <= 60) };
    // nowhere near its own: say why against the nearest line
  }
  for (const sid of R.LINE_IDS) {
    const G = lineGeom(J, sid, box.w, box.h); if (!G) continue;
    const [x0, y0] = G.p0, [x1, y1] = G.p1;
    const vx = x1 - x0, vy = y1 - y0, len2 = vx * vx + vy * vy || 1;
    const u = Math.max(0, Math.min(1, ((fx - x0) * vx + (fy - y0) * vy) / len2));
    const px = x0 + vx * u, py = y0 + vy * u;
    const inX = fx >= Math.min(x0, x1) - 4 && fx <= Math.max(x0, x1) + 4;
    const below = inX ? py - fy : Infinity; // the line under the feet (positive: below)
    cands.push({ sid, d: Math.hypot(fx - px, fy - py), below, t: u * G.cap });
  }
  const lines = cands.filter((c) => c.below !== undefined);
  let primary = lines.filter((c) => c.below >= -14 && c.below <= 40).sort((a, b) => Math.abs(a.below) - Math.abs(b.below))[0];
  if (!primary) primary = lines.filter((c) => c.d <= 80).sort((a, b) => a.d - b.d)[0] || null;
  const near = lines.filter((c) => c !== primary && c.d <= 60).sort((a, b) => a.d - b.d);
  if (hookish) return { primary: null, why: primary, cands: [] };
  return { primary, cands: near };
}
// the one place every way of placing goes through: put ref on sid at t, or a near surface that takes it.
// Writes the save on success. Returns {ok, surface, t, reason}
function commit(ref, sid, t, near = []) {
  if (fillList) return { ok: false, reason: 'unknown', surface: sid, t };
  const L = S.get().room;
  let res = R.place(L, ref, sid, t);
  if (!res.ok && res.reason !== 'room-full' && res.reason !== 'locked' && res.reason !== 'unknown') {
    for (const c of near) {
      if (c.sid === sid || R.fitReason(L, ref, c.sid)) continue;
      const r2 = R.place(L, ref, c.sid, c.t);
      if (r2.ok) { res = r2; break; }
    }
  }
  if (res.ok) S.saveNow();
  return res;
}
// after a successful place: the room shows it (only transforms move; a new thing gets its button)
function afterPlace(ref, res, { quiet = false } = {}) {
  if (!dom) return;
  const e = S.get().room.find((x) => x.ref === ref);
  let T = things.get(ref);
  const isDrape = R.SURFACES[res.surface].kind === 'drape';
  if (T && (isDrape || T.drape)) { removeThing(ref); T = null; } // a blanket's parts are for its drape
  if (!T && e) T = addThing(e);
  if (T) { T.e = e; label(T); T.btn.classList.remove('dragging', 'held'); T.btn.style.opacity = ''; }
  if (res.swapped) { removeThing(res.swapped); say('Swapped the blankets'); }
  layout();
  renderTray();
  softLine();
  if (!quiet) audio.play('peg');
  speak(`On ${R.SURFACES[res.surface].name}`);
  if (T) { T.bob.classList.remove('hop'); void T.bob.offsetWidth; T.bob.classList.add('hop'); }
}
function failLine(ref, reason, sid) {
  const text = R.reasonText(reason, ref, sid);
  say(text); speak(text);
  audio.play('ui', { gain: 0.4 });
}
// drop ref with its feet at (fx, fy) in the box
function dropAt(ref, fx, fy) {
  const at = surfacesAt(ref, fx, fy);
  if (!at.primary) {
    const why = at.why;
    if (R.isHookThing(ref) || R.goesOnDrape(ref)) failLine(ref, 'not-here', why ? why.sid : null);
    else failLine(ref, 'nowhere', null);
    return { ok: false };
  }
  const res = commit(ref, at.primary.sid, at.primary.t, at.cands);
  if (res.ok) afterPlace(ref, res); else failLine(ref, res.reason, at.primary.sid);
  return res;
}

// ---------------------------------------------------------------- holding a thing (pointer, tap-then-tap, keys)
function heldEl(ref) {
  // the thing as it's carried: its own button if it's in the room (a blanket: its flat stand-in)
  let T = things.get(ref);
  if (T && T.drape) { T.btn.style.opacity = '0.25'; if (T.part2) T.part2.style.opacity = '0.25'; T = null; }
  if (!T) {
    const info = renderThing(ref); if (!info) return null;
    const btn = el('button', { class: 'rt carry', type: 'button', tabindex: '-1', 'aria-hidden': 'true' });
    const vis = el('span', { class: 'rt-vis' }), shadow = el('span', { class: 'rt-shadow' }), bob = el('span', { class: 'rt-bob' });
    bob.append(info.el);
    vis.append(shadow, bob); btn.append(vis); dom.box.append(btn);
    return { ref, key: `carry:${ref}`, e: null, btn, vis, bob, shadow, info, kind: R.kindOf(ref), carry: true };
  }
  return T;
}
function startHold(ref, via, { pointerId = null, px = 0, py = 0 } = {}) {
  if (!dom || held) return false;
  if (!R.available(ref) && !fillList) return false;
  const entry = S.get().room.find((x) => x.ref === ref) || null;
  deselect(); disarm();
  const T = heldEl(ref); if (!T) return false;
  held = { ref, key: T.key, entry, via, pointerId, T, sid: null, t: 0, fx: 0, fy: 0, gx: 0, gy: 0 };
  T.btn.classList.add('dragging');
  const { h } = R.sizeOf(ref);
  if (via === 'pointer') {
    if (entry && T.feet) { held.gx = T.feet[0] - px; held.gy = T.feet[1] - py; }
    else { held.gx = 0; held.gy = Math.min(28, h * U_RUG() * 0.25); }
    try { root.setPointerCapture(pointerId); } catch { /* */ }
    moveHeld(px, py);
  }
  audio.play('dress', { gain: 0.8 });
  return true;
}
let mvRaf = 0, mvAt = null;
function moveHeld(px, py) {
  if (!held) return;
  held.fx = px + held.gx; held.fy = py + held.gy;
  mvAt = [held.fx, held.fy];
  if (!mvRaf) mvRaf = requestAnimationFrame(() => {
    mvRaf = 0; if (!held || !mvAt) return;
    const [fx, fy] = mvAt;
    // drawn at the depth of the surface under it (only the transform changes)
    const J = ART[pic].json; let U = U_RUG(), best = 1e9;
    for (const sid of R.LINE_IDS) { const G = lineGeom(J, sid, box.w, box.h); const ly = G.p0[1] + ((G.p1[1] - G.p0[1]) * Math.max(0, Math.min(1, (fx - G.p0[0]) / ((G.p1[0] - G.p0[0]) || 1)))); const d = Math.abs(ly - fy) + (fx < Math.min(G.p0[0], G.p1[0]) - 20 || fx > Math.max(G.p0[0], G.p1[0]) + 20 ? 60 : 0); if (d < best) { best = d; U = G.U; } }
    position(held.T, [fx, fy], U, U_RUG(), 5000, held.entry ? held.entry.flip : false);
  });
}
function endHold() {
  if (!held) return;
  const h = held; held = null;
  if (h.T.carry) h.T.btn.remove();
  else { h.T.btn.classList.remove('dragging'); }
  const T = things.get(h.ref);
  if (T && T.drape) { T.btn.style.opacity = ''; if (T.part2) T.part2.style.opacity = ''; }
  try { if (h.pointerId != null && root.hasPointerCapture(h.pointerId)) root.releasePointerCapture(h.pointerId); } catch { /* */ }
}
// a cancelled hold: back where it came from, nothing saved
function cancelHeld(silent = false) {
  if (!held) { disarm(); return; }
  endHold();
  if (dom) layout();
  if (!silent) speak('Put back');
}
function dropHeld(px, py, overTray) {
  const h = held; if (!h) return;
  const ref = h.ref, fx = h.fx, fy = h.fy;
  endHold();
  if (overTray) {
    if (h.entry) { putAway(ref); return; }
    layout(); return; // back to Your things
  }
  const res = dropAt(ref, fx, fy);
  if (!res.ok) layout();
}
function arm(ref) {
  if (!dom) return;
  deselect();
  armed = { ref, entry: S.get().room.find((x) => x.ref === ref) || null };
  root.classList.add('armed');
  for (const b of dom.list.querySelectorAll('.ti')) b.classList.toggle('lifted', b.dataset.tref === ref);
  const T = things.get(ref); if (T) T.btn.classList.add('held');
  say('Tap a place in the room', 4000); speak('Tap a place in the room');
  audio.play('dress', { gain: 0.6 });
}
function disarm() {
  if (!armed) return;
  const T = things.get(armed.ref); if (T) T.btn.classList.remove('held');
  armed = null;
  if (root) root.classList.remove('armed');
  if (dom) for (const b of dom.list.querySelectorAll('.ti.lifted')) b.classList.remove('lifted');
}

// ---------------------------------------------------------------- pointers
let bound = false, scroll = null;
const along = () => !side; // the strip scrolls sideways; the side column up and down
function boxPt(e) { const r = dom.box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
const inRect = (e, elm) => { const r = elm.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
function bindPointers() {
  if (bound) return; bound = true;
  const R0 = document.querySelector('[data-screen="room"]');
  R0.addEventListener('pointerdown', onDown);
  R0.addEventListener('pointermove', onMove);
  R0.addEventListener('pointerup', onUp);
  R0.addEventListener('pointercancel', (e) => { if (held && held.pointerId === e.pointerId) cancelHeld(); clearPress(); });
  // the room's own capture lost (not a button's implicit touch capture moving to the room)
  R0.addEventListener('lostpointercapture', (e) => { if (e.target === R0 && held && held.via === 'pointer' && held.pointerId === e.pointerId) cancelHeld(); });
  R0.addEventListener('contextmenu', (e) => e.preventDefault());
  R0.addEventListener('dragstart', (e) => e.preventDefault());
}
function clearPress() { if (press) { clearTimeout(press.timer); press = null; } }
function onDown(e) {
  if (!dom || tipOpen) return;
  if (e.button > 0) return;
  const t = e.target;
  if (t.closest('.rbar, .gal-top, .gal-tabs, .tray-head, .room-tip')) return;
  if (held) return;
  clearPress(); stopMomentum();
  const thing = t.closest('[data-key]');
  const ti = t.closest('.ti');
  const inTray = t.closest('.tray');
  press = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t0: performance.now(), key: thing ? thing.dataset.key : null, tref: ti ? ti.dataset.tref : null, tray: !!inTray, mode: null, vel: 0, lt: performance.now(), type: e.pointerType };
  if (press.tref) {
    const p = press;
    p.timer = setTimeout(() => { if (press === p && !p.mode) { p.mode = 'held'; const [bx, by] = boxPt({ clientX: p.lx, clientY: p.ly }); if (startHold(p.tref, 'pointer', { pointerId: p.id, px: bx, py: by })) { const b = dom.list.querySelector(`[data-tref="${CSS.escape(p.tref)}"]`); if (b) b.classList.add('lifting'); } } }, 250);
  }
  if (press.key || press.tray) e.preventDefault();
}
function onMove(e) {
  if (held && held.via === 'pointer' && e.pointerId === held.pointerId) { const [x, y] = boxPt(e); moveHeld(x, y); return; }
  const p = press; if (!p || p.id !== e.pointerId) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y, dist = Math.hypot(dx, dy);
  if (p.mode === 'scroll') {
    const L = dom.list, now = performance.now();
    const d = along() ? e.clientX - p.lx : e.clientY - p.ly;
    if (along()) L.scrollLeft -= d; else L.scrollTop -= d;
    p.vel = d / Math.max(1, now - p.lt); p.lt = now;
    p.lx = e.clientX; p.ly = e.clientY; return;
  }
  p.lx = e.clientX; p.ly = e.clientY;
  if (p.tray && !p.mode && dist >= 8) {
    clearTimeout(p.timer);
    const alongMove = along() ? Math.abs(dx) >= Math.abs(dy) : Math.abs(dy) >= Math.abs(dx);
    if (alongMove || !p.tref) { p.mode = 'scroll'; p.lt = performance.now(); return; }
    p.mode = 'held';
    const [bx, by] = boxPt(e);
    startHold(p.tref, 'pointer', { pointerId: p.id, px: bx, py: by });
    press = null; return;
  }
  if (p.key && !p.mode && dist > 10) {
    const T = things.get(p.key); if (!T || fillList) { press = null; return; }
    p.mode = 'held';
    const [bx, by] = boxPt({ clientX: p.x, clientY: p.y });
    startHold(T.ref, 'pointer', { pointerId: p.id, px: bx, py: by });
    const [x, y] = boxPt(e); moveHeld(x, y);
    press = null;
  }
}
function onUp(e) {
  if (held && held.via === 'pointer' && e.pointerId === held.pointerId) {
    const [x, y] = boxPt(e);
    if (mvRaf) { cancelAnimationFrame(mvRaf); mvRaf = 0; }
    held.fx = x + held.gx; held.fy = y + held.gy;
    dropHeld(x, y, inRect(e, dom.tray));
    clearPress();
    return;
  }
  const p = press; if (!p || p.id !== e.pointerId) return;
  clearPress();
  if (p.mode === 'scroll') { momentum(p.vel); return; }
  if (p.mode) return;
  if (Math.hypot(e.clientX - p.x, e.clientY - p.y) >= 10) return;
  // a tap
  if (p.tref) { if (armed && armed.ref === p.tref) disarm(); else arm(p.tref); return; }
  if (p.tray) { disarm(); return; }
  const [x, y] = boxPt(e);
  if (armed) {
    const a = armed; disarm();
    if (p.key === a.ref) return;
    const res = dropAt(a.ref, x, y + 6);
    if (!res.ok && a.entry) layout();
    return;
  }
  if (p.key && things.get(p.key)) { select(p.key); return; }
  if (dom.box.contains(e.target) || e.target === dom.stage) deselect();
}
let momRaf = 0;
function momentum(v) {
  stopMomentum();
  let vel = v * 16;
  const step = () => {
    if (!dom || Math.abs(vel) < 0.4) { momRaf = 0; return; }
    if (along()) dom.list.scrollLeft -= vel; else dom.list.scrollTop -= vel;
    vel *= 0.93; momRaf = requestAnimationFrame(step);
  };
  momRaf = requestAnimationFrame(step);
}
function stopMomentum() { cancelAnimationFrame(momRaf); momRaf = 0; }

// ---------------------------------------------------------------- the keyboard
function keyPickFromTray(ref) {
  if (held) return;
  if (!startHold(ref, 'key')) return;
  // it appears on the rug, or the first surface that takes it
  const L = S.get().room;
  const order = [...R.LINE_ORDER].reverse();
  let sid = null;
  if (R.isHookThing(ref)) sid = R.PIECES[ref.slice(6)].hook;
  else if (R.goesOnDrape(ref)) sid = L.some((e) => e.surface === 'chair-drape') ? 'seat-drape' : 'chair-drape';
  else sid = order.find((s) => !R.fitReason(L, ref, s)) || 'rug';
  keyShow(sid, R.SURFACES[sid].kind === 'line' ? R.SURFACES[sid].capacity / 2 : 0.5);
}
function keyShow(sid, t) {
  if (!held) return;
  const f = R.sizeOf(held.ref).foot, Sf = R.SURFACES[sid];
  held.sid = sid; held.t = Sf.kind === 'line' ? Math.max(f / 2, Math.min(Sf.capacity - f / 2, t)) : 0.5;
  const J = ART[pic].json;
  let feet, U;
  if (Sf.kind === 'line') { const G = lineGeom(J, sid, box.w, box.h); feet = lerp(G.p0, G.p1, held.t / G.cap); U = G.U; }
  else if (Sf.kind === 'hook') { const b = J.surfaces[sid].box; feet = [(b[0] + b[2] / 2) * box.w, (b[1] + b[3]) * box.h]; U = (b[3] * box.h) / 1.05; }
  else { const q = J.surfaces[sid].parts[0]; feet = [((q[0][0] + q[1][0]) / 2) * box.w, ((q[2][1] + q[3][1]) / 2) * box.h]; U = J.surfaces[sid === 'chair-drape' ? 'chair-seat' : 'window-seat'].scale * box.h; }
  held.fx = feet[0]; held.fy = feet[1] - U * 0.12; // lifted a little: it's in your hand
  position(held.T, [held.fx, held.fy], U, U_RUG(), 5000, held.entry ? held.entry.flip : false);
  const why = Sf.kind === 'line' ? R.fitReason(S.get().room, held.ref, sid) : null;
  speak(why ? R.reasonText(why, held.ref, sid) : `Over ${Sf.name}`);
}
function keyStepSurface(dir) {
  const ref = held.ref;
  let ids;
  if (R.isHookThing(ref)) return;
  if (R.goesOnDrape(ref)) ids = ['seat-drape', 'chair-drape'];
  else ids = R.LINE_ORDER.filter((s) => { const Sf = R.SURFACES[s]; const z = R.sizeOf(ref); return Sf.accepts.includes(R.acceptKey(ref)) && z.h <= Sf.maxH && z.foot <= Sf.capacity; });
  const i = ids.indexOf(held.sid);
  const j = i < 0 ? 0 : Math.max(0, Math.min(ids.length - 1, i + dir));
  if (ids[j] && ids[j] !== held.sid) { const frac = R.SURFACES[held.sid].kind === 'line' ? held.t / R.SURFACES[held.sid].capacity : 0.5; keyShow(ids[j], frac * (R.SURFACES[ids[j]].capacity || 1)); }
}
function keyPut() {
  const h = held; if (!h || !h.sid) return;
  const res = commit(h.ref, h.sid, h.t);
  if (!res.ok) { failLine(h.ref, res.reason, h.sid); return; }
  endHold();
  afterPlace(h.ref, res);
  const T = things.get(h.ref); if (T) { select(T.key, { quiet: true }); T.btn.focus(); }
}
function onKey(e) {
  if (!here()) return false;
  if (held && held.via === 'key') {
    const f = R.sizeOf(held.ref).foot;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (R.SURFACES[held.sid].kind === 'line') keyShow(held.sid, held.t + (e.key === 'ArrowLeft' ? -f : f)); return true; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { keyStepSurface(e.key === 'ArrowUp' ? -1 : 1); return true; }
    if (e.key === 'Enter' || e.key === ' ') { keyPut(); return true; }
    if (e.key === 'Escape') { const ref = held.ref; cancelHeld(); const T = things.get(ref); if (T) T.btn.focus(); else focusTray(ref); return true; }
    if (e.key === 'Delete' || e.key === 'Backspace') { const h = held; endHold(); if (h.entry) putAway(h.ref); else { layout(); speak('Put away'); } focusTray(h.ref); return true; }
    if (e.key === 'Tab') return true;
    return true;
  }
  if (held) { if (e.key === 'Escape') { cancelHeld(); return true; } return false; }
  const a = document.activeElement;
  const T = a && a.classList && a.classList.contains('rt') ? things.get(a.dataset.key) : null;
  if (T && (e.key === 'Enter' || e.key === ' ')) {
    if (fillList) return true;
    if (startHold(T.ref, 'key')) { keyShow(T.e.surface, T.e.t); speak(`Holding ${R.nameOf(T.ref)}`); }
    return true;
  }
  if (T && (e.key === 'Delete' || e.key === 'Backspace')) { putAway(T.key); return true; }
  if (e.key === 'Escape') { if (armed) { disarm(); speak('Put back'); return true; } menuFn(); return true; }
  if (e.key === 'p' || e.key === 'P') { menuFn(); return true; }
  if (e.key === 'm' || e.key === 'M') { window.__game && window.__game.toggleMute(); return true; }
  return false;
}
function focusTray(ref) { if (!dom) return; const b = dom.list.querySelector(`[data-tref="${CSS.escape(ref)}"]`); if (b) b.focus(); }

// ---------------------------------------------------------------- Look closer, Tidy up
function lookCloser(ref) {
  const k = R.kindOf(ref);
  if (k === 'piece') { const n = newestPiece(); if (n) galleryDetail(n.id); return; }
  if (k !== 'doll' && k !== 'purl') { galleryDetail(ref); return; }
  const id = ref.slice(5);
  const big = el('div', { class: 'closer-big' });
  const acts = el('div', { class: 'acts' });
  const canDress = id !== 'purl' || S.isUnlocked('doll:purl');
  if (canDress) {
    const d = el('button', { class: 'btn sage', text: `Dress ${DOLL_NAMES[id]}` });
    d.addEventListener('click', () => { audio.play('ui'); closeSheet(); go('dress', { doll: id, from: 'room' }); });
    acts.append(d);
  }
  openSheet('closer', el('div', { class: 'detail closer' }, big, acts), { title: DOLL_NAMES[id], cls: 'closer-sheet' });
  audio.play('card');
  requestAnimationFrame(() => {
    const d = Math.min(3, window.devicePixelRatio || 1);
    const H = Math.max(200, Math.min(560, innerHeight - 250)), Wd = Math.max(200, big.clientWidth - 12);
    // the doll's visible box in its own px
    const vb = id === 'purl' ? [80, 0, 456, 504] : [24, id === 'juniper' ? 2 : 40, 490, 734];
    const k = Math.min((H * d) / (vb[3] - vb[1]), (Wd * d) / (vb[2] - vb[0]));
    const c = canDress ? dressedDoll(id, k) : composeDoll(id, {}, k);
    const out = el('canvas', { width: Math.round((vb[2] - vb[0]) * k), height: Math.round((vb[3] - vb[1]) * k) });
    out.getContext('2d').drawImage(c, -vb[0] * k, -vb[1] * k);
    out.style.width = `${out.width / d}px`; out.style.height = `${out.height / d}px`;
    big.replaceChildren(out);
  });
}
function confirmTidy() {
  if (!S.get().room.length) { say("Everything's in Your things already"); return; }
  const yes = el('button', { class: 'btn primary', text: 'Tidy up' });
  const no = el('button', { class: 'btn', text: 'Not now' });
  yes.addEventListener('click', () => { closeSheet(); clearRoom(); audio.play('card'); });
  no.addEventListener('click', () => closeSheet());
  openSheet('tidy', el('div', { class: 'tidy-sheet' }, el('p', { text: 'Put everything back in Your things? The room will be empty until you arrange it again.' }), el('div', { class: 'acts' }, yes, no)), { title: 'Are you sure?' });
}
export function clearRoom() {
  S.get().room.length = 0; S.saveNow();
  if (here()) { deselect(); render(); }
  return true;
}

// ---------------------------------------------------------------- ?surfaces: the art check overlay
function drawSurfaces() {
  if (!dom) return;
  const J = ART[pic].json; const W = box.w, H = box.h;
  if (dom.svg) dom.svg.remove();
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'room-surf'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const add = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text) n.textContent = text; svg.append(n); return n; };
  for (const f of Object.values(J.fronts || {})) for (const poly of f.polygons) add('polygon', { points: poly.map(([x, y]) => `${x * W},${y * H}`).join(' '), fill: 'rgba(80,160,255,0.18)', stroke: '#3a8cff', 'stroke-width': 1 });
  for (const sid of R.SURFACE_IDS) {
    const js = J.surfaces[sid], Sf = R.SURFACES[sid];
    if (Sf.kind === 'line') {
      const G = lineGeom(J, sid, W, H);
      add('line', { x1: G.p0[0], y1: G.p0[1], x2: G.p1[0], y2: G.p1[1], stroke: '#ff3d6e', 'stroke-width': 2.5 });
      // the height of 1 ru there, and of maxH
      add('line', { x1: G.p0[0], y1: G.p0[1], x2: G.p0[0], y2: G.p0[1] - G.U, stroke: '#ffd23d', 'stroke-width': 2 });
      const used = R.usedOn(list(), sid);
      const len = Math.hypot(G.p1[0] - G.p0[0], G.p1[1] - G.p0[1]) / (G.cap * G.U);
      add('text', { x: G.p0[0] + 2, y: G.p0[1] + 12, fill: '#fff', 'font-size': 11, stroke: '#000', 'stroke-width': 0.4 }, `${sid} ${used.toFixed(2)}/${G.cap} (len ${Math.round(len * 100)}%)`);
    } else if (js.box) {
      add('rect', { x: js.box[0] * W, y: js.box[1] * H, width: js.box[2] * W, height: js.box[3] * H, fill: 'none', stroke: '#7dff7a', 'stroke-width': 2 });
      add('text', { x: js.box[0] * W + 2, y: js.box[1] * H + 12, fill: '#fff', 'font-size': 11 }, sid);
    } else {
      js.parts.forEach((q, i) => add('polygon', { points: q.map(([x, y]) => `${x * W},${y * H}`).join(' '), fill: i ? 'rgba(255,140,0,0.2)' : 'rgba(255,220,0,0.2)', stroke: '#ffa400', 'stroke-width': 1.5 }));
      add('text', { x: js.parts[0][0][0] * W, y: js.parts[0][0][1] * H - 2, fill: '#fff', 'font-size': 11 }, sid);
    }
  }
  dom.box.append(svg); dom.svg = svg;
}
// ?surfaces&fill: a doll (or the widest thing that fits) on every surface, display only
function buildFill() {
  const out = [];
  const pool = ['doll:pip', 'doll:clementine', 'doll:bramble', 'doll:juniper', 'doll:basil', 'doll:mabel', 'doll:purl'];
  let n = 0;
  const blankets = S.get().gallery.filter((g) => R.kindOf(g.id) === 'blanket').map((g) => g.id);
  for (const sid of R.SURFACE_IDS) {
    const Sf = R.SURFACES[sid];
    if (Sf.kind === 'hook') { out.push({ ref: Sf.accepts[0], key: `${Sf.accepts[0]}#${n++}`, surface: sid, t: 0.5, flip: false, z: 0 }); continue; }
    if (Sf.kind === 'drape') { const b = blankets.shift(); if (b) out.push({ ref: b, key: `${b}#${n++}`, surface: sid, t: 0.5, flip: false, z: 0 }); continue; }
    const cands = sid.startsWith('chair-arm') ? ['piece:plant'] : pool;
    let used = 0, i = 0, z = 0;
    for (let tries = 0; tries < 12; tries++) {
      const ref = cands[(i++ + n) % cands.length];
      const { foot, h } = R.sizeOf(ref);
      if (h > Sf.maxH || used + foot > Sf.capacity + 1e-6) { if (tries > 6) break; continue; }
      out.push({ ref, key: `${ref}#${n++}`, surface: sid, t: used + foot / 2, flip: false, z: z++ });
      used += foot;
    }
  }
  return out;
}

// ---------------------------------------------------------------- the screen
registerScreen('room', {
  enter(arg) {
    root = document.querySelector('[data-screen="room"]');
    root.className = 'screen gallery-screen room-screen';
    root.replaceChildren(el('div', { class: 'room-loading', text: 'Tidying the room…' }));
    held = null; armed = null; selected = null; press = null;
    const hold = arg && arg.hold;
    Promise.all([loadRoomArt(), loadDolls()]).then(() => {
      if (!here()) return;
      if (FILL && !fillList) fillList = buildFill();
      render();
      showTip();
      if (hold && R.available(hold)) arm(hold);
    });
    setKeyHandler(onKey);
    audio.music('gallery'); audio.ambience(false);
    toasts.pump();
  },
  leave() {
    setKeyHandler(null);
    cancelHeld(true); clearPress(); stopMomentum();
    cancelAnimationFrame(trayRaf); trayQueue = [];
    if (dom) for (const c of dom.list.querySelectorAll('canvas')) { c.width = c.height = 0; }
    if (root) root.replaceChildren();
    things.clear(); dom = null; selected = null; armed = null;
    freeCache(); kDev = 0;
  },
});
// a resize or rotation: whatever is held goes back (nothing saved), and the room lays out again
addEventListener('resize', () => { if (here() && dom) { cancelHeld(true); deselect(); render(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && held) cancelHeld(true); });
onSheet((open) => { if (open && held) cancelHeld(true); if (open) clearPress(); });
for (const ev of ['kk-unlocks', 'kk-cat']) addEventListener(ev, () => { if (here() && dom) render(); });

// ---------------------------------------------------------------- the debug hook
export const debug = {
  room: () => S.get().room.map((e) => ({ ...e })),
  place: (ref, surface, t) => {
    const res = commit(ref, surface, t);
    if (res.ok && here() && dom) afterPlace(ref, res, { quiet: true });
    return { ok: !!res.ok, surface: res.surface, t: res.t, reason: res.reason || null };
  },
  roomLayout: () => {
    if (!dom) return null;
    const br = dom.box.getBoundingClientRect();
    const J = ART[pic].json;
    const surfaces = R.LINE_IDS.map((id) => { const G = lineGeom(J, id, box.w, box.h); return { id, line: [[br.left + G.p0[0], br.top + G.p0[1]], [br.left + G.p1[0], br.top + G.p1[1]]], scale: G.U, capacity: G.cap, used: R.usedOn(list(), id) }; });
    const order = [...things.values()].sort((a, b) => (+a.btn.style.zIndex || 0) - (+b.btn.style.zIndex || 0));
    const tl = [...things.values()].map((T) => {
      const r = T.btn.getBoundingClientRect();
      return { ref: T.ref, surface: T.e.surface, t: T.e.t, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, feet: T.feet ? [br.left + T.feet[0], br.top + T.feet[1]] : null, visH: T.info && T.U ? ((T.info.trim[3] - T.info.trim[1]) * T.U) / T.info.ppr : null, scale: T.U || null, drawIndex: order.indexOf(T), flip: !!T.e.flip };
    });
    const tray = [...dom.list.querySelectorAll('.ti')].map((b) => { const r = b.getBoundingClientRect(); return { ref: b.dataset.tref, rect: { x: r.left, y: r.top, w: r.width, h: r.height } }; });
    const trayRect = dom.tray.getBoundingClientRect();
    return { picture: pic, box: { x: br.left, y: br.top, w: br.width, h: br.height }, trayRect: { x: trayRect.left, y: trayRect.top, w: trayRect.width, h: trayRect.height }, surfaces, things: tl, tray };
  },
  clearRoom: () => clearRoom(),
  state: () => ({ count: S.get().room.length, held: held ? held.ref : armed ? armed.ref : null, selected: selected ? (things.get(selected) || {}).ref || null : null, focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key || document.activeElement.dataset.tref || null : null, picture: dom ? pic : null, kRoom: kDev, cached: cache.size }),
};
