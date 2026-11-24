// sheets.js — the yarn picker, the written pattern ("Read the pattern"), the glossary.
import { el, openSheet, closeSheet, ICON } from './ui.js';
import { PALETTE, YARN_TYPES, YARN_LABELS, normYarn, yarnName, paintBallInto, colorName } from './yarn.js';
import * as S from './state.js';
import { writtenPattern, GLOSSARY } from './chart.js';
import * as audio from './audio.js';

// ---------------------------------------------------------------- yarn picker
// opts: {title, current: yarn, onPick(yarn)}
export function openPicker({ title = 'Pick a yarn', current, onPick, name = 'picker' }) {
  let type = current && S.isUnlocked(`yarn:${current.type}`) ? current.type : 'wool';
  let color = current ? current.color : '#9e2a3a';
  const root = el('div', { class: 'picker' });
  const curBall = el('canvas');
  const curName = el('span');
  const cur = el('div', { class: 'cur' }, curBall, curName);
  const types = el('div', { class: 'types' });
  const sw = el('div', { class: 'swatches' });
  const customRow = el('div', { class: 'swatches' });
  const pick = (hex) => {
    color = hex;
    const y = normYarn({ color: hex, type });
    audio.play('yarn');
    closeSheet();
    onPick(y);
  };
  const refreshCur = () => { paintBallInto(curBall, { color, type }, 48); curName.textContent = yarnName({ color, type }); };
  for (const t of YARN_TYPES) {
    const ok = S.isUnlocked(`yarn:${t}`);
    const c = el('canvas');
    const b = el('button', { class: 'type' + (t === type ? ' on' : '') + (ok ? '' : ' locked'), 'aria-label': YARN_LABELS[t] + (ok ? '' : ' (locked)') }, c, YARN_LABELS[t]);
    paintBallInto(c, { color, type: t }, 26);
    b.addEventListener('click', () => {
      if (!ok) { const u = S.ruleById(`yarn:${t}`); hint.textContent = `${YARN_LABELS[t]} yarn: ${S.remainingText(u.rule)}.`; return; }
      type = t;
      [...types.children].forEach((x) => x.classList.toggle('on', x === b));
      refreshCur(); audio.play('ui');
    });
    types.append(b);
  }
  const hint = el('p', { class: 'keys-list' });
  for (const [n, hex] of PALETTE) {
    const b = el('button', { class: 'sw' + (hex === color ? ' on' : ''), style: { background: hex }, 'aria-label': n, title: n });
    b.addEventListener('click', () => pick(hex));
    sw.append(b);
  }
  const renderCustom = () => {
    customRow.innerHTML = '';
    for (const hex of S.get().custom) {
      const b = el('button', { class: 'sw' + (hex === color ? ' on' : ''), style: { background: hex }, 'aria-label': colorName(hex), title: colorName(hex) });
      b.addEventListener('click', () => pick(hex));
      customRow.append(b);
    }
  };
  renderCustom();
  // mix your own
  const hsl = hexToHsl(color);
  const big = el('div', { class: 'swatch-big' });
  const mk = (label, max, v) => { const i = el('input', { type: 'range', min: 0, max, value: v, 'aria-label': label }); return [el('label', {}, label, i), i]; };
  const [lh, ih] = mk('Hue', 360, Math.round(hsl[0]));
  const [ls, is] = mk('Saturation', 100, Math.round(hsl[1]));
  const [ll, il] = mk('Lightness', 100, Math.round(hsl[2]));
  const mixHex = () => hslToHex(+ih.value, +is.value, +il.value);
  const upd = () => { big.style.background = mixHex(); };
  [ih, is, il].forEach((i) => i.addEventListener('input', upd));
  upd();
  const use = el('button', { class: 'btn primary small', text: 'Use this color' });
  use.addEventListener('click', () => { const h = mixHex(); S.pushCustom(h); pick(h); });
  const mix = el('div', { class: 'mix' }, el('div', { class: 'row' }, big, el('span', { text: 'Slide to mix a color, then use it.' })), lh, ls, ll, use);
  root.append(cur, types, hint, el('h3', { text: 'Colors' }), sw);
  if (S.get().custom.length) root.append(el('h3', { text: 'Your colors' }), customRow);
  root.append(el('h3', { text: 'Mix your own' }), mix);
  refreshCur();
  openSheet(name, root, { title });
}

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16); let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s * 100, l * 100];
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- the written pattern
const ABBR = /\b(k2tog|p2tog|ssk|ssp|M1LP|M1RP|M1L|M1R|MB|C[246][FB]|yo|k\d*|p\d*|BO|CO|RS|WS|rep|sts?)\b/g;
export function patternHTML(text) {
  return esc(text).replace(ABBR, '<b>$1</b>');
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function slotYarnNames(slots) {
  const out = {};
  for (const [k, v] of Object.entries(slots || {})) out[k] = yarnName(normYarn(v));
  return out;
}

// opts: {chart, pattern, yarns: slot yarns, currentRow}
export function openPattern({ chart, pattern, slots, currentRow = 0, currentIndex = null }) {
  // which part's lines to highlight, when the current row is worked part by part
  let curKey = null;
  if (currentIndex != null && chart.total) {
    const L = chart.locate(Math.min(currentIndex, chart.total - 1));
    currentRow = L.r;
    const node = chart.partIndex(L.r, L.entry.col);
    if (node >= 0) { const ctx = (chart._plan().rows.get(L.r) || []).find((x) => x.ids && x.ids.includes(node)); if (ctx && ctx.key != null) curKey = ctx.key; }
  }
  const wp = writtenPattern(chart, { name: pattern.name, source: pattern.source, yarns: slotYarnNames(slots || pattern.slots) });
  const box = el('div', { class: 'pattern-text' });
  let curEl = null;
  for (const l of wp.lines) {
    const d = el('div', { class: `ln ${l.kind}` });
    if (l.label) { d.append(el('span', { class: 'l', text: l.label + ': ' })); }
    const t = el('span'); t.innerHTML = l.kind === 'row' || l.kind === 'end' || l.kind === 'info' ? patternHTML(l.text) : esc(l.text);
    d.append(t);
    if (currentRow && l.rows && currentRow >= l.rows[0] && currentRow <= l.rows[1] && !curEl && (curKey == null || l.part == null || l.part === curKey)) { d.classList.add('cur'); curEl = d; }
    box.append(d);
  }
  const key = el('div', { class: 'key' });
  for (const a of wp.abbreviations) key.append(el('b', { text: a.abbr }), el('span', { text: a.meaning }));
  box.append(el('h3', { text: 'Key', style: { color: 'var(--plum)', margin: '14px 0 0' } }), key);
  const card = openSheet('pattern', box, { title: 'Read the pattern', cls: 'pattern-sheet' });
  if (curEl) requestAnimationFrame(() => curEl.scrollIntoView({ block: 'center' }));
  return card;
}

export function openGlossary(chart, pattern) {
  let used = [];
  try { used = writtenPattern(chart, { name: pattern.name }).abbreviations; } catch { used = []; }
  const all = Object.entries(GLOSSARY).map(([abbr, meaning]) => ({ abbr, meaning }));
  const box = el('div');
  box.append(el('p', { text: 'Pattern words, as in a real knitting pattern. On WS (wrong side) rows you work from the back, so a stitch that looks purled from the front is knit.' }));
  const key = el('div', { class: 'key' });
  const seen = new Set();
  for (const a of [...used, ...all]) { if (seen.has(a.abbr)) continue; seen.add(a.abbr); key.append(el('b', { text: a.abbr }), el('span', { text: a.meaning })); }
  box.append(key);
  openSheet('glossary', box, { title: 'Pattern glossary' });
}
export { ICON };
