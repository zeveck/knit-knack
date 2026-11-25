// galTabs.js — the gallery's tab list (Wall, Basket, Doll Shelf, Room), shared by the Wall and Basket
// (gallery.js), the Doll Shelf (dolls.js) and the cozy room (room.js). on: the open tab. pick(id) is asked
// first and returns true if the screen handled the tab itself; otherwise the tab opens its own screen.
import { el, go } from './ui.js';
import * as S from './state.js';
import * as audio from './audio.js';

export const GAL_TABS = ['wall', 'basket', 'dolls', 'room'];
export function galTabs(on, pick = () => false) {
  const n = S.basket().length;
  const tabs = el('div', { class: 'gal-tabs', role: 'tablist' });
  for (const [id, label] of [['wall', 'Wall'], ['basket', `Basket${n ? ` (${n})` : ''}`], ['dolls', 'Doll Shelf'], ['room', 'Room']]) {
    const t = el('button', { class: 'tab' + (on === id ? ' on' : ''), role: 'tab', 'aria-selected': on === id ? 'true' : 'false', 'data-tab': id, text: label });
    t.addEventListener('click', () => {
      if (pick(id)) return;
      if (id === on) return;
      audio.play('card');
      if (id === 'dolls') go('dolls'); else if (id === 'room') go('room'); else go('gallery', { tab: id });
    });
    tabs.append(t);
  }
  return tabs;
}
