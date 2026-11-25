// main.js — boot, the screen router wiring, the always-on frame logger, the debug hook (window.__game).
import { go, registerScreen, currentScreen, openSheetName, initSheets, closeSheet, notice } from './ui.js';
import { initInput, setKeyHandler, releaseHolds } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import * as toasts from './toasts.js';
import { loadScene, loadSceneRest, loadExtras } from './scene.js';
import { loadYarnImages, normYarn, registerColorNames } from './yarn.js';
import { setFibreTexture } from './stitches.js';
import { writtenPattern } from './chart.js';
import { chartOf, suggestedSlots } from './render.js';
import { slotYarnNames } from './sheets.js';
import { previewCard } from './previewCard.js';
import * as title from './title.js';
import * as knit from './knit.js';
import * as book from './book.js';
import * as finished from './finished.js';
import * as gallery from './gallery.js';
import { openMenu, setMenuHooks } from './menu.js';
import * as features from './features.js';
import { initHistory, tick as historyTick } from './history.js';

// ---------------------------------------------------------------- the frame log (web-target.md)
const frameLog = [];
function logFrame(name) {
  const last = frameLog[frameLog.length - 1];
  if (last && last[0] === name) last[1]++;
  else { frameLog.push([name, 1]); if (frameLog.length > 200) frameLog.shift(); }
}
function visibleName() {
  const ids = [...document.querySelectorAll('[data-screen]:not([hidden])')].map((s) => s.dataset.screen);
  const sh = openSheetName();
  return ids.join('>') + (sh ? `>${sh}` : '') + (window.gameReport && window.gameReport.isOpen() ? '>report' : '');
}
// a tiny always-on loop: logs the frame, and draws the small always-moving things (title, basket slot, finish)
function loop(t) {
  logFrame(visibleName());
  try { historyTick(); } catch (e) { console.error(e); }
  try {
    const sc = currentScreen();
    if (sc === 'title') title.frame(t);
    else if (sc === 'knit') knit.frame(t);
    else if (sc === 'finished') finished.frame(t);
  } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- patterns (the real book, or the dev stand-in)
async function loadPatterns() {
  let list = null;
  try {
    const m = await import('./patterns.js');
    list = m.PATTERNS || m.patterns || m.default || Object.values(m).find((v) => Array.isArray(v));
    if (m.PALETTE) registerColorNames(m.PALETTE);
  } catch (e) { list = null; }
  if (!Array.isArray(list) || !list.length) {
    const m = await import('./patterns-dev.js');
    list = m.PATTERNS;
  }
  return list;
}

// ---------------------------------------------------------------- menus
const toggleMute = () => { knit.toggleMute(); };
function applySettings() {
  const st = S.get().settings;
  audio.setVolumes(st.music, st.sfx);
  audio.setMuted(st.musicMuted, st.sfxMuted);
  knit.refreshMute();
}
setMenuHooks({
  toggleMute,
  onReset: () => { S.resetSave(); features.resetScarf().finally(() => location.reload()); },
  onSettings: () => { applySettings(); knit.applySettings(); features.applySettings(); },
});
knit.setMenu(openMenu); book.setMenu(openMenu); gallery.setMenu(openMenu);
features.init({ menu: openMenu });
toasts.onUse(() => { knit.onEquipChange(); });

// ---------------------------------------------------------------- boot
async function boot() {
  initInput(); initSheets();
  S.load();
  S.on('saveError', () => notice("Couldn't save just now. Your knitting is still here."));
  const titleEl = document.querySelector('[data-screen="title"]');
  // the title waits (dark, with a small loader) for only what it draws; the rest loads behind it
  const sv = S.get();
  const lastY = (sv.lastPiece && sv.pieces[`w-${sv.lastPiece}`] && sv.pieces[`w-${sv.lastPiece}`].yarns.slice(-1)[0]) || sv.recent[0];
  const [book] = await Promise.all([
    loadPatterns(),
    loadScene(sv.equipped.decor), loadYarnImages(['wool', ...(lastY && lastY.type ? [lastY.type] : [])]),
    document.fonts ? Promise.race([document.fonts.load('600 20px Fredoka'), new Promise((r) => setTimeout(r, 2500))]).then(() => document.fonts.load('24px Caveat')) : null,
  ]);
  S.setBook(book);
  // painted fibre tiles into the stitch sprites
  Promise.all(['assets/tex/tex-fibre.png', 'assets/tex/tex-fibre-fuzzy.png'].map((src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; })))
    .then(([a, b]) => { if (a) setFibreTexture(a, b); });
  // the rest loads behind the title; offline caching starts only after that, so the first launch never
  // waits on it (the service worker keeps the music out of its install, see sw.js)
  loadSceneRest().then(() => loadYarnImages()).then(() => loadExtras()).catch(() => {}).then(() => { audio.prefetch(); registerSW(); });
  // a save from before Pip etc: queue nothing yet; checked as play goes on
  S.get().seenPatterns.length || S.get().seenPatterns.push(...S.BOOK.slice(0, S.patternsUnlocked()).map((p) => p.id));
  // the phone's Back steps back inside the game (history.js)
  initHistory({ overlayOpen: features.overlayOpen, closeOverlay: features.closeOverlay, busy: () => currentScreen() === 'knit' && knit.isFinishing() });
  go('title');
  requestAnimationFrame(loop);
  requestAnimationFrame(() => requestAnimationFrame(() => titleEl.classList.remove('booting')));
  const start = (e) => {
    if (currentScreen() !== 'title') return;
    if (window.gameReport && window.gameReport.isOpen()) return;
    if (e && e.target && e.target.closest && e.target.closest('.title-link')) return;
    if (e && e.preventDefault) e.preventDefault();
    audio.unlock();
    applySettings();
    const s = S.get();
    if (!s.started && !s.gallery.length && !Object.keys(s.pieces).length) {
      // first launch: straight into the Garter Dishcloth, already cast on in cranberry wool
      s.started = true;
      const first = S.BOOK[0];
      S.startPiece(first, suggestedSlots(first));
      go('knit', first.id);
    } else { s.started = true; go('book'); }
    S.saveSoon();
  };
  titleEl.addEventListener('pointerdown', start);
  setKeyHandler((e) => { if (currentScreen() === 'title' && (e.key === ' ' || e.key === 'Enter' || e.key === 'k' || e.key === 'K')) { start(e); return true; } return false; });
  // the first tap or key anywhere starts the audio (the title's tap normally does)
  const firstInput = () => { audio.unlock(); applySettings(); };
  document.addEventListener('pointerdown', firstInput, { capture: true, once: true });
  document.addEventListener('keydown', firstInput, { capture: true, once: true });
  // the menu from any screen (Escape/P), closing a sheet first
  document.addEventListener('keydown', (e) => {
    if (window.gameReport && window.gameReport.isOpen()) return;
    if (e.defaultPrevented) return;
    if (e.key === 'Escape' && openSheetName()) { closeSheet(); e.preventDefault(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { S.saveNow(); } audio.suspendForHidden(document.hidden); });
  window.addEventListener('pagehide', () => S.saveNow());
  // feedback (Report a bug)
  window.gameReport && window.gameReport.setup({
    game: 'Knit Knack', key: 'knitknack', visibility: 'on',
    state: () => reportState(),
    pause: () => {},
    grab: () => grabScreen(),
    releaseAll: () => releaseHolds(),
  });
}

// Report a bug's picture of the screen. The screens drawn on canvas (the title, the knitting and scarf
// screens, the finish) are put back together from their canvases, each at its place on the screen; the
// paper and gallery screens are mostly page text a canvas can't copy, so they send no picture rather than
// a misleading one (a single card's thumbnail).
function grabScreen() {
  return new Promise((done) => {
    try {
      const scr = document.querySelector('[data-screen]:not([hidden])');
      const name = scr && scr.dataset.screen;
      if (!['title', 'knit', 'scarf', 'finished'].includes(name)) { done(null); return; }
      // "How long is it?" covers the scarf screen: its picture is its own canvas
      const how = scr.querySelector('.howlong');
      const host = how || scr;
      const shown = [...host.querySelectorAll('canvas')].filter((c) => {
        if (!c.width || !c.height || !c.getClientRects().length) return false;
        const st = getComputedStyle(c);
        return st.visibility !== 'hidden' && st.display !== 'none' && +st.opacity !== 0;
      });
      if (!shown.length) { done(null); return; }
      const W = innerWidth, H = innerHeight, k = Math.min(2, window.devicePixelRatio || 1);
      const out = document.createElement('canvas'); out.width = Math.round(W * k); out.height = Math.round(H * k);
      const g = out.getContext('2d'); g.scale(k, k);
      g.fillStyle = getComputedStyle(host).backgroundColor || '#2a1f3d';
      if (g.fillStyle === 'rgba(0, 0, 0, 0)') g.fillStyle = '#2a1f3d';
      g.fillRect(0, 0, W, H);
      for (const c of shown) { const r = c.getBoundingClientRect(); try { g.drawImage(c, r.left, r.top, r.width, r.height); } catch { /* a tainted canvas: skipped */ } }
      out.toBlob((b) => done(b), 'image/png');
    } catch { done(null); }
  });
}

function reportState() {
  const k = currentScreen() === 'knit' ? knit.knitState() : {};
  return { screen: currentScreen(), sheet: openSheetName(), pattern: k.pattern || null, row: k.row || null, stitch: k.stitch ?? null, yarn: k.yarn || null, mode: k.mode || null };
}

// ---------------------------------------------------------------- the debug hook
const hashYarns = (ys) => { let h = 2166136261; for (const y of ys) { const s = `${y.color}|${y.type};`; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } } return (h >>> 0).toString(16); };
window.__game = {
  state: () => {
    const s = S.get();
    const k = currentScreen() === 'knit' ? knit.knitState() : {};
    return {
      screen: currentScreen(), sheet: openSheetName(),
      pattern: k.pattern || null, pieceId: k.pieceId || null, row: k.row ?? null, rs: k.rs ?? null, stitch: k.stitch ?? null, total: k.total ?? null,
      yarn: k.yarn || null, mode: k.mode || null, slots: k.slots || null, recent: s.recent,
      unlockedPatterns: S.patternsUnlocked(), bookSize: S.BOOK.length,
      unlockedYarns: S.unlockedOf('yarn'),
      inProgress: Object.values(s.pieces).map((p) => ({ id: p.id, done: p.yarns.length })),
      gallery: s.gallery.map((g) => g.id), wall: S.wall().map((g) => g.id), basket: S.basket().map((g) => g.id),
      scarfCm: s.scarf.cm || 0, zoom: k.zoom ?? null, cellPx: k.cellPx ?? null, fabricCanvas: k.fabricCanvas || null, layout: k.layout || null,
      lifetimeStitches: s.lifetimeStitches, piecesFinished: s.piecesFinished,
      unlocked: { needles: S.unlockedOf('needles'), accessories: { marker: S.unlockedOf('marker'), counter: S.unlockedOf('counter'), holder: S.unlockedOf('holder'), decor: S.unlockedOf('decor'), purl: S.unlockedOf('purl') }, dolls: S.unlockedOf('doll') },
      equipped: s.equipped, outfits: s.outfits, toasts: toasts.queueState(), seenUnlocks: s.seenUnlocks,
      previewCard: k.previewCard || { doll: null, visible: false, rect: null }, fitBox: k.fitBox || null, needle: k.needle || null,
      tips: s.tips,
    };
  },
  frames: () => frameLog,
  audioState: () => { const a = audio.audioState(); return { context: a.context, musicMuted: a.musicMuted, sfxMuted: a.sfxMuted, family: a.family, ticks: a.ticks, music: a.music, voices: a.voices, deck: a.deck }; },
  musicSeekEnd: (n) => audio.musicSeekEnd(n),
  knit: (n = 1, { fast = false } = {}) => { if (currentScreen() !== 'knit') return null; return knit.knitMany(n, { fast }); },
  rip: (n = 1) => { if (currentScreen() !== 'knit') return null; knit.ripMany(n); return window.__game.state().stitch; },
  finish: () => {
    if (currentScreen() !== 'knit') return null;
    const st = knit.knitState();
    const g = knit.knitMany(st.total - st.stitch, { fast: true });
    return g && g.id ? g.id : null;
  },
  unlockAll: () => { S.unlockAll(); S.checkUnlocks(); if (currentScreen() === 'book') go('book'); return true; },
  setYarn: (slot, color, type = 'wool') => knit.setSlotYarn(slot, normYarn({ color, type })),
  freestyle: (color, type = 'wool') => knit.setFreestyle(normYarn({ color, type })),
  go: (screen, arg) => go(screen, arg),
  piece: (id) => {
    const s = S.get();
    const p = id.startsWith('g') ? S.galleryById(id) : s.pieces[id] || s.pieces[`w-${id}`];
    if (!p) return null;
    return { id, yarns: p.yarns.map((y) => ({ color: y.color, type: y.type })), count: p.yarns.length, hash: hashYarns(p.yarns) };
  },
  writtenPattern: (id) => { const p = S.patternById(id); if (!p) return null; const piece = S.getPiece(id); return writtenPattern(chartOf(p), { name: p.name, source: p.source, yarns: slotYarnNames(piece ? piece.slots : p.slots) }).text; },
  addStitches: (n) => { S.addStitches(n); S.checkUnlocks(); toasts.pump(); S.saveSoon(); return S.get().lifetimeStitches; },
  equip: (kind, id) => { const ok = S.equip(kind, id); knit.onEquipChange(); return ok; },
  dress: (dollId, galleryId) => features.dress(dollId, galleryId),
  scarfAddRows: (n, yarn, pattern) => features.scarfAddRows(n, yarn, pattern),
  failSaves: (on) => { S.failSaves(on); return true; },
  resetSave: () => { S.resetSave(); features.resetScarf().finally(() => location.reload()); return true; },
  toggleMute,
  previewCard,
};

// hooks for the other helpers' screens
export { go, registerScreen, previewCard };
boot();

// offline play (not while testing locally, unless asked with ?sw=1)
function registerSW() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && (!local || new URLSearchParams(location.search).has('sw'))) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
