// features.js — wires the Doll Shelf and dressing view, the preview card renderer, the Knitting Bag and
// the Infinite Scarf into the app. Imported by main.js after menu.js, so these screens replace its
// placeholders.
import * as dolls from './dolls.js';
import { loadDolls } from './worn.js';

export function init({ menu }) {
  dolls.setMenu(menu);
  loadDolls();
}
export const dress = (dollId, gid) => dolls.dress(dollId, gid, { quiet: false });
export const scarfAddRows = () => null;
