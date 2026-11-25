// worn.js — pieces worn by the dolls: bake a piece from its stitch data with the real stitch sprites,
// warp it onto a doll slot by slicing (row strips × a few column segments, each one drawImage under a
// small affine transform), shade it in code (curvature + a contact shadow that lands only on the doll),
// then redraw the doll's "over" polygons (ears over hats, hands over sleeve ends) on top.
//
// Caches: baked pieces (per piece and cell size), warped layers (per piece, doll, slot, size; LRU 60) and
// dressed-doll composites (per doll, outfit and size). All separate from the stitch sprite LRU's own map.
import { renderSwatch } from './work.js';
import { recordChart } from './render.js';
import { data as sceneData, image as sceneImage } from './scene.js';
import * as S from './state.js';
import { fmtLen } from './scarfFacts.js';
import { catImage, coatNow } from './catCoat.js';
import { shapeOf, drawTube, toScreen, localBounds } from './tube.js';
import { parseChart, fill } from './chart.js';

export const DOLLS = ['pip', 'clementine', 'bramble', 'juniper', 'basil', 'mabel', 'purl'];
export const DOLL_NAMES = { pip: 'Pip', clementine: 'Clementine', bramble: 'Bramble', juniper: 'Juniper', basil: 'Basil', mabel: 'Mabel', get purl() { return S.catName(); } };
export const DOLL_ABOUT = {
  pip: 'a small jointed wooden doll', clementine: 'a rag doll with yarn hair', bramble: 'a plush bear', juniper: 'a felt bunny',
  basil: 'a felt fox', mabel: "a tiny wooden artist's mannequin", purl: 'your very own cat',
};
export const SLOTS = ['head', 'neck', 'body', 'hands', 'feet', 'shoulders'];
export const SLOT_NAMES = { head: 'Head', neck: 'Neck', body: 'Body', hands: 'Hands', feet: 'Feet', shoulders: 'Shoulders' };
export const slotsOf = (dollId) => (dollId === 'purl' ? ['head', 'neck'] : SLOTS);
// draw order: under things first; over-polygons follow the slot they cover
const ORDER = ['body', 'feet', 'hands', 'shoulders', 'neck', 'head'];

// per-doll fit tuning (fractions of the anchors), checked on tools/doll-sheet.html
const TUNE = {
  pip: {},
  clementine: { hatW: 1.12, brim: 0.4, cowlW: 1.05 },
  bramble: { hatW: 0.86, brim: 0.42, hatUp: 0.06 },
  juniper: { hatW: 1.0, brim: 0.42 },
  basil: { hatW: 0.84, brim: 0.4, hatDx: -0.035 },
  mabel: { hatW: 1.16, brim: 0.5, mitW: 1.3 },
  purl: { hatW: 0.72, brim: 0.27, hatUp: 0.04, cowlW: 0.85, bandW: 0.8, bandDy: -0.06, neckW: 96, neckDy: -14 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const wrap = (t, th) => Math.sin(t * th) / Math.sin(th);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- doll sprites and anchors
const IMG = {};
let loading = null;
export function loadDolls() {
  if (loading) return loading;
  const files = { pip: 'doll-pip.webp', clementine: 'doll-clementine.webp', bramble: 'doll-bramble.webp', juniper: 'doll-juniper.webp', basil: 'doll-basil.webp', mabel: 'doll-mabel.webp', purl: 'purl-sit.png' };
  loading = Promise.all(Object.entries(files).map(([id, f]) => new Promise((res) => {
    const im = new Image(); im.onload = () => { IMG[id] = im; res(); }; im.onerror = () => res(); im.src = `assets/dolls/${f}`;
  })));
  return loading;
}
export const dollsReady = () => DOLLS.every((d) => IMG[d]);
export function anchors(dollId) {
  const J = sceneData('dolls');
  if (!J) return null;
  if (dollId === 'purl') { const p = J.purl && J.purl['purl-sit']; return p ? { ...p, groundY: 496 } : null; }
  return J.dolls ? J.dolls[dollId] : null;
}
export function dollSize(dollId) { return dollId === 'purl' ? [512, 512] : [512, 768]; }
export const dollImage = (id) => IMG[id] || null;
// the doll's picture as drawn: the cat in her coat
const dollPic = (id) => (id === 'purl' ? catImage(IMG.purl, 'sit') : IMG[id]);
// the box the visible doll occupies in its frame (for laying out shelves), doll px
export function dollBounds(dollId) {
  return dollId === 'purl' ? { x0: 92, y0: 4, x1: 444, y1: 496 } : { x0: 34, y0: dollId === 'juniper' ? 8 : 92, x1: 480, y1: 724 };
}

// ---------------------------------------------------------------- chart facts used by the fits
const infoCache = new Map();
function chartInfo(chart) {
  let ci = infoCache.get(chart);
  if (ci) return ci;
  const rows = chart.height, cols = chart.width;
  ci = { rows, cols };
  if (Number.isFinite(rows)) {
    const R1 = chart.row(1);
    ci.bodyA = Math.min(...R1.cols); ci.bodyB = Math.max(...R1.cols);
    // centre of the bottom row vs the top third (socks: which way the toe points)
    const mid = (r) => { const c = chart.row(r).cols; return (Math.min(...c) + Math.max(...c)) / 2; };
    const top = Math.max(1, Math.round(rows * 0.8));
    ci.toe = mid(top) > mid(1) ? 'left' : 'right';
    // sleeves (sweaters): cells outside the body's columns
    for (const side of ['L', 'R']) {
      let n = 0, sc = 0, sr = 0, rLo = Infinity, rHi = 0;
      for (let r = 1; r <= rows; r++) for (const c of chart.row(r).cols) {
        if (side === 'L' ? c < ci.bodyA : c > ci.bodyB) { n++; sc += c + 0.5; sr += r - 0.5; rLo = Math.min(rLo, r); rHi = Math.max(rHi, r); }
      }
      ci['sleeve' + side] = n ? { n, c: sc / n, r: sr / n, rLo, rHi } : null;
    }
  }
  infoCache.set(chart, ci);
  return ci;
}

// ---------------------------------------------------------------- baking
// A bake: {canvas, W, H, x0, y0, gw, gh, cols, rows} — the chart's grid spans x0..x0+gw, y0..y0+gh
// (row `rows` at the top), with a margin around it for the cast-on edge, the bind-off chain and loops.
const bakes = new Map();
function rememberBake(k, b) { bakes.set(k, b); if (bakes.size > 24) bakes.delete(bakes.keys().next().value); return b; }
export function bakeChart(chart, yarnAt, W, { castOnYarn, bindOff = true, key = null } = {}) {
  W = Math.max(3, Math.round(W));
  const k = key ? `${key}|${W}` : null;
  if (k && bakes.has(k)) { const b = bakes.get(k); bakes.delete(k); bakes.set(k, b); return b; }
  const M = Math.round(W * 1.2);
  let res;
  try { res = renderSwatch(chart, { yarnAt, cellPx: W, castOnYarn: castOnYarn || yarnAt(0), background: null, shadow: false, margin: M, bindOff }); } catch (e) { console.warn('bake', e); return null; }
  const b = { canvas: res.canvas, W: res.W, H: res.H, x0: M, y0: M + 0.4 * res.H, gw: chart.width * res.W, gh: chart.height * res.H, cols: chart.width, rows: chart.height, chart };
  // (Change 2) rows sit by the chart's row -> y table (zero-height steps take no room): the top of row r
  if (chart.round) { const hy = chart.heightY ?? chart.height; b.gh = hy * res.H; b.rowTop = (r) => b.y0 + (hy - chart.yOf(r)) * res.H; }
  return k ? rememberBake(k, b) : b;
}
export function bakeGallery(g, W) {
  const p = S.patternById(g.pattern);
  if (!p) return null;
  const ys = g.yarns;
  const chart = recordChart(g, p);
  return bakeChart(chart, (i) => ys[i] || ys[ys.length - 1], W, { castOnYarn: g.castOn || ys[0], key: `g|${g.id}|${ys.length}${chart.placeholder ? '|plain' : ''}` });
}
export function forgetBakes(prefix) { for (const k of [...bakes.keys()]) if (k.startsWith(prefix)) bakes.delete(k); for (const k of [...layers.keys()]) if (k.startsWith(prefix)) layers.delete(k); composites.clear(); }

// shaded copy of a bake for a kind of fit (curvature in the piece's own u/v space, carried by the warp)
const shadedCache = new WeakMap();
function shaded(bake, kind) {
  let m = shadedCache.get(bake);
  if (!m) { m = new Map(); shadedCache.set(bake, m); }
  if (m.has(kind)) return m.get(kind);
  const c = mk(bake.canvas.width, bake.canvas.height);
  const g = c.getContext('2d');
  g.drawImage(bake.canvas, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  const { x0, y0, gw, gh } = bake;
  const dark = (a) => `rgba(36,16,34,${a})`, lite = (a) => `rgba(255,244,222,${a})`;
  const across = (horizontal, edge, hi) => {
    const gr = horizontal ? g.createLinearGradient(x0, 0, x0 + gw, 0) : g.createLinearGradient(0, y0, 0, y0 + gh);
    gr.addColorStop(0, dark(edge)); gr.addColorStop(0.2, dark(edge * 0.35)); gr.addColorStop(0.42, dark(0)); gr.addColorStop(0.62, dark(0.02)); gr.addColorStop(0.82, dark(edge * 0.45)); gr.addColorStop(1, dark(edge * 1.1));
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    if (hi) {
      const h2 = horizontal ? g.createLinearGradient(x0, 0, x0 + gw, 0) : g.createLinearGradient(0, y0, 0, y0 + gh);
      h2.addColorStop(0.18, lite(0)); h2.addColorStop(0.36, lite(hi)); h2.addColorStop(0.55, lite(0));
      g.fillStyle = h2; g.fillRect(0, 0, c.width, c.height);
    }
  };
  if (kind === 'dome') {
    across(true, 0.42, 0.1);
    const v = g.createLinearGradient(0, y0, 0, y0 + gh);
    v.addColorStop(0, dark(0.22)); v.addColorStop(0.35, dark(0)); v.addColorStop(0.9, dark(0.04)); v.addColorStop(1, dark(0.22));
    g.fillStyle = v; g.fillRect(0, 0, c.width, c.height);
  } else if (kind === 'wrapU') across(true, 0.4, 0.08);
  else if (kind === 'wrapV') across(false, 0.4, 0.08);
  else if (kind === 'barrel') across(true, 0.3, 0.07);
  else if (kind === 'sock') {
    across(true, 0.16, 0.05);
    const v = g.createLinearGradient(0, y0, 0, y0 + gh);
    v.addColorStop(0, dark(0.04)); v.addColorStop(0.8, dark(0.06)); v.addColorStop(1, dark(0.3));
    g.fillStyle = v; g.fillRect(0, 0, c.width, c.height);
  } else if (kind === 'drape') {
    across(true, 0.22, 0.06);
    const v = g.createLinearGradient(0, y0, 0, y0 + gh);
    v.addColorStop(0, dark(0.24)); v.addColorStop(0.5, dark(0.02)); v.addColorStop(1, dark(0.1));
    g.fillStyle = v; g.fillRect(0, 0, c.width, c.height);
  } else if (kind === 'body') {
    const { bodyA = 0, bodyB = bake.cols - 1 } = bake.info || {};
    const a = x0 + (bodyA / bake.cols) * gw, b = x0 + ((bodyB + 1) / bake.cols) * gw;
    const gr = g.createLinearGradient(a, 0, b, 0);
    gr.addColorStop(0, dark(0.3)); gr.addColorStop(0.16, dark(0.06)); gr.addColorStop(0.45, dark(0)); gr.addColorStop(0.84, dark(0.08)); gr.addColorStop(1, dark(0.32));
    g.fillStyle = gr; g.fillRect(a, 0, b - a, c.height);
    const v = g.createLinearGradient(0, y0, 0, y0 + gh);
    v.addColorStop(0, dark(0.1)); v.addColorStop(0.12, dark(0)); v.addColorStop(0.92, dark(0)); v.addColorStop(1, dark(0.16));
    g.fillStyle = v; g.fillRect(0, 0, c.width, c.height);
    // sleeves: round along their length
    for (const [lo, hi] of [[0, a], [b, c.width]]) {
      if (hi - lo < 2) continue;
      const s = g.createLinearGradient(0, y0, 0, y0 + gh * 0.5);
      s.addColorStop(0, dark(0.16)); s.addColorStop(0.5, dark(0)); s.addColorStop(1, dark(0.2));
      g.fillStyle = s; g.fillRect(lo, 0, hi - lo, c.height);
    }
  }
  m.set(kind, c);
  return c;
}

// ---------------------------------------------------------------- fits: plans of parts {F(u,v)->[x,y] doll px, u0,u1,v0,v1,nu,nv, shade}
// u: 0..1 across the chart's columns (left to right); v: 0..1 from the bottom of row 1 to the top of the last row.
function planFit(slot, fit, A, T, ci, opts = {}) {
  const rows = ci.rows, cols = ci.cols;
  const ev0 = -1.1 / rows, ev1 = 1 + 0.9 / rows, eu0 = -0.4 / cols, eu1 = 1 + 0.4 / cols;
  const strips = (n) => Math.min(opts.maxStrips || 999, n);
  if (slot === 'head') {
    const [x0, , x1, y1] = A.head.box; const hw = x1 - x0;
    const cx = (x0 + x1) / 2 + (T.hatDx || 0) * hw;
    const top = A.head.domeTopY;
    if (fit === 'band') {
      const alongV = rows * 0.72 >= cols;
      const Wb = hw * (T.bandW ?? 1.04);
      const lenU = alongV ? rows * 0.72 : cols, acrossU = alongV ? cols : rows * 0.72;
      const sa = (Wb / lenU) * 1.2;
      const th = clamp(acrossU * sa, hw * 0.15, hw * 0.25);
      const yc = A.head.bandY + hw * (T.bandDy ?? 0.06);
      const F = (u, v) => {
        const a = alongV ? v : u, b = alongV ? 1 - u : v;
        const t = 2 * a - 1;
        return [cx + (Wb / 2) * wrap(t, 1.05), yc + (0.5 - b) * th * (1 - 0.12 * t * t) + hw * 0.055 * (1 - t * t)];
      };
      return [{ F, u0: eu0, u1: eu1, v0: ev0, v1: ev1, nu: strips(alongV ? 2 : Math.min(cols + 1, 16)), nv: strips(alongV ? rows + 2 : 4), shade: alongV ? 'wrapV' : 'wrapU' }];
    }
    // dome (hats)
    const Wb = hw * (T.hatW ?? 1.06);
    const yb = top + (y1 - top) * (T.brim ?? 0.37);
    const sa = Wb / cols;
    const nat = rows * 0.72 * sa;
    const target = yb - (top - hw * (T.hatUp ?? 0.14));
    const Ht = clamp(target, nat * 0.56, nat * 1.04);
    const gfun = (v) => (v < 0 ? v * (0.65 + 0.35 * Math.PI / 2) : v > 1 ? 1 + (v - 1) * 0.65 : 0.65 * v + 0.35 * Math.sin((v * Math.PI) / 2));
    const F = (u, v) => {
      const t = 2 * u - 1;
      const vv = clamp(v, 0, 1);
      const bow = hw * (0.05 - 0.13 * vv * vv) * (1 - t * t);
      const prof = 1 - 0.2 * smooth(0.3, 1.05, v);
      return [cx + (Wb / 2) * wrap(t, 1.0) * prof, yb - Ht * gfun(v) + bow];
    };
    return [{ F, u0: eu0, u1: eu1, v0: ev0, v1: ev1, nu: strips(Math.min(cols + 1, 12)), nv: strips(rows + 2), shade: 'dome', touchTop: F(0.5, 1) }];
  }
  if (slot === 'neck') {
    const [nx0, , nx1] = A.neck.box; const nw = T.neckW || nx1 - nx0; const cx = (nx0 + nx1) / 2;
    A = { ...A, neck: { ...A.neck, y: A.neck.y + (T.neckDy || 0) } };
    const bw = A.body ? A.body.box[2] - A.body.box[0] : nw * 2.4;
    if (fit === 'band') {
      const Wn = Math.max(nw * 1.9, bw * 0.74) * (T.cowlW ?? 1);
      const sa = (Wn / cols) * 1.15;
      const Hn = clamp(rows * 0.72 * sa, Wn * 0.28, Wn * 0.5);
      const yc = A.neck.y + Hn * 0.12;
      const F = (u, v) => { const t = 2 * u - 1; return [cx + (Wn / 2) * wrap(t, 1.1), yc + (0.5 - v) * Hn * (1 - 0.14 * t * t) + Hn * 0.22 * (1 - t * t) * (0.55 + 0.45 * (1 - v))]; };
      return [{ F, u0: eu0, u1: eu1, v0: ev0, v1: ev1, nu: strips(Math.min(cols + 1, 14)), nv: strips(rows + 2), shade: 'wrapU' }];
    }
    // hang: the scarf panel draped round the neck, both halves hanging down the front
    const stripW = clamp(bw * 0.4, nw * 0.7, nw * 1.2) * (T.scarfW ?? 1);
    const sa = stripW / cols;
    const half = rows / 2;
    const len = half * 0.72 * sa * 1.35;
    const ytop = A.neck.y - nw * 0.05;
    const mkSide = (sgn) => {
      const xr = cx + sgn * nw * 0.62;
      return (u, v) => {
        const s = sgn > 0 ? (0.5 - v) / 0.5 : (v - 0.5) / 0.5; // 0 at the neck, 1 at the end
        const across = (sgn > 0 ? u - 0.5 : 0.5 - u) * stripW * (1 - 0.1 * (1 - smooth(0, 0.25, s)));
        const bend = (1 - smooth(0, 0.3, s)) * nw * 0.3;
        return [xr + across + sgn * s * len * 0.1 - sgn * bend, ytop + s * len - (1 - smooth(0, 0.3, s)) * nw * 0.15];
      };
    };
    return [
      { F: mkSide(1), u0: eu0, u1: eu1, v0: ev0, v1: 0.5, nu: 3, nv: strips(Math.ceil(half) + 1), shade: 'wrapU' },
      { F: mkSide(-1), u0: eu0, u1: eu1, v0: 0.5, v1: ev1, nu: 3, nv: strips(Math.ceil(half) + 1), shade: 'wrapU' },
    ];
  }
  if (slot === 'shoulders') {
    // a shawlette worn as one: snug round the neck at its top edge, falling over the shoulders and flaring
    // over the upper arms, its middle dipping to a soft point at the front
    const { x0, x1, y } = A.shoulders; const sw = x1 - x0; const cx = (x0 + x1) / 2;
    const nk = A.neck || { box: [cx - sw * 0.16, y - 26, cx + sw * 0.16, y - 2], y: y - 14 };
    const halfBot = (sw * (T.shawlW ?? 1.42)) / 2;
    const halfTop = Math.max((nk.box[2] - nk.box[0]) * 0.72, sw * 0.34);
    const sa = (halfBot * 2) / cols;
    const Hs = rows * 0.72 * sa * 1.1;
    const yTop = nk.y + (nk.box[3] - nk.y) * 0.5;
    const F = (u, v) => {
      const t = 2 * u - 1, w = 1 - v;
      const flare = halfTop + (halfBot - halfTop) * (1 - Math.pow(Math.max(0, 1 - w), 1.6));
      const top = yTop + t * t * (y - yTop + Hs * 0.1);
      return [cx + t * flare, top + w * Hs * (0.85 + 0.15 * t * t) + w * Hs * 0.32 * (1 - t * t)];
    };
    return [{ F, u0: eu0, u1: eu1, v0: ev0, v1: ev1, nu: strips(Math.min(cols + 1, 16)), nv: strips(rows + 2), shade: 'drape' }];
  }
  if (slot === 'hands') {
    const full = !!opts.fullHand;
    return ['L', 'R'].map((side) => {
      const [hx0, hy0, hx1, hy1] = A.hands[side];
      const hc = [(hx0 + hx1) / 2, (hy0 + hy1) / 2], hr = (hx1 - hx0) / 2;
      const sh = A.body['shoulder' + side];
      let dx = hc[0] - sh[0], dy = hc[1] - sh[1]; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
      const perp = side === 'R' ? [dy, -dx] : [-dy, dx];
      const Wm = hr * 2 * (T.mitW ?? 1.42) * (full ? 1 : 0.92);
      const sa = Wm / cols;
      const L = rows * 0.72 * sa;
      const tip = [hc[0] + dx * hr * (full ? 0.95 : 0.1), hc[1] + dy * hr * (full ? 0.95 : 0.1)];
      const F = (u, v) => { const al = (v - 1) * L, ac = wrap(2 * u - 1, 0.9) * (Wm / 2); return [tip[0] + dx * al + perp[0] * ac, tip[1] + dy * al + perp[1] * ac]; };
      return { F, u0: eu0, u1: eu1, v0: ev0, v1: ev1, nu: strips(Math.min(cols + 1, 8)), nv: strips(rows + 2), shade: 'barrel' };
    });
  }
  if (slot === 'feet') {
    return ['L', 'R'].map((side) => {
      const f = A.feet[side]; const [fx0, , fx1, fy1] = f.box; const fw = fx1 - fx0;
      const mirror = ci.toe !== f.toe;
      const Ls = fw * (T.sockW ?? 1.12);
      const sa = Ls / cols;
      const Hs = rows * 0.72 * sa * 0.96;
      const xl = f.toe === 'left' ? fx0 - fw * 0.06 : fx1 + fw * 0.06 - Ls;
      const F = (u, v) => [xl + (mirror ? 1 - u : u) * Ls, fy1 + fw * 0.03 - v * Hs];
      return { F, u0: eu0, u1: eu1, v0: ev0, v1: ev1, nu: strips(Math.min(cols + 1, 6)), nv: strips(rows + 2), shade: 'sock' };
    });
  }
  if (slot === 'body') {
    const [bx0, , bx1, by1] = A.body.box; const bw = bx1 - bx0; const bcx = (bx0 + bx1) / 2;
    const A0 = ci.bodyA, B0 = ci.bodyB + 1, mid = (A0 + B0) / 2, half = (B0 - A0) / 2;
    const sx = (bw * (T.sweaterW ?? 1.14)) / (B0 - A0);
    const sL = ci.sleeveL, sR = ci.sleeveR;
    const rTop = Math.max(sL ? sL.rHi : rows, sR ? sR.rHi : rows);
    const shY = (A.body.shoulderL[1] + A.body.shoulderR[1]) / 2;
    const yTopSleeve = shY - bw * 0.1;
    const nat = rTop * 0.72 * sx;
    const vs = clamp((by1 + bw * 0.06 - yTopSleeve) / nat, 0.8, 1.25);
    const sy = 0.72 * sx * vs;
    const yBottom = yTopSleeve + rTop * sy;
    const base = (c, r) => {
      const t = (c - mid) / half;
      const x = Math.abs(t) <= 1 ? bcx + half * sx * wrap(t, 0.7) : bcx + Math.sign(t) * half * sx + (c - (t > 0 ? B0 : A0)) * sx;
      return [x, yBottom - r * sy];
    };
    // rotate each sleeve about its shoulder pivot so it runs along the doll's arm
    const rot = {};
    for (const side of ['L', 'R']) {
      const sl = side === 'L' ? sL : sR; if (!sl) continue;
      const edge = side === 'L' ? A0 : B0;
      const piv = base(edge, (sl.rLo + sl.rHi) / 2 + (sl.rHi - sl.rLo) * 0.15);
      const cen = base(sl.c, sl.r);
      const want = ((side === 'L' ? 180 - A.body.armAngleL : A.body.armAngleR) * Math.PI) / 180;
      const have = Math.atan2(cen[1] - piv[1], cen[0] - piv[0]);
      let d = want - have; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      rot[side] = { piv, d, edge };
    }
    const F = (u, v) => {
      const c = u * cols, r = v * rows;
      let [x, y] = base(c, r);
      for (const side of ['L', 'R']) {
        const R = rot[side]; if (!R) continue;
        const out = side === 'L' ? R.edge - c : c - R.edge;
        const w = smooth(-1.2, 1.6, out);
        if (w <= 0) continue;
        const a = R.d * w, ca = Math.cos(a), sa2 = Math.sin(a);
        const px = x - R.piv[0], py = y - R.piv[1];
        x = R.piv[0] + px * ca - py * sa2; y = R.piv[1] + px * sa2 + py * ca;
      }
      return [x, y];
    };
    return [{ F, u0: eu0, u1: eu1, v0: ev0, v1: ev1, nu: strips(Math.min(Math.ceil(cols / 1.5), 30)), nv: strips(rows + 2), shade: 'body' }];
  }
  return [];
}

// The Infinite Scarf worn: two wraps round the neck and a tail hanging to the shelf, from its first rows.
function planScarf(A, T, rowsAvail, opts = {}) {
  const [nx0, , nx1] = A.neck.box; const nw = T.neckW || nx1 - nx0; const cx = (nx0 + nx1) / 2;
  A = { ...A, neck: { ...A.neck, y: A.neck.y + (T.neckDy || 0) } };
  const bw = A.body ? A.body.box[2] - A.body.box[0] : nw * 2.4;
  const th = clamp(nw * 0.58, 18, 44) * (T.scarfW ?? 1); // band thickness (12 sts)
  const sa = th / 12, rowPx = 0.72 * sa;
  const Wn = Math.max(nw * 1.95, bw * 0.78) * (T.cowlW ?? 1);
  const front = Math.max(8, Math.round(Wn / (rowPx * 1.7))), back = Math.round(front * 0.7);
  const ground = A.groundY ?? 720;
  const y0 = A.neck.y + th * 0.4;
  const tailX = cx - nw * 0.42;
  const vert = ground - y0 - th * 0.6;
  const bendR = th * 1.2;
  const tailRowsWanted = Math.round((vert + th * 3) / rowPx);
  const parts = [];
  let r = 0;
  const seg = (n) => { const a = r; r = Math.min(rowsAvail, r + n); return [a, r]; };
  const w1 = seg(front); seg(back); const w2 = seg(front); seg(back); const tl = seg(tailRowsWanted);
  const N = Math.max(1, r);
  const vOf = (row) => row / N;
  // tail: down from under the wraps, then bending to lie along the shelf
  if (tl[1] > tl[0]) {
    const path = (d) => {
      if (d <= vert - bendR) return { x: tailX + Math.sin(d / 60) * nw * 0.08, y: y0 + d, nx: 1, ny: 0 };
      const a = Math.min(Math.PI / 2, (d - (vert - bendR)) / bendR);
      if (d - (vert - bendR) <= bendR * Math.PI / 2) {
        const ox = tailX + Math.sin((vert - bendR) / 60) * nw * 0.08 - bendR, oy = y0 + vert - bendR;
        return { x: ox + Math.cos(a) * bendR, y: oy + Math.sin(a) * bendR, nx: Math.cos(a), ny: Math.sin(a) };
      }
      const rest = d - (vert - bendR) - bendR * Math.PI / 2;
      const ex = tailX + Math.sin((vert - bendR) / 60) * nw * 0.08 - bendR;
      return { x: ex - rest, y: y0 + vert, nx: 0, ny: 1 };
    };
    const n = tl[1] - tl[0];
    const F = (u, v) => {
      const d = (v * N - tl[0]) * rowPx;
      const p = path(Math.max(-th, d));
      const ac = (u - 0.5) * th;
      return [p.x + p.nx * ac, p.y + p.ny * ac];
    };
    parts.push({ F, u0: -0.03, u1: 1.03, v0: vOf(tl[0]), v1: vOf(tl[1]), nu: 2, nv: Math.min(opts.maxStrips || 999, n), shade: 'wrapU', z: 0 });
  }
  const wrapPart = (w, yc, dir) => {
    if (w[1] <= w[0]) return;
    const F = (u, v) => {
      const a = (v * N - w[0]) / front; const t = dir * (2 * a - 1);
      return [cx + (Wn / 2) * wrap(t, 1.15), yc + (u - 0.5) * th * (1 - 0.1 * t * t) + th * 0.42 * (1 - t * t)];
    };
    parts.push({ F, u0: -0.04, u1: 1.04, v0: vOf(w[0]), v1: vOf(w[1]), nu: 3, nv: Math.min(opts.maxStrips || 999, w[1] - w[0] + 1), shade: 'wrapV', z: 1 });
  };
  wrapPart(w1, y0 - th * 0.05, 1);
  wrapPart(w2, y0 - th * 0.72, -1);
  return { parts, rowsUsed: r, label: { x: tailX - bendR - th * 2.2, y: ground - th * 0.2 } };
}

// ---------------------------------------------------------------- slicing
function drawParts(g, bake, parts, k, ox, oy, shadeKind) {
  const src = shadeKind ? shaded(bake, shadeKind) : bake.canvas;
  const cw = src.width, chh = src.height;
  for (const p of parts) {
    const s = p.shade ? shaded(bake, p.shade) : src;
    for (let j = 0; j < p.nv; j++) {
      const va = p.v0 + ((p.v1 - p.v0) * j) / p.nv, vb = p.v0 + ((p.v1 - p.v0) * (j + 1)) / p.nv, vm = (va + vb) / 2;
      const syTop = bake.y0 + (1 - vb) * bake.gh, syBot = bake.y0 + (1 - va) * bake.gh;
      for (let i = 0; i < p.nu; i++) {
        const ua = p.u0 + ((p.u1 - p.u0) * i) / p.nu, ub = p.u0 + ((p.u1 - p.u0) * (i + 1)) / p.nu, um = (ua + ub) / 2;
        const sx0 = bake.x0 + ua * bake.gw, sx1 = bake.x0 + ub * bake.gw;
        const L = p.F(ua, vm), R = p.F(ub, vm), Tp = p.F(um, vb), B = p.F(um, va), C = p.F(um, vm);
        const sw = sx1 - sx0, sh = syBot - syTop;
        const a = ((R[0] - L[0]) * k) / sw, b = ((R[1] - L[1]) * k) / sw, c = ((B[0] - Tp[0]) * k) / sh, d = ((B[1] - Tp[1]) * k) / sh;
        const sxm = (sx0 + sx1) / 2, sym = (syTop + syBot) / 2;
        g.setTransform(a, b, c, d, C[0] * k - ox - a * sxm - c * sym, C[1] * k - oy - b * sxm - d * sym);
        const scl = Math.max(0.2, Math.min(Math.hypot(a, b), Math.hypot(c, d)));
        const pad = clamp(0.8 / scl, 0.6, 3);
        let qx0 = Math.max(0, sx0 - pad), qx1 = Math.min(cw, sx1 + pad), qy0 = Math.max(0, syTop - pad), qy1 = Math.min(chh, syBot + pad);
        // the outermost slices take the whole margin (cast-on edge, bind-off chain, selvedge loops)
        if (i === 0) qx0 = Math.max(0, Math.min(qx0, sx0 - bake.W * 0.6));
        if (i === p.nu - 1) qx1 = Math.min(cw, Math.max(qx1, sx1 + bake.W * 0.6));
        if (qx1 - qx0 < 0.5 || qy1 - qy0 < 0.5) continue;
        g.drawImage(s, qx0, qy0, qx1 - qx0, qy1 - qy0, qx0, qy0, qx1 - qx0, qy1 - qy0);
      }
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
function partsBox(parts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parts) for (let j = 0; j <= 8; j++) for (let i = 0; i <= 8; i++) {
    const [x, y] = p.F(p.u0 + ((p.u1 - p.u0) * i) / 8, p.v0 + ((p.v1 - p.v0) * j) / 8);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

// ---------------------------------------------------------------- items: what a slot holds
// item: {gid} (gallery piece) | 'scarf' | {preview: {bake, chart, pattern, slots}} (the card's piece in progress)
function itemPattern(item) {
  if (item === 'scarf') return { wear: { slot: 'neck', fit: 'scarf' }, id: 'infinite-scarf' };
  if (item && item.preview) return item.preview.pattern;
  const g = item && S.galleryById(item.gid || item);
  return g ? S.patternById(g.pattern) : null;
}
export function itemSlot(item) { const p = itemPattern(item); return p && p.wear ? p.wear.slot : null; }

let scarfSource = null; // set by scarf.js: () => {chart, yarnAt, rows, totalRows, castOnYarn, version}
export function setScarfSource(fn) { scarfSource = fn; forgetBakes('scarf'); }

// ---------------------------------------------------------------- layers (warped + shaded piece, in a box)
const layers = new Map();
function rememberLayer(k, v) { layers.set(k, v); if (layers.size > 60) layers.delete(layers.keys().next().value); return v; }

// Build the layer for an item on a doll at k (output px per doll px). Returns {canvas, x, y, label?} in output px.
export function pieceLayer(item, dollId, k, opts = {}) {
  const A = anchors(dollId); if (!A) return null;
  const T = TUNE[dollId] || {};
  const pat = itemPattern(item); if (!pat || !pat.wear) return null;
  const slot = pat.wear.slot, fit = pat.wear.fit;
  if (!slotsOf(dollId).includes(slot)) return null;
  const kq = Math.round(k * 64) / 64;
  const isScarf = item === 'scarf';
  const sv = isScarf && scarfSource ? scarfSource() : null;
  if (isScarf && (!sv || !sv.rows)) return null;
  const key = item.preview ? null : `${isScarf ? `scarf|${sv.version}` : 'g|' + (item.gid || item)}|${dollId}|${slot}|${kq}`;
  if (key && layers.has(key)) { const v = layers.get(key); layers.delete(key); layers.set(key, v); return v; }
  let parts, bake, label = null, extra = null;
  if (isScarf) {
    const pl0 = planScarf(A, T, sv.rows);
    const sa = (clamp(((T.neckW || A.neck.box[2] - A.neck.box[0]) * 0.58), 18, 44) * (T.scarfW ?? 1)) / 12;
    const W = clamp(Math.ceil(sa * kq), 3, 14);
    const seg = sv.segment(pl0.rowsUsed);
    bake = bakeChart(seg.chart, seg.yarnAt, W, { castOnYarn: seg.castOnYarn, bindOff: false, key: `scarf|${sv.version}|${pl0.rowsUsed}` });
    if (!bake) return null;
    const pl = planScarf(A, T, pl0.rowsUsed);
    parts = pl.parts.sort((a, b) => a.z - b.z);
    const more = sv.totalRows - pl.rowsUsed;
    if (more > 0) label = { x: pl.label.x * kq, y: pl.label.y * kq, text: `+ ${fmtLen(more)} more` };
  } else {
    let chart, slots;
    // (Change 2) a piece knit in the round wears as a true tube (tube.js): its own two-layer fit
    {
      const g0 = item.preview ? null : S.galleryById(item.gid || item);
      const ch0 = item.preview ? item.preview.chart : recordChart(g0, pat);
      const sh = shapeOf(ch0, pat);
      if (sh) { const L = roundLayer(item, g0, sh, pat, slot, dollId, A, T, kq, opts); return key && L ? rememberLayer(key, L) : L; }
    }
    if (item.preview) { bake = item.preview.bake; chart = item.preview.chart; slots = item.preview.slots; } else {
      const g = S.galleryById(item.gid || item);
      chart = recordChart(g, pat); slots = g.slots;
      const ci0 = chartInfo(chart);
      const p0 = planFit(slot, fit, A, T, ci0, { fullHand: /mitten/.test(pat.id) });
      // doll px per stitch -> output px per stitch
      const b0 = partsBox(p0);
      const span = Math.max(b0.x1 - b0.x0, b0.y1 - b0.y0) / Math.max(ci0.cols, ci0.rows * 0.72);
      const W = clamp(Math.ceil(span * kq * 1.05), 4, opts.maxCell || 16);
      bake = bakeGallery(g, W);
    }
    if (!bake) return null;
    const ci = chartInfo(chart);
    bake.info = ci;
    parts = planFit(slot, fit, A, T, ci, { fullHand: /mitten/.test(pat.id), maxStrips: opts.maxStrips });
    // finishing touches that show when worn
    const tch = pat.touch && (pat.touch.kind || pat.touch);
    if (tch === 'pompom' && slot === 'head' && parts[0].touchTop) {
      const yarn = (slots && slots[pat.touch.slot || 'A']) || null;
      extra = { kind: 'pompom', at: parts[0].touchTop, color: yarn ? yarn.color : '#efe4cf', size: (A.head.box[2] - A.head.box[0]) * 0.3 };
    } else if (tch === 'buttons' && Array.isArray(pat.touch.cells)) {
      const yarn = (slots && slots[pat.touch.slot || 'B']) || null;
      extra = { kind: 'buttons', at: pat.touch.cells.map(([r, c]) => parts[0].F((c + 0.5) / ci.cols, (r - 0.5) / ci.rows)), color: yarn ? yarn.color : '#6b4426', size: (A.body.box[2] - A.body.box[0]) * 0.075 };
    }
  }
  const box = partsBox(parts);
  const pad = 6;
  const x = Math.floor(box.x0 * kq) - pad, y = Math.floor(box.y0 * kq) - pad - (extra && extra.kind === 'pompom' ? Math.ceil(extra.size * kq) : 0);
  const c = mk(Math.ceil(box.x1 * kq) + pad - x, Math.ceil(box.y1 * kq) + pad - y);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  drawParts(g, bake, parts, kq, x, y, null);
  if (extra) drawTouch(g, extra, kq, x, y);
  const out = { canvas: c, x, y, slot, label, dollId };
  return key ? rememberLayer(key, out) : out;
}

// ---------------------------------------------------------------- (Change 2) round pieces: true tubes (CHANGE_2.md E)
// The fit for a round piece is a list of tube places (tube.js) in doll px: the back half of each is drawn
// behind the doll (darkened), the front half over it. Pairs mirror for the other side.
function roundPlaces(Sh, slot, A, T, dollId) {
  const out = [];
  const P = Sh.prof.main; const top = P.S[P.S.length - 1];
  const r0 = Sh.rho0;
  if (slot === 'head') {
    const [x0, , x1, y1] = A.head.box; const hw = x1 - x0;
    const cx = (x0 + x1) / 2 + (T.hatDx || 0) * hw;
    const domeTop = A.head.domeTopY;
    if (Sh.kind === 'dome') {
      const Wb = hw * (T.hatW ?? 1.06);
      const yb = domeTop + (y1 - domeTop) * (T.brim ?? 0.37);
      const s = Wb / (2 * r0);
      const nat = top * s;
      const target = yb - (domeTop - hw * (T.hatUp ?? 0.14));
      const sy = clamp(target / nat, 0.6, 1.05);
      out.push({ s, sy, ox: cx, oy: yb - 0.08 * r0 * s * sy, rot: 0, flip: false, pose: 'worn' });
    } else {
      // a headband or the ear warmer: a ring round the head, over the ears' roots
      const Wb = hw * (T.bandW ?? 1.04);
      const s = Wb / (2 * r0);
      const sy = clamp((hw * 0.25) / (top * s), 0.45, 1);
      const yc = A.head.bandY + hw * (T.bandDy ?? 0.03);
      out.push({ s, sy, ox: cx, oy: yc + (top * s * sy) / 2, rot: 0, flip: false, pose: 'worn' });
    }
  } else if (slot === 'neck') {
    const [nx0, , nx1] = A.neck.box; const nw = T.neckW || nx1 - nx0; const cx = (nx0 + nx1) / 2;
    const ny = A.neck.y + (T.neckDy || 0);
    const bw = A.body ? A.body.box[2] - A.body.box[0] : nw * 2.4;
    const Wn = Math.max(nw * 2.4, bw * 1.04) * (T.cowlW ?? 1);
    const s = Wn / (2 * r0);
    const sy = clamp(clamp(top * s, Wn * 0.24, Wn * 0.34) / (top * s), 0.4, 1);
    const Hn = top * s * sy;
    // it rests on the shoulders, round the neck's base
    out.push({ s, sy, ox: cx, oy: ny + Hn * 0.78, rot: 0, flip: false, pose: 'cowl' });
  } else if (slot === 'hands') {
    const bcx = A.body ? (A.body.box[0] + A.body.box[2]) / 2 : 256;
    for (const side of ['L', 'R']) {
      const [hx0, hy0, hx1, hy1] = A.hands[side];
      const hc = [(hx0 + hx1) / 2, (hy0 + hy1) / 2], hr = (hx1 - hx0) / 2;
      const sh = A.body['shoulder' + side];
      let dx = hc[0] - sh[0], dy = hc[1] - sh[1]; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
      const Wm = hr * 2 * (T.mitW ?? 1.42) * 0.96;
      const s = Wm / (2 * r0);
      const sy = clamp((hr * (Sh.hasThumb ? 3.6 : 3.0)) / (top * s), 0.4, 1);
      const rot = Math.atan2(dy, dx) - Math.PI / 2;
      // a mitten covers the hand; open-topped mitts stop at the knuckles, so the fingers show
      const reach = Sh.gathered ? 0.92 : 0.05;
      const tip = [hc[0] + dx * hr * reach, hc[1] + dy * hr * reach];
      // the thumb at the outer side
      const outward = Math.sign(hc[0] - bcx) || 1;
      const lx = [Math.cos(rot), Math.sin(rot)];
      const flip = Math.sign(lx[0]) * (Sh.thumbSide || -1) !== outward;
      const L = top * s * sy;
      out.push({ s, sy, ox: tip[0] - dx * L, oy: tip[1] - dy * L, rot, flip, pose: 'worn', side });
    }
  } else if (slot === 'feet') {
    for (const side of ['L', 'R']) {
      const f = A.feet[side]; const [fx0, , fx1, fy1] = f.box; const fw = fx1 - fx0;
      const len = fw * (T.sockW ?? 1.1);
      const span = Sh.anchors.toe[0] + r0;
      const s = len / span;
      const flip = f.toe === 'left';
      const heelX = flip ? fx1 + fw * 0.02 : fx0 - fw * 0.02;
      const ox = flip ? heelX - r0 * s : heelX + r0 * s;
      out.push({ s, sy: 1, ox, oy: fy1 + fw * 0.03 - Sh.anchors.sole * s, rot: 0, flip, pose: 'profile', side });
    }
  } else if (slot === 'body') {
    const [bx0, , bx1, by1] = A.body.box; const bw = bx1 - bx0; const bcx = (bx0 + bx1) / 2;
    const s = (bw * (T.sweaterW ?? 1.1)) / (2 * r0);
    const neckTop = A.neck ? A.neck.y - (A.neck.box[3] - A.neck.box[1]) * 0.25 : A.body.box[1];
    const hem = by1 + bw * 0.05;
    const sy = clamp((hem - neckTop) / (top * s), 0.7, 1.7);
    out.push({ s, sy, ox: bcx, oy: hem - 0.1 * r0 * s * sy, rot: 0, flip: false, pose: 'worn' });
  }
  return out;
}

// the Yoke Sweater's sleeves: knit separately (written, not tapped), so drawn from a virtual plain sleeve chart
// in the sweater's A yarn, 16 sts round, strip-warped along the doll's arms
const sleeveCharts = new Map();
function sleeveShape(rows) {
  let v = sleeveCharts.get(rows);
  if (!v) {
    const st = fill(16, rows, 'stockinette');
    const ch = parseChart({ id: 'virtual-sleeve', stitch: st, repeat: { width: 1, edges: 0, rows: 1 } });
    v = { chart: ch, shape: shapeOf(ch, { id: 'virtual-sleeve', kind: 'ring' }, { asTube: true }) };
    sleeveCharts.set(rows, v);
  }
  return v;
}
function sleevePlaces(Sh, bodyPl, A) {
  if (!Sh.sleeveCols || !Sh.sleeveCols.length || !A.hands) return [];
  const out = [];
  const s = bodyPl.s; // the same yarn and gauge as the body
  for (const side of ['L', 'R']) {
    const [hx0, hy0, hx1, hy1] = A.hands[side];
    const hc = [(hx0 + hx1) / 2, (hy0 + hy1) / 2], hr = (hx1 - hx0) / 2;
    const sh = A.body['shoulder' + side];
    let vx = sh[0] - hc[0], vy = sh[1] - hc[1]; const vl = Math.hypot(vx, vy); vx /= vl; vy /= vl;
    const wrist = [hc[0] + vx * hr * 0.55, hc[1] + vy * hr * 0.55];
    // from inside the shoulder (the yoke covers the sleeve's top) to the wrist
    const top = [sh[0] - vx * hr * 0.1 + (side === 'L' ? 1 : -1) * hr * 0.75, sh[1] - hr * 0.15];
    const len = Math.hypot(top[0] - wrist[0], top[1] - wrist[1]);
    const rows = clamp(Math.round(len / (0.72 * s)), 6, 40);
    const v = sleeveShape(rows);
    const sy = len / (v.shape.prof.main.S[v.shape.prof.main.S.length - 1] * s);
    out.push({ v, pl: { s, sy, ox: wrist[0], oy: wrist[1], rot: Math.atan2(vx, -vy), flip: false, pose: 'sleeve' } });
  }
  return out;
}

const scalePl = (pl, k) => ({ ...pl, s: pl.s * k, ox: pl.ox * k, oy: pl.oy * k });
function plBox(Sh, pl) {
  const b = localBounds(Sh, pl.pose);
  const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map((p) => toScreen(pl, p));
  return { x0: Math.min(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), y1: Math.max(...pts.map((p) => p[1])) };
}

function roundLayer(item, g, Sh, pat, slot, dollId, A, T, kq, opts) {
  const pls = roundPlaces(Sh, slot, A, T, dollId);
  if (!pls.length) return null;
  let bake, slots;
  if (item.preview) { bake = item.preview.bake; slots = item.preview.slots; } else {
    if (!g) return null;
    slots = g.slots;
    // doll px per stitch -> output px per stitch: the bake's cell is about one stitch on the doll
    const W = clamp(Math.ceil(pls[0].s * kq * 1.05), 4, opts.maxCell || 16);
    bake = bakeGallery(g, W);
  }
  if (!bake) return null;
  // the sweater's sleeves, in its A yarn
  let sleeves = [];
  if (Sh.kind === 'body' && slot === 'body') {
    sleeves = sleevePlaces(Sh, pls[0], A);
    const yarn = (slots && slots.A) || (g && g.yarns && g.yarns[0]) || { color: '#9e2a3a', type: 'wool' };
    for (const sv of sleeves) {
      const W = clamp(Math.ceil(sv.pl.s * kq * 1.05), 4, opts.maxCell || 16);
      sv.bake = bakeChart(sv.v.chart, () => yarn, W, { castOnYarn: yarn, bindOff: false, key: `sleeve|${yarn.color}|${yarn.type}|${sv.v.chart.height}` });
    }
  }
  const things = [...pls.map((pl) => ({ Sh, pl: scalePl(pl, kq), bake })), ...sleeves.filter((x) => x.bake).map((x) => ({ Sh: x.v.shape, pl: scalePl(x.pl, kq), bake: x.bake, sleeve: true }))];
  // the finishing touches that show worn
  const tch = pat.touch && (pat.touch.kind || pat.touch);
  let extra = null;
  const unfinished = item.preview && item.preview.done != null && item.preview.done < Sh.chart.total;
  if (tch === 'pompom' && Sh.kind === 'dome' && !unfinished) {
    const yarn = (slots && slots[pat.touch.slot || 'A']) || null;
    const at = toScreen(pls[0], [Sh.anchors.top[0], Sh.anchors.top[1] + 0.25]);
    extra = { kind: 'pompom', at, color: yarn ? yarn.color : '#efe4cf', size: (A.head.box[2] - A.head.box[0]) * 0.3 };
  }
  let box = null;
  for (const t of things) { const b = plBox(t.Sh, t.pl); box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : b; }
  const pad = Math.ceil(6 + 2 * kq * 10);
  const x = Math.floor(box.x0) - pad, y = Math.floor(box.y0) - pad - (extra ? Math.ceil(extra.size * kq) : 0);
  const w = Math.ceil(box.x1) + pad - x, h = Math.ceil(box.y1) + pad - y;
  // a piece in progress (the card): its back half shows only what's knit, so the faint stitches still to come
  // don't let the inside show through them
  const done = item.preview && item.preview.done != null ? item.preview.done : null;
  const ch = Sh.chart;
  const backOnly = done != null && done < ch.total ? (cl) => { const i = ch.indexOf(cl.r, cl.c); return i >= 0 && i < done; } : null;
  const layer = (half) => {
    const c = mk(w, h);
    const q = c.getContext('2d');
    q.imageSmoothingEnabled = true; q.imageSmoothingQuality = 'high';
    q.translate(-x, -y);
    // sleeves under the yoke; the thumb is on its own part inside the mitten's map
    for (const t of [...things.filter((t) => t.sleeve), ...things.filter((t) => !t.sleeve)]) drawTube(q, t.bake, t.Sh, t.pl, { half, dark: 0.35, only: half === 'back' && !t.sleeve ? backOnly : null });
    if (half === 'front' && Sh.cinch && !unfinished) drawCinch(q, Sh, things[0].pl, slots);
    q.setTransform(1, 0, 0, 1, 0, 0);
    if (half === 'front' && extra) drawTouch(q, extra, kq, x, y);
    return c;
  };
  const front = layer('front');
  const back = layer('back');
  return { canvas: front, x, y, back: { canvas: back, x, y }, slot, label: null, dollId, round: true };
}

// ---------------------------------------------------------------- (Change 2) a round piece as the object (gallery, finish)
// The piece off the doll, as it hangs: a hat by its gathered top, a sock and a mitten by the cuff in profile,
// a headband or cowl as a loop, a sweater on a hanger (with its sleeves), the pouch by its drawstring.
// rec: a gallery record, or {preview: {bake, chart, slots}}. cell: device px per stitch. Returns a canvas or null.
export const POSE_OF = { dome: 'hang', ring: 'ring', sock: 'profile', mitten: 'hang', body: 'hang' };
export function roundObject(rec, pattern, cell, opts = {}) {
  const chart = rec.preview ? rec.preview.chart : recordChart(rec, pattern);
  const Sh = shapeOf(chart, pattern);
  if (!Sh) return null;
  const W = clamp(Math.round(cell * 1.05), 3, 28);
  const bake = rec.preview ? rec.preview.bake : bakeGallery(rec, W);
  if (!bake) return null;
  const slots = rec.preview ? rec.preview.slots : rec.slots;
  const pose = opts.pose || POSE_OF[Sh.kind] || 'hang';
  // a neck-down sweater (the Dog Sweater) hangs upside down from how it was knit
  const invert = Sh.kind === 'body' && !Sh.sleeveCols;
  const pl = { s: cell, sy: invert ? -1 : 1, ox: 0, oy: 0, rot: 0, flip: false, pose, spin: opts.spin || 0 };
  const things = [{ Sh, pl, bake }];
  // the Yoke Sweater's sleeves hang from its shoulders
  if (Sh.kind === 'body' && Sh.sleeveCols && Sh.sleeveCols.length) {
    const P = Sh.prof.main; const top = P.S[P.S.length - 1];
    const yJ = Sh.F(0.25, Sh.yJoin ?? P.y1 * 0.45, 'main', pose)[1];
    const len = top * 0.95 * cell;
    const rows = clamp(Math.round(len / (0.72 * cell)), 6, 40);
    const v = sleeveShape(rows);
    const yarn = (slots && slots.A) || (rec.yarns && rec.yarns[0]) || { color: '#9e2a3a', type: 'wool' };
    const sb = bakeChart(v.chart, () => yarn, W, { castOnYarn: yarn, bindOff: false, key: `sleeve|${yarn.color}|${yarn.type}|${rows}` });
    if (sb) for (const sg of [-1, 1]) {
      const sh = [sg * Sh.rho0 * 0.9 * cell, (yJ - 1.6) * cell];
      const ang = sg * 0.42; // hanging down, a little out
      const dir = [Math.sin(ang), Math.cos(ang)];
      const wrist = [sh[0] + dir[0] * len, sh[1] + dir[1] * len];
      const sy = len / (v.shape.prof.main.S[v.shape.prof.main.S.length - 1] * cell);
      things.unshift({ Sh: v.shape, pl: { s: cell, sy, ox: wrist[0], oy: wrist[1], rot: -ang, flip: false, pose: 'sleeve' }, bake: sb, sleeve: true });
    }
  }
  let box = null;
  for (const t of things) { const b = plBox(t.Sh, t.pl); box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : b; }
  const unfinished = rec.preview && rec.preview.done != null && rec.preview.done < chart.total;
  const tch = unfinished ? null : pattern.touch && (pattern.touch.kind || pattern.touch);
  const pom = tch === 'pompom' && Sh.kind === 'dome';
  const hanger = Sh.kind === 'body';
  const padTop = pom ? cell * 5 : hanger ? cell * 4 : cell * 1.5;
  const pad = Math.ceil(cell * 1.5 + 4);
  const x = Math.floor(box.x0) - pad, y = Math.floor(box.y0 - padTop) - pad;
  const c = mk(Math.ceil(box.x1) + pad - x, Math.ceil(box.y1) + pad - y);
  const q = c.getContext('2d');
  q.imageSmoothingEnabled = true; q.imageSmoothingQuality = 'high';
  q.translate(-x, -y);
  if (hanger) drawHanger(q, Sh, pl, cell, box);
  const done = unfinished ? rec.preview.done : null;
  const backOnly = done != null ? (cl) => { const i = chart.indexOf(cl.r, cl.c); return i >= 0 && i < done; } : null;
  for (const half of ['back', 'front']) {
    for (const t of things) drawTube(q, t.bake, t.Sh, t.pl, { half, dark: 0.35, only: half === 'back' && !t.sleeve ? backOnly : null });
    if (half === 'front' && Sh.cinch && !unfinished) drawCinch(q, Sh, pl, slots);
  }
  if (pom) {
    const yarn = (slots && slots[pattern.touch.slot || 'A']) || null;
    const at = toScreen(pl, [Sh.anchors.top[0], Sh.anchors.top[1] + 0.25]);
    q.setTransform(1, 0, 0, 1, 0, 0);
    drawTouch(q, { kind: 'pompom', at: [at[0] - x, at[1] - y], color: yarn ? yarn.color : '#efe4cf', size: Sh.rho0 * 2 * cell * 0.36 }, 1, 0, 0);
  }
  q.setTransform(1, 0, 0, 1, 0, 0);
  if (tch === 'drawstring') drawDrawstring(q, Sh, pl, slots, pattern, x, y);
  return c;
}
// a code-drawn wooden hanger over the sweater's shoulders
function drawHanger(q, Sh, pl, cell, box) {
  const P = Sh.prof.main;
  const topY = Math.min(...[0, 0.5, 1].map((u) => toScreen(pl, Sh.F(u, pl.sy < 0 ? P.y0 : P.y1, 'main', pl.pose))[1]));
  const w = (box.x1 - box.x0) * 0.62, cx = pl.ox, y = topY + cell * 0.6;
  q.save();
  q.lineCap = 'round';
  q.strokeStyle = '#b8b0a0'; q.lineWidth = Math.max(1.5, cell * 0.28);
  q.beginPath(); q.moveTo(cx, y - cell * 1.6); q.lineTo(cx, y - cell * 3.2); q.arc(cx - cell * 0.9, y - cell * 3.2, cell * 0.9, 0, Math.PI * 1.1, true); q.stroke();
  const gr = q.createLinearGradient(0, y - cell * 1.8, 0, y);
  gr.addColorStop(0, '#c48a52'); gr.addColorStop(1, '#7a4e2a');
  q.strokeStyle = gr; q.lineWidth = Math.max(2, cell * 0.8);
  q.beginPath(); q.moveTo(cx - w / 2, y); q.quadraticCurveTo(cx, y - cell * 3.2, cx + w / 2, y); q.stroke();
  q.restore();
}
// the pouch's i-cord drawstring, threaded through the eyelets and tied in a bow
function drawDrawstring(q, Sh, pl, slots, pattern, x, y) {
  const P = Sh.prof.main;
  const yarn = (slots && slots[pattern.touch.slot || 'A']) || { color: '#5f7a52' };
  const yy = P.y1 - 1.5;
  q.save(); q.translate(-x, -y);
  q.lineCap = 'round'; q.lineJoin = 'round';
  const pts = []; for (let i = 0; i <= 24; i++) pts.push(toScreen(pl, Sh.F(0.25 + i / 48, yy, 'main', pl.pose)));
  for (const [col, wd] of [[shadeHex(yarn.color, -0.45), 0.62], [yarn.color, 0.42]]) {
    q.strokeStyle = col; q.lineWidth = Math.max(1.5, pl.s * wd);
    q.beginPath(); pts.forEach((p, i) => (i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1]))); q.stroke();
    // a bow at the front
    const m = pts[12];
    q.beginPath(); q.ellipse(m[0] - pl.s * 1.1, m[1] - pl.s * 0.3, pl.s * 1.1, pl.s * 0.6, -0.3, 0, Math.PI * 2); q.stroke();
    q.beginPath(); q.ellipse(m[0] + pl.s * 1.1, m[1] - pl.s * 0.3, pl.s * 1.1, pl.s * 0.6, 0.3, 0, Math.PI * 2); q.stroke();
    q.beginPath(); q.moveTo(m[0], m[1]); q.lineTo(m[0] - pl.s * 0.8, m[1] + pl.s * 2.2); q.moveTo(m[0], m[1]); q.lineTo(m[0] + pl.s * 0.6, m[1] + pl.s * 2.4); q.stroke();
  }
  q.restore();
}

// the ear warmer's cinch: a short band wrapped round the front, gathering the ring
function drawCinch(q, Sh, pl, slots) {
  const P = Sh.prof.main;
  const yarn = (slots && slots.A) || { color: '#9e2a3a' };
  const pts = [];
  for (const y of [P.y0, P.y1]) pts.push(toScreen(pl, Sh.F(0.5, y, 'main', pl.pose)));
  const [b, t] = pts;
  const cx = (b[0] + t[0]) / 2, hgt = Math.abs(b[1] - t[1]) * 1.02, wd = pl.s * 2.4;
  const cy = (b[1] + t[1]) / 2;
  q.save();
  const gr = q.createLinearGradient(cx - wd / 2, 0, cx + wd / 2, 0);
  gr.addColorStop(0, shadeHex(yarn.color, -0.45)); gr.addColorStop(0.45, shadeHex(yarn.color, 0.08)); gr.addColorStop(1, shadeHex(yarn.color, -0.5));
  q.fillStyle = gr;
  q.shadowColor = 'rgba(30,10,24,0.45)'; q.shadowBlur = pl.s * 0.8; q.shadowOffsetY = pl.s * 0.25;
  q.beginPath(); q.roundRect ? q.roundRect(cx - wd / 2, cy - hgt / 2, wd, hgt, wd * 0.35) : q.rect(cx - wd / 2, cy - hgt / 2, wd, hgt); q.fill();
  q.shadowColor = 'transparent';
  // its knit ridges (the band is a few rows of garter, wrapped)
  q.strokeStyle = 'rgba(40,14,30,0.35)'; q.lineWidth = Math.max(1, pl.s * 0.18);
  const n = Math.max(3, Math.round(hgt / (pl.s * 0.9)));
  for (let i = 1; i < n; i++) { const yy = cy - hgt / 2 + (hgt * i) / n; q.beginPath(); q.moveTo(cx - wd * 0.42, yy); q.quadraticCurveTo(cx, yy + pl.s * 0.25, cx + wd * 0.42, yy); q.stroke(); }
  q.restore();
}
function shadeHex(hex, t) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex || '#888';
  const v = parseInt(m[1], 16); let r = v >> 16, g = (v >> 8) & 255, b = v & 255;
  const f = (c) => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

const tintCache = new Map();
function tinted(key, color, px) {
  const im = sceneImage(key); if (!im) return null;
  const k = `${key}|${color}|${px}`;
  let c = tintCache.get(k);
  if (!c) {
    c = mk(px, px); const q = c.getContext('2d');
    q.fillStyle = color; q.fillRect(0, 0, px, px); q.globalCompositeOperation = 'multiply'; q.drawImage(im, 0, 0, px, px);
    q.globalCompositeOperation = 'destination-in'; q.drawImage(im, 0, 0, px, px);
    tintCache.set(k, c); if (tintCache.size > 40) tintCache.delete(tintCache.keys().next().value);
  }
  return c;
}
function drawTouch(g, ex, k, ox, oy) {
  if (ex.kind === 'pompom') {
    const s = ex.size * k; const im = tinted('fin-pompom', ex.color, Math.max(8, Math.round(s)));
    if (im) g.drawImage(im, ex.at[0] * k - ox - s / 2, ex.at[1] * k - oy - s * 0.78, s, s);
  } else if (ex.kind === 'buttons') {
    const s = ex.size * k; const im = tinted('fin-button-4hole', ex.color, Math.max(6, Math.round(s)));
    if (im) for (const p of ex.at) g.drawImage(im, p[0] * k - ox - s / 2, p[1] * k - oy - s / 2, s, s);
  }
}

// ---------------------------------------------------------------- the dressed doll
function overPolys(g, dollId, names, k) {
  const A = anchors(dollId); const im = dollPic(dollId);
  if (!A || !A.over || !im) return;
  const [w, h] = dollSize(dollId);
  for (const o of A.over) {
    if (!names.some((n) => o.name.startsWith(n))) continue;
    g.save();
    g.beginPath(); o.poly.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.closePath(); g.clip();
    g.drawImage(im, 0, 0, w * k, h * k);
    g.restore();
  }
}
function contactShadow(g, L, k) {
  // the piece's shadow lands only on what's already drawn (the doll and pieces under it)
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.shadowColor = 'rgba(40,14,30,0.5)';
  g.shadowBlur = Math.max(2, 5 * k);
  g.shadowOffsetX = 10000; g.shadowOffsetY = Math.max(1, 3 * k);
  g.drawImage(L.canvas, L.x - 10000, L.y);
  g.restore();
}
function drawPurlThings(g, A, k, things) {
  const a = A.neckAnchor || { x: 256, y: 248, angle: 0, scale: 0.92 };
  const r = 62 * a.scale * k;
  g.save(); g.translate(a.x * k, a.y * k); g.rotate((a.angle * Math.PI) / 180);
  if (things.includes('collar')) {
    g.lineCap = 'round';
    g.strokeStyle = '#6e1726'; g.lineWidth = r * 0.3;
    g.beginPath(); g.ellipse(0, -r * 0.35, r, r * 0.45, 0, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
    g.strokeStyle = '#a8293d'; g.lineWidth = r * 0.2;
    g.beginPath(); g.ellipse(0, -r * 0.38, r, r * 0.45, 0, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
  }
  if (things.includes('bell')) {
    const by = r * 0.18, br = r * 0.2;
    const gr = g.createRadialGradient(-br * 0.35, by - br * 0.35, 0, 0, by, br);
    gr.addColorStop(0, '#fff3b8'); gr.addColorStop(0.5, '#e6b83e'); gr.addColorStop(1, '#8a6410');
    g.fillStyle = gr; g.beginPath(); g.arc(0, by, br, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#5a3d08'; g.lineWidth = Math.max(1, br * 0.15);
    g.beginPath(); g.moveTo(-br * 0.5, by + br * 0.25); g.lineTo(br * 0.5, by + br * 0.25); g.stroke();
  }
  g.restore();
}

// Draw a doll with its outfit into a fresh canvas of the doll's frame × k.
// outfit: {slot: item}. opts: {silhouette, things (Purl's), anim: {slot, p 0..1}, maxCell, maxStrips}
export function composeDoll(dollId, outfit, k, opts = {}) {
  const im = dollPic(dollId);
  const [w, h] = dollSize(dollId);
  const c = mk(w * k, h * k);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  if (!im) return c;
  // (Change 2) pieces knit in the round: their back halves go behind the doll, darkened, first
  const layersOf = {};
  for (const slot of ORDER) { const item = outfit && outfit[slot]; if (item) layersOf[slot] = pieceLayer(item, dollId, k, opts); }
  const backs = ORDER.filter((s) => layersOf[s] && layersOf[s].back);
  const animOf = (slot) => (opts.anim && opts.anim.slot === slot ? opts.anim.p : 1);
  if (backs.length) {
    for (const slot of backs) drawLayer(g, layersOf[slot].back, k, animOf(slot), false);
    const d = mk(w * k, h * k); const dg = d.getContext('2d'); dg.imageSmoothingQuality = 'high';
    dg.drawImage(im, 0, 0, w * k, h * k);
    if (opts.silhouette) { dg.globalCompositeOperation = 'source-atop'; dg.fillStyle = 'rgba(52,30,58,0.93)'; dg.fillRect(0, 0, d.width, d.height); }
    g.drawImage(d, 0, 0);
  } else {
    g.drawImage(im, 0, 0, w * k, h * k);
    if (opts.silhouette) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(52,30,58,0.93)'; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
    }
  }
  const A = anchors(dollId);
  const things = dollId === 'purl' ? (opts.things || S.get().equipped.purl || []) : [];
  if (things.length && A && !opts.silhouette) drawPurlThings(g, A, k, things);
  const labels = [];
  for (const slot of ORDER) {
    const item = outfit && outfit[slot];
    if (item) {
      const L = layersOf[slot];
      if (L) {
        drawLayer(g, L, k, animOf(slot), true);
        if (L.label) labels.push(L.label);
      }
    }
    if (slot === 'body' && item && !opts.silhouette) overPolys(g, dollId, ['hand'], k);
    if (slot === 'head' && item && !opts.silhouette) overPolys(g, dollId, ['ear'], k);
  }
  if (opts.silhouette) {
    // the doll stays a soft shadow, the piece shows in full color: redraw over the silhouette's own polys only
  }
  for (const lb of labels) drawLabel(g, lb, k, dollBounds(dollId).x0 * k);
  return c;
}
function drawLayer(g, L, k, an, shadow) {
  if (an >= 1) { if (shadow) contactShadow(g, L, k); g.drawImage(L.canvas, L.x, L.y); return; }
  // the piece drops on with a small squash (1.08 -> 1)
  const e = 1 - Math.pow(1 - an, 3);
  const sc = 1.08 - 0.08 * e, dy = (1 - e) * -18 * k;
  const cx = L.x + L.canvas.width / 2, cy = L.y + L.canvas.height / 2;
  g.save(); g.globalAlpha = Math.min(1, an * 3);
  g.translate(cx, cy + dy); g.scale(sc, 2 - sc); g.translate(-cx, -cy);
  g.drawImage(L.canvas, L.x, L.y); g.restore();
}
function drawLabel(g, lb, k, minX = 0) {
  // at least 12 CSS px, and wholly above the ground line (the shelf board overlaps the canvas's bottom)
  const d = typeof devicePixelRatio === 'number' ? Math.min(3, devicePixelRatio || 1) : 1;
  const fs = Math.max(12 * d, 22 * k);
  g.save();
  g.font = `600 ${fs}px Fredoka, sans-serif`;
  const tw = g.measureText(lb.text).width;
  const pw = tw + fs * 0.9, ph = fs * 1.5;
  const x = clamp(lb.x - tw, Math.max(fs * 0.5, minX + fs * 0.45), g.canvas.width - pw), y = clamp(lb.y - ph * 0.5, ph * 0.75, g.canvas.height - ph * 0.25 - 14 * d);
  g.fillStyle = 'rgba(34,22,46,0.82)';
  g.beginPath(); g.roundRect ? g.roundRect(x - fs * 0.45, y - ph * 0.75, pw, ph, ph / 2) : g.rect(x - fs * 0.45, y - ph * 0.75, pw, ph); g.fill();
  g.fillStyle = '#f6ecd9'; g.textBaseline = 'middle';
  g.fillText(lb.text, x, y - ph * 0.75 + ph / 2);
  g.restore();
}

// Cached composite for an outfit (shelf and dressing view)
const composites = new Map();
export function outfitOf(dollId) {
  const o = (S.get().outfits || {})[dollId] || {};
  const out = {};
  for (const [slot, v] of Object.entries(o)) {
    if (!v) continue;
    if (v === 'scarf') { out[slot] = 'scarf'; continue; }
    if (S.galleryById(v)) out[slot] = { gid: v };
  }
  return out;
}
const sig = (o) => Object.entries(o).map(([s, v]) => `${s}:${v === 'scarf' ? 'scarf' : v.gid}`).sort().join(',');
export function dressedDoll(dollId, k, opts = {}) {
  const outfit = opts.outfit || outfitOf(dollId);
  const sv = outfit.neck === 'scarf' && scarfSource ? scarfSource().version : '';
  const key = `${dollId}|${Math.round(k * 64)}|${sig(outfit)}|${sv}|${opts.silhouette ? 1 : 0}|${dollId === 'purl' ? `${S.get().equipped.purl.join('+')}|${coatNow()}` : ''}`;
  if (composites.has(key)) { const c = composites.get(key); composites.delete(key); composites.set(key, c); return c; }
  const c = composeDoll(dollId, outfit, k, opts);
  composites.set(key, c); if (composites.size > 16) composites.delete(composites.keys().next().value);
  return c;
}
export function clearComposites() { composites.clear(); }

// a doll's soft dark silhouette (locked dolls on the shelf, the Bag)
const silCache = new Map();
export function dollSilhouette(dollId, k) {
  const key = `${dollId}|${Math.round(k * 64)}`;
  if (silCache.has(key)) return silCache.get(key);
  const im = IMG[dollId]; const [w, h] = dollSize(dollId);
  const c = mk(w * k, h * k);
  if (im) {
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, w * k, h * k);
    g.globalCompositeOperation = 'source-in';
    const gr = g.createLinearGradient(0, 0, 0, h * k);
    gr.addColorStop(0, 'rgba(70,44,78,0.88)'); gr.addColorStop(1, 'rgba(40,22,46,0.92)');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  }
  silCache.set(key, c); if (silCache.size > 20) silCache.delete(silCache.keys().next().value);
  return c;
}

// Which unlocked doll shows a wearable: the last-dressed unlocked doll that has the slot, else Pip.
export function dollFor(slot) {
  const s = S.get();
  const ok = (d) => d && S.isUnlocked(`doll:${d}`) && slotsOf(d).includes(slot);
  if (ok(s.lastDoll)) return s.lastDoll;
  return 'pip';
}
export { chartInfo, planFit, drawParts, partsBox, TUNE };
