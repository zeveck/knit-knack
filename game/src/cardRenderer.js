// cardRenderer.js — the "what you're making" preview card (previewCard.setRenderer). It only draws.
//  - Wearables: the piece in progress worn on the last-dressed doll that has its slot (else Pip), or on
//    a soft dark silhouette of Pip before Pip arrives; cropped to the slot on the small card.
//  - Everything else: a small prop scene (mug, open book, armchair, tabletop, teapot, mantel hook, fir
//    branch, gallery peg, toy shelf), the piece drawn into it from its stitches.
// The small card uses the card's flat per-stitch canvas (about 4×3 device px a cell); the enlarged card
// bakes the real stitch sprites (stitches still to come stay ghosts). The warp is redrawn at most once a
// frame (the card itself throttles), never on the tap path.
import { composeDoll, dollFor, dollSize, drawParts, loadDolls, dollsReady } from './worn.js';
import { renderSwatch } from './work.js';
import { image as sceneImage } from './scene.js';
import * as S from './state.js';
import { plushify, toyEyes } from './plush.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const IMG = {};
let loading = false;
function loadProps() {
  if (loading) return; loading = true;
  const files = { mug: 'assets/cmp/cmp-01-mug.webp', book: 'assets/items/prop-book.png', teapot: 'assets/items/prop-teapot.png', chair: 'assets/items/prop-armchair.webp', shelf: 'assets/items/gallery-shelf.png', peg: 'assets/items/gallery-peg.png', wood: 'assets/tex/tex-wood.webp' };
  for (const [k, src] of Object.entries(files)) { const im = new Image(); im.onload = () => { IMG[k] = im; if (window.__game && window.__game.previewCard) window.__game.previewCard.invalidate(); }; im.src = src; }
  loadDolls().then(() => { if (window.__game && window.__game.previewCard) window.__game.previewCard.invalidate(); });
}

export let lastDoll = null;

// ---------------------------------------------------------------- what to draw the piece from
function flatBake(info) {
  const { flat, cellW, cellH, chart } = info;
  return { canvas: flat, W: cellW, H: cellH, x0: 0, y0: 0, gw: chart.width * cellW, gh: chart.height * cellH, cols: chart.width, rows: chart.height, chart };
}
let live = { key: '', bake: null };
function liveBake(info, W) {
  const { chart, piece, pattern } = info;
  const n = piece.yarns.length;
  const key = `${pattern.id}|${piece.id}|${n}|${W}|${piece.updated || 0}`;
  if (live.key === key) return live.bake;
  // re-bake at most every 250 ms while knitting (the card shows the newest within a moment)
  const now = performance.now();
  if (live.bake && live.pid === piece.id && now - live.t < 250) { clearTimeout(live.timer); live.timer = setTimeout(() => window.__game && window.__game.previewCard.invalidate(), 260); return live.bake; }
  const total = chart.total;
  const ghost = piece.slots.A || { color: '#efe4cf', type: 'wool' };
  // stitches still to come: the real stitches in the slot yarns the chart asks for, faint (a ghost of the piece)
  const slotYarn = (i) => { const L = chart.locate(i); return (L && piece.slots[L.entry.slot]) || ghost; };
  const M = Math.round(W * 1.2);
  let res;
  try { res = renderSwatch(chart, { yarnAt: (i) => piece.yarns[i] || slotYarn(i), cellPx: W, castOnYarn: piece.castOn || ghost, background: null, shadow: false, margin: M, bindOff: n >= total }); } catch { return flatBake(info); }
  const c = res.canvas, H = res.H, x0 = M, y0 = M + 0.4 * H, gw = chart.width * W, gh = chart.height * H;
  const out = document.createElement('canvas'); out.width = c.width; out.height = c.height;
  const g = out.getContext('2d');
  if (n < total) {
    g.globalAlpha = n ? 0.3 : 0.42; g.drawImage(c, 0, 0); g.globalAlpha = 1;
    // the faint ghost, then the real stitches over it, with stitches still to come erased from the real layer
    const q = c.getContext('2d');
    const L = chart.locate(n);
    const rowTop = (r) => y0 + (chart.height - r) * H;
    q.clearRect(0, 0, c.width, rowTop(L.r) - (L.k === 0 ? -0.1 * H : 0));
    const R = chart.row(L.r);
    for (let k = L.k; k < R.map.length; k++) q.clearRect(x0 + R.map[k].col * W - 0.5, rowTop(L.r) - 0.25 * H, W + 1, H * 1.25);
  }
  g.drawImage(c, 0, 0);
  live = { key, pid: piece.id, t: now, bake: { canvas: out, W, H, x0, y0, gw, gh, cols: chart.width, rows: chart.height, chart } };
  return live.bake;
}

// ---------------------------------------------------------------- the card
const SLOT_CROP = {
  head: [118, 30, 394, 340], neck: [118, 150, 394, 450], body: [24, 220, 488, 560], hands: [0, 250, 512, 470],
  feet: [70, 470, 442, 740], shoulders: [70, 170, 442, 470],
};
const PURL_CROP = { head: [70, 0, 442, 330], neck: [70, 90, 442, 420] };

// the finished object for the Finished screen: the same scenes, info.finish (0..1) plays the piece
// turning into the thing (the mug drops onto its coaster, the cloth settles on the table, the toy puffs
// up into a plush, the wearable slides onto its doll)
export function drawObject(g, info) { renderCard(g, { ...info, large: true, progress: 1 }); }
export function objectReady() { loadProps(); return dollsReady() && !!IMG.wood; }

export function renderCard(g, info) {
  loadProps();
  const { pattern, w, h, dpr, large } = info;
  if (!pattern || !info.chart) return;
  const rr = Math.round(10 * dpr);
  g.save();
  rrect(g, 0, 0, w, h, rr); g.clip();
  if (pattern.wear) wearable(g, info);
  else scene(g, info);
  g.restore();
}

function wearable(g, info) {
  const { pattern, w, h, large } = info;
  const slot = pattern.wear.slot;
  const hasPip = S.isUnlocked('doll:pip');
  const doll = hasPip ? dollFor(slot) : 'pip';
  lastDoll = doll;
  // warm lamplit backdrop
  const bg = g.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.5, w * 0.8);
  bg.addColorStop(0, hasPip ? '#f6e4c0' : '#d9c3a6'); bg.addColorStop(1, hasPip ? '#c79f74' : '#8c6d5c');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (!dollsReady()) return;
  const crop = large ? [10, 20, 502, 750] : (doll === 'purl' ? PURL_CROP : SLOT_CROP)[slot] || [0, 0, 512, 768];
  const [cx0, cy0, cx1, cy1] = doll === 'purl' && large ? [40, 0, 472, 510] : crop;
  const k = Math.min(w / (cx1 - cx0), h / (cy1 - cy0)) * 0.96;
  // the real stitch renderer, at a cell size where motifs survive, drawn down into the card
  const W = clamp(Math.round(k * 7), 6, 14);
  const bake = large || w >= 200 ? liveBake(info, W) : flatBake(info);
  const item = { preview: { bake, chart: info.chart, pattern, slots: info.piece.slots } };
  const an = info.finish != null && info.finish < 1 ? { slot, p: info.finish } : undefined;
  const c = composeDoll(doll, { [slot]: item }, k, { silhouette: !hasPip, maxStrips: large ? 999 : 40, anim: an });
  const ox = (w - (cx1 - cx0) * k) / 2 - cx0 * k, oy = (h - (cy1 - cy0) * k) / 2 - cy0 * k;
  // floor shadow
  const [fw, fh] = dollSize(doll);
  g.save(); g.fillStyle = 'rgba(60,30,20,0.25)'; g.beginPath(); g.ellipse(ox + fw * k * 0.5, oy + (doll === 'purl' ? 494 : 722) * k, fw * k * 0.32, 10 * k, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.drawImage(c, ox, oy);
  void fh;
}

// ---------------------------------------------------------------- scenes
const KIND = {
  'stockinette-coaster': 'coaster', 'fair-isle-coaster': 'coaster',
  'basketweave-mug-cozy': 'cozy', 'aran-mug-cozy': 'cozy',
  'seed-bookmark': 'bookmark', 'vine-lace-bookmark': 'bookmark',
  'heart-pillow': 'pillow', 'bobble-cushion': 'pillow', 'chevron-baby-blanket': 'blanket', 'patchwork-blanket': 'blanket', 'heirloom-afghan': 'blanket',
  'garter-dishcloth': 'table', 'eyelet-dishcloth': 'table', 'checkerboard-washcloth': 'table', 'lace-doily': 'table',
  'tea-cosy': 'teapot', 'holiday-stocking': 'stocking', 'star-ornament': 'ornament', 'strawberry-pouch': 'peg', 'dog-sweater': 'peg',
  'little-bunny': 'toy', 'cat-toy': 'toy', whale: 'toy', frog: 'toy', penguin: 'toy', octopus: 'toy', fox: 'toy', 'teddy-bear': 'toy',
};
export const sceneOf = (pattern) => KIND[pattern.id] || (pattern.chapter === 6 ? 'toy' : 'table');

// draw the piece into a quad (TL, TR, BR, BL) with a bilinear map, sliced
function drawQuad(g, bake, q, { nu = 6, nv = 16 } = {}) {
  const [TL, TR, BR, BL] = q;
  const F = (u, v) => {
    const bx = BL[0] + (BR[0] - BL[0]) * u, by = BL[1] + (BR[1] - BL[1]) * u;
    const tx = TL[0] + (TR[0] - TL[0]) * u, ty = TL[1] + (TR[1] - TL[1]) * u;
    return [bx + (tx - bx) * v, by + (ty - by) * v];
  };
  drawParts(g, bake, [{ F, u0: -0.4 / bake.cols, u1: 1 + 0.4 / bake.cols, v0: -1 / bake.rows, v1: 1 + 0.8 / bake.rows, nu, nv: Math.min(nv, bake.rows + 2) }], 1, 0, 0);
}
function drawUpright(g, bake, cx, bottom, maxW, maxH, { shadow = true } = {}) {
  const k = Math.min(maxW / bake.gw, maxH / bake.gh);
  const pw = bake.gw * k, ph = bake.gh * k;
  const x = cx - pw / 2, y = bottom - ph;
  g.save();
  if (shadow) { g.shadowColor = 'rgba(30,12,20,0.45)'; g.shadowBlur = Math.max(2, pw * 0.04); g.shadowOffsetY = Math.max(1, pw * 0.02); }
  const m = bake.W * k;
  g.imageSmoothingEnabled = true;
  g.drawImage(bake.canvas, bake.x0 - bake.W * 1.2, bake.y0 - bake.H * 1.4, bake.gw + bake.W * 2.4, bake.gh + bake.H * 2.4, x - m * 1.2, y - bake.H * k * 1.4, pw + m * 2.4, ph + bake.H * k * 2.4);
  g.restore();
  return { x, y, w: pw, h: ph };
}
function fitImg(g, im, x, y, w, h) { if (!im) return null; const k = Math.min(w / im.width, h / im.height); const dw = im.width * k, dh = im.height * k; const r = { x: x + (w - dw) / 2, y: y + (h - dh), w: dw, h: dh }; g.drawImage(im, r.x, r.y, dw, dh); return r; }
function woodWall(g, w, h, dark = 0.35) {
  if (IMG.wood) { const p = g.createPattern(IMG.wood, 'repeat'); const s = w / 300; g.save(); g.scale(s, s); g.fillStyle = p; g.fillRect(0, 0, w / s, h / s); g.restore(); } else { g.fillStyle = '#7a5434'; g.fillRect(0, 0, w, h); }
  g.fillStyle = `rgba(40,18,26,${dark})`; g.fillRect(0, 0, w, h);
  const v = g.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.5, h * 0.5, w * 0.85); v.addColorStop(0, 'rgba(255,214,150,0.25)'); v.addColorStop(1, 'rgba(20,8,20,0.35)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
}
function tabletop(g, w, h, yTop) {
  // a wall above, a wooden table top in perspective below (tex-wood, code shadow)
  const wall = g.createLinearGradient(0, 0, 0, yTop); wall.addColorStop(0, '#5a3c52'); wall.addColorStop(1, '#7a5262');
  g.fillStyle = wall; g.fillRect(0, 0, w, yTop);
  g.save(); g.beginPath(); g.rect(0, yTop, w, h - yTop); g.clip();
  if (IMG.wood) { const p = g.createPattern(IMG.wood, 'repeat'); const s = w / 260; g.translate(0, yTop); g.scale(s, s * 0.55); g.fillStyle = p; g.fillRect(0, 0, w / s, (h - yTop) / (s * 0.55)); } else { g.fillStyle = '#9a6a3c'; g.fillRect(0, yTop, w, h); }
  g.restore();
  const sh = g.createLinearGradient(0, yTop, 0, h); sh.addColorStop(0, 'rgba(30,10,20,0.35)'); sh.addColorStop(0.25, 'rgba(30,10,20,0.05)'); sh.addColorStop(1, 'rgba(30,10,20,0.25)');
  g.fillStyle = sh; g.fillRect(0, yTop, w, h - yTop);
  g.fillStyle = 'rgba(255,236,200,0.25)'; g.fillRect(0, yTop, w, Math.max(1, h * 0.006));
  const lamp = g.createRadialGradient(w * 0.25, h * 0.1, 0, w * 0.4, h * 0.4, w); lamp.addColorStop(0, 'rgba(255,220,150,0.22)'); lamp.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = lamp; g.fillRect(0, 0, w, h);
}
const plushCache = new WeakMap();
function plushBake(bake, pattern, chart, slots) {
  let p = plushCache.get(bake);
  if (p) return p;
  const eyes = toyEyes(pattern, chart, slots).map((e) => ({ x: bake.x0 + e.c * bake.W + bake.W / 2, y: bake.y0 + (bake.rows - e.r) * bake.H + bake.H * 0.55, color: e.color }));
  const r = plushify(bake.canvas, { cell: bake.W, eyes });
  p = { ...bake, canvas: r.canvas, x0: bake.x0 + r.pad, y0: bake.y0 + r.pad };
  plushCache.set(bake, p);
  return p;
}
const silCache = new WeakMap();
function silhouetteOf(bake) {
  let s = silCache.get(bake);
  if (s) return s;
  const c = document.createElement('canvas'); c.width = bake.canvas.width; c.height = bake.canvas.height;
  const q = c.getContext('2d');
  q.drawImage(bake.canvas, 0, 0);
  q.globalCompositeOperation = 'source-in'; q.fillStyle = 'rgb(30,10,24)'; q.fillRect(0, 0, c.width, c.height);
  s = { ...bake, canvas: c };
  silCache.set(bake, s);
  return s;
}
function flatOnTable(g, bake, cx, cy, maxW, tilt = 0.5) {
  const aspect = bake.gh / bake.gw;
  let pw = maxW, ph = pw * aspect * tilt;
  const top = pw * 0.82; // far edge narrower (perspective)
  const q = [[cx - top / 2, cy - ph / 2], [cx + top / 2, cy - ph / 2], [cx + pw / 2, cy + ph / 2], [cx - pw / 2, cy + ph / 2]];
  // its shadow is its own silhouette (stitches still to come cast next to none)
  const sil = silhouetteOf(bake);
  const off = Math.max(1.5, pw * 0.012);
  g.save(); g.globalAlpha = 0.32;
  for (const [dx, dy] of [[off, off * 1.6], [off * 2, off * 3]]) drawQuad(g, sil, q.map(([x, y]) => [x + dx, y + dy]));
  g.restore();
  drawQuad(g, bake, q);
  return { pw, ph };
}

function scene(g, info) {
  const { w, h, large, pattern } = info;
  const kind = sceneOf(pattern);
  const cols = info.chart.width;
  // the real stitch renderer at a cell size where motifs (garter ridges, eyelets, lace) survive, drawn
  // down into the card; the piece is the star, the prop is context
  const W = clamp(Math.round(Math.max(8, (w * 0.8) / cols)), 6, 16);
  const bake = large || w >= 200 ? liveBake(info, W) : flatBake(info);
  if (kind === 'coaster') {
    tabletop(g, w, h, 0);
    // the mug waits at the back; the coaster, big, in front
    flatOnTable(g, bake, w * 0.47, h * 0.62, w * 0.8, 0.62);
    // the mug waits at the back (at the finish it drops onto the new coaster)
    const f = info.finish;
    if (IMG.mug && f != null) {
      const e = f < 0.55 ? 0 : Math.min(1, (f - 0.55) / 0.45), d = 1 - Math.pow(1 - e, 3);
      g.save(); g.globalAlpha = e > 0 ? 1 : 0; fitImg(g, IMG.mug, w * 0.29, h * 0.12 - (1 - d) * h * 0.5, w * 0.36, h * 0.5); g.restore();
    } else if (IMG.mug) fitImg(g, IMG.mug, w * 0.56, h * 0.02, w * 0.4, h * 0.42);
  } else if (kind === 'cozy') {
    tabletop(g, w, h, h * 0.62);
    if (IMG.mug) {
      const r = fitImg(g, IMG.mug, w * 0.12, h * 0.1, w * 0.76, h * 0.78);
      // wrap round the mug body (906×845 picture: body x 0..0.71, rim to y 0.1), handle redrawn over
      const bx0 = r.x + r.w * 0.005, bx1 = r.x + r.w * 0.705, by0 = r.y + r.h * 0.22, by1 = r.y + r.h * 0.86;
      const bw = bx1 - bx0, bh = by1 - by0, cx = (bx0 + bx1) / 2;
      const F = (u, v) => { const t = 2 * u - 1; return [cx + (bw / 2) * Math.sin(t * 1.25) / Math.sin(1.25) * 1.02, by1 - v * bh + bh * 0.06 * (1 - t * t) * (1 - v)]; };
      drawParts(g, bake, [{ F, u0: -0.3 / cols, u1: 1 + 0.3 / cols, v0: -1 / bake.rows, v1: 1 + 0.8 / bake.rows, nu: 10, nv: Math.min(bake.rows + 2, 24), shade: 'wrapU' }], 1, 0, 0);
      g.save(); g.beginPath(); g.rect(r.x + r.w * 0.715, r.y, r.w * 0.3, r.h); g.clip(); g.drawImage(IMG.mug, r.x, r.y, r.w, r.h); g.restore();
    }
  } else if (kind === 'bookmark') {
    tabletop(g, w, h, h * 0.3);
    const r = IMG.book ? fitImg(g, IMG.book, w * 0.04, h * 0.25, w * 0.92, h * 0.5) : { x: w * 0.04, y: h * 0.38, w: w * 0.92, h: h * 0.37 };
    // lying on the right-hand page, hanging off its foot
    const bw = r.w * 0.2, top = r.y + r.h * 0.08, bot = r.y + r.h * 1.15;
    const ar = bake.gh / bake.gw;
    const len = Math.min(bot - top, bw * ar * 0.75);
    const cx = r.x + r.w * 0.66;
    drawQuad(g, bake, [[cx - bw * 0.42, bot - len], [cx + bw * 0.42, bot - len], [cx + bw * 0.55, bot], [cx - bw * 0.55, bot]]);
  } else if (kind === 'pillow' || kind === 'blanket') {
    if (IMG.chair) { const k = Math.max(w / IMG.chair.width, h / IMG.chair.height); g.drawImage(IMG.chair, (w - IMG.chair.width * k) / 2, (h - IMG.chair.height * k) / 2, IMG.chair.width * k, IMG.chair.height * k); } else { g.fillStyle = '#c9b59a'; g.fillRect(0, 0, w, h); }
    if (kind === 'pillow') {
      g.save(); g.fillStyle = 'rgba(40,20,20,0.3)'; g.beginPath(); g.ellipse(w * 0.47, h * 0.74, w * 0.22, h * 0.04, 0, 0, Math.PI * 2); g.fill(); g.restore();
      const cx = w * 0.46, top = h * 0.36, bot = h * 0.75, pw = w * 0.38;
      const F = (u, v) => { const t = 2 * u - 1; return [cx + (pw / 2) * t * (1 - 0.06 * Math.sin(v * Math.PI)), bot - v * (bot - top) + Math.sin(u * Math.PI) * h * 0.018 * (v - 0.5)]; };
      drawParts(g, bake, [{ F, u0: -0.3 / cols, u1: 1 + 0.3 / cols, v0: -1 / bake.rows, v1: 1 + 0.8 / bake.rows, nu: 8, nv: Math.min(bake.rows + 2, 24), shade: 'barrel' }], 1, 0, 0);
    } else {
      // over the seat: up the back cushion, across the seat, over the front edge
      const x0 = w * 0.17, x1 = w * 0.71;
      const F = (u, v) => {
        const s = 1 - v; // 0 at the back (bind-off edge), 1 at the front hem
        const y = s < 0.4 ? h * 0.4 + (s / 0.4) * h * 0.27 : s < 0.62 ? h * 0.67 + ((s - 0.4) / 0.22) * h * 0.08 : h * 0.75 + ((s - 0.62) / 0.38) * h * 0.2;
        const narrow = s < 0.4 ? 0.86 + 0.14 * (s / 0.4) : 1;
        const xm = (x0 + x1) / 2, hw = ((x1 - x0) / 2) * narrow;
        return [xm + (2 * u - 1) * hw, y];
      };
      drawParts(g, bake, [{ F, u0: -0.3 / cols, u1: 1 + 0.3 / cols, v0: -1 / bake.rows, v1: 1 + 0.8 / bake.rows, nu: 6, nv: Math.min(bake.rows + 2, 30), shade: 'drape' }], 1, 0, 0);
    }
  } else if (kind === 'teapot') {
    tabletop(g, w, h, h * 0.66);
    if (IMG.teapot) {
      const r = fitImg(g, IMG.teapot, w * 0.06, h * 0.12, w * 0.88, h * 0.74);
      const cx = r.x + r.w * 0.475, bot = r.y + r.h * 0.9, top = r.y + r.h * 0.02, cw = r.w * 0.5;
      const F = (u, v) => { const t = 2 * u - 1; const prof = 1 - 0.32 * Math.pow(Math.max(0, v), 2.2); return [cx + (cw / 2) * (Math.sin(t * 1.05) / Math.sin(1.05)) * prof, bot - (bot - top) * (0.7 * v + 0.3 * Math.sin((v * Math.PI) / 2)) + cw * 0.05 * (1 - t * t) * (1 - v)]; };
      drawParts(g, bake, [{ F, u0: -0.3 / cols, u1: 1 + 0.3 / cols, v0: -1 / bake.rows, v1: 1 + 0.8 / bake.rows, nu: 10, nv: Math.min(bake.rows + 2, 26), shade: 'dome' }], 1, 0, 0);
      const pom = sceneImage('fin-pompom');
      if (pom && info.progress >= 1) { const s = cw * 0.22; g.drawImage(pom, cx - s / 2, top - s * 0.7, s, s); }
    }
  } else if (kind === 'stocking') {
    woodWall(g, w, h, 0.45);
    // the mantel shelf and a brass hook, drawn in code
    const my = h * 0.16;
    const sh = g.createLinearGradient(0, my - h * 0.07, 0, my + h * 0.03); sh.addColorStop(0, '#8a5a34'); sh.addColorStop(0.5, '#a8743f'); sh.addColorStop(1, '#4a2a16');
    g.fillStyle = sh; g.fillRect(0, my - h * 0.07, w, h * 0.1);
    g.fillStyle = 'rgba(20,8,10,0.35)'; g.fillRect(0, my + h * 0.03, w, h * 0.025);
    const hx = w * 0.56;
    g.strokeStyle = '#c99a3a'; g.lineWidth = Math.max(2, w * 0.02); g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx, my); g.lineTo(hx, my + h * 0.06); g.arc(hx - w * 0.025, my + h * 0.06, w * 0.025, 0, Math.PI * 0.9); g.stroke();
    const ar = drawUpright(g, bake, w * 0.48, h * 0.94, w * 0.62, h * 0.7);
    g.strokeStyle = '#efe4cf'; g.lineWidth = Math.max(1, w * 0.008);
    g.beginPath(); g.moveTo(ar.x + ar.w * 0.92, ar.y + ar.h * 0.03); g.quadraticCurveTo(hx - w * 0.01, my + h * 0.02, hx - w * 0.04, my + h * 0.075); g.stroke();
  } else if (kind === 'ornament') {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2c2440'); bg.addColorStop(1, '#4a3048'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { const x = ((i * 97) % 100) / 100 * w, y = ((i * 53) % 100) / 100 * h; const gr = g.createRadialGradient(x, y, 0, x, y, w * 0.06); gr.addColorStop(0, 'rgba(255,214,140,0.35)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(x - w * 0.06, y - w * 0.06, w * 0.12, w * 0.12); }
    firBranch(g, w, h);
    const tx = w * 0.5;
    const ar = drawUpright(g, bake, tx, h * 0.9, w * 0.56, h * 0.56);
    g.strokeStyle = '#e6c46a'; g.lineWidth = Math.max(1, w * 0.008);
    g.beginPath(); g.moveTo(tx, ar.y); g.lineTo(tx, h * 0.2); g.stroke();
  } else if (kind === 'peg') {
    woodWall(g, w, h, 0.3);
    const ar = drawUpright(g, bake, w * 0.5, h * 0.92, w * 0.66, h * 0.66);
    g.strokeStyle = '#e8d6b0'; g.lineWidth = Math.max(1, w * 0.008);
    g.beginPath(); g.moveTo(ar.x + ar.w * 0.3, ar.y + 2); g.lineTo(w * 0.5, h * 0.16); g.lineTo(ar.x + ar.w * 0.7, ar.y + 2); g.stroke();
    if (IMG.peg) { const s = w * 0.17; g.drawImage(IMG.peg, w * 0.5 - s / 2, h * 0.16 - s / 2, s, s); }
  } else if (kind === 'toy') {
    woodWall(g, w, h, 0.4);
    const sy = h * 0.8;
    if (info.progress >= 1) {
      // finished: seamed, stuffed and sitting on the shelf, a plush (at the finish it puffs up)
      const pb = plushBake(bake, pattern, info.chart, info.piece.slots);
      const f = info.finish != null ? info.finish : 1;
      const puff = f < 1 ? 1 + 0.14 * Math.sin(Math.min(1, f * 1.4) * Math.PI) : 1;
      g.save();
      if (f < 1) { g.globalAlpha = Math.min(1, f * 2.2); g.translate(w * 0.5, sy); g.scale(puff, 2 - puff); g.translate(-w * 0.5, -sy); }
      const r = drawUpright(g, pb, w * 0.5, sy + h * 0.02, w * 0.66, h * 0.64);
      g.restore();
      g.save(); g.fillStyle = 'rgba(30,12,20,0.3)'; g.beginPath(); g.ellipse(w * 0.5, sy + h * 0.025, r.w * 0.42, h * 0.018, 0, 0, Math.PI * 2); g.fill(); g.restore();
    } else drawUpright(g, bake, w * 0.5, sy + h * 0.02, w * 0.62, h * 0.62);
    if (IMG.shelf) g.drawImage(IMG.shelf, -w * 0.06, sy - h * 0.02, w * 1.12, h * 0.24);
    else { g.fillStyle = '#8a5a34'; g.fillRect(0, sy, w, h * 0.06); }
  } else {
    // a dishcloth, washcloth or doily: laid flat on the table, filling the card
    tabletop(g, w, h, 0);
    const ar = bake.gh / bake.gw;
    // at the finish it floats down and settles flat on the table
    const f = info.finish != null ? 1 - Math.pow(1 - info.finish, 3) : 1;
    flatOnTable(g, bake, w * 0.5, h * 0.52 - (1 - f) * h * 0.05, Math.min(w * 0.86, (h * 0.84) / (ar * 0.8)) * (1.12 - 0.12 * f), 0.8 + 0.2 * (1 - f));
  }
}
function firBranch(g, w, h) {
  g.save();
  g.strokeStyle = '#5a3a22'; g.lineWidth = Math.max(2, w * 0.025); g.lineCap = 'round';
  const pts = (t) => [w * (-0.05 + 1.1 * t), h * (0.12 + 0.1 * t + Math.sin(t * 3) * 0.02)];
  g.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = pts(i / 20); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  for (let i = 0; i < 70; i++) {
    const t = i / 70; const [x, y] = pts(t);
    for (const s of [-1, 1]) {
      const a = s * (0.9 + ((i * 37) % 10) / 25) + 0.3;
      const L = w * (0.07 + ((i * 13) % 7) / 200);
      g.strokeStyle = i % 3 ? '#2f6a3c' : '#3f8a4c'; g.lineWidth = Math.max(1, w * 0.008);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L); g.stroke();
    }
  }
  g.restore();
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
