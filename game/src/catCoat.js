// catCoat.js — the cat's coat, recolored in code from the cream sprites (purl-cat, purl-cheer-0..3,
// purl-sit). Each fur pixel (warm hue, light, not the pink of her ears, nose and pads, not the white
// of her whiskers and eye glints) is mapped by its lightness onto the coat's dark → mid → light ramp,
// so the painted shading and fur strokes stay. The outline is tinted to match darker coats. The
// cranberry ear tip (hue ~350°) is never touched: it stays her mark. Calico and tuxedo add soft
// ellipse masks per pose (patches; bib, muzzle and paws). Recolored sprites are cached per pose.
import * as S from './state.js';

// [dark, mid, light, outline]
export const COATS = {
  cream: null, // the painted sprite as it is
  ginger: ['#9a4a1a', '#de8536', '#f9c88e', '#5e260c'],
  grey: ['#4a4f5a', '#7a808c', '#b9bec6', '#262830'],
  charcoal: ['#1e1e24', '#383842', '#74747f', '#0c0c10'],
  chocolate: ['#3e2416', '#6e442c', '#ad8262', '#24130a'],
  silver: ['#9aa3ae', '#c9d0d8', '#f6f8fa', '#5a6270'],
  white: ['#bdb6ae', '#ece7e0', '#fffdfa', '#7a6a60'],
};
export const COAT_LIST = [
  ['cream', 'Cream'], ['ginger', 'Ginger'], ['grey', 'Grey'], ['charcoal', 'Charcoal'], ['chocolate', 'Chocolate'], ['silver', 'Silver'], ['calico', 'Calico'], ['tuxedo', 'Tuxedo'],
];
// mixed coats: a base and patches [coat, mask name]
const MIXED = { calico: { base: 'white', patches: [['ginger', 'a', 0.8], ['charcoal', 'b', 0.8]] }, tuxedo: { base: 'charcoal', patches: [['white', 'w', 0.55]] } };
// soft ellipses [cx, cy, rx, ry] in sprite px (512²), per pose: w = tuxedo bib/muzzle/paws, a/b = calico ginger/black
const MASKS = {
  sleep: { w: [[155, 248, 55, 34], [178, 324, 58, 50], [130, 418, 52, 28], [262, 422, 52, 28]], a: [[385, 265, 100, 70], [300, 150, 40, 40]], b: [[118, 135, 58, 52], [440, 405, 55, 38]] },
  cheer0: { w: [[160, 235, 55, 34], [183, 322, 58, 50], [140, 418, 52, 28], [270, 422, 52, 28]], a: [[390, 265, 100, 70], [310, 150, 40, 40]], b: [[135, 130, 58, 52], [440, 405, 55, 38]] },
  cheer1: { w: [[165, 225, 55, 36], [180, 322, 58, 50], [95, 285, 38, 32], [270, 420, 60, 28]], a: [[390, 270, 100, 70], [310, 130, 40, 40]], b: [[140, 110, 58, 52], [440, 405, 55, 38]] },
  cheer2: { w: [[170, 215, 55, 34], [190, 322, 58, 50], [45, 265, 38, 35], [260, 422, 60, 28]], a: [[390, 280, 100, 70], [300, 150, 40, 40]], b: [[175, 120, 58, 52], [440, 405, 55, 38]] },
  cheer3: { w: [[150, 318, 55, 32], [178, 372, 58, 40], [130, 425, 52, 26], [262, 425, 52, 26]], a: [[385, 300, 100, 65], [290, 230, 40, 35]], b: [[125, 200, 58, 50], [440, 410, 55, 36]] },
  sit: { w: [[234, 195, 50, 32], [240, 310, 70, 95], [185, 470, 40, 30], [285, 470, 40, 30]], a: [[350, 350, 70, 90], [290, 90, 40, 40]], b: [[180, 100, 55, 60], [420, 420, 50, 40]] },
};
// where her open eyes are (sprite px), for the happy squint drawn over them when she's petted
export const EYES = { sit: [[196, 148], [286, 148]], cheer0: [[160, 178], [240, 192]], cheer1: [[150, 155], [230, 168]], cheer2: [[148, 175], [228, 190]], cheer3: null, sleep: null };

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const coatNow = () => { const c = S.get().cat && S.get().cat.coat; return COATS[c] !== undefined || MIXED[c] ? c : 'cream'; };

function rampOf(coat) {
  const [d, m, l, o] = COATS[coat].map(hex);
  return { d, m, l, o };
}
function ramp(R, L, out) {
  const t = Math.min(1, Math.max(0, (L - 0.55) / 0.42));
  if (t < 0.55) { const a = t / 0.55; for (let i = 0; i < 3; i++) out[i] = R.d[i] + (R.m[i] - R.d[i]) * a; }
  else { const b = (t - 0.55) / 0.45; for (let i = 0; i < 3; i++) out[i] = R.m[i] + (R.l[i] - R.m[i]) * b; }
}
function maskOf(ells, size) {
  const m = new Float32Array(size * size);
  const k = size / 512;
  for (const [cx, cy, rx, ry, soft = 0.55] of ells) {
    const x0 = Math.max(0, Math.floor((cx - rx) * k)), x1 = Math.min(size - 1, Math.ceil((cx + rx) * k));
    const y0 = Math.max(0, Math.floor((cy - ry) * k)), y1 = Math.min(size - 1, Math.ceil((cy + ry) * k));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x / k - cx) / rx, dy = (y / k - cy) / ry;
      const v = 1 - ss(soft, 1, Math.sqrt(dx * dx + dy * dy));
      const i = y * size + x; if (v > m[i]) m[i] = v;
    }
  }
  return m;
}

// recolor a 512² sprite (any size works) into a new canvas
export function recolor(img, coat, pose = 'sleep') {
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  if (!COATS[coat] && !MIXED[coat]) return c;
  const id = g.getImageData(0, 0, W, H), p = id.data;
  const mix = MIXED[coat];
  const base = rampOf(mix ? mix.base : coat);
  const patches = mix ? mix.patches.map(([pc, mk, soft]) => ({ R: rampOf(pc), m: maskOf((MASKS[pose] || MASKS.sleep)[mk].map((e) => [...e, soft]), W) })) : [];
  const out = [0, 0, 0], o2 = [0, 0, 0];
  for (let i = 0, n = W * H; i < n; i++) {
    const j = i * 4;
    if (p[j + 3] === 0) continue;
    const r = p[j] / 255, gg = p[j + 1] / 255, b = p[j + 2] / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), C = mx - mn, L = (mx + mn) / 2;
    let Hh = 30;
    if (C > 0) { Hh = mx === r ? (((gg - b) / C) % 6) * 60 : mx === gg ? ((b - r) / C + 2) * 60 : ((r - gg) / C + 4) * 60; if (Hh < 0) Hh += 360; }
    const lw = ss(0.42, 0.58, L);
    const hw = ss(0, 8, Hh) * (1 - ss(46, 54, Hh));
    const pink = ss(0.33, 0.40, C) * (1 - ss(24, 30, Hh)) * ss(0.56, 0.63, L);
    const fur = hw * lw * (1 - pink) * ss(0.03, 0.08, C);
    const line = ss(0, 8, Hh) * (1 - ss(32, 42, Hh)) * (1 - lw) * ss(0.06, 0.18, L) * (1 - ss(0.28, 0.36, C) * (1 - ss(0.36, 0.44, L)));
    if (fur < 0.004 && line < 0.004) continue;
    let R0 = p[j], G0 = p[j + 1], B0 = p[j + 2];
    if (line > 0.004) {
      // the outline: the coat's outline color, lightening toward its dark fur
      const lt = Math.min(1, Math.max(0, (L - 0.1) / 0.48));
      R0 += (base.o[0] + (base.d[0] - base.o[0]) * lt - R0) * line;
      G0 += (base.o[1] + (base.d[1] - base.o[1]) * lt - G0) * line;
      B0 += (base.o[2] + (base.d[2] - base.o[2]) * lt - B0) * line;
    }
    if (fur > 0.004) {
      ramp(base, L, out);
      for (const pt of patches) { const m = pt.m[i]; if (m > 0.004) { ramp(pt.R, L, o2); for (let q = 0; q < 3; q++) out[q] += (o2[q] - out[q]) * m; } }
      R0 += (out[0] - R0) * fur; G0 += (out[1] - G0) * fur; B0 += (out[2] - B0) * fur;
    }
    p[j] = R0; p[j + 1] = G0; p[j + 2] = B0;
  }
  g.putImageData(id, 0, 0);
  return c;
}

// the sprite in the cat's coat (the cream original when she's cream), cached per image and coat
const cache = new Map();
export function catImage(img, pose, coat = coatNow()) {
  if (!img || coat === 'cream') return img;
  const key = `${pose}|${coat}|${img.src || ''}`;
  let c = cache.get(key);
  if (!c) {
    c = recolor(img, coat, pose);
    cache.set(key, c);
    if (cache.size > 24) cache.delete(cache.keys().next().value);
  }
  return c;
}
