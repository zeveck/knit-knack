// finished.js — the celebration: the bind-off flourish, a puff of steam, yarn-fluff confetti, the
// finishing touch, Purl waking up to cheer (purl-cheer frames, mirrored so the paw reaches the piece),
// then "Display it", "Put it on a doll" (wearables), "Not now".
import { el, go, registerScreen, currentScreen, fmt } from './ui.js';
import { onTap, setKeyHandler } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { pieceRender, cellFor } from './render.js';
import { drawNook, drawStack, image } from './scene.js';
import { yarnName, yarnKey } from './yarn.js';

let root, canvas, g, ui, t0 = 0, gal = null, pat = null, art = null, confetti = [], steam = [], cheerDone = false;
let btns;

function build() {
  root = document.querySelector('[data-screen="finished"]');
  canvas = el('canvas', { class: 'fx' });
  ui = el('div', { class: 'fin-ui' });
  root.append(canvas, el('div', { class: 'fin-top', text: 'Bound off and blocked!' }), ui);
  g = canvas.getContext('2d');
}

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
  const names = used.slice(0, 4).map(yarnName).join(', ') + (used.length > 4 ? ` and ${used.length - 4} more` : '');
  ui.replaceChildren(
    el('h2', { text: pat.name }),
    el('div', { class: 'facts', text: `${fmt(gal.yarns.length)} stitches · ${used.length} yarn${used.length > 1 ? 's' : ''}: ${names}` }),
  );
  btns = el('div', { class: 'btns' });
  const display = el('button', { class: 'btn primary big', text: 'Display it' });
  onTap(display, () => { audio.play('ui'); go('gallery', { display: gal.id }); });
  btns.append(display);
  if (pat.wear) {
    const doll = el('button', { class: 'btn big sage', text: 'Put it on a doll' });
    onTap(doll, () => { audio.play('ui'); S.hang(gal.id); go('dolls', gal.id); });
    btns.append(doll);
  }
  const later = el('button', { class: 'btn ghost', text: 'Not now' });
  onTap(later, () => { audio.play('card'); S.toBasket(gal.id); go('book'); });
  btns.append(later);
  ui.append(btns);
  setTimeout(() => btns.classList.add('show'), 1500);
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
  setTimeout(() => { if (currentScreen() === 'finished' && pat.wear && !S.get().tips.includes('doll')) { S.get().tips.push('doll'); } }, 1600);
  if (!S.get().tips.includes('display')) { S.get().tips.push('display'); S.saveSoon(); setTimeout(() => { if (currentScreen() === 'finished') ui.append(el('div', { class: 'facts', text: pat.wear ? 'Display it hangs it in your gallery. Put it on a doll: meet Pip!' : 'Display it hangs it in your gallery.' })); }, 1600); }
  setKeyHandler((e) => {
    if (e.key === 'Enter' || e.key === ' ') { if (btns.classList.contains('show')) display.click(); return true; }
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
  const bw = Math.min(w * 0.28, 200), bh = bw * (396 / 468);
  const top = 64, bottom = h - uiH - bh * 0.55;
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
    g.drawImage(art, cx - aw / 2, cy - ah / 2, aw, ah);
    // finishing touch
    const touch = touchOf(pat);
    const ta = Math.min(1, Math.max(0, (el_ - 700) / 300));
    if (touch && ta > 0) {
      g.save(); g.globalAlpha = ta;
      const col = gal.slots && gal.slots.A ? gal.slots.A.color : '#9e2a3a';
      if (touch === 'pompom') tinted(g, 'fin-pompom', col, cx - aw * 0.12, cy - ah / 2 - aw * 0.2, aw * 0.24);
      else if (touch === 'tassel') tinted(g, 'fin-tassel', col, cx - aw * 0.25, cy - ah / 2 - aw * 0.45, aw * 0.5);
      else if (touch === 'eyes') { const s = aw * 0.09; tinted(g, 'fin-button-2hole', '#2a1f2a', cx - aw * 0.16 - s / 2, cy - ah * 0.12, s); tinted(g, 'fin-button-2hole', '#2a1f2a', cx + aw * 0.16 - s / 2, cy - ah * 0.12, s); }
      else if (touch === 'buttons') { const s = aw * 0.08; for (let i = 0; i < 4; i++) tinted(g, 'fin-button-4hole', '#d9a441', cx - s / 2, cy - ah * 0.3 + i * ah * 0.18, s); }
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
  const b = { x: w < 600 ? 8 : w * 0.06, y: h - uiH - bh * 0.92, w: bw, h: bh };
  const fi = Math.floor((el_ - 800) / 125);
  let frameNo = 'sleep';
  if (fi >= 0 && fi < 8) frameNo = [0, 1, 2, 1, 2, 3, 3, 3][fi];
  drawStack(g, b, { t, purl: frameNo, mirror: true, things: e.purl, holder: e.holder, yarn: gal.yarns[gal.yarns.length - 1], dpr });
  if (fi >= 8 && !cheerDone) { cheerDone = true; }
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
