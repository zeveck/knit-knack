// bag.js — the Knitting Bag: tabs Needles, Markers, Counter, Holder, Decor, Purl, Dolls. Each tab has a
// code-drawn preview of the equipped choice as it looks in play (a real Work view with stitches on the
// needles, the basket and holder with your ball, the nook with its decor, Purl with her things, the
// dolls), then a grid of cards: owned ones equip on tap (a tick shows which; decor and Purl's things
// toggle), locked ones show a silhouette and exactly what's left, unseen ones carry a "new" badge.
import { el, ICON, go, registerScreen, currentScreen, pageZoom } from './ui.js';
import { setKeyHandler } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { Work, drawNeedle, NEEDLE_STYLES, MARKER_STYLES, COUNTER_STYLES } from './work.js';
import { parseChart } from './chart.js';
import { drawNook, drawStack, image as sceneImage } from './scene.js';
import { drawBall } from './yarn.js';
import { loadDolls, dressedDoll, dollSilhouette, dollBounds, dollSize, DOLL_NAMES } from './worn.js';

const TABS = [
  ['needles', 'Needles'], ['marker', 'Markers'], ['counter', 'Counter'], ['holder', 'Holder'], ['decor', 'Decor'], ['purl', 'Purl'], ['doll', 'Dolls'],
];
let root = null, tab = 'needles', menuFn = () => {}, work = null, workCanvas = null, prevScreen = null;
export const setMenu = (fn) => { menuFn = fn; };
const dpr = () => Math.min(3, window.devicePixelRatio || 1) * pageZoom();
const itemsOf = (kind) => S.UNLOCK_RULES.filter((u) => u.kind === kind);
const isNew = (u) => !u.rule.start && S.isUnlocked(u.id) && !S.get().bagSeen.includes(u.id);
export const tabHasNew = (kind) => itemsOf(kind).some(isNew);
export const bagHasNew = () => TABS.some(([k]) => tabHasNew(k));
function equipped(u) {
  const e = S.get().equipped;
  if (u.kind === 'decor' || u.kind === 'purl') return e[u.kind].includes(u.item);
  if (u.kind === 'doll') return (S.get().lastDoll || 'pip') === u.item;
  return e[u.kind] === u.item;
}
const yarnNow = () => {
  const s = S.get();
  const p = s.lastPiece && s.pieces[`w-${s.lastPiece}`];
  return (p && (p.free || p.slots.A)) || s.recent[0] || { color: '#9e2a3a', type: 'wool' };
};

function render() {
  root = document.querySelector('[data-screen="bag"]');
  root.className = 'screen paper-screen bag-screen';
  const back = el('button', { class: 'icon-btn', 'aria-label': 'Back', title: 'Back' }); back.innerHTML = ICON.back;
  back.addEventListener('click', () => { audio.play('ui'); leaveBag(); });
  const menu = el('button', { class: 'icon-btn', 'aria-label': 'Menu', title: 'Menu' }); menu.innerHTML = ICON.menu;
  menu.addEventListener('click', () => menuFn());
  const page = el('div', { class: 'page bag-page' });
  page.append(el('div', { class: 'topline' }, back, el('h2', { text: 'Knitting Bag' }), menu));
  const tabs = el('div', { class: 'tabs bag-tabs', role: 'tablist' });
  for (const [k, label] of TABS) {
    const t = el('button', { class: 'tab' + (tab === k ? ' on' : ''), role: 'tab', 'aria-selected': tab === k ? 'true' : 'false', 'data-tab': k }, label);
    if (tabHasNew(k) && tab !== k) t.append(el('span', { class: 'dot', 'aria-label': 'new' }));
    t.addEventListener('click', () => { if (tab !== k) { tab = k; audio.play('page'); render(); } });
    tabs.append(t);
  }
  page.append(tabs);
  const pv = el('div', { class: 'bag-preview' });
  workCanvas = el('canvas');
  pv.append(workCanvas, el('div', { class: 'pv-label', text: previewLabel() }));
  page.append(pv);
  const grid = el('div', { class: 'bag-grid' + (tab === 'doll' ? ' dolls' : '') });
  const fresh = [];
  for (const u of itemsOf(tab)) {
    const owned = S.isUnlocked(u.id);
    const cv = el('canvas', { class: 'thumb' });
    const on = owned && equipped(u);
    const c = el('button', { class: 'bag-card' + (owned ? '' : ' locked') + (on ? ' on' : ''), 'data-id': u.id, 'aria-pressed': on ? 'true' : 'false', 'aria-label': `${u.name}${owned ? (on ? ' (in use)' : '') : ' (locked)'}` }, cv, el('span', { class: 'nm', text: u.name }));
    if (owned) {
      if (isNew(u)) { c.append(el('span', { class: 'badge', text: 'new' })); fresh.push(u.id); }
      if (on) c.append(el('span', { class: 'tick icw', html: ICON.check }));
      c.append(el('span', { class: 'sub', text: subText(u, on) }));
      c.addEventListener('click', () => use(u));
    } else {
      c.append(el('span', { class: 'lock' }, el('span', { class: 'icw', html: ICON.lock }), lockText(u)));
      c.addEventListener('click', () => audio.play('ui', { gain: 0.4 }));
    }
    grid.append(c);
  }
  page.append(grid);
  if (tab === 'doll') page.append(el('p', { class: 'bag-note', text: 'The doll you pick models your hats, socks and sweaters on the preview card while you knit. Dress them on the Doll Shelf in the Gallery.' }));
  root.replaceChildren(page);
  // seen: the badge shows this once, and is gone next time
  if (fresh.length) { S.get().bagSeen.push(...fresh); S.saveSoon(); }
  requestAnimationFrame(() => { drawThumbs(grid); drawPreview(); });
}
function subText(u, on) {
  if (u.kind === 'decor' || u.kind === 'purl') return on ? 'On (tap to take away)' : 'Off (tap to put out)';
  if (u.kind === 'doll') return on ? 'Models your knitting' : 'Tap to model';
  return on ? 'In use' : 'Tap to use';
}
function lockText(u) {
  const t = S.remainingText(u.rule);
  return t;
}
function previewLabel() {
  const e = S.get().equipped;
  const nm = (kind, id) => (S.ruleById(`${kind}:${id}`) || {}).name || id;
  if (tab === 'needles') return `${nm('needles', e.needles)} needles`;
  if (tab === 'marker') return nm('marker', e.marker);
  if (tab === 'counter') return `${nm('counter', e.counter)} row counter`;
  if (tab === 'holder') return nm('holder', e.holder);
  if (tab === 'decor') return e.decor.length ? `In the nook: ${e.decor.map((d) => nm('decor', d).toLowerCase()).join(', ')}` : 'The nook (nothing put out yet)';
  if (tab === 'purl') return e.purl.length ? `Purl with her ${e.purl.map((d) => nm('purl', d).toLowerCase()).join(', ')}` : 'Purl, asleep in her basket';
  return `${DOLL_NAMES[S.get().lastDoll || 'pip']} models your knitting`;
}
function use(u) {
  const was = equipped(u);
  if (u.kind === 'doll') { S.get().lastDoll = u.item; S.saveSoon(); }
  else S.equip(u.kind, u.item);
  audio.play(u.kind === 'purl' && u.item === 'bell' && !was ? 'bell' : 'ui');
  if (u.kind === 'needles') audio.setNeedles(u.item);
  if (window.__game && window.__game.previewCard) window.__game.previewCard.invalidate();
  render();
}
function leaveBag() {
  if (prevScreen && ['knit', 'scarf', 'gallery', 'dolls'].includes(prevScreen)) {
    if (prevScreen === 'knit' && S.get().lastPiece) go('knit', S.get().lastPiece); else go(prevScreen === 'knit' ? 'book' : prevScreen);
  } else go('book');
}

// ---------------------------------------------------------------- the big preview
function drawPreview() {
  const c = workCanvas; if (!c) return;
  const r = c.getBoundingClientRect(); if (!r.width) return;
  const d = dpr();
  const e = S.get().equipped;
  if (tab === 'needles' || tab === 'marker' || tab === 'counter') {
    // a real Work view: a few rows of stockinette on the needles, in your current yarn
    const chart = previewChart();
    work = new Work(c, { dpr: d, minFit: 10, maxFit: 40, fitBox: (w, h) => ({ x: w * 0.1, y: h * 0.12, w: w * 0.8, h: h * 0.86 }) });
    const y = yarnNow();
    const done = chart.rowStart(3) + 5;
    work.load(chart, { yarns: Array.from({ length: done }, () => y), done, castOnYarn: y, nextYarn: y });
    work.setNeedles(e.needles); work.setMarkers(e.marker); work.setCounter(e.counter);
    return;
  }
  work = null;
  c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  const w = r.width, h = r.height;
  if (tab === 'decor') { drawNook(g, w, h, { decor: e.decor, photo: newestPhoto() }); return; }
  if (tab === 'holder' || tab === 'purl') {
    drawNook(g, w, h, { decor: e.decor });
    g.fillStyle = 'rgba(34,18,40,0.45)'; g.fillRect(0, 0, w, h);
    const bh = Math.min(h * 0.62, w * 0.36), bw = bh * (468 / 396);
    const b = { x: w / 2 - bw * 0.85, y: h - bh - h * 0.08, w: bw, h: bh };
    drawStack(g, b, { t: performance.now(), things: e.purl, holder: e.holder, yarn: yarnNow(), dpr: d, purl: 'sleep' });
    return;
  }
  if (tab === 'doll') {
    const bg = g.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h / 2, w * 0.7); bg.addColorStop(0, '#f3e1bd'); bg.addColorStop(1, '#b98d62');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    loadDolls().then(() => {
      const ids = S.UNLOCK_RULES.filter((u) => u.kind === 'doll').map((u) => u.item);
      const n = ids.length, cw = w / n;
      g.setTransform(1, 0, 0, 1, 0, 0);
      ids.forEach((id, i) => {
        const b = dollBounds(id); const k = Math.min((h * d * 0.9) / (b.y1 - b.y0 + 40), (cw * d * 1.5) / (b.x1 - b.x0));
        const cv = S.isUnlocked(`doll:${id}`) ? dressedDoll(id, k) : dollSilhouette(id, k);
        const [fw] = dollSize(id);
        g.drawImage(cv, (i + 0.5) * cw * d - (fw * k) / 2, h * d - b.y1 * k - 6 * d);
      });
    });
  }
}
function previewChart() {
  const row = 'k'.repeat(12);
  return parseChart({ stitch: Array(4).fill(row).join('\n'), repeat: { width: 4, edges: 0, rows: 2 } });
}
function newestPhoto() { return null; }

// ---------------------------------------------------------------- card thumbnails
function drawThumbs(grid) {
  for (const c of grid.querySelectorAll('.bag-card')) {
    const u = S.ruleById(c.dataset.id); const cv = c.querySelector('canvas');
    const r = cv.getBoundingClientRect(); if (!r.width) continue;
    const d = dpr();
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    const w = r.width, h = r.height;
    if (u.kind === 'doll') { loadDolls().then(() => thumb(g, u, w, h, d, cv)); continue; }
    thumb(g, u, w, h, d, cv);
  }
}
function thumb(g, u, w, h, d, cv) {
  const owned = S.isUnlocked(u.id);
  g.save();
  if (u.kind === 'needles') {
    const st = NEEDLE_STYLES[u.item];
    drawNeedle(g, { x: w * 0.12, y: h * 0.8 }, { x: w * 0.9, y: h * 0.22 }, Math.max(2.5, h * 0.045), st, h * 0.12, 0);
    drawNeedle(g, { x: w * 0.88, y: h * 0.82 }, { x: w * 0.12, y: h * 0.3 }, Math.max(2.5, h * 0.045), st, h * 0.12, 0);
  } else if (u.kind === 'marker') {
    g.translate(0, -h * 0.08);
    marker(g, w * 0.36, h * 0.38, h * 0.09, h * 0.55, MARKER_STYLES[u.item]);
    marker(g, w * 0.66, h * 0.38, h * 0.09, h * 0.55, MARKER_STYLES[u.item]);
  } else if (u.kind === 'counter') {
    counter(g, w / 2, h / 2, h * 0.36, h * 0.62, COUNTER_STYLES[u.item], 12);
  } else if (u.kind === 'holder') {
    const y = yarnNow();
    if (u.item === 'floor') {
      g.fillStyle = 'rgba(30,12,30,0.3)'; g.beginPath(); g.ellipse(w / 2, h * 0.86, h * 0.32, h * 0.07, 0, 0, Math.PI * 2); g.fill();
      drawBall(g, y, w / 2, h * 0.58, h * 0.6, { dpr: d });
    } else {
      const im = sceneImage(`holder-${u.item}`);
      if (im) { const s = h * 1.05; g.drawImage(im, w / 2 - s / 2, h - s * 0.98, s, s); }
    }
  } else if (u.kind === 'decor') {
    const im = sceneImage(`decor-${u.item}`);
    if (im) { const k = Math.min((w * 0.9) / im.width, (h * 0.86) / im.height); g.drawImage(im, (w - im.width * k) / 2, (h - im.height * k) / 2, im.width * k, im.height * k); }
  } else if (u.kind === 'purl') {
    const bh = h * 1.15, bw = bh * (468 / 396);
    const b = { x: w / 2 - bw / 2, y: h - bh * 0.62, w: bw, h: bh };
    g.beginPath(); g.rect(0, 0, b.x + b.w * 1.02, h); g.clip(); // Purl's things only, not the ball beside her
    drawStack(g, b, { things: [u.item], holder: 'floor', purl: 'sleep', dpr: d });
  } else if (u.kind === 'doll') {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const b = dollBounds(u.item); const k = Math.min((h * d * 0.92) / (b.y1 - b.y0 + 30), (w * d * 1.1) / (b.x1 - b.x0));
    const c = owned ? dressedDoll(u.item, k) : dollSilhouette(u.item, k);
    const [fw] = dollSize(u.item);
    g.drawImage(c, (w * d - fw * k) / 2, h * d - b.y1 * k - 3 * d);
  }
  g.restore();
  if (!owned && u.kind !== 'doll') {
    // a soft silhouette of what's to come
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(70,44,78,0.55)'; g.fillRect(0, 0, cv.width, cv.height);
    g.restore();
  }
}
const hexRgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function marker(g, x, y, rad, cp, st) {
  const ring = hexRgb(st.ring);
  const r = Math.max(2.2, rad * 1.7);
  g.save();
  // a short bit of needle through the ring
  g.strokeStyle = '#c99b5c'; g.lineWidth = rad * 0.9; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - r * 2.2, y); g.lineTo(x + r * 2.2, y); g.stroke();
  g.lineWidth = Math.max(1, cp * 0.05);
  g.strokeStyle = rgba(ring.map((v) => v * 0.55)); g.beginPath(); g.ellipse(x, y, r * 0.55, r, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = Math.max(0.7, cp * 0.03); g.strokeStyle = st.ring; g.beginPath(); g.ellipse(x - 0.4, y - 0.4, r * 0.55, r, 0, 0, Math.PI * 2); g.stroke();
  if (st.charm) {
    const s = Math.max(3, cp * 0.17), cy = y + r + s * 1.1;
    g.strokeStyle = st.ring; g.beginPath(); g.moveTo(x, y + r); g.lineTo(x, cy - s * 0.6); g.stroke();
    g.fillStyle = st.color; g.strokeStyle = 'rgba(40,20,20,0.6)'; g.lineWidth = Math.max(0.6, s * 0.12);
    g.beginPath();
    if (st.charm === 'heart') { g.moveTo(x, cy + s * 0.8); g.bezierCurveTo(x - s * 1.3, cy - s * 0.1, x - s * 0.6, cy - s * 1.0, x, cy - s * 0.35); g.bezierCurveTo(x + s * 0.6, cy - s * 1.0, x + s * 1.3, cy - s * 0.1, x, cy + s * 0.8); }
    else if (st.charm === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); }
    else if (st.charm === 'acorn') { g.ellipse(x, cy + s * 0.2, s * 0.6, s * 0.75, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.fillStyle = '#5a3a1a'; g.ellipse(x, cy - s * 0.35, s * 0.75, s * 0.35, 0, 0, Math.PI * 2); }
    else if (st.charm === 'cat') { g.arc(x, cy, s * 0.7, 0, Math.PI * 2); g.moveTo(x - s * 0.65, cy - s * 0.2); g.lineTo(x - s * 0.5, cy - s * 1.0); g.lineTo(x - s * 0.1, cy - s * 0.6); g.moveTo(x + s * 0.65, cy - s * 0.2); g.lineTo(x + s * 0.5, cy - s * 1.0); g.lineTo(x + s * 0.1, cy - s * 0.6); }
    g.fill(); g.stroke();
  }
  g.restore();
}
function counter(g, x, y, w, h, st, n) {
  const [d, m, l] = st.body.map(hexRgb);
  g.save(); g.translate(x, y);
  const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, rgba(d)); gr.addColorStop(0.3, rgba(l)); gr.addColorStop(0.55, rgba(m)); gr.addColorStop(1, rgba(d));
  g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.3); g.fill();
  g.strokeStyle = 'rgba(40,20,10,0.6)'; g.lineWidth = 1; g.stroke();
  g.strokeStyle = 'rgba(40,20,10,0.35)';
  for (const sx of [-0.36, 0.36]) { g.beginPath(); g.moveTo(sx * w, -h / 2 + 1); g.lineTo(sx * w, h / 2 - 1); g.stroke(); }
  const fw = w * 0.5, fh = h * 0.58;
  g.fillStyle = st.face; rr(g, -fw / 2, -fh / 2, fw, fh, fh * 0.2); g.fill();
  g.fillStyle = st.ink; g.font = `700 ${Math.max(6, fh * 0.6)}px Fredoka, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 0, fh * 0.05);
  g.restore();
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

registerScreen('bag', {
  enter(arg, prev) {
    prevScreen = prev;
    if (typeof arg === 'string' && TABS.some(([k]) => k === arg)) tab = arg;
    else { const t = TABS.find(([k]) => tabHasNew(k)); if (t) tab = t[0]; }
    render();
    setKeyHandler((e) => {
      if (e.key === 'Escape') { leaveBag(); return true; }
      if (e.key === 'p' || e.key === 'P') { menuFn(); return true; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const i = TABS.findIndex(([k]) => k === tab); tab = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0]; render(); return true; }
      if (e.key === 'm' || e.key === 'M') { window.__game && window.__game.toggleMute(); return true; }
      return false;
    });
    audio.music('nook'); audio.ambience(true);
    toasts.pump();
  },
  leave() { setKeyHandler(null); work = null; },
});
window.addEventListener('resize', () => { if (currentScreen() === 'bag') render(); });
export const bagState = () => ({ tab });
