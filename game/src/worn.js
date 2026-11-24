// worn.js — pieces worn by the dolls: bake a piece from its stitch data with the real stitch sprites,
// warp it onto a doll slot by slicing (row strips × a few column segments, each one drawImage under a
// small affine transform), shade it in code (curvature + a contact shadow that lands only on the doll),
// then redraw the doll's "over" polygons (ears over hats, hands over sleeve ends) on top.
//
// Caches: baked pieces (per piece and cell size), warped layers (per piece, doll, slot, size; LRU 60) and
// dressed-doll composites (per doll, outfit and size). All separate from the stitch sprite LRU's own map.
import { renderSwatch } from './work.js';
import { chartOf } from './render.js';
import { data as sceneData, image as sceneImage } from './scene.js';
import * as S from './state.js';
import { fmtLen } from './scarfFacts.js';

export const DOLLS = ['pip', 'clementine', 'bramble', 'juniper', 'basil', 'mabel', 'purl'];
export const DOLL_NAMES = { pip: 'Pip', clementine: 'Clementine', bramble: 'Bramble', juniper: 'Juniper', basil: 'Basil', mabel: 'Mabel', purl: 'Purl' };
export const DOLL_ABOUT = {
  pip: 'a small jointed wooden doll', clementine: 'a rag doll with yarn hair', bramble: 'a plush bear', juniper: 'a felt bunny',
  basil: 'a felt fox', mabel: "a tiny wooden artist's mannequin", purl: 'Purl herself',
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
  return k ? rememberBake(k, b) : b;
}
export function bakeGallery(g, W) {
  const p = S.patternById(g.pattern);
  if (!p) return null;
  const ys = g.yarns;
  return bakeChart(chartOf(p), (i) => ys[i] || ys[ys.length - 1], W, { castOnYarn: g.castOn || ys[0], key: `g|${g.id}|${ys.length}` });
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
    if (item.preview) { bake = item.preview.bake; chart = item.preview.chart; slots = item.preview.slots; } else {
      const g = S.galleryById(item.gid || item);
      chart = chartOf(pat); slots = g.slots;
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
  const A = anchors(dollId); const im = IMG[dollId];
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
  const im = IMG[dollId];
  const [w, h] = dollSize(dollId);
  const c = mk(w * k, h * k);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  if (!im) return c;
  g.drawImage(im, 0, 0, w * k, h * k);
  if (opts.silhouette) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(52,30,58,0.93)'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
  }
  const A = anchors(dollId);
  const things = dollId === 'purl' ? (opts.things || S.get().equipped.purl || []) : [];
  if (things.length && A && !opts.silhouette) drawPurlThings(g, A, k, things);
  const labels = [];
  for (const slot of ORDER) {
    const item = outfit && outfit[slot];
    if (item) {
      const L = pieceLayer(item, dollId, k, opts);
      if (L) {
        const an = opts.anim && opts.anim.slot === slot ? opts.anim.p : 1;
        if (an >= 1) { contactShadow(g, L, k); g.drawImage(L.canvas, L.x, L.y); }
        else {
          // the piece drops on with a small squash (1.08 -> 1)
          const e = 1 - Math.pow(1 - an, 3);
          const sc = 1.08 - 0.08 * e, dy = (1 - e) * -18 * k;
          const cx = L.x + L.canvas.width / 2, cy = L.y + L.canvas.height / 2;
          g.save(); g.globalAlpha = Math.min(1, an * 3);
          g.translate(cx, cy + dy); g.scale(sc, 2 - sc); g.translate(-cx, -cy);
          g.drawImage(L.canvas, L.x, L.y); g.restore();
        }
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
  const key = `${dollId}|${Math.round(k * 64)}|${sig(outfit)}|${sv}|${opts.silhouette ? 1 : 0}|${dollId === 'purl' ? S.get().equipped.purl.join('+') : ''}`;
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
