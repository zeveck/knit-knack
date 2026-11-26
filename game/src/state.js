// state.js — the save (localStorage 'knitknack', throttled, try/catch), migrations, the unlock rules,
// counters, pieces in progress, the gallery and Basket, recent and custom yarns, equipped things.
import { u16ToBase64, base64ToU16 } from './chart.js';
import { normYarn, yarnKey } from './yarn.js';
import { fmtLen } from './scarfFacts.js';

export const SAVE_KEY = 'knitknack';
const VERSION = 2;

export const CHAPTERS = ['First Stitches', 'Warm Things', 'Colorwork', 'Cables and Texture', 'Lace', 'Knitted Friends', 'Big Projects'];

// ---------------------------------------------------------------- the book (set by main once patterns load)
export let BOOK = [];
export function setBook(list) { BOOK = list; }
export const patternById = (id) => BOOK.find((p) => p.id === id) || null;
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// find a pattern by id or by name ("Bobble Hat")
export function findPattern(idOrName) { const s = slug(idOrName); return BOOK.find((p) => p.id === idOrName || slug(p.id) === s || slug(p.name) === s) || null; }
export const chapterPatterns = (n) => BOOK.filter((p) => p.chapter === n);
export const chapterLast = (n) => { const l = chapterPatterns(n); return l[l.length - 1] || null; };

// ---------------------------------------------------------------- unlock rules
// rule: {stitches}|{pieces}|{chapter}|{pattern}|{scarfCm}|{firstWearable}|{allPatterns}|{any:[...]}|{start:true}
export const UNLOCK_RULES = [
  // yarns
  { id: 'yarn:wool', kind: 'yarn', item: 'wool', name: 'Wool', rule: { start: true } },
  { id: 'yarn:cotton', kind: 'yarn', item: 'cotton', name: 'Cotton', rule: { start: true } },
  { id: 'yarn:chunky', kind: 'yarn', item: 'chunky', name: 'Chunky', rule: { pieces: 3 } },
  { id: 'yarn:mohair', kind: 'yarn', item: 'mohair', name: 'Mohair', rule: { chapter: 2 } },
  { id: 'yarn:sparkle', kind: 'yarn', item: 'sparkle', name: 'Sparkle', rule: { scarfCm: 100 } },
  { id: 'yarn:stripe', kind: 'yarn', item: 'stripe', name: 'Self-striping', rule: { pieces: 10 } },
  { id: 'yarn:velvet', kind: 'yarn', item: 'velvet', name: 'Velvet', rule: { chapter: 4 } },
  { id: 'yarn:glow', kind: 'yarn', item: 'glow', name: 'Glow', rule: { any: [{ scarfCm: 300 }, { chapter: 6 }] } },
  // scarf stitch patterns
  { id: 'scarf:garter', kind: 'scarf', item: 'garter', name: 'Garter', rule: { start: true } },
  { id: 'scarf:rib2', kind: 'scarf', item: 'rib2', name: '2×2 rib', rule: { start: true } },
  { id: 'scarf:seed', kind: 'scarf', item: 'seed', name: 'Seed', rule: { start: true } },
  { id: 'scarf:cable', kind: 'scarf', item: 'cable', name: 'Center cable', rule: { chapter: 4 } },
  { id: 'scarf:lace', kind: 'scarf', item: 'lace', name: 'Lace column', rule: { chapter: 5 } },
  // needles
  { id: 'needles:bamboo', kind: 'needles', item: 'bamboo', name: 'Bamboo', rule: { start: true } },
  { id: 'needles:birch', kind: 'needles', item: 'birch', name: 'Birch', rule: { stitches: 500 } },
  { id: 'needles:rosewood', kind: 'needles', item: 'rosewood', name: 'Rosewood', rule: { chapter: 1 } },
  { id: 'needles:cherry', kind: 'needles', item: 'cherry', name: 'Cherry with brass tips', rule: { stitches: 2000 } },
  { id: 'needles:ebony', kind: 'needles', item: 'ebony', name: 'Ebony with silver ends', rule: { stitches: 4000 } },
  { id: 'needles:nickel', kind: 'needles', item: 'nickel', name: 'Nickel-plated', rule: { chapter: 2 } },
  { id: 'needles:rainbow', kind: 'needles', item: 'rainbow', name: 'Rainbow aluminium', rule: { stitches: 7500 } },
  { id: 'needles:candy', kind: 'needles', item: 'candy', name: 'Candy-cane stripe', rule: { chapter: 3 } },
  { id: 'needles:glass', kind: 'needles', item: 'glass', name: 'Clear glass', rule: { stitches: 12000 } },
  { id: 'needles:gold', kind: 'needles', item: 'gold', name: 'Gold-tipped', rule: { chapter: 5 } },
  { id: 'needles:glowtip', kind: 'needles', item: 'glowtip', name: 'Glow-tipped', rule: { scarfCm: 1000 } },
  { id: 'needles:oak', kind: 'needles', item: 'oak', name: 'Heirloom carved oak', rule: { allPatterns: true } },
  // stitch markers
  { id: 'marker:ring', kind: 'marker', item: 'ring', name: 'Plain rings', rule: { start: true } },
  { id: 'marker:heart', kind: 'marker', item: 'heart', name: 'Heart markers', rule: { stitches: 1000 } },
  { id: 'marker:star', kind: 'marker', item: 'star', name: 'Star markers', rule: { pieces: 5 } },
  { id: 'marker:acorn', kind: 'marker', item: 'acorn', name: 'Acorn markers', rule: { chapter: 4 } },
  { id: 'marker:cat', kind: 'marker', item: 'cat', name: 'Tiny cat markers', rule: { pieces: 25 } },
  // row counters
  { id: 'counter:brass', kind: 'counter', item: 'brass', name: 'Brass barrel', rule: { start: true } },
  { id: 'counter:wood', kind: 'counter', item: 'wood', name: 'Wooden dial', rule: { stitches: 3000 } },
  { id: 'counter:flower', kind: 'counter', item: 'flower', name: 'Enamel flower', rule: { chapter: 6 } },
  // yarn holders
  { id: 'holder:floor', kind: 'holder', item: 'floor', name: 'On the floor', rule: { start: true } },
  { id: 'holder:bowl', kind: 'holder', item: 'bowl', name: 'Ceramic yarn bowl', rule: { pieces: 8 } },
  { id: 'holder:bag', kind: 'holder', item: 'bag', name: 'Canvas project bag', rule: { chapter: 3 } },
  { id: 'holder:teacup', kind: 'holder', item: 'teacup', name: 'Teacup bowl', rule: { stitches: 20000 } },
  // nook decor (toggles)
  { id: 'decor:fern', kind: 'decor', item: 'fern', name: 'Potted fern', rule: { stitches: 1500 } },
  { id: 'decor:lights', kind: 'decor', item: 'lights', name: 'String lights', rule: { pieces: 12 } },
  { id: 'decor:rug', kind: 'decor', item: 'rug', name: 'Braided rug', rule: { chapter: 2 } },
  { id: 'decor:frame', kind: 'decor', item: 'frame', name: 'Framed photo', rule: { pieces: 15 } },
  { id: 'decor:bookshelf', kind: 'decor', item: 'bookshelf', name: 'Little bookshelf', rule: { chapter: 7 } },
  // Purl's things (toggles)
  { id: 'purl:collar', kind: 'purl', item: 'collar', name: 'Cranberry collar', rule: { pieces: 2 } },
  { id: 'purl:bell', kind: 'purl', item: 'bell', name: 'Bell', rule: { stitches: 6000 } },
  { id: 'purl:cushion', kind: 'purl', item: 'cushion', name: 'Cushion', rule: { chapter: 1 } },
  // dolls
  { id: 'doll:pip', kind: 'doll', item: 'pip', name: 'Pip', rule: { firstWearable: true } },
  { id: 'doll:clementine', kind: 'doll', item: 'clementine', name: 'Clementine', rule: { chapter: 2 } },
  { id: 'doll:bramble', kind: 'doll', item: 'bramble', name: 'Bramble', rule: { chapter: 3 } },
  { id: 'doll:juniper', kind: 'doll', item: 'juniper', name: 'Juniper', rule: { stitches: 10000 } },
  { id: 'doll:basil', kind: 'doll', item: 'basil', name: 'Basil', rule: { chapter: 4 } },
  { id: 'doll:mabel', kind: 'doll', item: 'mabel', name: 'Mabel', rule: { chapter: 7 } },
  { id: 'doll:purl', kind: 'doll', item: 'purl', get name() { return catName(); }, rule: { pattern: 'Bobble Hat' } },
  // (Change 3) pieces for the cozy room (placed as `piece:<item>`)
  { id: 'room:table', kind: 'room', item: 'table', name: 'Side table with a teacup', rule: { start: true } },
  { id: 'room:plant', kind: 'room', item: 'plant', name: 'Potted plant', rule: { pieces: 4 } },
  { id: 'room:books', kind: 'room', item: 'books', name: 'Stack of storybooks', rule: { stitches: 3000 } },
  { id: 'room:chest', kind: 'room', item: 'chest', name: 'Toy chest', rule: { chapter: 3 } },
  { id: 'room:teaset', kind: 'room', item: 'teaset', name: 'Tiny tea set', rule: { pieces: 12 } },
  { id: 'room:garland', kind: 'room', item: 'garland', name: 'Star garland', rule: { stitches: 8000 } },
  { id: 'room:lamp', kind: 'room', item: 'lamp', name: 'Floor lamp', rule: { chapter: 5 } },
  { id: 'room:frame', kind: 'room', item: 'frame', name: 'Framed picture', rule: { pieces: 20 } },
];
export const ruleById = (id) => UNLOCK_RULES.find((u) => u.id === id) || null;
const KIND_TOAST = { yarn: 'New yarn', scarf: 'New scarf stitch', needles: 'New needles', marker: 'New stitch markers', counter: 'New row counter', holder: 'New yarn holder', decor: 'New for the nook', get purl() { return `New for ${catName()}`; }, doll: 'New doll', room: 'New for the room' };
export const toastTitle = (u) => `${KIND_TOAST[u.kind] || 'New'}: ${u.name}!`;

// ---------------------------------------------------------------- the cat
// A new game (a fresh save, or Reset progress) gets a random coat and a random name from this list;
// a save from before the cat could change keeps the cream Purl she always was.
export const CAT_NAMES = [
  'Purl', 'Skein', 'Bobbin', 'Tweed', 'Pompom', 'Merino', 'Noodle', 'Cable', 'Fuzz', 'Mittens',
  'Picot', 'Ravel', 'Alpaca', 'Tassel', 'Bouclé', 'Cashmere', 'Angora', 'Mohair', 'Stitch', 'Toggle',
  'Button', 'Marl', 'Fleece', 'Woolly', 'Ribbon', 'Thimble', 'Garter', 'Moss', 'Bobble', 'Loopy',
];
export const CAT_COATS = ['cream', 'ginger', 'grey', 'charcoal', 'chocolate', 'silver', 'calico', 'tuxedo'];
const pickOne = (a, not) => { const l = a.filter((x) => x !== not); return l[Math.floor(Math.random() * l.length)]; };
export const randomCatName = (not) => pickOne(CAT_NAMES, not);
const cleanName = (n) => (typeof n === 'string' ? n.replace(/\s+/g, ' ').trim().slice(0, 16) : '');
export const catName = () => (S && S.cat && S.cat.name) || 'Purl';
export const cat = () => ({ coat: get().cat.coat, name: get().cat.name });
export function setCat({ coat, name } = {}) {
  const c = get().cat;
  if (coat != null && CAT_COATS.includes(coat)) c.coat = coat;
  if (name != null && cleanName(name)) c.name = cleanName(name);
  saveSoon();
  return cat();
}
// visible text written with "Purl" in it, said with the cat's own name
export const catText = (t) => String(t).replace(/\bPurl\b/g, catName());

// ---------------------------------------------------------------- the save
let S = null;
let failing = false;
let saveTimer = 0, lastSave = 0;
const listeners = { saveError: [], saveOk: [] };
export const on = (ev, fn) => listeners[ev].push(fn);

function fresh() {
  return {
    v: VERSION,
    settings: { music: 0.55, sfx: 0.85, vibrate: true, hold: false, big: false, musicMuted: false, sfxMuted: false, unlockAll: false },
    lifetimeStitches: 0, piecesFinished: 0, finishedPatterns: [],
    seenUnlocks: [], bagSeen: [], tips: [],
    equipped: { needles: 'bamboo', marker: 'ring', counter: 'brass', holder: 'floor', decor: [], purl: [] },
    outfits: {}, lastDoll: null,
    pieces: {}, gallery: [], serial: 0,
    recent: [], custom: [],
    lastPiece: null, scarf: { rows: 0, stitches: 0, cm: 0 },
    bookComplete: false, bookCompleteShown: false, seenPatterns: [],
    started: false,
    cat: { coat: pickOne(CAT_COATS), name: randomCatName() },
    // (Change 3) the cozy room: [{ref, surface, t, flip, z}], seeded with the cat on the armchair and
    // (Change 4, roomV 2) the Infinite Scarf on its pegs (hidden until its first stitch)
    room: freshRoom(), roomV: 2,
    // (Change 4) the scarf's length the room last showed (its growth moment counts up from it)
    roomScarfCm: null,
    // the next fact the scarf's Look closer shows (it carries on from session to session)
    roomScarfFact: 0,
  };
}
const scarfEntry = () => ({ ref: 'scarf', surface: 'scarf-pegs', t: 0.5, flip: false, z: 0 });
export const freshRoom = () => [{ ref: 'doll:purl', surface: 'chair-seat', t: 0.6, flip: false, z: 0 }, scarfEntry()];
// the room's entries as saved: well-formed ones only, each ref once (the rest of its cleaning, which needs
// the book, is roomRules.cleanRoom at boot)
function migrateRoom(raw) {
  if (!Array.isArray(raw)) return freshRoom();
  const seen = new Set(), out = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object' || typeof e.ref !== 'string' || !e.ref || seen.has(e.ref)) continue;
    seen.add(e.ref);
    out.push({ ref: e.ref, surface: typeof e.surface === 'string' ? e.surface : 'rug', t: Number.isFinite(+e.t) ? +e.t : 0, flip: !!e.flip, z: Number.isFinite(+e.z) ? +e.z : 0 });
  }
  return out;
}

const encYarns = (yarns) => {
  const table = [], idx = new Map();
  const data = new Uint16Array(yarns.length);
  yarns.forEach((y, i) => {
    const k = yarnKey(y);
    let j = idx.get(k);
    if (j === undefined) { j = table.length; table.push({ color: y.color, type: y.type }); idx.set(k, j); }
    data[i] = j;
  });
  return { table, data: u16ToBase64(data) };
};
const decYarns = (enc) => {
  if (!enc || !enc.table) return [];
  const table = enc.table.map((y) => normYarn(y));
  const data = base64ToU16(enc.data || '');
  return Array.from(data, (j) => table[j] || table[0]);
};

function serialize() {
  const out = { ...S, pieces: {}, gallery: [] };
  for (const [id, p] of Object.entries(S.pieces)) out.pieces[id] = { ...p, yarns: encYarns(p.yarns) };
  out.gallery = S.gallery.map((g) => ({ ...g, yarns: encYarns(g.yarns), _cache: undefined }));
  return JSON.stringify(out);
}

// The last save that loaded cleanly is kept under its own key, so a save that's been cut short or
// mangled falls back to it instead of starting over.
const PREV_KEY = `${SAVE_KEY}-prev`;
function readSave(key) {
  let text = null;
  try { text = localStorage.getItem(key); } catch { return null; }
  if (!text) return null;
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return { text, save: migrate(raw) };
  } catch (e) { console.warn(`save ${key} unreadable`, e); return null; }
}
export function load() {
  const main = readSave(SAVE_KEY);
  const got = main || readSave(PREV_KEY);
  S = got ? got.save : fresh();
  if (main) { try { localStorage.setItem(PREV_KEY, main.text); } catch { /* full: the main save still stands */ } }
  else if (got) console.warn('save unreadable: using the last good one');
  return S;
}

function migrate(raw) {
  const s = fresh();
  Object.assign(s, raw);
  // a field of the wrong type (a hand-edited or half-written save) falls back to its default
  const def = fresh();
  for (const [k, v] of Object.entries(def)) {
    if (Array.isArray(v) ? !Array.isArray(s[k]) : (v !== null && typeof v !== typeof s[k])) s[k] = v;
  }
  if (!raw.pieces || typeof raw.pieces !== 'object' || Array.isArray(raw.pieces)) raw.pieces = {};
  if (!Array.isArray(raw.gallery)) raw.gallery = [];
  raw.gallery = raw.gallery.filter((g) => g && typeof g === 'object' && typeof g.id === 'string' && g.pattern);
  s.settings = { ...fresh().settings, ...(raw.settings || {}) };
  s.equipped = { ...fresh().equipped, ...(raw.equipped || {}) };
  s.scarf = { ...fresh().scarf, ...(raw.scarf || {}) };
  s.pieces = {};
  for (const [id, p] of Object.entries(raw.pieces || {})) if (p && typeof p === 'object' && p.pattern) s.pieces[id] = { ...p, slots: p.slots && typeof p.slots === 'object' ? p.slots : {}, yarns: Array.isArray(p.yarns) ? p.yarns.map((y) => normYarn(y)) : decYarns(p.yarns) };
  // (Change 2) every piece and gallery record carries its chart edition; records saved before editions
  // existed were knit on edition 1 (for the patterns Change 2 knits in the round: the flat one)
  for (const p of Object.values(s.pieces)) if (!(p.ed >= 1)) p.ed = 1;
  s.gallery = (raw.gallery || []).map((g) => ({ ...g, ed: g.ed >= 1 ? g.ed : 1, slots: g.slots && typeof g.slots === 'object' ? g.slots : {}, yarns: Array.isArray(g.yarns) ? g.yarns.map((y) => normYarn(y)) : decYarns(g.yarns) }));
  // saves from before the unlock counters: rebuild them from what's there
  if (typeof raw.lifetimeStitches !== 'number') {
    s.lifetimeStitches = s.gallery.reduce((t, g) => t + g.yarns.length, 0) + Object.values(s.pieces).reduce((t, p) => t + p.yarns.length, 0) + (s.scarf.stitches || 0);
  }
  if (typeof raw.piecesFinished !== 'number') s.piecesFinished = s.gallery.length;
  // the cat: a save from before her coat and name could change keeps the cream Purl she was
  const rc = raw.cat && typeof raw.cat === 'object' ? raw.cat : {};
  s.cat = { coat: CAT_COATS.includes(rc.coat) ? rc.coat : 'cream', name: cleanName(rc.name) || 'Purl' };
  s.room = migrateRoom(raw.room);
  // (Change 4) a room saved before the scarf hung in it: it's already on its pegs, first in the list (so
  // cleanRoom's 40-thing limit, which keeps the saved order, can't drop it). Tested on raw: s starts as
  // fresh(), whose roomV is already 2. A scarf put away later stays away.
  if (!(raw.roomV >= 2)) {
    if (!s.room.some((e) => e.ref === 'scarf')) s.room.unshift(scarfEntry());
    s.roomV = 2;
  }
  if (!(typeof raw.roomScarfCm === 'number' && raw.roomScarfCm >= 0)) s.roomScarfCm = null;
  if (!(Number.isInteger(s.roomScarfFact) && s.roomScarfFact >= 0)) s.roomScarfFact = 0;
  if (!Array.isArray(raw.finishedPatterns)) s.finishedPatterns = [...new Set(s.gallery.map((g) => g.pattern))];
  s.v = VERSION;
  return s;
}

export function get() { return S || load(); }
export function failSaves(on) { failing = !!on; if (!on) saveNow(); }

export function saveNow() {
  clearTimeout(saveTimer); saveTimer = 0;
  lastSave = performance.now();
  try {
    if (failing) throw new Error('QuotaExceededError (failSaves)');
    localStorage.setItem(SAVE_KEY, serialize());
    listeners.saveOk.forEach((f) => f());
    return true;
  } catch (e) {
    listeners.saveError.forEach((f) => f(e));
    return false;
  }
}
// at most every 2 s while knitting
export function saveSoon() {
  if (saveTimer) return;
  const wait = Math.max(0, 2000 - (performance.now() - lastSave));
  saveTimer = setTimeout(saveNow, wait);
}
export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(PREV_KEY); } catch { /* ignore */ }
  S = fresh();
}

// ---------------------------------------------------------------- counts and unlocks
export function chapterDone(n) { const last = chapterLast(n); return !!last && get().finishedPatterns.includes(last.id); }
export const ribbons = () => CHAPTERS.map((_, i) => chapterDone(i + 1));

export function ruleMet(rule) {
  const s = get();
  if (!rule || rule.start) return true;
  if (rule.any) return rule.any.some(ruleMet);
  if (rule.stitches != null) return s.lifetimeStitches >= rule.stitches;
  if (rule.pieces != null) return s.piecesFinished >= rule.pieces;
  if (rule.chapter != null) return chapterDone(rule.chapter);
  if (rule.pattern != null) { const p = findPattern(rule.pattern); return !!p && s.finishedPatterns.includes(p.id); }
  if (rule.scarfCm != null) return (s.scarf.cm || 0) >= rule.scarfCm;
  if (rule.firstWearable) return s.finishedPatterns.some((id) => { const p = patternById(id); return p && p.wear; });
  if (rule.allPatterns) return BOOK.length > 0 && BOOK.every((p) => s.finishedPatterns.includes(p.id));
  return false;
}
// what's earned (the counters): the toasts, the Bag's "new" badges and the book's card flips go by this
export function isEarned(id) { const u = ruleById(id); return u ? ruleMet(u.rule) : false; }
// what's available to use: earned, or everything while Settings' "Unlock everything" is on (a view
// override only: the counters, seenUnlocks and the rest of the progress are left as they are)
export function isUnlocked(id) { if (overrideOn()) return !!ruleById(id); return isEarned(id); }
export const unlockedOf = (kind) => UNLOCK_RULES.filter((u) => u.kind === kind && isUnlocked(u.id)).map((u) => u.item);

const fmt = (n) => Math.max(0, Math.round(n)).toLocaleString('en-US');
// "1,240 more stitches", "Finish 3 more pieces", "Finish chapter 3 (its last pattern is the Argyle Sock)"
export function remainingText(rule) {
  const s = get();
  if (!rule || rule.start) return '';
  if (rule.any) return rule.any.map(remainingText).join(', or ');
  if (rule.stitches != null) { const n = rule.stitches - s.lifetimeStitches; return `${fmt(n)} more stitch${n === 1 ? '' : 'es'}`; }
  if (rule.pieces != null) { const n = rule.pieces - s.piecesFinished; return `Finish ${fmt(n)} more piece${n === 1 ? '' : 's'}`; }
  if (rule.chapter != null) { const l = chapterLast(rule.chapter); return `Finish chapter ${rule.chapter}${l ? ` (its last pattern is the ${l.name})` : ''}`; }
  if (rule.pattern != null) { const p = findPattern(rule.pattern); return `Finish the ${p ? p.name : rule.pattern}`; }
  if (rule.scarfCm != null) { const cm = rule.scarfCm - (s.scarf.cm || 0); return `Knit the Infinite Scarf ${fmtLen(Math.ceil(cm))} longer`; }
  if (rule.firstWearable) return 'Finish your first wearable (a wristwarmer or a headband)';
  if (rule.allPatterns) { const n = BOOK.filter((p) => !s.finishedPatterns.includes(p.id)).length; return `Finish all ${BOOK.length} patterns (${n} to go)`; }
  return '';
}

let unlockAllFlag = false; // the debug hook's __game.unlockAll()
export function unlockAll() { unlockAllFlag = true; }
export const overrideOn = () => unlockAllFlag || !!(S && S.settings && S.settings.unlockAll);
export const allUnlocked = overrideOn;

// Patterns: 3 to start, one more per piece finished (Knit again counts), in book order.
export function patternsEarned() { return Math.min(BOOK.length, 3 + get().piecesFinished); }
export function patternsUnlocked() { return overrideOn() ? BOOK.length : patternsEarned(); }
// open to knit: earned or unlocked-everything, and always a pattern with a piece on the needles or
// one already knit (so switching "Unlock everything" off never strands a piece)
export const patternUnlocked = (id) => {
  const i = BOOK.findIndex((p) => p.id === id);
  if (i < 0) return false;
  if (i < patternsUnlocked()) return true;
  const s = get();
  return !!s.pieces[pieceId(id)] || s.finishedPatterns.includes(id);
};

// Settings' "Unlock everything". Switching it off puts back what's earned: anything equipped that
// isn't earned goes back to the starting choice (decor and Purl's things that aren't earned come off).
const DEFAULT_EQUIP = { needles: 'bamboo', marker: 'ring', counter: 'brass', holder: 'floor' };
export function setUnlockAll(on) {
  const s = get();
  s.settings.unlockAll = !!on;
  if (!on && !unlockAllFlag) {
    const e = s.equipped;
    for (const [k, def] of Object.entries(DEFAULT_EQUIP)) if (!isEarned(`${k}:${e[k]}`)) e[k] = def;
    e.decor = e.decor.filter((d) => isEarned(`decor:${d}`));
    e.purl = e.purl.filter((d) => isEarned(`purl:${d}`));
    if (s.lastDoll && !isEarned(`doll:${s.lastDoll}`)) s.lastDoll = null;
  }
  saveSoon();
}

// New unlocks since last shown: ids not in seenUnlocks that are now unlocked.
const toastQueue = [];
export function checkUnlocks() {
  const s = get();
  const fresh = [];
  for (const u of UNLOCK_RULES) {
    if (u.rule.start) continue;
    if (s.seenUnlocks.includes(u.id) || toastQueue.includes(u.id)) continue;
    if (ruleMet(u.rule)) { toastQueue.push(u.id); fresh.push(u.id); }
  }
  return fresh;
}
export const pendingToasts = () => toastQueue;
export function takeToast() {
  const id = toastQueue.shift();
  if (id && !get().seenUnlocks.includes(id)) { get().seenUnlocks.push(id); saveSoon(); }
  return id ? ruleById(id) : null;
}

export function addStitches(n) { get().lifetimeStitches += n; }

// ---------------------------------------------------------------- equipping
export function equip(kind, item) {
  const e = get().equipped;
  const map = { needles: 'needles', marker: 'marker', markers: 'marker', counter: 'counter', holder: 'holder' };
  if (map[kind]) { e[map[kind]] = item; saveSoon(); return true; }
  if (kind === 'decor' || kind === 'purl') {
    const list = e[kind];
    const i = list.indexOf(item);
    if (i < 0) list.push(item); else list.splice(i, 1);
    saveSoon(); return true;
  }
  if (kind === 'doll') { get().lastDoll = item; saveSoon(); return true; }
  if (kind === 'yarn' || kind === 'scarf' || kind === 'room') return true; // room pieces are placed in the room, not equipped
  return false;
}
// "Use it" equips without toggling decor off
export function useUnlock(u) {
  const e = get().equipped;
  if ((u.kind === 'decor' || u.kind === 'purl') && e[u.kind].includes(u.item)) return;
  equip(u.kind, u.item);
}

// ---------------------------------------------------------------- pieces in progress
export const pieceId = (patternId) => `w-${patternId}`;
export function getPiece(patternId) { return get().pieces[pieceId(patternId)] || null; }
export function startPiece(pattern, slots) {
  const p = { id: pieceId(pattern.id), pattern: pattern.id, ed: pattern.edition || 1, yarns: [], slots: { ...slots }, follow: true, free: null, castOn: slots.A || Object.values(slots)[0], started: Date.now(), updated: Date.now() };
  get().pieces[p.id] = p;
  get().lastPiece = pattern.id;
  saveNow();
  return p;
}
export function dropPiece(patternId) { delete get().pieces[pieceId(patternId)]; }

// ---------------------------------------------------------------- the gallery
export function finishPiece(piece, pattern) {
  const s = get();
  s.serial += 1;
  const g = { id: `g${s.serial}`, pattern: pattern.id, ed: piece.ed || pattern.edition || 1, name: pattern.name, yarns: piece.yarns.slice(), slots: { ...piece.slots }, castOn: piece.castOn, finished: Date.now(), hung: false, pending: true };
  s.gallery.push(g);
  s.piecesFinished += 1;
  const first = !s.finishedPatterns.includes(pattern.id);
  if (first) s.finishedPatterns.push(pattern.id);
  delete s.pieces[piece.id];
  if (s.lastPiece === pattern.id) s.lastPiece = null;
  if (!s.bookComplete && BOOK.length && BOOK.every((p) => s.finishedPatterns.includes(p.id))) s.bookComplete = true;
  saveNow();
  return g;
}
export const galleryById = (id) => get().gallery.find((g) => g.id === id) || null;
export const wall = () => get().gallery.filter((g) => g.hung).sort((a, b) => (b.hungAt || b.finished) - (a.hungAt || a.finished));
export const basket = () => get().gallery.filter((g) => !g.hung && !g.shelf).sort((a, b) => b.finished - a.finished);
// Knitted Friends sitting on the Doll Shelf (the toy row), oldest first
export const shelf = () => get().gallery.filter((g) => g.shelf && !g.hung).sort((a, b) => (a.shelfAt || a.finished) - (b.shelfAt || b.finished));
export function hang(id) { const g = galleryById(id); if (g) { g.hung = true; g.shelf = false; g.pending = false; g.hungAt = Date.now(); saveNow(); } return g; }
export function takeDown(id) { const g = galleryById(id); if (g) { g.hung = false; g.shelf = false; g.pending = false; saveNow(); } return g; }
export function toBasket(id) { const g = galleryById(id); if (g) { g.hung = false; g.shelf = false; g.pending = false; saveNow(); } return g; }
export function toShelf(id) { const g = galleryById(id); if (g) { g.hung = false; g.shelf = true; g.pending = false; g.shelfAt = Date.now(); saveNow(); } return g; }

// ---------------------------------------------------------------- recent and custom yarns
export function pushRecent(y) {
  const s = get();
  s.recent = [y, ...s.recent.filter((r) => yarnKey(r) !== yarnKey(y))].slice(0, 5);
}
export function pushCustom(hex) {
  const s = get();
  s.custom = [hex, ...s.custom.filter((h) => h !== hex)].slice(0, 8);
  saveSoon();
}
