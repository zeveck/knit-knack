// render.js — charts per pattern (cached) and finished-looking renders of pieces (renderSwatch), cached.
import { parseChart } from './chart.js';
import { pageZoom } from './ui.js';
import { renderSwatch } from './work.js';
import { normYarn } from './yarn.js';
import { isToy, toyEyes, plushify } from './plush.js';

const charts = new Map();
export function chartOf(pattern) {
  let c = charts.get(pattern.id);
  if (!c) { c = parseChart(pattern); charts.set(pattern.id, c); if (c.errors.length) console.warn(`chart ${pattern.id}:`, c.errors.slice(0, 3)); }
  return c;
}

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
  let c;
  try { c = renderSwatch(chart, { yarnAt, cellPx, castOnYarn: yarnAt(0), background: null }).canvas; } catch (e) { console.warn('render', pattern.id, e); c = document.createElement('canvas'); }
  return remember(k, c);
}

// A gallery piece exactly as knit.
export function pieceRender(g, pattern, cellPx) {
  const k = `g|${g.id}|${cellPx}`;
  if (cache.has(k)) return cache.get(k);
  const chart = chartOf(pattern);
  const ys = g.yarns;
  let c;
  try { c = renderSwatch(chart, { yarnAt: (i) => ys[i] || ys[ys.length - 1], cellPx, castOnYarn: g.castOn || ys[0], background: null }).canvas; } catch (e) { console.warn('render', g.id, e); c = document.createElement('canvas'); }
  return remember(k, c);
}

// A Knitted Friend, finished: seamed, stuffed into a plush, eyes embroidered as French knots.
// Anything else: the piece as knit.
export function objectRender(g, pattern, cellPx) {
  if (!isToy(pattern)) return pieceRender(g, pattern, cellPx);
  const k = `t|${g.id}|${cellPx}`;
  if (cache.has(k)) return cache.get(k);
  const flat = pieceRender(g, pattern, cellPx);
  const chart = chartOf(pattern);
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

// cell size (device px) so a chart fits a box of CSS px
export function cellFor(pattern, maxW, maxH, lo = 3, hi = 24) {
  const chart = chartOf(pattern);
  const dpr = Math.min(3, window.devicePixelRatio || 1) * pageZoom();
  const c = Math.min((maxW * dpr) / (chart.width + 2), (maxH * dpr) / ((chart.height + 3) * 0.72));
  return Math.max(lo, Math.min(hi * dpr, Math.floor(c)));
}
