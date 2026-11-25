// render.js — charts per pattern (cached) and finished-looking renders of pieces (renderSwatch), cached.
import { parseChart, fill } from './chart.js';
import { pageZoom } from './ui.js';
import { renderSwatch } from './work.js';
import { normYarn } from './yarn.js';
import { isToy, toyEyes, plushify } from './plush.js';
import { shapeOf, localBounds } from './tube.js';
import { roundObject, POSE_OF, forgetBakes, bakeChart } from './worn.js';

// Charts are cached by pattern and edition (Change 2, CHANGE_2.md G). Edition 1 of a pattern that
// Change 2 rewrote for knitting in the round is built from patterns-flat-v1.json (loaded at boot only
// when the save holds such a record, see loadFlatV1), so pieces made before the change bake, wear and
// finish flat exactly as knit. Until it's there (or if it can't load) such a record gets a plain
// stand-in swatch in its yarns (chart.placeholder), and an in-progress one can't be opened.
const charts = new Map();
let FLAT_V1 = null, flatV1State = 'idle'; // 'idle' | 'loading' | 'ok' | 'failed'
const V1_NOTE = 'This piece was started before the pattern was rewritten for knitting in the round, so it finishes flat.';
const editionOf = (pattern) => pattern.edition || 1;
// does this piece or gallery record need the flat edition 1 of its pattern?
export const isOldEdition = (rec, pattern) => !!(rec && pattern && (rec.ed || 1) < editionOf(pattern));
export const flatV1Ready = () => flatV1State === 'ok';
export const flatV1Status = () => flatV1State;
export function setFlatV1(json) {
  FLAT_V1 = json && json.patterns ? json.patterns : null;
  flatV1State = FLAT_V1 ? 'ok' : 'failed';
  for (const k of [...charts.keys()]) if (k.endsWith('|plain')) charts.delete(k);
  forget('');
  forgetBakes(''); // (the dolls' layers and bakes of stand-in swatches too)
}
export async function loadFlatV1(src = 'src/patterns-flat-v1.json') {
  if (flatV1State === 'ok') return true;
  flatV1State = 'loading';
  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error(String(r.status));
    setFlatV1(await r.json());
  } catch (e) { console.warn('patterns-flat-v1', e); FLAT_V1 = null; flatV1State = 'failed'; }
  return flatV1State === 'ok';
}
// chartOf(pattern, ed): the chart of a pattern's edition ed (default: its current edition)
export function chartOf(pattern, ed) {
  const cur = editionOf(pattern);
  const e = ed == null ? cur : ed;
  if (e >= cur) {
    const k = `${pattern.id}|${cur}`;
    let c = charts.get(k);
    if (!c) { c = parseChart(pattern); charts.set(k, c); if (c.errors.length) console.warn(`chart ${pattern.id}:`, c.errors.slice(0, 3)); }
    return c;
  }
  const v1 = FLAT_V1 && FLAT_V1[pattern.id];
  const k = `${pattern.id}|${e}${v1 ? '' : '|plain'}`;
  let c = charts.get(k);
  if (!c) {
    if (v1) c = parseChart({ ...v1, edition: e, notes: [...(v1.notes || []), V1_NOTE] });
    else { c = parseChart({ ...pattern, round: false, flat: null, sections: null, stitch: fill(12, 40, 'stockinette'), shape: null, color: null, cables: [], edition: e, repeat: { width: 1, edges: 0, rows: 1 } }); c.placeholder = true; }
    charts.set(k, c);
    if (c.errors.length) console.warn(`chart ${pattern.id} ed ${e}:`, c.errors.slice(0, 3));
  }
  return c;
}
// the chart a piece or gallery record was knit on
export const recordChart = (rec, pattern) => chartOf(pattern, rec ? rec.ed : undefined);

export const suggestedSlots = (pattern) => {
  const out = {};
  for (const [k, v] of Object.entries(pattern.slots || { A: null })) out[k] = normYarn(v, k === 'A' ? { color: '#9e2a3a', type: 'wool' } : { color: '#efe4cf', type: 'wool' });
  return out;
};

// yarn at stitch i when following the chart with slot yarns
export function slotYarnAt(chart, slots) {
  const fallback = slots.A || Object.values(slots)[0];
  return (i) => { const L = chart.locate(i); return (L && slots[L.entry.slot]) || fallback; };
}

const cache = new Map(); // key -> canvas
function remember(key, c) { cache.set(key, c); if (cache.size > 120) cache.delete(cache.keys().next().value); return c; }
export function forget(prefix) { for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k); }

// A pattern in given slot yarns (book cards, cast on). cellPx in device px.
export function patternRender(pattern, slots, cellPx, key = '') {
  const chart = chartOf(pattern);
  const k = `p|${pattern.id}|${cellPx}|${key || JSON.stringify(slots)}`;
  if (cache.has(k)) return cache.get(k);
  const yarnAt = slotYarnAt(chart, slots);
  let c = null;
  // (a pattern knit in the round shows as the object, the tube the Basket draws, in these yarns)
  if (shapeOf(chart, pattern)) {
    try {
      const W = Math.max(6, Math.min(32, Math.round(cellPx * 1.8)));
      const bake = bakeChart(chart, yarnAt, W, { castOnYarn: yarnAt(0), key: `pv|${pattern.id}|${key || JSON.stringify(slots)}` });
      if (bake) c = roundObject({ preview: { bake, chart, slots, done: chart.total }, yarns: [] }, pattern, cellPx);
    } catch (e) { console.warn('round preview', pattern.id, e); }
  }
  if (!c) try { c = renderSwatch(chart, { yarnAt, cellPx, castOnYarn: yarnAt(0), background: null }).canvas; } catch (e) { console.warn('render', pattern.id, e); c = document.createElement('canvas'); }
  return remember(k, c);
}

// A gallery piece exactly as knit.
export function pieceRender(g, pattern, cellPx) {
  const chart = recordChart(g, pattern);
  const k = `g|${g.id}|${cellPx}${chart.placeholder ? '|plain' : ''}`;
  if (cache.has(k)) return cache.get(k);
  const ys = g.yarns;
  let c;
  try { c = renderSwatch(chart, { yarnAt: (i) => ys[i] || ys[ys.length - 1], cellPx, castOnYarn: g.castOn || ys[0], background: null }).canvas; } catch (e) { console.warn('render', g.id, e); c = document.createElement('canvas'); }
  return remember(k, c);
}

// A Knitted Friend, finished: seamed, stuffed into a plush, eyes embroidered as French knots.
// Anything else: the piece as knit.
// (Change 2) A piece knit in the round: the object itself, a true tube as it hangs (tube.js via worn.roundObject).
// opts.spin turns it round its axis (the close-up). cellPx: device px per stitch (cellFor(..., rec) picks one for a box).
export function objectRender(g, pattern, cellPx, opts = {}) {
  if (shapeOf(recordChart(g, pattern), pattern)) {
    const sp = opts.spin || 0;
    const k = `o|${g.id}|${g.yarns.length}|${cellPx}`;
    if (!sp && cache.has(k)) return cache.get(k);
    let c = null;
    try { c = roundObject(g, pattern, cellPx, { spin: sp }); } catch (e) { console.warn('round object', g.id, e); }
    if (sp) return c || pieceRender(g, pattern, cellPx); // turning in the close-up: not kept
    return remember(k, c || pieceRender(g, pattern, cellPx));
  }
  if (!isToy(pattern)) return pieceRender(g, pattern, cellPx);
  const k = `t|${g.id}|${cellPx}`;
  if (cache.has(k)) return cache.get(k);
  const flat = pieceRender(g, pattern, cellPx);
  const chart = recordChart(g, pattern);
  // renderSwatch's geometry: margin round(W * 0.6), the cast-on row 0.4 rows below it
  const W = Math.round(cellPx), H = Math.round(W * 0.72), m = Math.round(W * 0.6);
  const eyes = toyEyes(pattern, chart, g.slots).map((e) => ({ x: m + e.c * W + W / 2, y: m + 0.4 * H + (chart.height - e.r) * H + H * 0.55, color: e.color }));
  let c;
  try { c = plushify(flat, { cell: W, eyes }).canvas; } catch (e) { console.warn('plush', g.id, e); c = flat; }
  return remember(k, c);
}

// A soft silhouette of a chart's shape (locked cards)
export function silhouette(pattern, cellPx) {
  const k = `s|${pattern.id}|${cellPx}`;
  if (cache.has(k)) return cache.get(k);
  const chart = chartOf(pattern);
  // (a round pattern: the object's own outline)
  if (shapeOf(chart, pattern)) {
    const obj = patternRender(pattern, { A: { color: '#8a7f86', type: 'wool' } }, cellPx, 'sil');
    if (obj && obj.width > 1) {
      const c = document.createElement('canvas'); c.width = obj.width; c.height = obj.height;
      const g = c.getContext('2d');
      g.drawImage(obj, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(70,40,72,0.55)'; g.fillRect(0, 0, c.width, c.height);
      return remember(k, c);
    }
  }
  const W = cellPx, H = Math.round(cellPx * 0.72);
  const c = document.createElement('canvas');
  c.width = chart.width * W + 4; c.height = chart.height * H + 4;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(70,40,72,0.55)';
  for (let r = 1; r <= chart.height; r++) for (const col of chart.row(r).cols) {
    g.beginPath(); g.ellipse(2 + col * W + W / 2, 2 + (chart.height - r) * H + H / 2, W * 0.62, H * 0.75, 0, 0, Math.PI * 2); g.fill();
  }
  return remember(k, c);
}

// the same render cropped to what is drawn (no empty margin above a piece hanging from its peg)
const trimCache = new WeakMap();
export function trimmed(src) {
  let c = trimCache.get(src);
  if (c) return c;
  c = src;
  try {
    const w = src.width, h = src.height;
    const d = src.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 >= x0 && y1 >= y0) {
      // keep a little room below for the drop shadow
      const pad = Math.round(Math.min(w, h) * 0.02);
      c = document.createElement('canvas'); c.width = x1 - x0 + 1 + pad; c.height = y1 - y0 + 1 + pad;
      c.getContext('2d').drawImage(src, -x0, -y0);
    }
  } catch { c = src; }
  trimCache.set(src, c);
  return c;
}

// fit a render into a box (CSS px) and return a canvas element styled to that size
// (Change 2) the close-up of a round object turning in your hands: 24 spin steps rendered lazily and
// kept, at half the cell size while it's being dragged (fast) and full size once let go, all drawn into
// one canvas the size of the spin-0 view. -> {canvas, draw(spin), dragging}
export function spinView(g, pattern, cellPx, maxW, maxH) {
  const STEPS = 24, frames = new Map();
  const half = Math.max(3, Math.round(cellPx * 0.5));
  const frame = (q, fast) => {
    const k = `${q}|${fast ? 'h' : 'f'}`;
    if (!frames.has(k)) { let c = null; try { c = roundObject(g, pattern, fast ? half : cellPx, { spin: q / STEPS }); } catch (e) { console.warn('spin', g.id, e); } frames.set(k, c); }
    return frames.get(k);
  };
  const f0 = objectRender(g, pattern, cellPx);
  const dpr = Math.min(3, window.devicePixelRatio || 1) * pageZoom();
  const k = Math.min((maxW * dpr) / f0.width, (maxH * dpr) / f0.height, 1.6);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(f0.width * k)); c.height = Math.max(1, Math.round(f0.height * k));
  c.style.width = c.width / dpr + 'px'; c.style.height = c.height / dpr + 'px';
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const view = {
    canvas: c, dragging: false,
    draw(spin) {
      const q = ((Math.round(spin * STEPS) % STEPS) + STEPS) % STEPS;
      const src = (q === 0 && !view.dragging ? f0 : frame(q, view.dragging)) || f0;
      const kk = k * (src === f0 || !view.dragging ? 1 : cellPx / half);
      const w = src.width * kk, h = src.height * kk;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(src, (c.width - w) / 2, (c.height - h) / 2, w, h);
    },
  };
  view.draw(0);
  return view;
}

export function fitCanvas(src, maxW, maxH) {
  const dpr = Math.min(3, window.devicePixelRatio || 1) * pageZoom();
  const k = Math.min((maxW * dpr) / src.width, (maxH * dpr) / src.height, 1.6);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k));
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  c.style.width = c.width / dpr + 'px'; c.style.height = c.height / dpr + 'px';
  return c;
}

// cell size (device px) so a chart fits a box of CSS px. A record (rec) with a round chart: the object's size
// (a tube shows about half its stitches across)
// rec === true: the pattern itself as the object (a preview: the book, Cast On)
export function cellFor(pattern, maxW, maxH, lo = 3, hi = 24, rec = null) {
  const chart = rec && rec !== true ? recordChart(rec, pattern) : chartOf(pattern);
  const sh = rec ? shapeOf(chart, pattern) : null;
  if (sh) {
    const dpr = Math.min(3, window.devicePixelRatio || 1) * pageZoom();
    const b = localBounds(sh, POSE_OF[sh.kind] || 'hang');
    const extra = sh.kind === 'body' ? 1.5 : 1.15; // a hanger, sleeves, a pom-pom
    const c = Math.min((maxW * dpr) / ((b.x1 - b.x0) * extra + 3), (maxH * dpr) / ((b.y1 - b.y0) * extra + 4));
    return Math.max(lo, Math.min(hi * dpr, Math.floor(c)));
  }
  const dpr = Math.min(3, window.devicePixelRatio || 1) * pageZoom();
  const c = Math.min((maxW * dpr) / (chart.width + 2), (maxH * dpr) / ((chart.height + 3) * 0.72));
  return Math.max(lo, Math.min(hi * dpr, Math.floor(c)));
}
