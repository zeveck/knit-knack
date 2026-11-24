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
  const M = Math.round(W * 1.2);
  let res;
  try { res = renderSwatch(chart, { yarnAt: (i) => piece.yarns[i] || ghost, cellPx: W, castOnYarn: piece.castOn || ghost, background: null, shadow: false, margin: M, bindOff: n >= total }); } catch { return flatBake(info); }
  const c = res.canvas, H = res.H, x0 = M, y0 = M + 0.4 * H, gw = chart.width * W, gh = chart.height * H;
  const out = document.createElement('canvas'); out.width = c.width; out.height = c.height;
  const g = out.getContext('2d');
  // ghosts under, real stitches over, with stitches still to come erased from the real layer
  g.imageSmoothingEnabled = false;
  g.drawImage(info.flat, x0, y0, gw, gh);
  if (n < total) {
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
  // frame: a stitched border
  g.save();
  g.strokeStyle = 'rgba(246,236,217,0.55)'; g.lineWidth = Math.max(1, dpr * (large ? 1.6 : 1)); g.setLineDash([4 * dpr, 3 * dpr]);
  const pad = Math.round(w * 0.035);
  rrect(g, pad, pad, w - pad * 2, h - pad * 2, rr * 0.7); g.stroke();
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
  const W = clamp(Math.round(k * 7), 4, 14);
  const bake = large || w >= 380 ? liveBake(info, W) : flatBake(info);
  const item = { preview: { bake, chart: info.chart, pattern, slots: info.piece.slots } };
  const c = composeDoll(doll, { [slot]: item }, k, { silhouette: !hasPip, maxStrips: large ? 999 : 40 });
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
function flatOnTable(g, bake, cx, cy, maxW, tilt = 0.5) {
  const aspect = bake.gh / bake.gw;
  let pw = maxW, ph = pw * aspect * tilt;
  const top = pw * 0.82; // far edge narrower (perspective)
  const q = [[cx - top / 2, cy - ph / 2], [cx + top / 2, cy - ph / 2], [cx + pw / 2, cy + ph / 2], [cx - pw / 2, cy + ph / 2]];
  g.save(); g.fillStyle = 'rgba(30,10,20,0.3)'; g.beginPath(); g.ellipse(cx + pw * 0.03, cy + ph * 0.08, pw * 0.52, ph * 0.56, 0, 0, Math.PI * 2); g.fill(); g.restore();
  drawQuad(g, bake, q);
  return { pw, ph };
}

function scene(g, info) {
  const { w, h, large, pattern } = info;
  const kind = sceneOf(pattern);
  const cols = info.chart.width;
  const W = clamp(Math.round((w * 0.6) / cols), 4, 14);
  const bake = large || w >= 380 ? liveBake(info, W) : flatBake(info);
  if (kind === 'coaster') {
    tabletop(g, w, h, h * 0.42);
    flatOnTable(g, bake, w * 0.5, h * 0.74, w * 0.66, 0.42);
    if (IMG.mug) fitImg(g, IMG.mug, w * 0.3, h * 0.14, w * 0.36, h * 0.6);
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
    drawUpright(g, bake, w * 0.5, sy + h * 0.02, w * 0.62, h * 0.62);
    if (IMG.shelf) g.drawImage(IMG.shelf, -w * 0.06, sy - h * 0.02, w * 1.12, h * 0.24);
    else { g.fillStyle = '#8a5a34'; g.fillRect(0, sy, w, h * 0.06); }
  } else {
    tabletop(g, w, h, h * 0.3);
    flatOnTable(g, bake, w * 0.5, h * 0.66, w * 0.74, 0.55);
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
