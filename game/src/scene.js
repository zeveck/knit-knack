// scene.js — the nook pictures and the basket stack (basket back, cushion, Purl, basket front, and the
// yarn holder with the tinted ball beside it), shared by the title, the knitting screen and Finished.
import { drawBall } from './yarn.js';

const IMG = {};
const JSON_ = {};
const DECOR = ['fern', 'lights', 'rug', 'frame', 'bookshelf'];
const HOLDERS = ['bowl', 'bag', 'teacup'];

function img(key, src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[key] = im; res(im); };
    im.onerror = () => res(null);
    im.src = src;
  });
}
async function json(key, src) { try { JSON_[key] = await (await fetch(src)).json(); } catch { JSON_[key] = null; } }

// The art every screen needs, loaded during the title.
export function loadScene() {
  return Promise.all([
    img('nook-land', 'assets/bg/nook-land.webp'), img('nook-port', 'assets/bg/nook-port.webp'),
    json('nook-land', 'assets/bg/nook-land.json'), json('nook-port', 'assets/bg/nook-port.json'),
    json('holders', 'assets/items/holders.json'), json('dolls', 'assets/dolls/dolls.json'),
    img('basket-back', 'assets/sprites/basket-back.png'), img('basket-front', 'assets/sprites/basket-front.png'),
    img('purl', 'assets/sprites/purl-cat.png'),
    ...[0, 1, 2, 3].map((i) => img(`cheer${i}`, `assets/sprites/purl-cheer/purl-cheer-${i}.png`)),
    ...DECOR.map((d) => img(`decor-${d}`, `assets/items/decor-${d}.png`)),
    ...HOLDERS.map((h) => img(`holder-${h}`, `assets/items/holder-${h}.png`)),
  ]);
}
// Gallery and finish art, loaded in the background after the title.
export function loadExtras() {
  return Promise.all([
    img('wood', 'assets/tex/tex-wood.webp'), img('paper', 'assets/tex/tex-paper.webp'),
    img('peg', 'assets/items/gallery-peg.png'), img('shelf', 'assets/items/gallery-shelf.png'), img('lamp', 'assets/items/gallery-lamp.png'),
    img('fin-pompom', 'assets/items/fin-pompom.png'), img('fin-tassel', 'assets/items/fin-tassel.png'),
    img('fin-button-4hole', 'assets/items/fin-button-4hole.png'), img('fin-button-2hole', 'assets/items/fin-button-2hole.png'),
  ]);
}
export const image = (k) => IMG[k] || null;
export const data = (k) => JSON_[k] || null;

// ---------------------------------------------------------------- the nook
// cover-fit the nook (portrait picture when the box is taller than wide) and return the fit, so
// fractions of the picture map to the box: {sx, sy, s, ox, oy, orient, json}
export function nookFit(w, h, orient) {
  orient = orient || (h > w * 1.05 ? 'port' : 'land');
  const im = IMG[`nook-${orient}`];
  const iw = im ? im.naturalWidth : orient === 'port' ? 1024 : 1536, ih = im ? im.naturalHeight : orient === 'port' ? 1536 : 1024;
  const s = Math.max(w / iw, h / ih);
  return { s, ox: (w - iw * s) / 2, oy: (h - ih * s) / 2, iw, ih, orient, json: JSON_[`nook-${orient}`] };
}
export function fracBox(fit, b) { return { x: fit.ox + b.x * fit.iw * fit.s, y: fit.oy + b.y * fit.ih * fit.s, w: b.w * fit.iw * fit.s, h: b.h * fit.ih * fit.s }; }

// Draw the nook with the decor that's on. photo: a canvas for the frame's inner box (newest piece).
export function drawNook(g, w, h, { orient, decor = [], photo = null, t = 0 } = {}) {
  const fit = nookFit(w, h, orient);
  const im = IMG[`nook-${fit.orient}`];
  if (im) g.drawImage(im, fit.ox, fit.oy, fit.iw * fit.s, fit.ih * fit.s);
  else { g.fillStyle = '#5b3a5e'; g.fillRect(0, 0, w, h); }
  const J = fit.json;
  if (J && J.decor) {
    // rug first (on the floor), then the rest
    for (const d of ['rug', 'bookshelf', 'fern', 'frame', 'lights']) {
      if (!decor.includes(d) || !J.decor[d] || !IMG[`decor-${d}`]) continue;
      const b = fracBox(fit, J.decor[d]);
      g.drawImage(IMG[`decor-${d}`], b.x, b.y, b.w, b.h);
      if (d === 'frame' && photo) {
        const ix = b.x + b.w * 0.2, iy = b.y + b.h * 0.2, iw = b.w * 0.6, ih = b.h * 0.6;
        const k = Math.min(iw / photo.width, ih / photo.height);
        g.fillStyle = '#efe4cf'; g.fillRect(ix, iy, iw, ih);
        g.drawImage(photo, ix + (iw - photo.width * k) / 2, iy + (ih - photo.height * k) / 2, photo.width * k, photo.height * k);
      }
      if (d === 'lights') {
        // twinkle: soft warm glows along the string
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 10; i++) {
          const a = 0.18 + 0.18 * Math.sin(t / 700 + i * 1.7);
          const x = b.x + (b.w * (i + 0.5)) / 10, y = b.y + b.h * (0.45 + 0.25 * Math.sin(i * 1.3));
          const gr = g.createRadialGradient(x, y, 0, x, y, b.h * 0.9);
          gr.addColorStop(0, `rgba(255,220,140,${a})`); gr.addColorStop(1, 'rgba(255,220,140,0)');
          g.fillStyle = gr; g.fillRect(x - b.h, y - b.h, b.h * 2, b.h * 2);
        }
        g.restore();
      }
    }
  }
  return fit;
}

// snow past the window (title)
export function drawSnow(g, fit, t) {
  const J = fit.json; if (!J || !J.window) return;
  const b = fracBox(fit, J.window);
  g.save(); g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 40; i++) {
    const sp = 0.02 + ((i * 37) % 11) / 400;
    const x = b.x + ((i * 97) % 100) / 100 * b.w + Math.sin(t / 1400 + i) * 6;
    const y = b.y + (((t * sp) / 10 + i * 53) % b.h);
    g.beginPath(); g.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- the basket stack
// Purl sits in the basket at 0.8 scale (in basket-sprite px: x 50, y -80), checked in Pillow.
const PURL = { x: 50, y: -80, s: 0.8 };
const BASKET_BODY = { x: 22, y: 62, w: 468, h: 396 }; // basket-back.png's opaque box
const PURL_NECK = { x: 190, y: 288, angle: 8, scale: 1 };

// stack geometry for a basket body box b (screen px): {s, basket:{x,y}, ground, holder:{x,y,k}, ball:{x,y,size}}
export function stackLayout(b, holderId = 'floor', { holderGap = 0.02, holderScale = 0.85 } = {}) {
  const s = b.w / BASKET_BODY.w;
  const ground = b.y + b.h;
  const H = JSON_.holders;
  const k = s * holderScale * 1.0; // holder sprite (256) -> screen
  let holder = null, ball;
  if (holderId !== 'floor' && H && H[holderId]) {
    const hd = H[holderId];
    const hx = b.x + b.w + b.w * holderGap - 40 * k; // sprites have side padding
    const hy = ground - H.groundY * k;
    holder = { x: hx, y: hy, k, id: holderId, hd };
    ball = { x: hx + hd.ball.cx * k, y: hy + hd.ball.cy * k, size: 256 * hd.ball.scale * k };
  } else {
    const size = 256 * 0.62 * k;
    ball = { x: b.x + b.w + b.w * holderGap + size * 0.5, y: ground - size * 0.47, size, floor: true };
  }
  return { s, ground, holder, ball, b };
}

// Draw the stack. opts: {purl: 'sleep' | 0..3 (cheer frame), mirror, breathe t, things: ['collar','bell','cushion'],
// yarn, ballScale (shrinks as you go), ballRot, holder}
export function drawStack(g, b, opts = {}) {
  const L = stackLayout(b, opts.holder || 'floor');
  const s = L.s;
  const bx = b.x - BASKET_BODY.x * s, by = b.y - BASKET_BODY.y * s, bs = 512 * s;
  // floor shadow
  g.save();
  const sh = g.createRadialGradient(b.x + b.w / 2, L.ground - b.h * 0.02, 0, b.x + b.w / 2, L.ground - b.h * 0.02, b.w * 0.62);
  sh.addColorStop(0, 'rgba(30,12,30,0.45)'); sh.addColorStop(1, 'rgba(30,12,30,0)');
  g.fillStyle = sh; g.beginPath(); g.ellipse(b.x + b.w / 2, L.ground - b.h * 0.03, b.w * 0.62, b.h * 0.16, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  if (IMG['basket-back']) g.drawImage(IMG['basket-back'], bx, by, bs, bs);
  const things = opts.things || [];
  if (things.includes('cushion')) {
    const cx = b.x + b.w / 2, cy = b.y + b.h * 0.33;
    const gr = g.createRadialGradient(cx - b.w * 0.1, cy - b.h * 0.05, 0, cx, cy, b.w * 0.42);
    gr.addColorStop(0, '#c84a5c'); gr.addColorStop(1, '#7c1e2e');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, b.w * 0.4, b.h * 0.14, 0, 0, Math.PI * 2); g.fill();
  }
  // Purl (breathing in code while asleep: 1.5% vertical scale anchored at her base, on a 3 s sine)
  const frame = opts.purl === undefined || opts.purl === 'sleep' ? null : opts.purl;
  const pim = frame === null ? IMG.purl : IMG[`cheer${frame}`] || IMG.purl;
  if (pim && opts.purl !== 'none') {
    const ps = PURL.s * s;
    const px = bx + PURL.x * s, py = by + PURL.y * s, pw = 512 * ps;
    const base = py + 454 * ps;
    const br = frame === null && opts.t != null ? 1 + 0.015 * Math.sin((opts.t / 3000) * Math.PI * 2) : 1;
    g.save();
    g.translate(px + pw / 2, base); g.scale(opts.mirror ? -1 : 1, br); g.translate(-(px + pw / 2), -base);
    if (opts.hop) g.translate(0, -opts.hop * b.h * 0.12);
    g.drawImage(pim, px, py, pw, pw);
    if (things.includes('collar') || things.includes('bell')) drawPurlThings(g, px, py, ps, things);
    g.restore();
  }
  if (IMG['basket-front']) g.drawImage(IMG['basket-front'], bx, by, bs, bs);
  // the holder and the ball
  drawHolderBall(g, L, opts);
  return L;
}

function drawPurlThings(g, px, py, ps, things) {
  const a = PURL_NECK;
  const x = px + a.x * ps, y = py + a.y * ps, r = 62 * ps * a.scale;
  g.save();
  g.translate(x, y); g.rotate((a.angle * Math.PI) / 180);
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

export function drawHolderBall(g, L, opts) {
  const yarn = opts.yarn || { color: '#9e2a3a', type: 'wool' };
  const sc = opts.ballScale ?? 1;
  const size = L.ball.size * sc;
  const bx = L.ball.x, by = L.ball.floor ? L.ground - size * 0.47 : L.ball.y + (L.ball.size - size) * 0.3;
  if (L.holder && IMG[`holder-${L.holder.id}`]) {
    const H = L.holder, k = H.k;
    g.drawImage(IMG[`holder-${H.id}`], H.x, H.y, 256 * k, 256 * k);
    // the ball, clipped to what's above the holder's front rim (the lower arc of its rim ellipse)
    const rim = H.hd.rim;
    const cx = H.x + rim.cx * k, cy = H.y + rim.cy * k, rx = rim.rx * k, ry = rim.ry * k;
    g.save();
    g.beginPath();
    g.moveTo(cx - rx - size, cy); g.lineTo(cx - rx, cy);
    g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true); // the lower (front) arc
    g.lineTo(cx + rx + size, cy); g.lineTo(cx + rx + size, cy - size * 2); g.lineTo(cx - rx - size, cy - size * 2); g.closePath();
    g.clip();
    drawBall(g, yarn, bx, by, size, { t: opts.t || 0, rot: opts.ballRot || 0, dpr: opts.dpr || 1 });
    g.restore();
  } else {
    g.save();
    const gr = g.createRadialGradient(bx, L.ground, 0, bx, L.ground, size * 0.6);
    gr.addColorStop(0, 'rgba(25,10,25,0.5)'); gr.addColorStop(1, 'rgba(25,10,25,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(bx, L.ground - 1, size * 0.6, size * 0.14, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    drawBall(g, yarn, bx, by, size, { t: opts.t || 0, rot: opts.ballRot || 0, dpr: opts.dpr || 1 });
  }
  return { x: bx, y: by, size };
}
