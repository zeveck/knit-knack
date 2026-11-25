// finished.js — the celebration: the bind-off flourish, a puff of steam, yarn-fluff confetti, the
// finishing touch, Purl waking up to cheer (purl-cheer frames, mirrored so the paw reaches the piece),
// then "Display it", "Put it on a doll" (wearables), "Not now".
import { el, go, registerScreen, currentScreen, fmt, nb } from './ui.js';
import { onTap, setKeyHandler } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { pieceRender, cellFor, chartOf } from './render.js';
import { drawObject, objectReady } from './cardRenderer.js';
import { isToy } from './plush.js';
import { drawNook, drawStack, image, catHit } from './scene.js';
import { pet } from './pet.js';
import { yarnName, yarnKey } from './yarn.js';

let root, canvas, g, ui, t0 = 0, gal = null, pat = null, art = null, confetti = [], steam = [], cheerDone = false;
let btns;
// the swatch turning into the thing: starts at T_OBJ ms, takes OBJ_MS
const T_OBJ = 1350, OBJ_MS = 900;
let obj = null; // {canvas, done, key}

function build() {
  root = document.querySelector('[data-screen="finished"]');
  canvas = el('canvas', { class: 'fx' });
  ui = el('div', { class: 'fin-ui' });
  root.append(canvas, el('div', { class: 'fin-top', text: 'Bound off and blocked!' }), ui);
  g = canvas.getContext('2d');
  // a press that comes hard on the heels of another (thumbs still drumming from the last stitch)
  // doesn't pick: only a tap after a short pause does
  root.addEventListener('pointerdown', (e) => { const now = performance.now(); root._calm = now - (root._lastDown || -1e9) > 700; root._lastDown = now; }, true);
  // a tap on the cat in her basket pets her
  root.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || (window.gameReport && window.gameReport.isOpen())) return;
    if (e.target.closest && e.target.closest('button, a, input')) return;
    if (catHit(canvas, e.clientX, e.clientY)) { e.preventDefault(); pet(e.clientX, e.clientY); }
  });
}
const calm = () => root._calm !== false;

function touchOf(p) {
  if (p.touch) { const k = String(p.touch.kind || p.touch).toLowerCase().replace(/[^a-z]/g, ''); if (['pompom', 'tassel', 'eyes', 'buttons'].includes(k)) return k; if (k === 'buttoneyes') return 'eyes'; if (k === 'button') return 'buttons'; }
  const f = (p.finishing || '').toLowerCase();
  if (f.includes('pom-pom') || f.includes('pompom')) return 'pompom';
  if (f.includes('tassel')) return 'tassel';
  if (f.includes('button eyes')) return 'eyes';
  if (f.includes('button')) return 'buttons';
  return null;
}

function enter(id) {
  if (!root) build();
  gal = S.galleryById(id);
  pat = gal && S.patternById(gal.pattern);
  if (!gal || !pat) { go('book'); return; }
  toasts.hold(true);
  t0 = performance.now(); cheerDone = false;
  const used = [];
  const seen = new Set();
  for (const y of gal.yarns) { const k = yarnKey(y); if (!seen.has(k)) { seen.add(k); used.push(y); } }
  const names = used.slice(0, 4).map((y) => nb(yarnName(y))).join(', ') + (used.length > 4 ? ` and ${used.length - 4} more` : '');
  ui.replaceChildren(
    el('h2', { text: pat.name }),
    el('div', { class: 'facts', text: `${fmt(gal.yarns.length)} stitches · ${used.length} yarn${used.length > 1 ? 's' : ''}: ${names}` }),
  );
  btns = el('div', { class: 'btns' });
  const display = el('button', { class: 'btn primary big', text: 'Display it' });
  onTap(display, (e) => { if (e.detail && !calm()) return; audio.play('ui'); go('gallery', { display: gal.id }); });
  btns.append(display);
  if (isToy(pat)) {
    const sit = el('button', { class: 'btn big sage', text: 'Sit it on the shelf' });
    onTap(sit, (e) => { if (e.detail && !calm()) return; audio.play('dress'); S.toShelf(gal.id); go('dolls', { shelf: gal.id }); });
    btns.append(sit);
  }
  if (pat.wear) {
    const doll = el('button', { class: 'btn big sage', text: 'Put it on a doll' });
    onTap(doll, (e) => { if (e.detail && !calm()) return; audio.play('ui'); S.hang(gal.id); go('dolls', gal.id); });
    btns.append(doll);
  }
  const later = el('button', { class: 'btn ghost', text: 'Not now' });
  onTap(later, (e) => { if (e.detail && !calm()) return; audio.play('card'); S.toBasket(gal.id); go('book'); });
  btns.append(later);
  ui.append(btns);
  setTimeout(() => btns.classList.add('show'), 1500);
  obj = { canvas: document.createElement('canvas'), done: false, key: '' };
  // art: the piece as knit, big
  const w = innerWidth, h = innerHeight;
  art = pieceRender(gal, pat, cellFor(pat, w * 0.8, h * 0.5, 4, 26));
  // confetti in the piece's own yarn colors
  confetti = [];
  for (let i = 0; i < 70; i++) {
    const y = used[i % used.length];
    confetti.push({ x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.36, vx: (Math.random() - 0.5) * 9, vy: -4 - Math.random() * 8, r: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, color: y.color, delay: 380 + Math.random() * 250 });
  }
  steam = [];
  for (let i = 0; i < 14; i++) steam.push({ x: (Math.random() - 0.5) * 0.8, delay: 250 + i * 50, s: 0.6 + Math.random() * 0.6 });
  audio.play('finish');
  setTimeout(() => audio.play('steam'), 260);
  setTimeout(() => { audio.play('mew'); if (S.get().equipped.purl.includes('bell')) audio.play('bell'); }, 900);
  setTimeout(() => audio.play('purr'), 1700);
  // the tips, once each: the first finish explains Display it; the first wearable introduces Pip
  const tips = [];
  if (!S.get().tips.includes('display')) { S.get().tips.push('display'); tips.push('"Display it" hangs it on your gallery wall.'); }
  if (pat.wear && !S.get().tips.includes('doll')) { S.get().tips.push('doll'); tips.push('Put it on a doll to meet Pip!'); }
  if (isToy(pat) && !S.get().tips.includes('toyshelf')) { S.get().tips.push('toyshelf'); tips.push('Toys can sit on the Doll Shelf, beside the dolls.'); }
  if (tips.length) { S.saveSoon(); setTimeout(() => { if (currentScreen() === 'finished' && gal && gal.id === id) ui.append(el('div', { class: 'facts tipline', text: tips.join(' ') })); }, 1600); }
  // knit keys still drumming from the last stitch never pick for you: a key acts only after a pause
  let lastKey = performance.now();
  setKeyHandler((e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'k' || e.key === 'K') {
      const now = performance.now(), quiet = now - lastKey > 700; lastKey = now;
      if (quiet && !e.repeat && e.key === 'Enter' && btns.classList.contains('show')) display.click();
      return true;
    }
    if (e.key === 'Escape') { later.click(); return true; }
    return false;
  });
  audio.music('gallery');
  audio.ambience(false);
}

export function frame(t) {
  if (currentScreen() !== 'finished' || !g) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = innerWidth, h = innerHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const e = S.get().equipped;
  drawNook(g, w, h, { decor: e.decor, t });
  g.fillStyle = 'rgba(30,16,44,0.55)'; g.fillRect(0, 0, w, h);
  const el_ = t - t0;
  // the piece: pops in after the bind-off (scale), slightly bounces, then settles flat
  const dprArt = Math.min(3, window.devicePixelRatio || 1);
  const uiH = ui.offsetHeight || 180;
  // a short screen (a phone held sideways): a smaller basket on the floor in the corner, the piece above the words
  const short = h < 500;
  // a phone held upright: a smaller basket, and the piece's card ends above it (never over it)
  const narrow = !short && w < 600;
  const bw = short ? Math.min(w * 0.16, h * 0.32) : narrow ? Math.min(w * 0.22, 120) : Math.min(w * 0.28, 200), bh = bw * (396 / 468);
  const top = short ? 56 : 64, bottom = short ? h - uiH - 8 : narrow ? h - uiH - bh * 0.95 : h - uiH - bh * 0.55;
  if (art && art.width) {
    const maxW = w * 0.84, maxH = Math.max(80, bottom - top);
    const k0 = Math.min(maxW / (art.width / dprArt), maxH / (art.height / dprArt), 1.6);
    const p = Math.min(1, el_ / 500);
    const sc = k0 * (p < 1 ? 0.6 + 0.48 * Math.sin(p * Math.PI * 0.75) : 1 + 0.02 * Math.sin(el_ / 900));
    const aw = (art.width / dprArt) * sc, ah = (art.height / dprArt) * sc;
    const cx = w / 2, cy = top + maxH / 2;
    // warm glow behind
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(aw, ah) * 0.8);
    gl.addColorStop(0, 'rgba(255,214,140,0.35)'); gl.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = gl; g.fillRect(0, 0, w, h);
    // the swatch turns into the thing: its scene card grows out of it (the preview card's prop scenes)
    const q = clamp01((el_ - T_OBJ) / OBJ_MS);
    const side = Math.min(maxW * 0.94, maxH * 0.94, 560);
    const ready = objectReady();
    const qa = ready ? q : 0;
    if (qa < 1) {
      g.save(); g.globalAlpha = 1 - ease(clamp01(qa * 1.6));
      const s2 = 1 - 0.15 * ease(qa);
      g.drawImage(art, cx - (aw * s2) / 2, cy - (ah * s2) / 2, aw * s2, ah * s2);
      // finishing touch (on the flat piece; the scenes add their own)
      const touch = touchOf(pat);
      const ta = Math.min(1, Math.max(0, (el_ - 700) / 300));
      if (touch && ta > 0) {
        g.globalAlpha *= ta;
        const col = gal.slots && gal.slots.A ? gal.slots.A.color : '#9e2a3a';
        if (touch === 'pompom') tinted(g, 'fin-pompom', col, cx - aw * 0.12, cy - ah / 2 - aw * 0.2, aw * 0.24);
        else if (touch === 'tassel') tinted(g, 'fin-tassel', col, cx - aw * 0.25, cy - ah / 2 - aw * 0.45, aw * 0.5);
        else if (touch === 'buttons') { const s = aw * 0.08; for (let i = 0; i < 4; i++) tinted(g, 'fin-button-4hole', '#d9a441', cx - s / 2, cy - ah * 0.3 + i * ah * 0.18, s); }
      }
      g.restore();
    }
    if (qa > 0) {
      const e = ease(qa);
      // from the piece's own box to the card's
      const cw0 = Math.max(aw, ah) * 0.9, cs = cw0 + (side - cw0) * e;
      paintObject(Math.round(side * dprArt), qa);
      g.save();
      g.globalAlpha = clamp01(qa * 2.5);
      g.shadowColor = 'rgba(20,8,20,0.5)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
      const r = 14 + 4 * e;
      g.beginPath(); roundRect(g, cx - cs / 2, cy - cs / 2, cs, cs, r); g.fillStyle = '#3a2438'; g.fill();
      g.shadowColor = 'transparent';
      g.clip();
      g.drawImage(obj.canvas, cx - cs / 2, cy - cs / 2, cs, cs);
      g.restore();
    }
    // steam (blocking): soft puffs rising
    for (const s of steam) {
      const q = (el_ - s.delay) / 1600;
      if (q <= 0 || q >= 1) continue;
      const x = cx + s.x * aw + Math.sin(q * 6 + s.x * 10) * 12, y = cy + ah * 0.2 - q * ah * 0.9;
      const r = (20 + q * 50) * s.s;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(255,250,245,${0.45 * (1 - q)})`); gr.addColorStop(1, 'rgba(255,250,245,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  }
  // confetti: little curls of yarn fluff
  for (const c of confetti) {
    if (el_ < c.delay) continue;
    c.vy += 0.16; c.vx *= 0.99; c.x += c.vx; c.y += c.vy; c.rot += c.vr;
    if (c.y > h + 20) continue;
    g.save(); g.translate(c.x, c.y); g.rotate(c.rot);
    g.strokeStyle = c.color; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, c.r, 0.3, Math.PI * 1.6); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, c.r, 0.6, Math.PI * 1.1); g.stroke();
    g.restore();
  }
  // Purl in her basket, bottom corner, cheering (frames 0..3 at 8 fps once), then settling asleep
  const b = short ? { x: 10, y: h - bh - 6, w: bw, h: bh } : { x: w < 600 ? 8 : w * 0.06, y: h - uiH - bh * 0.92, w: bw, h: bh };
  const fi = Math.floor((el_ - 800) / 125);
  let frameNo = 'sleep';
  if (fi >= 0 && fi < 8) frameNo = [0, 1, 2, 1, 2, 3, 3, 3][fi];
  drawStack(g, b, { t, purl: frameNo, mirror: true, things: e.purl, holder: e.holder, yarn: gal.yarns[gal.yarns.length - 1], dpr });
  if (fi >= 8 && !cheerDone) { cheerDone = true; }
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
function roundRect(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// the object scene (device px square), redrawn while it plays, then kept
function paintObject(px, q) {
  const c = obj.canvas;
  const key = `${px}|${q >= 1 ? 'done' : ''}`;
  if (obj.key === key && q >= 1) return;
  obj.key = key;
  if (c.width !== px) { c.width = px; c.height = px; }
  const cg = c.getContext('2d');
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, px, px);
  const piece = { id: gal.id, yarns: gal.yarns, slots: gal.slots || {}, castOn: gal.castOn, updated: gal.finished };
  try { drawObject(cg, { pattern: pat, chart: chartOf(pat), piece, w: px, h: px, dpr: Math.min(3, window.devicePixelRatio || 1), flat: null, finish: q, state: S.get() }); } catch (e) { console.warn('finish object', e); }
}
const tintCache = new Map();
function tinted(g, key, color, x, y, size) {
  const im = image(key); if (!im) return;
  const k = `${key}|${color}|${Math.round(size)}`;
  let c = tintCache.get(k);
  if (!c) {
    c = document.createElement('canvas'); const px = Math.max(8, Math.round(size * 2)); c.width = c.height = px;
    const q = c.getContext('2d'); q.fillStyle = color; q.fillRect(0, 0, px, px); q.globalCompositeOperation = 'multiply'; q.drawImage(im, 0, 0, px, px); q.globalCompositeOperation = 'destination-in'; q.drawImage(im, 0, 0, px, px);
    tintCache.set(k, c);
  }
  g.drawImage(c, x, y, size, size);
}

registerScreen('finished', {
  enter,
  leave() {
    setKeyHandler(null);
    // a piece left undecided waits in the Basket
    if (gal && gal.pending) { gal.pending = false; S.saveSoon(); }
    toasts.hold(false);
  },
});
