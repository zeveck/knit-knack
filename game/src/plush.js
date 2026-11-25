// plush.js — a finished Knitted Friend, seamed and stuffed: the toy's own stitches with pillowy shading
// (edges rolling away into shadow, a soft lit crown, a seamed rim) and its eyes as embroidered French
// knots. Used by the finish, the preview card, the gallery and the toy row on the Doll Shelf.
import { palette } from './stitches.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export const isToy = (pattern) => !!pattern && pattern.chapter === 6;

// the eyes of a toy, as chart cells {r, c, color}: button-eye spots, else the cells of an "Eye"/"Pupil"
// slot, grouped into one knot per eye (neighbouring cells merge)
export function toyEyes(pattern, chart, slots) {
  const t = pattern.touch;
  const colorOf = (slot) => ((slots && slots[slot]) || (pattern.slots && pattern.slots[slot]) || {}).color;
  if (t && t.kind === 'button-eyes' && t.cells) return t.cells.map(([r, c]) => ({ r, c: c, color: '#2a1f26' }));
  const lab = (re) => Object.entries(pattern.slots || {}).find(([, y]) => y && re.test(y.label || ''));
  const hit = lab(/pupil/i) || lab(/^eyes?$/i) || lab(/\beyes?\b/i);
  if (!hit) return [];
  const slot = hit[0];
  const cells = [];
  for (let r = 1; r <= chart.height; r++) (chart.cells(r) || []).forEach((cl, c) => { if (cl && cl.slot === slot) cells.push([r, c]); });
  // a slot that also colours a nose or ear tips: keep only the small clusters in the face's top half
  const groups = [];
  for (const [r, c] of cells) {
    const g = groups.find((G) => G.some(([r2, c2]) => Math.abs(r2 - r) <= 1 && Math.abs(c2 - c) <= 1));
    if (g) g.push([r, c]); else groups.push([[r, c]]);
  }
  const color = colorOf(slot) || '#2a1f26';
  return groups.filter((G) => G.length <= 4).map((G) => ({ r: G.reduce((s, x) => s + x[0], 0) / G.length, c: G.reduce((s, x) => s + x[1], 0) / G.length, color }))
    .sort((a, b) => b.r - a.r).slice(0, 2);
}

// src: the piece's render (transparent around it). cell: its stitch width in src px. eyes: [{x, y, color}]
// in src px. shape: 'toy' (its own outline, the stitch steps and corners rounded off as if stuffed) or
// 'pillow' (a stuffed square: the sides drawn in, the corners poking out round). Returns {canvas, pad}:
// the plush, `pad` px bigger on every side.
export function plushify(src, { cell = 8, eyes = [], shape = 'toy' } = {}) {
  const pad = Math.max(4, Math.round(cell * 1.4));
  const w = src.width + pad * 2, h = src.height + pad * 2;
  const out = mk(w, h), g = out.getContext('2d');
  // a soft (blurred) copy of a canvas: shrunk and scaled back up twice
  const blurOf = (c, scale, dx = 0, dy = 0) => {
    const a = mk(w / scale, h / scale), q = a.getContext('2d');
    q.imageSmoothingEnabled = true; q.drawImage(c, dx / scale, dy / scale, w / scale, h / scale);
    const b = mk(w / (scale * 2), h / (scale * 2)), r = b.getContext('2d');
    r.imageSmoothingEnabled = true; r.drawImage(a, 0, 0, b.width, b.height);
    return b;
  };
  // the stuffed outline: the piece's own (or a pillow's pinched square), blurred and cut at half, so stitch
  // steps and corners round off the way a seam pulls on stuffing
  const base = mk(w, h), bq = base.getContext('2d', { willReadFrequently: true });
  bq.drawImage(src, pad, pad);
  if (shape === 'pillow') {
    const [x0, y0, x1, y1] = opaqueBox(base);
    const m = Math.min(x1 - x0, y1 - y0), pin = m * 0.05;
    const P = new Path2D();
    P.moveTo(x0, y0);
    P.quadraticCurveTo((x0 + x1) / 2, y0 + pin * 2, x1, y0);
    P.quadraticCurveTo(x1 - pin * 2, (y0 + y1) / 2, x1, y1);
    P.quadraticCurveTo((x0 + x1) / 2, y1 - pin * 2, x0, y1);
    P.quadraticCurveTo(x0 + pin * 2, (y0 + y1) / 2, x0, y0);
    bq.globalCompositeOperation = 'destination-in'; bq.fillStyle = '#000'; bq.fill(P);
    bq.globalCompositeOperation = 'source-over';
  }
  const round = Math.max(1.2, shape === 'pillow' ? cell * 1.1 : cell * 0.55);
  const mask = threshold(gauss(base, round), w, h, 0.45, 0.55);
  const body = mk(w, h), yq = body.getContext('2d');
  yq.drawImage(src, pad, pad);
  yq.globalCompositeOperation = 'destination-in'; yq.drawImage(mask, 0, 0);
  // seamed rim: a dark line hugging the outline
  const sil = mk(w, h), sq = sil.getContext('2d');
  sq.drawImage(mask, 0, 0); sq.globalCompositeOperation = 'source-in'; sq.fillStyle = 'rgb(44,20,34)'; sq.fillRect(0, 0, w, h);
  const rim = Math.max(1, cell * 0.12);
  g.globalAlpha = 0.55;
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.drawImage(sil, Math.cos(a) * rim, Math.sin(a) * rim); }
  g.globalAlpha = 1;
  g.drawImage(body, 0, 0);
  // the edges roll away into shadow, most toward the lower right; the upper-left edges catch the lamp.
  // (a layer that is solid outside a soft, offset copy of the shape, laid over the stitches only)
  const blurS = Math.max(2, cell * (shape === 'pillow' ? 2.2 : 1.5));
  const rimLayer = (dx, dy, color) => {
    const L = mk(w, h), q = L.getContext('2d');
    q.fillStyle = color; q.fillRect(0, 0, w, h);
    q.globalCompositeOperation = 'destination-out'; q.imageSmoothingEnabled = true;
    const m = blurOf(mask, blurS, dx, dy);
    q.drawImage(m, 0, 0, w, h); q.drawImage(m, 0, 0, w, h);
    return L;
  };
  g.save(); g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.85; g.drawImage(rimLayer(-cell * 0.7, -cell * 0.9, 'rgb(34,12,28)'), 0, 0);
  g.globalAlpha = 0.4; g.drawImage(rimLayer(cell * 0.8, cell * 1.0, 'rgb(255,238,210)'), 0, 0);
  g.globalAlpha = 1;
  const [bx0, by0, bx1, by1] = mask.box;
  const cw = bx1 - bx0, ch = by1 - by0, cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
  // round, stuffed: a gentle fall-off toward the far edges
  const R = Math.max(cw, ch) * 0.75;
  const gr = g.createRadialGradient(cx - cw * 0.08, cy - ch * 0.12, R * 0.2, cx, cy, R);
  gr.addColorStop(0, 'rgba(40,14,30,0)'); gr.addColorStop(1, 'rgba(40,14,30,0.3)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // the light on the fullest part: a soft sheen up and to the left
  const hx = cx - cw * 0.16, hy = cy - ch * 0.2, hr = Math.min(cw, ch) * 0.42;
  const hl = g.createRadialGradient(hx, hy, 0, hx, hy, hr);
  hl.addColorStop(0, 'rgba(255,246,228,0.3)'); hl.addColorStop(0.5, 'rgba(255,246,228,0.1)'); hl.addColorStop(1, 'rgba(255,246,228,0)');
  g.fillStyle = hl; g.save(); g.translate(hx, hy); g.scale(cw > ch ? 1.3 : 1, ch > cw ? 1.3 : 1); g.translate(-hx, -hy); g.fillRect(-w, -h, w * 3, h * 3); g.restore();
  // the seam just inside the outline: a pulled-in groove (dark) with the stuffing bulging past it (light)
  const sb = gauss(mask, Math.max(1, cell * 0.45));
  const groove = threshold(sb, w, h, 0.84, 0.9, 0.95), puff = threshold(sb, w, h, 0.93, 0.97, 1.01);
  tint(groove, 'rgb(40,14,30)'); tint(puff, 'rgb(255,240,215)');
  g.globalAlpha = shape === 'pillow' ? 0.4 : 0.3; g.drawImage(groove, 0, 0);
  g.globalAlpha = 0.18; g.drawImage(puff, 0, 0);
  g.globalAlpha = 1;
  g.restore();
  for (const e of eyes) frenchKnot(g, e.x + pad, e.y + pad, cell * 0.5, e.color || '#2a1f26');
  return { canvas: out, pad };
}
// a gaussian blur of a canvas (r: its radius in px), the same size; where canvas filters aren't drawn, a
// shrink-and-grow blur close enough to it
let filterOK = null;
function gauss(c, r) {
  const out = mk(c.width, c.height), q = out.getContext('2d');
  if (filterOK === null) { q.filter = 'blur(1px)'; filterOK = q.filter === 'blur(1px)'; q.filter = 'none'; }
  if (filterOK) { const p = Math.ceil(r * 3); const t = mk(c.width + p * 2, c.height + p * 2), tq = t.getContext('2d'); tq.filter = `blur(${r}px)`; tq.drawImage(c, p, p); q.drawImage(t, -p, -p); return out; }
  const f = Math.max(1, r * 0.8), a = mk(c.width / f, c.height / f), aq = a.getContext('2d');
  aq.imageSmoothingEnabled = true; aq.drawImage(c, 0, 0, a.width, a.height);
  q.imageSmoothingEnabled = true; q.drawImage(a, 0, 0, c.width, c.height);
  return out;
}
// the opaque box of a canvas [x0, y0, x1, y1]
function opaqueBox(c) {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < x0 ? [0, 0, w, h] : [x0, y0, x1 + 1, y1 + 1];
}
// a soft canvas (blurred, small) drawn at w × h, its alpha remapped: 0 below lo, 1 from hi; with top, a
// band that falls back to 0 at top (a line along one level of the blur)
function threshold(soft, w, h, lo, hi, top = 0) {
  const c = mk(w, h), q = c.getContext('2d', { willReadFrequently: true });
  q.imageSmoothingEnabled = true; q.drawImage(soft, 0, 0, w, h);
  const im = q.getImageData(0, 0, w, h), d = im.data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i] / 255;
    let v = a <= lo ? 0 : a >= hi ? 1 : (a - lo) / (hi - lo);
    if (top && a > hi) v = a >= top ? 0 : 1 - (a - hi) / (top - hi);
    v = v * v * (3 - 2 * v);
    d[i - 3] = d[i - 2] = d[i - 1] = 0; d[i] = Math.round(v * 255);
    if (v > 0.15) { const p = (i - 3) >> 2, x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  c.box = x1 < x0 ? [0, 0, w, h] : [x0, y0, x1 + 1, y1 + 1];
  q.putImageData(im, 0, 0);
  return c;
}
function tint(c, color) { const q = c.getContext('2d'); q.globalCompositeOperation = 'source-in'; q.fillStyle = color; q.fillRect(0, 0, c.width, c.height); }

// an embroidered French knot: a tight round knot of wraps, with a glint
export function frenchKnot(g, x, y, r, color) {
  const P = palette(color, 'wool');
  g.save();
  g.fillStyle = 'rgba(20,8,14,0.45)'; g.beginPath(); g.ellipse(x + r * 0.15, y + r * 0.3, r * 1.1, r * 0.95, 0, 0, Math.PI * 2); g.fill();
  const body = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.05);
  body.addColorStop(0, rgba(P.light)); body.addColorStop(0.55, rgba(P.base)); body.addColorStop(1, rgba(P.deep));
  g.fillStyle = body; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  // the wraps
  g.lineCap = 'round';
  g.strokeStyle = rgba(P.deep, 0.75); g.lineWidth = Math.max(0.6, r * 0.16);
  for (let k = 0; k < 3; k++) { const a = -0.6 + k * 2.1; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25, r * 0.62, a + 0.5, a + 2.4); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.38, Math.max(0.7, r * 0.2), 0, Math.PI * 2); g.fill();
  g.restore();
}
