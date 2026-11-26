// menu.js — Menu, Settings, How to play, Credits (sheets), and the placeholder screens other helpers
// replace: go('bag'), go('dolls', galleryId?), go('scarf').
import { el, ICON, go, openSheet, closeSheet, registerScreen, currentScreen, notice } from './ui.js';
import { setKeyHandler } from './input.js';
import * as S from './state.js';
import * as audio from './audio.js';
import { image as sceneImage } from './scene.js';
import { catImage, COAT_LIST } from './catCoat.js';

let hooks = { toggleMute: () => {}, resume: () => {}, onReset: () => {}, onSettings: () => {}, onUnlocks: () => {}, backToRoom: () => false };
export const setMenuHooks = (h) => { hooks = { ...hooks, ...h }; };

const item = (icon, label, fn, cls = '') => {
  const b = el('button', { class: `btn ${cls}` }, el('span', { class: 'icw', html: ICON[icon] }), label);
  b.addEventListener('click', () => { audio.play('ui'); fn(); });
  return b;
};

export function openMenu() {
  if (currentScreen() === 'title') return;
  const s = S.get();
  const list = el('div', { class: 'menu-list' });
  // (Change 4) from Knit more in the room: "Back to the room" heads the menu
  if (hooks.backToRoom && hooks.backToRoom()) list.append(item('back', 'Back to the room', () => { closeSheet(); go('room'); }));
  list.append(item('play', 'Resume', () => closeSheet(), 'primary'));
  list.append(item('book', 'Pattern Book', () => go('book')));
  list.append(item('frame', 'Gallery', () => go('gallery')));
  list.append(item('bag', 'Knitting Bag', () => go('bag')));
  list.append(item('scarf', 'Infinite Scarf', () => go('scarf')));
  list.append(item('gear', 'Settings', () => openSettings()));
  list.append(item('help', 'How to play', () => openHowTo()));
  if (window.gameReport && window.gameReport.shown()) list.append(item('bug', 'Report a bug', () => openReport()));
  list.append(item('info', 'Credits', () => openCredits()));
  void s;
  openSheet('menu', list, { title: 'Menu' });
}

export function openReport() {
  closeSheet();
  window.gameReport && window.gameReport.open();
}

export function openSettings() {
  const st = S.get().settings;
  const box = el('div', { class: 'settings-list' });
  const slider = (label, key, fn) => {
    const i = el('input', { type: 'range', min: 0, max: 100, value: Math.round(st[key] * 100), 'aria-label': label });
    i.addEventListener('input', () => { st[key] = +i.value / 100; fn(); S.saveSoon(); });
    i.addEventListener('change', () => audio.play('ui'));
    return el('label', { class: 'set-row' }, el('span', { text: label }), i);
  };
  const toggle = (label, key, fn, note) => {
    const t = el('button', { class: 'toggle' + (st[key] ? ' on' : ''), role: 'switch', 'aria-checked': st[key] ? 'true' : 'false', 'aria-label': label });
    t.addEventListener('click', () => { st[key] = !st[key]; t.classList.toggle('on', st[key]); t.setAttribute('aria-checked', st[key] ? 'true' : 'false'); fn && fn(); audio.play('ui'); S.saveSoon(); });
    return el('div', { class: 'set-row' }, el('span', {}, label, note ? el('small', { style: { display: 'block', fontWeight: 400, color: 'var(--ink-soft)', fontSize: '13px' }, text: note }) : null), t);
  };
  const vols = () => audio.setVolumes(st.music, st.sfx);
  box.append(slider('Music volume', 'music', vols), slider('Sound volume', 'sfx', vols));
  const muteRow = toggle('Mute everything', 'musicMuted', () => { st.sfxMuted = st.musicMuted; audio.setMuted(st.musicMuted, st.sfxMuted); hooks.onSettings(); });
  box.append(muteRow);
  if ('vibrate' in navigator) box.append(toggle('Vibrate on each stitch', 'vibrate'));
  box.append(toggle('Hold to knit', 'hold', null, 'Holding a key, or a finger, knits 6 stitches a second.'));
  box.append(toggle('Big buttons', 'big', () => hooks.onSettings()));
  // a view override: everything to play with; the earned progress is kept for when it's switched off
  box.append(toggle('Unlock everything', 'unlockAll', () => { S.setUnlockAll(st.unlockAll); hooks.onUnlocks(); }, 'Every pattern, yarn, needle, doll and more, to play with. Switch it off to go back to what you have earned.'));
  box.append(catSection());
  if (window.gameReport && window.gameReport.shown()) box.append(item('bug', 'Report a bug', () => openReport()));
  // reset
  const input = el('input', { type: 'text', placeholder: 'Type RESET', 'aria-label': 'Type RESET to confirm' });
  const reset = el('button', { class: 'btn small', text: 'Reset progress', disabled: true });
  input.addEventListener('input', () => { reset.disabled = input.value.trim() !== 'RESET'; });
  reset.addEventListener('click', () => { if (input.value.trim() !== 'RESET') return; closeSheet(); hooks.onReset(); });
  box.append(el('h3', { text: 'Start over', style: { color: 'var(--plum)', fontSize: '16px', marginTop: '6px' } }),
    el('p', { text: 'This clears every piece, the gallery and the scarf. Type RESET to confirm.', style: { fontSize: '14px', color: 'var(--ink-soft)' } }), el('div', { class: 'reset-box' }, input, reset));
  openSheet('settings', box, { title: 'Settings' });
}

// "Your cat": her coat (swatches drawn from her own sprite) and her name (a 🎲 for another)
function catSection() {
  const c = S.cat();
  const sec = el('div', { class: 'cat-set' });
  const row = el('div', { class: 'coat-row', role: 'radiogroup', 'aria-label': 'Cat coat' });
  const changed = () => window.dispatchEvent(new Event('kk-cat'));
  for (const [id, label] of COAT_LIST) {
    const cv = el('canvas', { width: 112, height: 112 });
    const b = el('button', { class: 'coat-sw' + (id === c.coat ? ' on' : ''), role: 'radio', 'aria-checked': id === c.coat ? 'true' : 'false', 'aria-label': `${label} coat`, title: label }, cv, label);
    const draw = () => { const im = sceneImage('purl'); if (!im) return false; const g = cv.getContext('2d'); g.clearRect(0, 0, 112, 112); g.drawImage(catImage(im, 'sleep', id), 4, 8, 104, 104); return true; };
    if (!draw()) setTimeout(draw, 600);
    b.addEventListener('click', () => {
      S.setCat({ coat: id }); audio.play('ui');
      for (const x of row.children) { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); }
      changed();
    });
    row.append(b);
  }
  const input = el('input', { type: 'text', value: c.name, maxlength: 16, 'aria-label': 'Cat name', autocomplete: 'off', spellcheck: 'false' });
  input.addEventListener('input', () => { if (input.value.trim()) { S.setCat({ name: input.value }); changed(); } });
  input.addEventListener('change', () => { if (!input.value.trim()) input.value = S.catName(); });
  const dice = el('button', { class: 'btn small dice', 'aria-label': 'Another name', title: 'Another name' }, '🎲 Another name');
  dice.addEventListener('click', () => { const n = S.randomCatName(S.catName()); S.setCat({ name: n }); input.value = n; audio.play('ui'); changed(); });
  sec.append(el('h3', { text: 'Your cat', style: { color: 'var(--plum)', fontSize: '16px', marginTop: '6px' } }), row, el('div', { class: 'name-row' }, input, dice));
  return sec;
}

export function openHowTo() {
  const cards = el('div', { class: 'howto-cards' });
  const mk = (draw, title, text) => {
    const c = el('canvas', { width: 160, height: 160, style: { width: '80px', height: '80px' } });
    draw(c.getContext('2d'));
    return el('div', { class: 'howto-card' }, c, el('div', {}, el('h3', { text: title }), el('p', { text })));
  };
  cards.append(
    mk(drawTap, 'Tap to knit', 'Every tap anywhere on the knitting (or Space, Enter or K) knits one real stitch. When a row ends, the work turns and you knit back the other way.'),
    mk(drawYarns, 'Change yarn any time', 'Tap a yarn in the yarn bar, on any stitch. Follow chart switches yarns for you; pick any yarn from the basket to knit your own way. Rip back, at the top left, undoes stitches (hold it to keep ripping).'),
    mk(drawFinish, 'Finish, display, unlock', 'Finish a piece and display it on your gallery wall. Every piece you finish opens the next pattern, and stitches unlock needles, yarns and more. The menu is always at the top right.'),
  );
  const keys = el('p', { class: 'keys-list howto-keys', html: '<kbd>Space</kbd> <kbd>Enter</kbd> <kbd>K</kbd> knit · <kbd>Backspace</kbd> <kbd>U</kbd> rip back · <kbd>1</kbd>–<kbd>4</kbd> chart yarns · <kbd>5</kbd>–<kbd>9</kbd> recent yarns · <kbd>Y</kbd> any yarn · <kbd>C</kbd> follow chart · <kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd> zoom · <kbd>V</kbd> preview · <kbd>G</kbd> glossary · <kbd>R</kbd> read the pattern · <kbd>M</kbd> mute · <kbd>Esc</kbd> menu · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> report a bug' });
  openSheet('howto', el('div', {}, cards, keys), { title: 'How to play' });
}
function bg(g) { const gr = g.createLinearGradient(0, 0, 160, 160); gr.addColorStop(0, '#7a5378'); gr.addColorStop(1, '#4a2f4d'); g.fillStyle = gr; g.fillRect(0, 0, 160, 160); }
function v(g, x, y, s, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x - s * 0.22, y, s * 0.26, s * 0.42, -0.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x + s * 0.22, y, s * 0.26, s * 0.42, 0.5, 0, Math.PI * 2); g.fill(); }
function drawTap(g) {
  bg(g);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) v(g, 28 + c * 26, 132 - r * 20, 22, r === 3 && c > 2 ? 'rgba(239,228,207,0.25)' : '#9e2a3a');
  g.strokeStyle = '#e8c98a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(10, 62); g.lineTo(150, 50); g.stroke();
  g.fillStyle = '#f6ecd9'; g.beginPath(); g.arc(108, 92, 16, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(246,236,217,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(108, 92, 26, 0, Math.PI * 2); g.stroke();
}
function drawYarns(g) {
  bg(g);
  const cols = ['#9e2a3a', '#8fa77f', '#d9a441', '#efe4cf'];
  cols.forEach((c, i) => { const x = 40 + (i % 2) * 80, y = 45 + Math.floor(i / 2) * 75; const gr = g.createRadialGradient(x - 10, y - 10, 2, x, y, 30); gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, c); gr.addColorStop(1, 'rgba(30,10,30,0.9)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 28, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 18, 0.4, 2.6); g.stroke(); });
}
function drawFinish(g) {
  bg(g);
  g.fillStyle = '#8a5a34'; g.fillRect(0, 0, 160, 160);
  g.fillStyle = '#5a3a20'; g.beginPath(); g.arc(80, 26, 10, 0, Math.PI * 2); g.fill();
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) v(g, 47 + c * 22, 125 - r * 18, 20, r % 2 ? '#d9a441' : '#9e2a3a');
  g.fillStyle = '#f2d48a'; for (const [x, y] of [[24, 40], [136, 52], [130, 120]]) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 3, y); g.lineTo(x, y + 9); g.lineTo(x - 3, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x, y + 3); g.lineTo(x + 9, y); g.lineTo(x, y - 3); g.closePath(); g.fill(); }
}

export function openCredits() {
  const box = el('div', { class: 'credits' },
    el('p', {}, el('b', { text: 'Knit Knack' }), ': a cozy tap-to-knit game. Every tap knits one real stitch.'),
    el('h3', { text: 'Idea' }), el('p', { text: 'Rich Conlan' }),
    el('h3', { text: 'Made with' }), el('p', { text: 'gamegen, with code-drawn knitting; painted art, music and sounds made for this game.' }),
    el('h3', { text: 'Fonts' }),
    el('p', { text: 'Fredoka, copyright 2016 The Fredoka Project Authors (github.com/hafontia/Fredoka-One). Caveat, copyright 2014 The Caveat Project Authors (github.com/googlefonts/caveat). Both are under the SIL Open Font License 1.1, and their license files (fonts/OFL-fredoka.txt, fonts/OFL-caveat.txt) come with the game.' }),
  );
  // only once the game has a repo to report to (the button shows then too)
  if (window.gameReport && window.gameReport.shown()) box.append(el('h3', { text: 'Bug reports' }), el('p', { text: 'Found a bug? Open the menu and pick "Report a bug", or press Ctrl+Shift+F (you\'ll need a GitHub account).' }));
  openSheet('credits', box, { title: 'Credits' });
}

// ---------------------------------------------------------------- placeholders (replaced by other helpers)
function placeholder(name, title, text, music) {
  registerScreen(name, {
    enter(arg) {
      const root = document.querySelector(`[data-screen="${name}"]`);
      const back = el('button', { class: 'btn primary', text: 'Back to the book' });
      back.addEventListener('click', () => go('book'));
      const gal = el('button', { class: 'btn', text: 'Gallery' });
      gal.addEventListener('click', () => go('gallery'));
      root.replaceChildren(el('div', { class: 'ph-panel' }, el('h2', { text: title }), el('p', { text }), arg ? el('p', { text: `(${typeof arg === 'string' ? arg : JSON.stringify(arg)})`, style: { fontSize: '13px' } }) : null, el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' } }, back, gal)));
      setKeyHandler((e) => { if (e.key === 'Escape') { go('book'); return true; } return false; });
      audio.music(music); audio.ambience(music === 'nook');
    },
    leave() { setKeyHandler(null); },
  });
}
placeholder('bag', 'Knitting Bag', 'Needles, stitch markers, row counters, yarn holders, nook decor and things for your cat will live here.', 'nook');
placeholder('dolls', 'Doll Shelf', 'The dolls will stand here, ready to wear what you knit.', 'gallery');
placeholder('scarf', 'Infinite Scarf', 'The scarf that never ends will be knit here.', 'scarf');
export { notice };
