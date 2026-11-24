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
// in src px. Returns {canvas, pad}: the plush, `pad` px bigger on every side.
export function plushify(src, { cell = 8, eyes = [] } = {}) {
  const pad = Math.max(4, Math.round(cell * 1.4));
  const w = src.width + pad * 2, h = src.height + pad * 2;
  const out = mk(w, h), g = out.getContext('2d');
  // a soft (blurred) copy of the shape: shrunk and scaled back up twice
  const soft = (scale, dx = 0, dy = 0) => {
    const a = mk(w / scale, h / scale), q = a.getContext('2d');
    q.imageSmoothingEnabled = true; q.drawImage(src, (pad + dx) / scale, (pad + dy) / scale, src.width / scale, src.height / scale);
    const b = mk(w / (scale * 2), h / (scale * 2)), r = b.getContext('2d');
    r.imageSmoothingEnabled = true; r.drawImage(a, 0, 0, b.width, b.height);
    return b;
  };
  // seamed rim: a dark line hugging the outline
  const sil = mk(w, h), sq = sil.getContext('2d');
  sq.drawImage(src, pad, pad); sq.globalCompositeOperation = 'source-in'; sq.fillStyle = 'rgb(44,20,34)'; sq.fillRect(0, 0, w, h);
  const rim = Math.max(1, cell * 0.12);
  g.globalAlpha = 0.55;
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.drawImage(sil, Math.cos(a) * rim, Math.sin(a) * rim); }
  g.globalAlpha = 1;
  g.drawImage(src, pad, pad);
  // the edges roll away into shadow, most toward the lower right; the upper-left edges catch the lamp.
  // (a layer that is solid outside a soft, offset copy of the shape, laid over the stitches only)
  const blurS = Math.max(2, cell * 1.5);
  const rimLayer = (dx, dy, color) => {
    const L = mk(w, h), q = L.getContext('2d');
    q.fillStyle = color; q.fillRect(0, 0, w, h);
    q.globalCompositeOperation = 'destination-out'; q.imageSmoothingEnabled = true;
    const m = soft(blurS, dx, dy);
    q.drawImage(m, 0, 0, w, h); q.drawImage(m, 0, 0, w, h);
    return L;
  };
  g.save(); g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.85; g.drawImage(rimLayer(-cell * 0.7, -cell * 0.9, 'rgb(34,12,28)'), 0, 0);
  g.globalAlpha = 0.4; g.drawImage(rimLayer(cell * 0.8, cell * 1.0, 'rgb(255,238,210)'), 0, 0);
  // round, stuffed: a gentle fall-off toward the far edges
  g.globalAlpha = 1;
  const R = Math.max(w, h) * 0.7;
  const gr = g.createRadialGradient(w * 0.42, h * 0.38, R * 0.2, w * 0.5, h * 0.5, R);
  gr.addColorStop(0, 'rgba(40,14,30,0)'); gr.addColorStop(1, 'rgba(40,14,30,0.28)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.restore();
  for (const e of eyes) frenchKnot(g, e.x + pad, e.y + pad, cell * 0.5, e.color || '#2a1f26');
  return { canvas: out, pad };
}

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
