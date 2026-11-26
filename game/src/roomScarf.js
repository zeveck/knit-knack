// roomScarf.js — the Infinite Scarf hanging on the cozy room's pegs (Change 4, CHANGE_4.md 9c).
// drapePath(cm, zone) is pure (node can test it): how the scarf hangs at a length, in the picture's own px.
// bakeScarf(...) draws it once into a canvas the size of the zone's box (the room caches it per entry).
// colourStrip(store, N) is the scarf's rows as a 12 × N strip, read straight from the store's stitches
// (at most 8 source rows averaged per output row and column, so 40 km costs what 1 km does).
import { yarnColorAt } from './stitches.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- stages (1 row = 1 cm)
// landscape: hang over peg 1, swag to peg 2, on to peg 3 (from 4.4 m, "the bus"), 2 and 3 rows of
// garlands (10 m, 30 m), the knitting bag (100 m). portrait grows downward: a loop, 2 and 3 nested loops,
// the bag.
export function stageOf(cm, down = false) {
  if (!(cm > 0)) return 'none';
  if (cm < 150) return 'hang';
  if (cm >= 10000) return 'bag';
  if (down) return cm < 1000 ? 'loop' : cm < 3000 ? 'l2' : 'l3';
  return cm < 440 ? 'peg2' : cm < 1000 ? 'peg3' : cm < 3000 ? 'g2' : 'g3';
}
const ORDER = { none: 0, hang: 1, peg2: 2, loop: 2, peg3: 3, g2: 4, l2: 4, g3: 5, l3: 5, bag: 6 };
export const stageRank = (s) => ORDER[s] || 0;
// the line for reaching a stage (null for the first one)
export function stageLine(s) {
  return {
    peg2: 'Your scarf reached the second peg!',
    peg3: 'Your scarf reached the third peg!',
    g2: 'Your scarf hangs in two rows of garlands now!',
    g3: 'Your scarf hangs in three rows of garlands now!',
    loop: 'Your scarf hangs in a long loop now!',
    l2: 'Your scarf hangs in two loops now!',
    l3: 'Your scarf hangs in three loops now!',
    bag: 'Your scarf has its own knitting bag now!',
  }[s] || null;
}

// the chair back's top (the scarf tucks behind it) at x; in the bare strip right of the chair, its bottom
export function hangYAt(zone, x) {
  const h = zone.hang;
  if (zone.strip && x >= zone.strip[0]) return zone.strip[2];
  if (x <= h[0][0]) return h[0][1];
  for (let i = 1; i < h.length; i++) {
    const [xa, ya] = h[i - 1], [xb, yb] = h[i];
    if (xb > xa && x >= xa && x <= xb) return lerp(ya, yb, (x - xa) / (xb - xa));
  }
  return zone.strip ? zone.strip[2] : h[h.length - 1][1];
}

// ---------------------------------------------------------------- the drape
// zone (picture px): {box: [x, y, w, h], pegs: [[x, y]], hang: [[x, y]] (the chair back's top), strip:
// [x0, x1, yBottom] | null, U (px per ru at the wall), down (portrait)}.
// Returns {stage, cm, bw (band width), parts: [{pts, t0, t1}] in draw order (back first; t = 0 the cast-on
// end, 1 the live end), folds: [{x, y, t}], needles: {x, y, ang} | null, bag: {x, y, s, fill, rim} | null,
// tag: [x, y] (where its string meets peg 1), len (path length)}
export function drapePath(cm, zone) {
  const stage = stageOf(cm, zone.down);
  const U = zone.U, bw = 0.3 * U;
  const P = zone.pegs.map(([x, y]) => [x, y]);
  const [bx, by, bwid, bh] = zone.box;
  const out = { stage, cm, bw, parts: [], folds: [], needles: null, bag: null, tag: [P[0][0] - bw * 0.5, P[0][1] + 0.5 * U], len: 0 };
  if (stage === 'none') return out;
  const segs = []; // [{pts, z}] in path order (cast-on end first); z: draw order (lower first)
  const vert = (x, y0, y1, n = 10) => Array.from({ length: n + 1 }, (_, i) => [x + Math.sin((i / n) * Math.PI) * bw * 0.06, lerp(y0, y1, i / n)]);
  const swag = (a, b, depth, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t) + depth * 4 * t * (1 - t)]; });
  // a loop hanging from a to b (portrait): a half ellipse, deeper than it is wide
  const loop = (a, b, depth, n = 36) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [lerp(a[0], b[0], (1 - Math.cos(Math.PI * t)) / 2), lerp(a[1], b[1], t) + depth * Math.sin(Math.PI * t)]; });
  const top = (p) => [p[0], p[1] - bw * 0.12]; // the scarf lies over the peg's shaft
  const p1 = P[0], last = P[P.length - 1];
  const liveLen = 0.9 * U;
  if (stage === 'hang') {
    // folded over peg 1, both ends down; each end max(0.1, cm/150) of the drop to the chair back
    const L = Math.max(0.1, cm / 150) * (hangYAt(zone, p1[0]) - p1[1]);
    const xl = p1[0] - bw * 0.5, xr = p1[0] + bw * 0.5;
    segs.push({ pts: [...vert(xl, p1[1] + L, p1[1], 8), [p1[0], p1[1] - bw * 0.3], ...vert(xr, p1[1], p1[1] + L, 8)], z: 0 });
    out.tag = [xl, p1[1] + clamp(L * 0.55, bw * 0.6, 1.1 * U)];
    out.folds.push({ x: p1[0], y: p1[1], at: 0.5 });
  } else {
    // the cast-on end hangs at peg 1, down behind the chair back (portrait: a set length)
    const castLen = zone.down ? 0.8 * U : hangYAt(zone, p1[0] - bw * 0.5) - p1[1] + bw;
    segs.push({ pts: vert(p1[0] - bw * 0.45, p1[1] + castLen, top(p1)[1], 10), z: 1 });
    out.tag = [p1[0] - bw * 0.45, p1[1] + Math.min(castLen * 0.6, 1.1 * U)]; // (pinned on the cast-on end)
    const pegsUsed = zone.down ? [p1, last] : stage === 'peg2' ? P.slice(0, 2) : P;
    let rows = 1;
    if (stage === 'g2' || stage === 'l2') rows = 2;
    if (stage === 'g3' || stage === 'l3' || stage === 'bag') rows = 3;
    const drop = (x) => hangYAt(zone, x) - p1[1];
    for (let k = 0; k < rows; k++) {
      // each row back and forth along the pegs; deeper rows hang behind (drawn first)
      const seq = k % 2 ? [...pegsUsed].reverse() : pegsUsed;
      const pts = [];
      for (let i = 1; i < seq.length; i++) {
        const a = top(seq[i - 1]), b = top(seq[i]);
        let part;
        if (zone.down) {
          const g = clamp((cm - 150) / 850, 0, 1);
          const d0 = drop(lerp(a[0], b[0], 0.5));
          const depth = rows === 1 ? lerp(0.15, 0.95, g) * d0 : d0 * (0.62 + 0.3 * (rows - 1 - k)) ;
          part = loop(a, b, depth);
        } else {
          const g = clamp((cm - 150) / 850, 0, 1);
          const base = rows === 1 ? bh * (0.04 + 0.14 * g) : bh * 0.18;
          part = swag(a, b, base + (rows - 1 - k) * 0.09 * bh);
        }
        pts.push(...(i > 1 ? part.slice(1) : part));
      }
      segs.push({ pts, z: 2 + (rows - 1 - k) * -0.01 + k * 0.1 });
    }
    for (const p of pegsUsed) out.folds.push({ x: p[0], y: p[1] });
    // where the scarf leaves the rail: the last peg of the last row
    const endPeg = rows % 2 ? pegsUsed[pegsUsed.length - 1] : pegsUsed[0];
    if (stage === 'bag') {
      // the knitting bag on the last peg, by its drawstring, full of the newest rows (log-scaled)
      const s = (0.8 * U) / 200; // holder-bag.png: 200 px of bag (its box 37..218 × 48..248)
      const half = 91 * s;
      const cx = clamp(last[0], bx + half + 2, bx + bwid - half - 2);
      const rimY = last[1] + 0.42 * U;
      const fill = clamp(0.25 + (Math.log10(cm) - 4) * 0.4167, 0, 1.2);
      out.bag = { cx, rimY, s, x: cx - 123 * s, y: rimY - 80 * s, w: 256 * s, h: 256 * s, fill, rim: { cx, cy: rimY, rx: 67 * s, ry: 25 * s }, peg: last };
      // the last row runs down into the bag's mouth
      const e = top(endPeg);
      segs.push({ pts: [e, [lerp(e[0], cx, 0.5), lerp(e[1], rimY, 0.5) + bw * 0.2], [cx - 30 * s, rimY]], z: 3 });
      out.needles = { x: cx + 26 * s, y: rimY - 6 * s, ang: -1.15, bag: true };
    } else {
      // the live end hangs free from the last peg with its needles through the last row
      const e = top(endPeg);
      const x = e[0] + (endPeg === p1 ? -bw * 0.5 : bw * 0.45);
      segs.push({ pts: vert(x, e[1], e[1] + liveLen, 8), z: 3 });
    }
  }
  // rows along the path: by length, cast-on end (0) to live end (1); in the bag stage the path holds the
  // older rows and the bag the newest
  const lenOf = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  const total = segs.reduce((t, s) => t + lenOf(s.pts), 0) || 1;
  const span = out.bag ? 0.86 : 1;
  let acc = 0;
  for (const s of segs) { const L = lenOf(s.pts); s.t0 = (acc / total) * span; acc += L; s.t1 = (acc / total) * span; }
  out.len = total;
  out.parts = segs.slice().sort((a, b) => a.z - b.z).map(({ pts, t0, t1 }) => ({ pts, t0, t1 }));
  // the folds' colour: where the path passes each peg
  for (const f of out.folds) {
    let best = 1e9, bt = 0;
    for (const s of segs) for (let i = 0; i < s.pts.length; i++) { const d = Math.hypot(s.pts[i][0] - f.x, s.pts[i][1] - f.y); if (d < best) { best = d; bt = lerp(s.t0, s.t1, i / (s.pts.length - 1)); } }
    f.t = bt;
  }
  if (!out.bag) {
    const s = segs[segs.length - 1]; const a = s.pts[s.pts.length - 2], b = s.pts[s.pts.length - 1];
    out.needles = { x: b[0], y: b[1] - bw * 0.1, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return out;
}

// the visible hit areas (picture px): the path's points above the chair back (and the bag, the tag), split
// into the part over the chair (main) and the part in the bare strip right of it; each padded
export function hitAreas(D, zone) {
  if (D.stage === 'none') return { main: null, strip: null };
  const pad = D.bw / 2 + 6;
  const main = [], strip = [];
  for (const p of D.parts) for (const [x, y] of p.pts) {
    if (y > hangYAt(zone, x) + 1) continue; // tucked behind the chair: not tappable
    (zone.strip && x >= zone.strip[0] ? strip : main).push([x, y]);
  }
  for (const f of D.folds) main.push([f.x, f.y - D.bw * 0.4]);
  main.push([D.tag[0] - D.bw, D.tag[1]], [D.tag[0] + D.bw, D.tag[1] + D.bw]);
  if (D.bag) (zone.strip && D.bag.cx >= zone.strip[0] ? strip : main).push([D.bag.cx - 91 * D.bag.s, D.bag.rimY - 30 * D.bag.s], [D.bag.cx + 91 * D.bag.s, D.bag.rimY + 168 * D.bag.s]);
  const box = (pts) => {
    if (!pts.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];
  };
  const m = box(main);
  // never lower than the chair back's top anywhere along it (so the empty chair stays the chair's)
  if (m) {
    let lo = Infinity;
    for (let x = m[0]; x <= m[0] + m[2]; x += 4) if (!zone.strip || x < zone.strip[0]) lo = Math.min(lo, hangYAt(zone, x));
    if (m[1] + m[3] > lo) m[3] = Math.max(8, lo - m[1]);
  }
  return { main: m, strip: box(strip) };
}

// ---------------------------------------------------------------- the colour strip
// the scarf's rows as RGBA, 12 × N (row 0 the cast-on), from store.idx: each output row averages at most 8
// evenly spaced source rows per column
export function colourStrip(store, N) {
  const W = 12, rows = Math.floor(store.n / W);
  N = Math.max(1, Math.min(N, rows || 1));
  const data = new Uint8ClampedArray(W * N * 4);
  if (!rows) return { data, N, rows };
  const hexRgb = (h) => { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const plain = store.table.map((y) => (y && y.type !== 'stripe' ? hexRgb(y.color) : null));
  const memo = new Map();
  const rgbAt = (i) => {
    const j = store.idx[i]; const p = plain[j]; if (p) return p;
    const y = store.table[j]; if (!y) return [158, 42, 58];
    const k = j * 16 + (Math.floor(i / 7) % 16);
    let c = memo.get(k); if (!c) { c = hexRgb(yarnColorAt(y, i)); memo.set(k, c); }
    return c;
  };
  for (let r = 0; r < N; r++) {
    const a = Math.floor((r * rows) / N), b = Math.max(a + 1, Math.floor(((r + 1) * rows) / N));
    const n = Math.min(8, b - a);
    for (let c = 0; c < W; c++) {
      let R = 0, G = 0, B = 0;
      for (let s = 0; s < n; s++) { const row = a + Math.floor(((s + 0.5) * (b - a)) / n); const p = rgbAt(row * W + c); R += p[0]; G += p[1]; B += p[2]; }
      const o = (r * W + c) * 4;
      data[o] = R / n; data[o + 1] = G / n; data[o + 2] = B / n; data[o + 3] = 255;
    }
  }
  return { data, N, rows };
}
let stripMemo = null; // {key, canvas, N}
function stripCanvas(store, N) {
  const key = `${store.version}|${store.n}|${N}`;
  if (stripMemo && stripMemo.key === key) return stripMemo;
  const S = colourStrip(store, N);
  const c = document.createElement('canvas'); c.width = 12; c.height = S.N;
  c.getContext('2d').putImageData(new ImageData(S.data, 12, S.N), 0, 0);
  if (stripMemo) stripMemo.canvas.width = stripMemo.canvas.height = 0;
  stripMemo = { key, canvas: c, N: S.N };
  return stripMemo;
}
export function forgetStrip() { if (stripMemo) { stripMemo.canvas.width = stripMemo.canvas.height = 0; stripMemo = null; } }

// ---------------------------------------------------------------- the bake
const INK = 'rgba(59,39,56,0.62)';
let vPattern = null;
function knitPattern(g, cell) {
  // a little V (a knit stitch) on transparent, tiled along the band
  const c = document.createElement('canvas'); const w = Math.max(3, Math.round(cell)), h = Math.max(3, Math.round(cell * 0.8));
  c.width = w; c.height = h;
  const q = c.getContext('2d');
  q.strokeStyle = 'rgba(40,20,30,0.9)'; q.lineWidth = Math.max(0.8, w * 0.16);
  q.beginPath(); q.moveTo(0.5, 0.5); q.lineTo(w / 2, h - 0.8); q.lineTo(w - 0.5, 0.5); q.stroke();
  return g.createPattern(c, 'repeat');
}
// D: drapePath's result; zone: as for drapePath; k: canvas px per picture px; opts: {store, needles: [shadow,
// base, light], bagImg}. Returns {canvas, ms}
export function bakeScarf(D, zone, k, opts) {
  const t0 = performance.now();
  const [bx, by, bwid, bh] = zone.box;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(bwid * k)); c.height = Math.max(1, Math.ceil(bh * k));
  if (D.stage === 'none') return { canvas: c, ms: performance.now() - t0 };
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, -bx * k, -by * k);
  const N = Math.min(Math.max(1, Math.round(2 * D.len * k)), 3000);
  const st = stripCanvas(opts.store, N);
  const rowAt = (t) => Math.min(st.N - 1, Math.max(0, Math.floor(t * st.N)));
  const bw = D.bw;
  const stroke = (pts, w, style, cap = 'butt') => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.lineWidth = w; g.strokeStyle = style; g.lineCap = cap; g.lineJoin = 'round'; g.stroke(); };
  // each part: its outline, the band in its rows' colours (short slices of the strip along the path),
  // a soft light down its middle
  const step = 1.6 / k;
  const ribbon = (p) => {
    const pts = p.pts;
    let L = 0; const cum = [0];
    for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
    let j = 1;
    for (let s = 0; s < L; s += step) {
      while (j < pts.length - 1 && cum[j] < s) j++;
      const a = pts[j - 1], b = pts[j];
      const f = (s - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
      const x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const cs = Math.cos(ang), sn = Math.sin(ang);
      // the strip's 12 stitches across the band, its row along the path
      g.setTransform(-sn * k, cs * k, cs * k, sn * k, (x - bx) * k, (y - by) * k);
      g.drawImage(st.canvas, 0, rowAt(lerp(p.t0, p.t1, s / L)), 12, 1, -bw / 2, -0.2, bw, step + 0.5);
    }
    g.setTransform(k, 0, 0, k, -bx * k, -by * k);
  };
  for (const p of D.parts) {
    stroke(p.pts, bw + 2.6, INK);
    ribbon(p);
    stroke(p.pts, bw * 0.34, 'rgba(255,244,222,0.12)');
  }
  // the folds over the pegs: a soft bulge in that row's colour
  const colAt = (t) => { const d = st.canvas.getContext('2d').getImageData(5, rowAt(t), 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
  for (const f of D.folds) {
    g.beginPath(); g.ellipse(f.x, f.y - bw * 0.18, bw * 0.62, bw * 0.42, 0, 0, Math.PI * 2);
    g.fillStyle = colAt(f.t); g.fill(); g.lineWidth = 1.3; g.strokeStyle = INK; g.stroke();
  }
  // the knit texture: little Vs over the whole scarf, darkening only where it's drawn
  if (!vPattern) vPattern = knitPattern(g, Math.max(3, bw / 6) * k);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.22; g.fillStyle = vPattern; g.fillRect(0, 0, c.width, c.height);
  g.restore();
  // the bag on the last peg: its drawstring, the bag, the newest rows coiled inside, a loop over the rim
  if (D.bag) {
    const B = D.bag;
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(90,60,40,0.95)';
    g.beginPath(); g.moveTo(B.cx - B.rim.rx * 0.8, B.rimY - 2); g.lineTo(B.peg[0], B.peg[1] - bw * 0.1); g.lineTo(B.cx + B.rim.rx * 0.8, B.rimY - 2); g.stroke();
    if (opts.bagImg) g.drawImage(opts.bagImg, B.x, B.y, B.w, B.h);
    // coils: arcs in the newest colours, filling the mouth by B.fill
    g.save();
    g.beginPath(); g.ellipse(B.cx, B.rimY, B.rim.rx * 0.95, B.rim.ry * (1 + Math.max(0, B.fill - 0.6) * 1.6), 0, Math.PI, 0); g.lineTo(B.cx + B.rim.rx, B.rimY + 4); g.lineTo(B.cx - B.rim.rx, B.rimY + 4); g.closePath(); g.clip();
    const n = 7, rise = B.rim.ry * 2.2 * Math.min(1, B.fill);
    for (let i = 0; i < n; i++) {
      const t = 0.86 + (0.14 * (i + 1)) / n;
      g.beginPath(); g.ellipse(B.cx + (i % 2 ? -1 : 1) * B.rim.rx * 0.18, B.rimY + B.rim.ry * 0.6 - (rise * i) / n, B.rim.rx * (0.62 - i * 0.04), B.rim.ry * 0.5, (i % 3 - 1) * 0.12, 0, Math.PI * 2);
      g.lineWidth = bw * 0.62; g.strokeStyle = colAt(t); g.stroke();
      g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
    }
    g.restore();
    if (B.fill > 1) { // overflowing: a loop spills over the rim
      const sp = [[B.cx - B.rim.rx * 0.5, B.rimY - B.rim.ry * 0.4], [B.cx - B.rim.rx * 1.05, B.rimY + B.rim.ry * 0.6], [B.cx - B.rim.rx * 0.95, B.rimY + B.rim.ry * 2.6]];
      stroke(sp, bw + 2.4, INK);
      stroke(sp, bw, colAt(0.99));
    }
  }
  // the needles: two thin sticks through the last row (out of the bag's mouth in the bag stage)
  if (D.needles) {
    const N0 = D.needles, nc = opts.needles || ['#8f6431', '#c99b5c', '#ecd09a'];
    const len = bw * 2.1;
    for (const side of [-1, 1]) {
      const ang = N0.bag ? N0.ang + side * 0.18 : side * 0.32 + (N0.ang - Math.PI / 2);
      const cx = N0.x, cy = N0.y;
      const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
      const a = [cx - dx, cy - dy], b = [cx + dx, cy + dy];
      stroke([a, b], Math.max(1.6, bw * 0.13) + 1.4, INK, 'round');
      stroke([a, b], Math.max(1.6, bw * 0.13), nc[1], 'round');
      g.beginPath(); g.arc(a[0], a[1], Math.max(1.4, bw * 0.12), 0, Math.PI * 2); g.fillStyle = nc[0]; g.fill(); // the knob end
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: c, ms: performance.now() - t0 };
}

// ---------------------------------------------------------------- the icon (Your things, and in the hand)
// a scarf folded in three, its fringe hanging, in the newest colours (or the cast-on's)
export function drawScarfIcon(c, colours) {
  const g = c.getContext('2d'); const w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  const cols = colours && colours.length ? colours : ['#9e2a3a'];
  const band = h * 0.2, x0 = w * 0.16, x1 = w * 0.84;
  for (let i = 0; i < 3; i++) {
    const y = h * 0.2 + i * band * 0.92;
    const col = cols[Math.min(cols.length - 1, i)];
    g.beginPath(); g.roundRect ? g.roundRect(x0, y, x1 - x0, band, band * 0.35) : g.rect(x0, y, x1 - x0, band);
    g.fillStyle = col; g.fill(); g.lineWidth = Math.max(1, w / 48); g.strokeStyle = INK; g.stroke();
    // knit columns
    g.save(); g.globalAlpha = 0.16; g.strokeStyle = '#2a1420'; g.lineWidth = Math.max(0.8, w / 110);
    for (let x = x0 + band * 0.3; x < x1 - band * 0.2; x += band * 0.4) { g.beginPath(); g.moveTo(x, y + band * 0.25); g.lineTo(x + band * 0.14, y + band * 0.75); g.lineTo(x + band * 0.28, y + band * 0.25); g.stroke(); }
    g.restore();
  }
  // the fringe from the bottom fold
  const fy = h * 0.2 + 3 * band * 0.92 - band * 0.1;
  g.strokeStyle = cols[cols.length - 1]; g.lineWidth = Math.max(1.2, w / 36); g.lineCap = 'round';
  for (let x = x0 + band * 0.3; x < x1 - band * 0.1; x += band * 0.38) { g.beginPath(); g.moveTo(x, fy); g.lineTo(x + w * 0.01, fy + band * 0.75); g.stroke(); }
}
