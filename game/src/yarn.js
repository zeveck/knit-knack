// yarn.js — the palette, yarn types, names, recent yarns, custom colors, and the tinted yarn balls.
import { YARN_TYPES, YARN_LABELS, yarnColorAt, hexToRgb } from './stitches.js';

export { YARN_TYPES, YARN_LABELS };

// 30 swatches: warm, cool, brights, naturals and greys.
export const PALETTE = [
  ['Cranberry', '#9e2a3a'], ['Tomato', '#d2462e'], ['Rust', '#b5532b'], ['Pumpkin', '#e07b2c'], ['Honey', '#d9a441'],
  ['Butter', '#f2d675'], ['Rose', '#e8a0a8'], ['Blush', '#f3cbc4'], ['Berry', '#b03a6e'], ['Plum', '#5b3a5e'],
  ['Lilac', '#b9a3d0'], ['Lavender', '#8e7cc3'], ['Navy', '#1f2a4d'], ['Denim', '#46679a'], ['Sky', '#8db8d8'],
  ['Teal', '#2f7f7f'], ['Mint', '#b8dcc4'], ['Sage', '#8fa77f'], ['Moss', '#5f7a3a'], ['Forest', '#2f5233'],
  ['Lime', '#a9c94a'], ['Cream', '#efe4cf'], ['Oatmeal', '#d8c8a8'], ['Camel', '#b58a5a'], ['Chocolate', '#5a3a28'],
  ['White', '#f8f6f1'], ['Silver', '#bdbcc0'], ['Slate', '#6f7480'], ['Charcoal', '#3a3a3e'], ['Black', '#1c1a1c'],
];
const BY_HEX = new Map(PALETTE.map(([n, h]) => [h.toLowerCase(), n]));
const BY_NAME = new Map(PALETTE.map(([n, h]) => [n.toLowerCase(), h]));

// extra color names from the pattern book's own palette ({name: hex})
export function registerColorNames(map) {
  for (const [n, h] of Object.entries(map || {})) {
    const name = n[0].toUpperCase() + n.slice(1);
    if (!BY_NAME.has(n.toLowerCase())) BY_NAME.set(n.toLowerCase(), h.toLowerCase());
    if (!BY_HEX.has(h.toLowerCase())) BY_HEX.set(h.toLowerCase(), name);
  }
}
export const colorName = (hex) => BY_HEX.get(String(hex).toLowerCase()) || nearestName(hex);
function nearestName(hex) {
  const [r, g, b] = hexToRgb(hex);
  let best = 'Custom', bd = Infinity;
  for (const [n, h] of PALETTE) { const [r2, g2, b2] = hexToRgb(h); const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2; if (d < bd) { bd = d; best = n; } }
  return bd < 900 ? best : `Custom ${best.toLowerCase()}`;
}
export const typeName = (t) => YARN_LABELS[t] || 'Wool';
export const yarnName = (y) => (y ? `${colorName(y.color)} ${typeName(y.type).toLowerCase()}` : '');
export const sameYarn = (a, b) => !!a && !!b && a.color.toLowerCase() === b.color.toLowerCase() && a.type === b.type;
export const yarnKey = (y) => `${y.color.toLowerCase()}|${y.type}`;

// Accepts {color,type}, {hex,type}, "Cranberry wool", "#9e2a3a", or a palette name.
export function normYarn(v, fallback = { color: '#efe4cf', type: 'wool' }) {
  if (!v) return { ...fallback };
  if (typeof v === 'object') {
    const color = v.color || v.hex || fallback.color;
    let type = v.type || fallback.type; if (type === 'striping' || type === 'self-striping') type = 'stripe';
    return { color: color.startsWith('#') ? color.toLowerCase() : (BY_NAME.get(color.toLowerCase()) || fallback.color), type: YARN_TYPES.includes(type) ? type : 'wool' };
  }
  const s = String(v).trim();
  if (s.startsWith('#')) return { color: s.toLowerCase(), type: fallback.type };
  const words = s.toLowerCase().split(/\s+/);
  let type = fallback.type, color = fallback.color;
  for (const w of words) {
    const t = w === 'striping' || w === 'self-striping' ? 'stripe' : w;
    if (YARN_TYPES.includes(t)) type = t;
    if (BY_NAME.has(w)) color = BY_NAME.get(w);
  }
  return { color, type };
}

// ---------------------------------------------------------------- the balls
const FILE = { wool: 'wool', cotton: 'cotton', chunky: 'chunky', mohair: 'mohair', sparkle: 'sparkle', stripe: 'striping', velvet: 'velvet', glow: 'glow' };
const imgs = {};
export function loadYarnImages(types = YARN_TYPES) {
  return Promise.all(types.filter((t) => !imgs[t]).map((t) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { imgs[t] = im; res(); };
    im.onerror = () => res();
    im.src = `assets/items/yarn-${FILE[t]}.png`;
  })));
}

const tintCache = new Map();
// A tinted ball canvas (square, px device pixels): fill with the color, multiply the ball, screen its highlight back.
export function ballCanvas(yarn, px) {
  px = Math.max(8, Math.round(px));
  const key = `${yarn.type}|${yarn.color}|${px}`;
  let c = tintCache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d');
  const im = imgs[yarn.type] || imgs.wool;
  if (!im) {
    g.fillStyle = yarn.color; g.beginPath(); g.arc(px / 2, px / 2, px * 0.45, 0, Math.PI * 2); g.fill();
  } else {
    if (yarn.type === 'stripe') {
      // self-striping: bands of drifting shades across the ball
      const n = 8;
      for (let i = 0; i < n; i++) { g.fillStyle = yarnColorAt(yarn, i * 14); g.fillRect(0, (i * px) / n, px, px / n + 1); }
    } else { g.fillStyle = yarn.color; g.fillRect(0, 0, px, px); }
    g.globalCompositeOperation = 'multiply';
    g.drawImage(im, 0, 0, px, px);
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.32;
    g.filter = 'contrast(2.2) brightness(0.75)';
    g.drawImage(im, 0, 0, px, px);
    g.filter = 'none';
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(im, 0, 0, px, px);
  }
  if (tintCache.size > 160) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, c);
  return c;
}

// Draw a ball centred at (x, y), size = its square side, with the type's code effects.
export function drawBall(g, yarn, x, y, size, { t = 0, rot = 0, dpr = 1 } = {}) {
  const c = ballCanvas(yarn, size * dpr);
  g.save();
  g.translate(x, y); if (rot) g.rotate(rot);
  if (yarn.type === 'glow') {
    const gr = g.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 0.7);
    const [r, gg, b] = hexToRgb(yarn.color);
    gr.addColorStop(0, `rgba(${r},${gg},${b},0.45)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr; g.fillRect(-size, -size, size * 2, size * 2);
  }
  g.drawImage(c, -size / 2, -size / 2, size, size);
  if (yarn.type === 'sparkle') {
    for (let k = 0; k < 4; k++) {
      const ph = ((t / 900) + k * 0.27) % 1;
      if (ph > 0.35) continue;
      const a = Math.sin((ph / 0.35) * Math.PI);
      const gx = Math.cos(k * 2.1 + 0.6) * size * 0.27, gy = Math.sin(k * 2.7 + 0.3) * size * 0.25;
      g.fillStyle = `rgba(255,252,235,${a})`;
      const s = size * 0.07 * a + 0.6;
      g.beginPath(); g.moveTo(gx, gy - s * 2); g.lineTo(gx + s * 0.5, gy); g.lineTo(gx, gy + s * 2); g.lineTo(gx - s * 0.5, gy); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(gx - s * 2, gy); g.lineTo(gx, gy + s * 0.5); g.lineTo(gx + s * 2, gy); g.lineTo(gx, gy - s * 0.5); g.closePath(); g.fill();
    }
  }
  g.restore();
}

// A ball drawn into a small canvas element (yarn bar buttons, pickers). Redraws only when the yarn changes.
export function paintBallInto(canvas, yarn, cssSize) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const key = yarn ? yarnKey(yarn) + '|' + cssSize + '|' + dpr : '';
  if (canvas._ballKey === key) return;
  canvas._ballKey = key;
  canvas.width = canvas.height = Math.round(cssSize * dpr);
  canvas.style.width = canvas.style.height = cssSize + 'px';
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (!yarn) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBall(g, yarn, cssSize / 2, cssSize / 2, cssSize * 0.98, { dpr });
}
