// stitches.js — code-drawn stitch sprites, keyed by (kind, yarn type, color, cell device px, variant),
// in an LRU of about 600 canvases. Every sprite is drawn for a cell W wide and H = 0.72 W tall,
// reaching above and below its cell so rows tuck into each other when drawn bottom-up.
//
// getSprite(kind, yarn, W, variant) -> {canvas, ox, oy}: draw at (cellX - ox, cellY - oy).
// kinds: k p o < > m b castOn bindOff, and cable pieces 'cable:<type>:<i>' (i = position in the span).

export const CELL_ASPECT = 0.72;
export const YARN_TYPES = ['wool', 'cotton', 'chunky', 'mohair', 'sparkle', 'stripe', 'velvet', 'glow'];
export const YARN_LABELS = { wool: 'Wool', cotton: 'Cotton', chunky: 'Chunky', mohair: 'Mohair', sparkle: 'Sparkle', stripe: 'Self-striping', velvet: 'Velvet', glow: 'Glow' };

// per-type look: leg thickness, ply-twist strength, fibre texture strength, edge fuzz,
// sheen (specular), shadow depth, saturation, outline strength
const TYPE = {
  wool:    { thick: 1.0,  twist: 0.20, tex: 0.55, fuzz: 0.35, sheen: 0.0,  shade: 1.0,  sat: 1.0,  line: 0.5, plies: 4 },
  cotton:  { thick: 0.9,  twist: 0.26, tex: 0.25, fuzz: 0.0,  sheen: 0.28, shade: 0.95, sat: 1.0,  line: 0.65, plies: 5 },
  chunky:  { thick: 1.16, twist: 0.30, tex: 0.5,  fuzz: 0.2,  sheen: 0.0,  shade: 1.35, sat: 1.0,  line: 0.6, plies: 3 },
  mohair:  { thick: 0.92, twist: 0.06, tex: 0.5,  fuzz: 0.9,  sheen: 0.0,  shade: 0.75, sat: 0.95, line: 0.25, plies: 3 },
  sparkle: { thick: 0.96, twist: 0.14, tex: 0.3,  fuzz: 0.05, sheen: 0.2,  shade: 1.0,  sat: 1.0,  line: 0.5, plies: 4, glints: true },
  stripe:  { thick: 1.0,  twist: 0.20, tex: 0.5,  fuzz: 0.3,  sheen: 0.0,  shade: 1.0,  sat: 1.0,  line: 0.5, plies: 4 },
  velvet:  { thick: 1.04, twist: 0.04, tex: 0.08, fuzz: 0.0,  sheen: 0.75, shade: 1.3,  sat: 1.12, line: 0.55, plies: 2 },
  glow:    { thick: 0.98, twist: 0.10, tex: 0.2,  fuzz: 0.1,  sheen: 0.15, shade: 0.7,  sat: 1.05, line: 0.35, plies: 3, glow: true },
};
export const typeInfo = (t) => TYPE[t] || TYPE.wool;

// ---------------------------------------------------------------- color

export function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

const SHADOW = [46, 22, 44];   // plum-brown shadow, as in the look target's outlines
const WARM = [255, 246, 228];  // lamp-warm highlight

// A color-preserving palette: the body of each strand stays at the yarn's own color;
// only edges darken (toward a plum shadow, scaled by the color's lightness) and the
// lit crest lifts a little. Cream stays cream; navy stays navy.
export function palette(hex, type = 'wool') {
  const T = typeInfo(type);
  let base = hexToRgb(hex);
  if (T.sat !== 1) { const [h, s, l] = rgbToHsl(...base); base = hslToRgb(h, Math.min(1, s * T.sat), l); }
  const [, , L] = rgbToHsl(...base);
  const k = T.shade;
  const dk = (t) => mix(base, SHADOW, Math.min(0.92, t * k));
  // the yarn's own shade (same hue, lower lightness): the troughs between loops and
  // behind purl bumps, so cream fabric shades to tan and navy to deep navy, never to grey or black
  const [h0, s0, l0] = rgbToHsl(...base);
  let out;
  const own = (f) => mix(mix([base[0] * f, base[1] * f, base[2] * f], hslToRgb(h0, s0, Math.max(0.05, l0 * f)), 0.4), SHADOW, 0.08);
  out = {
    base,
    hi: mix(base, WARM, 0.55 - 0.15 * L),
    light: mix(base, WARM, 0.22 - 0.08 * L),
    mid: mix(dk(0.18 + 0.1 * L), own(0.84), 0.45),
    dark: mix(dk(0.42 + 0.18 * L), own(0.56), 0.35),
    deep: dk(0.66 + 0.12 * L),
    gap: dk(0.8),
    trough: own(0.7 + 0.05 * (1 - L)),
    troughDeep: own(0.5 + 0.1 * (1 - L)),
    L,
  };
  // strands set back (cable back strands, the far leg) darken toward the yarn's own deep tone
  out.shade = mix(out.troughDeep, out.deep, 0.45);
  return out;
}

// Self-striping: 16 shades drifting along the yarn (hue ±22°, lightness ±10%).
export function yarnColorAt(yarn, index = 0) {
  if (!yarn || yarn.type !== 'stripe') return yarn ? yarn.color : '#cccccc';
  const shade = Math.floor(index / 7) % 16;
  const [h, s, l] = rgbToHsl(...hexToRgb(yarn.color));
  const t = (shade / 16) * Math.PI * 2;
  const rgb = hslToRgb((h + Math.sin(t) * 0.06 + 1) % 1, Math.min(1, s * (0.9 + 0.15 * Math.cos(t))), Math.max(0.08, Math.min(0.92, l + Math.sin(t * 2 + 1) * 0.1)));
  return rgbToHex(...rgb);
}

// ---------------------------------------------------------------- canvas + randomness

const mkCanvas = (w, h) => {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export const hash = (a, b = 0, c = 0) => ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0;

// ---------------------------------------------------------------- fibre texture (pluggable)

let fibreTex = null, fibreFuzzy = null, userTex = false;
function makeFibreTile(size, hairs, fuzzy) {
  const c = mkCanvas(size, size), g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, size, size);
  const R = rng(fuzzy ? 99 : 7);
  for (let i = 0; i < hairs; i++) {
    const x = R() * size, y = R() * size;
    const a = (R() - 0.5) * Math.PI * (fuzzy ? 2 : 0.7) + Math.PI * 0.35;
    const len = (fuzzy ? 6 : 4) + R() * (fuzzy ? 16 : 10);
    const v = R() < 0.5 ? 255 : 0;
    g.strokeStyle = `rgba(${v},${v},${v},${0.05 + R() * (fuzzy ? 0.14 : 0.1)})`;
    g.lineWidth = 0.6 + R() * 1.1;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + Math.cos(a + 0.4) * len * 0.5, y + oy + Math.sin(a + 0.4) * len * 0.5, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
      g.stroke();
    }
  }
  return c;
}
function ensureTex() {
  if (!fibreTex) fibreTex = makeFibreTile(128, 900, false);
  if (!fibreFuzzy) fibreFuzzy = makeFibreTile(128, 700, true);
}
// Swap in the painted tex-fibre / tex-fibre-fuzzy tiles when they exist (grey, seamless).
export function setFibreTexture(img, fuzzyImg) {
  if (img) { fibreTex = img; userTex = true; }
  if (fuzzyImg) fibreFuzzy = fuzzyImg;
  clearCache();
}

// ---------------------------------------------------------------- LRU

const LRU_MAX = 600;
const cache = new Map();
let hits = 0, misses = 0;
export function clearCache() { cache.clear(); }
export function cacheStats() { return { size: cache.size, max: LRU_MAX, hits, misses, userTexture: userTex }; }

export function getSprite(kind, yarn, W, variant = 0, colorOverride) {
  W = Math.max(4, Math.round(W));
  const color = (colorOverride || yarn.color).toLowerCase();
  const key = `${kind}|${yarn.type}|${color}|${W}|${variant}`;
  let s = cache.get(key);
  if (s) { hits++; cache.delete(key); cache.set(key, s); return s; }
  misses++;
  s = drawSprite(kind, yarn.type, color, W, variant);
  cache.set(key, s);
  if (cache.size > LRU_MAX) cache.delete(cache.keys().next().value);
  return s;
}

// ---------------------------------------------------------------- strand primitives

// One leg (a plump twisted strand segment) from (x0,y0) to (x1,y1), thickness t.
function leg(g, x0, y0, x1, y1, t, P, T, W, opt = {}) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  const rx = len / 2, ry = t / 2;
  g.save();
  g.translate((x0 + x1) / 2, (y0 + y1) / 2);
  g.rotate(ang);
  // body: a grain shape, fuller toward the top end (x<0 is the start)
  const shape = () => {
    g.beginPath();
    if (opt.pinch == null) { // a plump capsule, slightly fuller at the top end
      g.moveTo(-rx, 0);
      g.bezierCurveTo(-rx, -ry * 1.32, rx * 0.75, -ry * 1.22, rx, -ry * 0.08);
      g.quadraticCurveTo(rx * 1.02, 0, rx, ry * 0.08);
      g.bezierCurveTo(rx * 0.75, ry * 1.22, -rx, ry * 1.32, -rx, 0);
      g.closePath();
      return;
    }
    const pinch = opt.pinch;
    g.moveTo(-rx, 0);
    g.bezierCurveTo(-rx, -ry * 1.15, rx * pinch, -ry * 1.12, rx, -ry * 0.12);
    g.quadraticCurveTo(rx * 1.04, 0, rx, ry * 0.12);
    g.bezierCurveTo(rx * pinch, ry * 1.12, -rx, ry * 1.15, -rx, 0);
    g.closePath();
  };
  if (opt.shadow) {
    g.save();
    g.shadowColor = 'rgba(30,12,30,0.55)';
    g.shadowBlur = Math.max(1, W * 0.12);
    g.shadowOffsetX = Math.cos(-ang) * 0 + W * 0.04; g.shadowOffsetY = W * 0.07;
    shape(); g.fillStyle = css(P.dark); g.fill();
    g.restore();
  }
  shape();
  g.save();
  g.clip();
  // light from the upper left: in this rotated frame, "up" depends on ang; use a gradient across the strand
  // whose lit side is the one facing up-left, plus a crest along the middle.
  const lightDir = -0.7 * Math.sin(ang) + 0.7 * Math.cos(ang); // >0: the local -y side faces the lamp (up-left)
  const sgn = lightDir >= 0 ? -1 : 1;
  const gr = g.createLinearGradient(0, sgn * ry * 1.1, 0, -sgn * ry * 1.1);
  const tone = opt.tone || 0; // >0 darker (back strands)
  const tc = (c) => mix(c, P.shade || P.deep, tone);
  gr.addColorStop(0, css(tc(P.light)));
  gr.addColorStop(0.28, css(tc(P.base)));
  gr.addColorStop(0.62, css(tc(P.base)));
  gr.addColorStop(0.86, css(tc(P.mid)));
  gr.addColorStop(1, css(tc(P.dark)));
  g.fillStyle = gr;
  g.fillRect(-rx - 2, -ry * 1.3, len + 4, ry * 2.6);
  // ends roll under: darken both tips
  const ge = g.createLinearGradient(-rx, 0, rx, 0);
  ge.addColorStop(0, css(P.deep, 0.55 * T.shade));
  ge.addColorStop(0.18, css(P.deep, 0));
  ge.addColorStop(0.8, css(P.deep, 0));
  ge.addColorStop(1, css(P.deep, 0.5 * T.shade));
  g.fillStyle = ge;
  g.fillRect(-rx - 2, -ry * 1.3, len + 4, ry * 2.6);
  // crest highlight
  if (W >= 10) {
    const hl = g.createLinearGradient(0, sgn * ry * 0.95, 0, 0);
    hl.addColorStop(0, css(P.hi, 0));
    hl.addColorStop(0.45, css(P.hi, 0.28 + T.sheen * 0.4));
    hl.addColorStop(1, css(P.hi, 0));
    g.fillStyle = hl;
    g.beginPath(); g.ellipse(-rx * 0.1, sgn * ry * 0.38, rx * 0.7, ry * 0.36, 0, 0, Math.PI * 2); g.fill();
  }
  // ply twist: diagonal grooves across the strand
  if (W >= 14 && T.twist > 0) {
    const n = Math.max(2, Math.round((len / (t * 0.7)) * (T.plies / 4)));
    const step = len / n;
    const slant = ry * 1.25;
    g.lineCap = 'round';
    for (let j = 0; j <= n; j++) {
      const x = -rx + j * step + (opt.phase || 0) * step;
      g.strokeStyle = css(P.deep, T.twist * 0.6 * (tone ? 1.1 : 1));
      g.lineWidth = Math.max(0.6, t * 0.05);
      g.beginPath(); g.moveTo(x - slant * 0.5, -ry * 1.1); g.quadraticCurveTo(x + slant * 0.1, 0, x + slant * 0.5, ry * 1.1); g.stroke();
      g.strokeStyle = css(P.hi, T.twist * 0.55);
      g.lineWidth = Math.max(0.5, t * 0.04);
      g.beginPath(); g.moveTo(x - slant * 0.5 + t * 0.09, -ry * 1.1); g.quadraticCurveTo(x + slant * 0.1 + t * 0.09, 0, x + slant * 0.5 + t * 0.09, ry * 1.1); g.stroke();
    }
  }
  // velvet / cotton sheen: a sharp specular streak
  if (T.sheen > 0.2 && W >= 10) {
    g.strokeStyle = css([255, 255, 255], T.sheen * 0.45);
    g.lineWidth = Math.max(0.8, t * 0.09);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(-rx * 0.55, sgn * ry * 0.45); g.quadraticCurveTo(0, sgn * ry * 0.62, rx * 0.45, sgn * ry * 0.4); g.stroke();
  }
  g.restore();
  // soft outline
  if (T.line > 0) {
    shape();
    g.strokeStyle = css(P.deep, T.line * (W < 12 ? 0.45 : 0.6) * (opt.soft ? 0.45 : 1));
    g.lineWidth = Math.max(0.5, W * 0.018);
    g.stroke();
  }
  g.restore();
}

// fibre texture laid into the sprite with a color-preserving soft-light blend
let scratch = null;
function applyTexture(g, cw, ch, T, W, seed) {
  if (W < 12 || T.tex <= 0) return;
  ensureTex();
  const tile = T.fuzz > 0.5 ? fibreFuzzy : fibreTex;
  if (!scratch || scratch.width < cw || scratch.height < ch) scratch = mkCanvas(Math.max(cw, scratch ? scratch.width : 0), Math.max(ch, scratch ? scratch.height : 0));
  const s = scratch.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, scratch.width, scratch.height);
  const pat = s.createPattern(tile, 'repeat');
  const sc = (W * 1.3) / (tile.width || 128);
  if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().translate((seed % 37) * 3, (seed % 23) * 5).scale(sc));
  s.fillStyle = pat;
  s.fillRect(0, 0, cw, ch);
  s.globalCompositeOperation = 'destination-in';
  s.drawImage(g.canvas, 0, 0);
  g.save();
  g.globalCompositeOperation = 'soft-light';
  g.globalAlpha = Math.min(1, T.tex * 1.6);
  g.drawImage(scratch, 0, 0, cw, ch, 0, 0, cw, ch);
  g.restore();
}

// stray fibres along the outline (wool, mohair)
function fuzz(g, cx, cy, rx, ry, P, T, W, R, amount = 1) {
  if (W < 14 || T.fuzz <= 0) return;
  const n = Math.round((6 + W * 0.25) * T.fuzz * amount);
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const x = cx + Math.cos(a) * rx * (0.75 + R() * 0.3), y = cy + Math.sin(a) * ry * (0.75 + R() * 0.3);
    const l = W * (0.05 + R() * 0.1) * (1 + T.fuzz);
    const b = a + (R() - 0.5) * 1.4;
    g.strokeStyle = css(R() < 0.6 ? P.light : P.hi, 0.25 + R() * 0.3);
    g.lineWidth = Math.max(0.4, W * 0.01);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(b) * l * 0.6, y + Math.sin(b) * l * 0.6 + l * 0.2, x + Math.cos(b) * l, y + Math.sin(b) * l); g.stroke();
  }
}

// ---------------------------------------------------------------- the sprites

// Every sprite canvas: cell at (ox, oy) inside it.
function frame(W, H, padL, padR, padT, padB) {
  const ox = Math.ceil(W * padL), oy = Math.ceil(H * padT);
  const c = mkCanvas(ox + W + Math.ceil(W * padR), oy + H + Math.ceil(H * padB));
  return { c, g: c.getContext('2d'), ox, oy };
}

// the dark interior between loops, so gaps read as depth rather than holes
function backing(g, x, y, W, H, P, alpha = 1, h = 1.0) {
  const gr = g.createLinearGradient(0, y, 0, y + H * h);
  gr.addColorStop(0, css(P.troughDeep, alpha));
  gr.addColorStop(1, css(P.trough, alpha));
  g.fillStyle = gr;
  const x0 = x + W * 0.06, x1 = x + W * 0.94, y0 = y + H * 0.08, y1 = y + H * h, r = W * 0.18;
  g.beginPath();
  g.moveTo(x0 + r, y0); g.lineTo(x1 - r, y0); g.quadraticCurveTo(x1, y0, x1, y0 + r); g.lineTo(x1, y1 - r); g.quadraticCurveTo(x1, y1, x1 - r, y1);
  g.lineTo(x0 + r, y1); g.quadraticCurveTo(x0, y1, x0, y1 - r); g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0); g.fill();
}

function drawKnitV(g, x, y, W, H, P, T, R, v, o = {}) {
  // a V of two leaning legs; bottoms meet below the cell (tucking into the row below),
  // tops open toward the cell's upper corners (hidden under the row above).
  const lean = (o.lean || 0) * W;
  const spread = (o.spread ?? 1) * (0.41 + (R() - 0.5) * 0.03);
  const bx = x + W / 2 + lean * 0.3 + (R() - 0.5) * W * 0.03;
  const by = y + H * (1.28 + (R() - 0.5) * 0.04);
  const ty = y + H * (0.05 + (R() - 0.5) * 0.05);
  const t = W * 0.45 * T.thick * (o.thin ?? 1);
  const tl = [x + W * (0.5 - spread) + lean, ty], tr = [x + W * (0.5 + spread) + lean, ty + (R() - 0.5) * H * 0.04];
  const pin = o.pinch ?? null;
  // which leg sits on top varies a little (real fabric does this)
  const order = v % 2 ? ['L', 'R'] : ['R', 'L'];
  for (const s of order) {
    if (s === 'L') leg(g, tl[0], tl[1], bx - W * 0.035, by, t, P, T, W, { pinch: pin, phase: 0.2, shadow: o.shadow, tone: o.toneL || o.tone });
    else leg(g, tr[0], tr[1], bx + W * 0.035, by, t, P, T, W, { pinch: pin, phase: 0.6, shadow: o.shadow, tone: o.toneR || o.tone });
  }
  // the notch between the legs (where the row above pulls through)
  if (W >= 10 && !o.noNotch) {
    const ng = g.createRadialGradient(x + W / 2 + lean * 0.8, y + H * 0.05, 0, x + W / 2 + lean * 0.8, y + H * 0.05, W * 0.22);
    ng.addColorStop(0, css(P.troughDeep, 0.7));
    ng.addColorStop(1, css(P.troughDeep, 0));
    g.fillStyle = ng;
    g.fillRect(x, y - H * 0.2, W, H * 0.6);
  }
}

// A curved strand (a round tube) along a path: outline, body, shading, highlight and ply marks.
function tube(g, path, t, P, T, W, opt = {}) {
  const tone = opt.tone || 0;
  const tc = (c) => mix(c, P.shade || P.deep, tone);
  g.save();
  g.lineCap = opt.cap || 'round'; g.lineJoin = 'round';
  if (opt.shadow) {
    // shadow 2 = a cable's front strand: a deeper groove where it crosses, so it reads in mid-tones and fuzz
    const deep = opt.shadow === 2;
    g.save(); g.shadowColor = deep ? 'rgba(20,6,20,0.85)' : 'rgba(30,12,30,0.5)'; g.shadowBlur = Math.max(1, W * (deep ? 0.13 : 0.1)); g.shadowOffsetX = W * (deep ? 0.05 : 0.03); g.shadowOffsetY = W * (deep ? 0.09 : 0.06);
    path(); g.strokeStyle = css(tc(P.dark)); g.lineWidth = t; g.stroke();
    if (deep) { path(); g.strokeStyle = css(P.deep, 0.9); g.lineWidth = t * 1.25; g.stroke(); }
    g.restore();
  }
  if (!opt.noOutline) { path(); g.strokeStyle = css(P.deep, Math.min(1, 0.22 + T.line * 0.3)); g.lineWidth = t * 1.06 + Math.max(0.5, W * 0.016); g.stroke(); }
  path(); g.strokeStyle = css(tc(mix(P.dark, P.mid, 0.4))); g.lineWidth = t; g.stroke();
  const off = (k, c, w, a = 1) => { g.save(); g.translate(-t * k * 0.75, -t * k); path(); g.strokeStyle = css(c, a); g.lineWidth = w; g.stroke(); g.restore(); };
  off(0.04, tc(P.mid), t * 0.92);
  off(0.07, tc(P.base), t * 0.8);
  off(0.16, tc(P.light), t * 0.42, 0.7);
  if (W >= 10) off(0.25, P.hi, t * 0.12, 0.35 + T.sheen * 0.5);
  if (W >= 14 && T.twist > 0) {
    g.save(); path(); g.setLineDash([Math.max(0.8, t * 0.1), t * 0.36]); g.lineDashOffset = (opt.phase || 0) * t; g.lineCap = 'butt';
    g.strokeStyle = css(P.deep, T.twist * 0.5); g.lineWidth = t * 0.7; g.stroke(); g.restore();
  }
  g.restore();
}

function drawPurl(g, x, y, W, H, P, T, R, v) {
  // a purl bump as it looks in real fabric: the loop's head, a plump horizontal bump across the stitch,
  // with the sinker loops (the strand between stitches) half a stitch over, just below it. Purl rows
  // then interlock brick-wise into the continuous, wavy ridges of garter and reverse stockinette.
  // Everything shades in the yarn's own colour (troughs to tan for cream, to deep navy for navy).
  const Q = { ...P, deep: P.troughDeep, dark: mix(P.dark, P.trough, 0.55), mid: mix(P.mid, P.trough, 0.25), gap: P.troughDeep };
  backing(g, x, y, W, H, P, 1, 1.12);
  const th = T.thick;
  const wob = () => (R() - 0.5) * H * 0.06;
  // sinker loops: each half clipped to its half of the cell, so neighbouring purls join into one strand
  for (const side of [0, 1]) {
    g.save(); g.beginPath(); g.rect(x + side * W * 0.5, y - H * 0.3, W * 0.5 + (side ? 1 : 0), H * 1.8); g.clip();
    const cx = x + side * W, cy = y + H * 0.84 + wob();
    leg(g, cx - W * 0.46, cy + H * 0.03, cx + W * 0.46, cy - H * 0.03, H * 0.48 * th, Q, T, W, { tone: 0.16, soft: true, phase: R() });
    g.restore();
  }
  // the head: overlaps its neighbours a little so the row reads as a ridge, not separate beans
  const hy = y + H * 0.36 + wob(), tilt = (v % 2 ? 1 : -1) * H * 0.04;
  leg(g, x - W * 0.04, hy + tilt, x + W * 1.04, hy - tilt, H * 0.6 * th, Q, T, W, { phase: R(), soft: true });
  fuzz(g, x + W / 2, y + H * 0.5, W * 0.48, H * 0.4, P, T, W, R, 0.6);
}

function drawYo(g, x, y, W, H, P, T, R) {
  // the yarn-over strand ringing the eyelet; the hole itself is cut by the fabric renderer
  const cx = x + W / 2, cy = y + H * 0.62;
  const rx = W * 0.36, ry = H * 0.55;
  const t = W * 0.2 * T.thick;
  tube(g, () => { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.62, Math.PI * 2.38); }, t, P, T, W, { phase: 0.2 });
  // the strand crossing at the base, where the yo sits on the decrease beside it
  tube(g, () => { g.beginPath(); g.moveTo(cx - rx * 0.9, cy + ry * 0.75); g.quadraticCurveTo(cx, cy + ry * 1.25, cx + rx * 0.9, cy + ry * 0.75); }, t * 0.9, P, T, W, { tone: 0.2 });
  fuzz(g, cx, cy, rx, ry, P, T, W, R, 0.4);
}

function drawDec(g, x, y, W, H, P, T, R, v, dir) {
  // dir +1: k2tog (leans right), -1: ssk (leans left)
  backing(g, x, y, W, H, P);
  // the stitch underneath, peeking out on the trailing side
  leg(g, x + W * (0.5 + 0.42 * dir), y + H * 0.0, x + W * (0.5 + 0.12 * dir), y + H * 1.22, W * 0.32 * T.thick, P, T, W, { tone: 0.4 });
  // the top stitch, leaning
  const lean = dir * 0.24;
  const t = W * 0.42 * T.thick;
  const bx = x + W * (0.5 - dir * 0.1), by = y + H * 1.33;
  leg(g, x + W * (0.14 + lean), y + H * 0.06, bx - W * 0.03, by, t, P, T, W, { phase: 0.2 });
  leg(g, x + W * (0.84 + lean), y - H * 0.02, bx + W * 0.03, by, t * 1.06, P, T, W, { phase: 0.6 });
  fuzz(g, x + W / 2, y + H * 0.7, W * 0.45, H * 0.6, P, T, W, R, 0.6);
}

function drawInc(g, x, y, W, H, P, T, R, v) {
  backing(g, x, y, W, H, P);
  drawKnitV(g, x, y, W, H, P, T, R, v, { spread: 0.82, thin: 0.9 });
  // the lifted, twisted bar at the base
  const cx = x + W / 2, cy = y + H * 1.08;
  const t = W * 0.17 * T.thick;
  leg(g, cx - W * 0.3, cy - H * 0.12, cx + W * 0.22, cy + H * 0.16, t, P, T, W, { tone: 0.25, pinch: 0.85 });
  leg(g, cx + W * 0.3, cy - H * 0.12, cx - W * 0.22, cy + H * 0.16, t, P, T, W, { pinch: 0.85 });
}

function drawBobble(g, x, y, W, H, P, T, R) {
  backing(g, x, y, W, H, P);
  const cx = x + W / 2, cy = y + H * 0.55, r = W * 0.66 * Math.min(1.12, T.thick);
  // cast shadow
  const sh = g.createRadialGradient(cx + r * 0.15, cy + r * 0.45, r * 0.2, cx + r * 0.15, cy + r * 0.45, r * 1.25);
  sh.addColorStop(0, 'rgba(25,10,25,0.55)'); sh.addColorStop(1, 'rgba(25,10,25,0)');
  g.fillStyle = sh; g.beginPath(); g.ellipse(cx + r * 0.12, cy + r * 0.4, r * 1.05, r * 0.8, 0, 0, Math.PI * 2); g.fill();
  // the knot: several bulging loops
  const loops = [[-0.38, 0.1, 0.62, -0.9], [0.38, 0.1, 0.62, 0.9], [0, -0.28, 0.7, 0], [0, 0.32, 0.66, 0.2]];
  for (const [ox, oy, s, a] of loops) {
    const lx = cx + ox * r, ly = cy + oy * r;
    leg(g, lx - Math.cos(a) * r * s * 0.6, ly - Math.sin(a) * r * s * 0.15 - r * s * 0.3, lx + Math.cos(a) * r * s * 0.6, ly + r * s * 0.3, r * s * 1.05, P, T, W, { pinch: 0.85, phase: R() });
  }
  const hl = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx - r * 0.35, cy - r * 0.4, r * 0.8);
  hl.addColorStop(0, css(P.hi, 0.45)); hl.addColorStop(1, css(P.hi, 0));
  g.fillStyle = hl; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  fuzz(g, cx, cy, r, r, P, T, W, R, 0.8);
}

function drawCastOn(g, x, y, W, H, P, T, R) {
  // a twisted cord along the bottom edge of the cell (below row 1)
  const cy = y + H * 1.12, t = H * 0.34 * T.thick;
  tube(g, () => { g.beginPath(); g.moveTo(x - W * 0.04, cy - H * 0.1); g.quadraticCurveTo(x + W * 0.3, cy + H * 0.22, x + W * 0.62, cy + H * 0.12); }, t, P, T, W, { tone: 0.15 });
  tube(g, () => { g.beginPath(); g.moveTo(x + W * 0.46, cy - H * 0.1); g.quadraticCurveTo(x + W * 0.8, cy + H * 0.22, x + W * 1.1, cy + H * 0.12); }, t, P, T, W, {});
}

function drawBindOff(g, x, y, W, H, P, T, R) {
  // a chain of sideways Vs lying across the top of the stitch
  const cy = y + H * 0.1, t = H * 0.36 * T.thick;
  tube(g, () => { g.beginPath(); g.moveTo(x - W * 0.02, cy + H * 0.2); g.quadraticCurveTo(x + W * 0.55, cy + H * 0.18, x + W * 1.02, cy + H * 0.02); }, t, P, T, W, { tone: 0.15 });
  tube(g, () => { g.beginPath(); g.moveTo(x - W * 0.02, cy - H * 0.16); g.quadraticCurveTo(x + W * 0.55, cy - H * 0.14, x + W * 1.02, cy + H * 0.02); }, t, P, T, W, {});
}

// cable piece: cell i of an n-wide span. Front strands cross over with a shadow; back strands sit behind.
export function cableRole(type, i) {
  const n = +type[1], k = n / 2, F = type[2] === 'F';
  if (F) return i < k ? { front: true, shift: k } : { front: false, shift: -k };
  return i >= k ? { front: true, shift: -k } : { front: false, shift: k };
}
function drawCablePiece(g, x, y, W, H, P, T, R, v, type, i) {
  // A cable cell owns its column on the cross row and the row below it (the renderer leaves that plain
  // V out once the cross is knit). Its stitch travels from `shift` columns away up to this column.
  // (Change 2 fix) The front strand is an S over the two rows: three overlapping Vs, upright near its source,
  // leaning hard in the middle, upright again at the top, so it reads as a rope turning over, with a deep
  // shadow cast along its whole length on what lies under it. The back strands sink: darker and narrower,
  // drawn first (the renderer draws every back strand before the front ones).
  const { front, shift } = cableRole(type, i);
  const lean = Math.sign(shift) * Math.min(Math.abs(shift) * W * 0.42 / H, 0.62); // shear along the travel, capped near 32 degrees
  if (!front) {
    for (const [vy, f] of [[y + H, 0.96], [y, 0.04]]) { // lower V near its source column, upper V near this one
      const cy = vy + H * 0.65;
      g.save();
      g.translate(shift * W * f, 0);
      g.transform(1, 0, lean * 0.8, 1, -lean * 0.8 * cy, 0);
      drawKnitV(g, x, vy, W, H, P, T, R, v + (f > 0.5 ? 1 : 0), { tone: 0.8, thin: 0.84, spread: 0.84, noNotch: true });
      g.restore();
    }
    return;
  }
  // the shadow the front strand casts: a soft dark band along its path, a little below and to the side
  const sx0 = x + W * 0.5 + shift * W, sy0 = y + H * 1.95, sx1 = x + W * 0.5, sy1 = y + H * 0.35;
  // (drawn as the blurred shadow of a stroke far off the canvas, so only the soft shadow lands)
  const OFF = 4096;
  g.save();
  g.lineCap = 'round';
  g.shadowColor = css(mix(P.troughDeep, [24, 10, 20], 0.4), 0.7); g.shadowBlur = Math.max(1.5, W * 0.32); g.shadowOffsetX = OFF; g.shadowOffsetY = 0;
  g.strokeStyle = '#000'; g.lineWidth = W * 0.9;
  g.beginPath(); g.moveTo(sx0 + W * 0.1 - OFF, sy0);
  g.bezierCurveTo(sx0 + W * 0.1 - OFF, sy0 - H * 0.6, sx1 + W * 0.1 - OFF, sy1 + H * 0.75, sx1 + W * 0.1 - OFF, sy1 + H * 0.15);
  g.stroke();
  g.restore();
  // the S: [vertical place, share of the travel still to go, lean]
  const steps = [[y + H, 0.9, 0.42], [y + H * 0.5, 0.5, 1], [y, 0.1, 0.42]];
  steps.forEach(([vy, f, k], q) => {
    const cy = vy + H * 0.65;
    g.save();
    g.translate(shift * W * f, 0);
    g.transform(1, 0, lean * k, 1, -lean * k * cy, 0);
    drawKnitV(g, x, vy, W, H, P, T, R, v + q, { shadow: 2, thin: 1.12, spread: 1.0 });
    if (W >= 6) {
      // a highlight along the strand's crown (the lamp is up and to the left)
      const hl = g.createRadialGradient(x + W * 0.4, vy + H * 0.55, 0, x + W * 0.4, vy + H * 0.55, W * 0.6);
      hl.addColorStop(0, css(P.hi, 0.42)); hl.addColorStop(1, css(P.hi, 0));
      g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = hl; g.fillRect(x - W * 0.3, vy - H * 0.3, W * 1.6, H * 1.8); g.restore();
    }
    g.restore();
  });
}

function drawSprite(kind, type, color, W, variant) {
  const T = typeInfo(type);
  const P = palette(color, type);
  const H = Math.round(W * CELL_ASPECT);
  const R = rng(hash(W, variant + 1, kind.length * 31 + kind.charCodeAt(0)));
  let f;
  if (kind.startsWith('kl:')) {
    // (Change 2) a plain V inside a cable's rope, leaning along the rope's twist between crossings
    const q = +kind.slice(3) / 10;
    f = frame(W, H, 0.22 + Math.max(0, -q), 0.22 + Math.max(0, q), 0.2, 0.45);
    backing(f.g, f.ox, f.oy, W, H, P);
    drawKnitV(f.g, f.ox, f.oy, W, H, P, T, R, variant, { lean: q, thin: 1.06, spread: 1.02 });
    fuzz(f.g, f.ox + W / 2, f.oy + H * 0.68, W * 0.45, H * 0.65, P, T, W, R);
  } else if (kind.startsWith('cable:')) {
    const [, ctype, si] = kind.split(':');
    const i = +si, { shift } = cableRole(ctype, i);
    const padL = 0.25 + Math.max(0, -shift), padR = 0.25 + Math.max(0, shift);
    f = frame(W, H, padL + 0.5, padR + 0.5, 0.3, 1.9);
    drawCablePiece(f.g, f.ox, f.oy, W, H, P, T, R, variant, ctype, i);
  } else {
    switch (kind) {
      case 'k': case 'x': case 's': case 'u': case 'v': // (Change 2) slip, picked-up and sleeve sts show as knit Vs for now
        f = frame(W, H, 0.22, 0.22, 0.2, 0.45);
        backing(f.g, f.ox, f.oy, W, H, P);
        drawKnitV(f.g, f.ox, f.oy, W, H, P, T, R, variant);
        fuzz(f.g, f.ox + W / 2, f.oy + H * 0.68, W * 0.45, H * 0.65, P, T, W, R);
        break;
      case 'p': case 'q': f = frame(W, H, 0.22, 0.22, 0.2, 0.4); drawPurl(f.g, f.ox, f.oy, W, H, P, T, R, variant); break;
      case 'o': f = frame(W, H, 0.2, 0.2, 0.2, 0.4); drawYo(f.g, f.ox, f.oy, W, H, P, T, R); break;
      case '<': f = frame(W, H, 0.25, 0.4, 0.2, 0.45); drawDec(f.g, f.ox, f.oy, W, H, P, T, R, variant, 1); break;
      case '>': f = frame(W, H, 0.4, 0.25, 0.2, 0.45); drawDec(f.g, f.ox, f.oy, W, H, P, T, R, variant, -1); break;
      case 'm': f = frame(W, H, 0.25, 0.25, 0.2, 0.5); drawInc(f.g, f.ox, f.oy, W, H, P, T, R, variant); break;
      case 'b': f = frame(W, H, 0.5, 0.5, 0.6, 0.9); drawBobble(f.g, f.ox, f.oy, W, H, P, T, R); break;
      case 'castOn': f = frame(W, H, 0.2, 0.2, 0, 0.5); drawCastOn(f.g, f.ox, f.oy, W, H, P, T, R); break;
      case 'bindOff': f = frame(W, H, 0.2, 0.2, 0.35, 0.2); drawBindOff(f.g, f.ox, f.oy, W, H, P, T, R); break;
      case '+': // a cast-on stitch knits like k
        f = frame(W, H, 0.22, 0.22, 0.2, 0.45);
        backing(f.g, f.ox, f.oy, W, H, P);
        drawKnitV(f.g, f.ox, f.oy, W, H, P, T, R, variant);
        break;
      default:
        f = frame(W, H, 0, 0, 0, 0); f.g.fillStyle = css(P.base); f.g.fillRect(0, 0, W, H);
    }
  }
  if (T.glints) glints(f.g, f.c.width, f.c.height, W, R);
  if (T.glow) glowCore(f.g, f.ox, f.oy, W, H, P);
  applyTexture(f.g, f.c.width, f.c.height, T, W, hash(variant, W));
  return { canvas: f.c, ox: f.ox, oy: f.oy, W, H };
}

function glints(g, w, h, W, R) {
  // static metallic flecks (the twinkle is an effect drawn on top, see work.js)
  const n = Math.max(2, Math.round(W * 0.18));
  g.save();
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, s = Math.max(0.6, W * (0.012 + R() * 0.02));
    g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(255,226,150,0.85)';
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
function glowCore(g, x, y, W, H, P) {
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createRadialGradient(x + W / 2, y + H * 0.6, 0, x + W / 2, y + H * 0.6, W * 0.7);
  gr.addColorStop(0, css(mix(P.base, [255, 255, 255], 0.55), 0.55));
  gr.addColorStop(1, css(P.base, 0));
  g.fillStyle = gr; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.restore();
}

// ---------------------------------------------------------------- per-stitch effects (not cached)

// Drawn straight into the fabric after the sprite: the mohair halo (seeded, so a redraw matches).
export function drawEffects(g, kind, x, y, W, yarn, seed, color) {
  const T = typeInfo(yarn.type);
  if (yarn.type !== 'mohair' || W < 8) return;
  const H = W * CELL_ASPECT;
  const P = palette(color || yarn.color, yarn.type);
  const R = rng(seed + 11);
  // cables keep their crossings readable: a lighter halo there
  const cab = typeof kind === 'string' && kind.startsWith('cable:');
  const n = Math.round((10 + W * 0.3) * (cab ? 0.35 : 1));
  g.save();
  if (cab) g.globalAlpha = 0.6;
  g.lineCap = 'round';
  // a soft bloom
  const bl = g.createRadialGradient(x + W / 2, y + H * 0.7, 0, x + W / 2, y + H * 0.7, W * 0.75);
  bl.addColorStop(0, css(P.light, 0.16)); bl.addColorStop(1, css(P.light, 0));
  g.fillStyle = bl; g.fillRect(x - W * 0.3, y - H * 0.2, W * 1.6, H * 1.8);
  for (let i = 0; i < n; i++) {
    const sx = x + W * (0.1 + R() * 0.8), sy = y + H * (0.1 + R() * 1.1);
    const a = R() * Math.PI * 2, l = W * (0.25 + R() * 0.45);
    const b = a + (R() - 0.5) * 1.6;
    g.strokeStyle = css(R() < 0.5 ? P.light : P.hi, 0.18 + R() * 0.22);
    g.lineWidth = Math.max(0.35, W * 0.008);
    g.beginPath(); g.moveTo(sx, sy);
    g.bezierCurveTo(sx + Math.cos(a) * l * 0.4, sy + Math.sin(a) * l * 0.4, sx + Math.cos(b) * l * 0.8, sy + Math.sin(b) * l * 0.8, sx + Math.cos(b) * l, sy + Math.sin(b) * l + l * 0.1);
    g.stroke();
  }
  g.restore();
}

// a 4-point twinkle (sparkle yarn), drawn on the view each frame
export function drawTwinkle(g, x, y, size, alpha) {
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, size);
  gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,235,180,0.6)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x, y - size); g.quadraticCurveTo(x, y, x + size, y); g.quadraticCurveTo(x, y, x, y + size); g.quadraticCurveTo(x, y, x - size, y); g.quadraticCurveTo(x, y, x, y - size);
  g.fill();
  g.restore();
}

// yarn-over hole geometry (cell-relative), shared by the renderer
export function holeEllipse(x, y, W) {
  const H = W * CELL_ASPECT;
  return { cx: x + W / 2, cy: y + H * 0.62, rx: W * 0.25, ry: H * 0.4 };
}
