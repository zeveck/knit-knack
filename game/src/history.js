// history.js — the browser's (and the phone's) Back steps back inside the game instead of leaving it.
//
// The game keeps a few history entries of its own above the page's first one, each marked with its
// depth: 0 on the title, 1 on the book, 2 on any other screen, and one more for each layer open on top
// (a sheet, the Report a bug form, "How long is it?" or the dressing view). Every Back takes one layer
// or screen off and lands exactly one level down, so a Back never has to push an entry back: Android
// Chrome skips entries a page added without a tap, so a push from popstate would make a later Back
// jump past the game's title and leave the site.
// Going deeper pushes entries; going up through the game's own buttons only replaces the entry (no
// pile-up), and the spare entries are spent by the next Back. A Back (popstate) does one step:
//   the report form, then a sheet, then the overlay closes; else the dressing view goes to the shelf;
//   else any screen goes to the book; the book goes to the title; and Back on the title leaves the site.
// Afterwards the entries are put right for where the game now is (one pushed back if a level is still
// open, or a spare one dropped with a silent history.go). Forward never moves the game.
import { go, currentScreen, openSheetName, closeSheet, onScreenChange, onSheet } from './ui.js';

const KEY = 'kk';
let cfg = { overlayOpen: () => false, closeOverlay: () => false, busy: () => false };
let handling = false; // inside our own Back step: the screen and sheet hooks wait for its end
let skip = 0; // pops we caused ourselves (history.go), to ignore
let seen = 0; // the depth of the entry we're on, as we last saw it
let reportWas = ''; // the watched layers, as last seen

const reportOpen = () => !!(window.gameReport && window.gameReport.isOpen());
const depthNow = () => { const s = history.state; return s && typeof s[KEY] === 'number' ? s[KEY] : 0; };
const level = () => { const sc = currentScreen(); return !sc || sc === 'title' ? 0 : sc === 'book' ? 1 : 2; };
const want = () => level() + (reportOpen() ? 1 : 0) + (openSheetName() ? 1 : 0) + (cfg.overlayOpen() ? 1 : 0);
const entry = (d) => ({ ...(history.state && typeof history.state === 'object' ? history.state : {}), [KEY]: d, screen: currentScreen() });

// bring the entries in line with where the game is (called on every screen change and sheet)
export function sync() {
  if (handling || skip) return;
  const w = want();
  let d = depthNow();
  try {
    if (w > d) { while (d < w) { d += 1; history.pushState(entry(d), ''); } }
    else if (w === 0 && d > 0) { skip += 1; history.go(-d); return; } // back on the title: the next Back leaves
    else history.replaceState(entry(d), '');
  } catch { /* history refused (too many calls): Back simply works as before */ }
  seen = depthNow();
}

function stepBack() {
  if (reportOpen()) { window.gameReport.close(); return; }
  if (openSheetName()) { closeSheet(); return; }
  if (cfg.closeOverlay()) return;
  if (cfg.busy()) return; // e.g. the piece is just being finished: it goes on to the finish screen
  const sc = currentScreen();
  if (!sc || sc === 'title') return;
  go(sc === 'book' ? 'title' : 'book');
}

function onPop() {
  const d = depthNow();
  if (skip) { skip -= 1; seen = d; if (!skip) sync(); return; } // and catch up with anything opened meanwhile
  const forward = d > seen;
  seen = d;
  if (!forward) { handling = true; try { stepBack(); } catch (e) { console.error(e); } finally { handling = false; } }
  const w = want();
  if (w > d) sync();
  else if (w < d) { skip += 1; history.go(w - d); }
  else { try { history.replaceState(entry(d), ''); } catch { /* */ } }
}

// opts: overlayOpen() (a game overlay that isn't a sheet is open), closeOverlay() (close or step out of
// it, true if it did), busy() (ignore Back for now)
export function initHistory(opts) {
  cfg = { ...cfg, ...opts };
  // a reload deep in the game's entries: step down to the page's own entry first (the game starts on the title)
  const d = depthNow();
  if (d > 0) { skip += 1; history.go(-d); } else { try { history.replaceState(entry(0), ''); } catch { /* */ } }
  seen = 0;
  addEventListener('popstate', onPop);
  onScreenChange(() => sync());
  onSheet(() => sync());
}
// called every frame: the report form, "How long is it?" and the dressing view have no open/close
// events of their own, so their state is watched
export function tick() {
  const r = `${reportOpen()}|${cfg.overlayOpen()}`;
  if (r !== reportWas) { reportWas = r; sync(); }
}
