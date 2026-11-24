// features.js — wires the Doll Shelf and dressing view, the preview card renderer, the Knitting Bag and
// the Infinite Scarf into the app. Imported by main.js after menu.js, so these screens replace its
// placeholders.
import * as dolls from './dolls.js';
import { loadDolls } from './worn.js';
import { previewCard } from './previewCard.js';
import * as card from './cardRenderer.js';
import * as bag from './bag.js';
import * as scarf from './scarf.js';

export function init({ menu }) {
  dolls.setMenu(menu); bag.setMenu(menu); scarf.setMenu(menu);
  scarf.init();
  setTimeout(() => { if (window.__game) { window.__game.scarf = scarf.scarfState; window.__game.scarfPattern = (p) => scarf.setPattern(p); } }, 0);
  loadDolls();
  previewCard.setRenderer(card.renderCard);
  const st = previewCard.state.bind(previewCard);
  previewCard.state = (c) => ({ ...st(c), doll: card.lastDoll });
}
export const dress = (dollId, gid) => dolls.dress(dollId, gid, { quiet: false });
export const applySettings = () => scarf.applySettings();
export const resetScarf = () => scarf.resetAll();
export const scarfAddRows = (n, yarn, pattern) => scarf.addRows(n, yarn, pattern);
