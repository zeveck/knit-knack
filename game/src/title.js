// title.js — the title: the nook built from the game's own layers (decor that's on, the basket with
// Purl asleep, the holder and ball on the painted floor spot), dimmed to night, with the logo.
import { registerScreen, currentScreen } from './ui.js';
import { drawNook, drawStack, drawSnow, fracBox, nookFit } from './scene.js';
import * as S from './state.js';

let canvas = null, g = null;
export function frame(t) {
  if (currentScreen() !== 'title') return;
  if (!canvas) { canvas = document.getElementById('title-canvas'); g = canvas.getContext('2d'); }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = innerWidth, h = innerHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const e = S.get().equipped;
  const fit = drawNook(g, w, h, { decor: e.decor, t });
  drawSnow(g, fit, t);
  const J = fit.json;
  if (J && J.basket) {
    const b = fracBox(fit, J.basket);
    const yarn = lastYarn();
    drawStack(g, b, { t, things: e.purl, holder: e.holder, yarn, dpr });
  }
  // night: dim with a cool wash, keep the lamp warm, vignette
  g.save();
  g.fillStyle = 'rgba(24,16,48,0.38)'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  const lx = fit.orient === 'land' ? fit.ox + fit.iw * fit.s * 0.6 : fit.ox + fit.iw * fit.s * 0.68;
  const ly = fit.oy + fit.ih * fit.s * (fit.orient === 'land' ? 0.22 : 0.2);
  const flick = 0.16 + 0.02 * Math.sin(t / 230) + 0.015 * Math.sin(t / 97);
  const lg = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(w, h) * 0.45);
  lg.addColorStop(0, `rgba(255,190,110,${flick})`); lg.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  const vg = g.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
  vg.addColorStop(0, 'rgba(12,6,24,0)'); vg.addColorStop(1, 'rgba(12,6,24,0.72)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  const top = g.createLinearGradient(0, 0, 0, h * 0.4);
  top.addColorStop(0, 'rgba(12,6,24,0.55)'); top.addColorStop(1, 'rgba(12,6,24,0)');
  g.fillStyle = top; g.fillRect(0, 0, w, h * 0.4);
  g.restore();
}
function lastYarn() {
  const s = S.get();
  const p = s.lastPiece && s.pieces[`w-${s.lastPiece}`];
  if (p && p.yarns.length) return p.yarns[p.yarns.length - 1];
  if (s.recent[0]) return s.recent[0];
  return { color: '#9e2a3a', type: 'wool' };
}
export { nookFit };
registerScreen('title', { enter() {}, leave() {} });
