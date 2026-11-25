// roomRules.js — the cozy room's rules (Change 3, CHANGE_3.md "Sizes and places"): what each thing is, its
// size in room units (1 ru = a doll's standing height), the surfaces (the same ids, capacities and limits in
// both pictures), packing, whether a thing fits, placing it, and cleaning the saved room at boot.
// Nothing here touches the DOM; room.js draws, the Bag's preview uses the same layout.
import * as S from './state.js';
import { recordChart } from './render.js';
import { isToy } from './plush.js';
import { DOLLS, DOLL_NAMES } from './worn.js';

export const LAYERS = ['wall', 'shelf-top', 'shelf-low', 'floor-back', 'window-seat', 'chair', 'rug', 'rug-front'];
const ALL_FLOOR = ['doll', 'purl', 'toy', 'pillow', 'piece:table', 'piece:plant', 'piece:books', 'piece:chest', 'piece:teaset', 'piece:lamp'];
export const SURFACES = {
  'frame-hook': { kind: 'hook', layer: 'wall', capacity: 1, accepts: ['piece:frame'], name: 'the picture hook' },
  'garland-hook': { kind: 'hook', layer: 'wall', capacity: 1, accepts: ['piece:garland'], name: 'the window' },
  'shelf-top': { kind: 'line', layer: 'shelf-top', capacity: 2.5, maxH: 1.15, accepts: ['doll', 'purl', 'toy', 'piece:plant', 'piece:books'], name: 'the top shelf' },
  'shelf-low': { kind: 'line', layer: 'shelf-low', capacity: 2.5, maxH: 1.15, accepts: ['doll', 'purl', 'toy', 'piece:plant', 'piece:books'], name: 'the low shelf' },
  'floor-back': { kind: 'line', layer: 'floor-back', capacity: 1.5, maxH: 2.4, accepts: ['doll', 'purl', 'toy', 'piece:table', 'piece:plant', 'piece:books', 'piece:chest', 'piece:lamp'], name: 'the floor by the wall' },
  'seat-drape': { kind: 'drape', layer: 'window-seat', capacity: 1, accepts: ['blanket'], name: 'the window seat' },
  'window-seat': { kind: 'line', layer: 'window-seat', capacity: 2.0, maxH: 1.6, accepts: ['doll', 'purl', 'toy', 'pillow', 'piece:plant', 'piece:books', 'piece:teaset'], name: 'the window seat' },
  'chair-drape': { kind: 'drape', layer: 'chair', capacity: 1, accepts: ['blanket'], name: 'the armchair' },
  'chair-arm-l': { kind: 'line', layer: 'chair', capacity: 0.8, maxH: 1.5, accepts: ['toy', 'piece:plant', 'piece:books'], name: 'the chair arm' },
  'chair-arm-r': { kind: 'line', layer: 'chair', capacity: 0.8, maxH: 1.5, accepts: ['toy', 'piece:plant', 'piece:books'], name: 'the chair arm' },
  'chair-seat': { kind: 'line', layer: 'chair', capacity: 1.2, maxH: 2.0, accepts: ['doll', 'purl', 'toy', 'pillow', 'piece:books'], name: 'the armchair' },
  // the rug holds a group in two rows: its middle, and its front edge (drawn over the middle row)
  rug: { kind: 'line', layer: 'rug', capacity: 4.0, maxH: 3.0, accepts: ALL_FLOOR, name: 'the rug' },
  'rug-front': { kind: 'line', layer: 'rug-front', capacity: 3.5, maxH: 3.0, accepts: ALL_FLOOR, name: 'the front of the rug' },
};
export const SURFACE_IDS = Object.keys(SURFACES);
export const LINE_IDS = SURFACE_IDS.filter((id) => SURFACES[id].kind === 'line');
// keyboard Up / Down: back to front
export const LINE_ORDER = ['shelf-top', 'shelf-low', 'floor-back', 'window-seat', 'chair-arm-l', 'chair-seat', 'chair-arm-r', 'rug', 'rug-front'];
export const MAX_THINGS = 40;

// room pieces: height and footprint in ru, whether Turn shows (hooks never)
export const PIECES = {
  table: { h: 0.9, foot: 0.7, turns: true, name: 'The side table' },
  plant: { h: 0.6, foot: 0.4, turns: true, name: 'The plant' },
  books: { h: 0.35, foot: 0.45, turns: true, name: 'The storybooks' },
  chest: { h: 0.8, foot: 1.1, turns: true, name: 'The toy chest' },
  teaset: { h: 0.3, foot: 0.8, turns: true, name: 'The tea set' },
  lamp: { h: 2.2, foot: 0.6, turns: true, name: 'The lamp' },
  garland: { hook: 'garland-hook', turns: false, name: 'The star garland' },
  frame: { hook: 'frame-hook', turns: false, name: 'The framed picture' },
};
export const PIECE_ORDER = ['table', 'plant', 'books', 'chest', 'teaset', 'garland', 'lamp', 'frame'];
const PILLOWS = ['heart-pillow', 'bobble-cushion'];
const BLANKETS = ['chevron-baby-blanket', 'patchwork-blanket', 'heirloom-afghan'];
// dolls' standing heights (ru): the ground line to the top of the head, from the sprites (Pip = 1)
const DOLL_H = { pip: 1, clementine: 1.01, bramble: 1.01, juniper: 1.14, basil: 1.08, mabel: 1 };

// ---------------------------------------------------------------- what a ref is
// kind: 'doll' | 'purl' | 'toy' | 'pillow' | 'blanket' | 'piece' | null
export function kindOf(ref) {
  if (typeof ref !== 'string') return null;
  if (ref === 'doll:purl') return 'purl';
  if (ref.startsWith('doll:')) return DOLLS.includes(ref.slice(5)) ? 'doll' : null;
  if (ref.startsWith('piece:')) return PIECES[ref.slice(6)] ? 'piece' : null;
  const g = S.galleryById(ref); const p = g && S.patternById(g.pattern);
  if (!p) return null;
  if (isToy(p)) return 'toy';
  if (PILLOWS.includes(p.id)) return 'pillow';
  if (BLANKETS.includes(p.id)) return 'blanket';
  return null;
}
export const acceptKey = (ref) => { const k = kindOf(ref); return k === 'piece' ? ref : k; };
export const isHookThing = (ref) => kindOf(ref) === 'piece' && !!PIECES[ref.slice(6)].hook;
export const goesOnDrape = (ref) => kindOf(ref) === 'blanket';
// in the player's hands: an unlocked doll (the cat always), a gallery piece, an unlocked room piece
export function available(ref) {
  const k = kindOf(ref);
  if (!k) return false;
  if (k === 'purl') return true;
  if (k === 'doll') return S.isUnlocked(ref);
  if (k === 'piece') return S.isUnlocked(`room:${ref.slice(6)}`);
  return true;
}
export function nameOf(ref) {
  const k = kindOf(ref);
  if (k === 'doll' || k === 'purl') return DOLL_NAMES[ref.slice(5)];
  if (k === 'piece') return PIECES[ref.slice(6)].name;
  const g = S.galleryById(ref); return g ? g.name : 'It';
}
// a short name for lines like "Pip can't go on the chair arm"
export const shortName = (ref) => { const n = nameOf(ref); return kindOf(ref) === 'piece' ? n : n; };
// Turn: only things that look different mirrored (the cat, the toys, the standing room pieces)
export function turns(ref) { const k = kindOf(ref); return k === 'purl' || k === 'toy' || (k === 'piece' && PIECES[ref.slice(6)].turns); }

// a toy's or pillow's plush aspect (width / height), from its chart: stitches 0.72 as tall as wide, with
// the plush's rim and the cast-on and bind-off edges round it
const aspectCache = new Map();
export function plushAspect(ref) {
  if (aspectCache.has(ref)) return aspectCache.get(ref);
  const g = S.galleryById(ref); const p = g && S.patternById(g.pattern);
  let a = 1;
  if (p) { try { const c = recordChart(g, p); a = (c.width + 3) / (c.height * 0.72 + 3.6); } catch { a = 1; } }
  aspectCache.set(ref, a);
  return a;
}
export const setPlushAspect = (ref, a) => { if (a > 0.1 && a < 10) aspectCache.set(ref, a); };
// {h, foot} in ru
export function sizeOf(ref) {
  const k = kindOf(ref);
  if (k === 'doll') return { h: DOLL_H[ref.slice(5)] || 1, foot: 0.6 };
  if (k === 'purl') return { h: 0.8, foot: 0.6 };
  if (k === 'piece') { const P = PIECES[ref.slice(6)]; return P.hook ? { h: 0, foot: 1 } : { h: P.h, foot: P.foot }; }
  if (k === 'toy' || k === 'pillow') {
    const [H, lo, hi] = k === 'toy' ? [0.55, 0.35, 0.8] : [0.5, 0.45, 0.7];
    const a = plushAspect(ref);
    let h = H, w = H * a;
    if (w > hi) { w = hi; h = hi / a; }
    return { h, foot: Math.max(lo, w), w };
  }
  if (k === 'blanket') return { h: 0, foot: 1 };
  return { h: 1, foot: 0.6 };
}

// ---------------------------------------------------------------- packing
// a surface's things sorted by t, pushed right so footprints don't overlap, then back left from the right
// end. Returns [{e, t}] (layout only: never writes the save)
export function packSurface(list, sid, extra = null) {
  const S0 = SURFACES[sid];
  const items = list.filter((e) => e.surface === sid && (!extra || e.ref !== extra.ref)).map((e) => ({ e, t: e.t, f: sizeOf(e.ref).foot }));
  if (extra) items.push({ e: extra, t: extra.t, f: sizeOf(extra.ref).foot });
  if (!S0 || S0.kind !== 'line') return items;
  // ties: the newcomer goes where it was dropped (it sorts by its t like the rest)
  items.sort((a, b) => a.t - b.t || (a.e === extra ? -1 : b.e === extra ? 1 : 0));
  const cap = S0.capacity;
  let prev = -Infinity;
  for (const it of items) { it.t = Math.max(it.t, it.f / 2, prev + it.f / 2); prev = it.t + it.f / 2; }
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const lim = i === items.length - 1 ? cap - it.f / 2 : items[i + 1].t - items[i + 1].f / 2 - it.f / 2;
    it.t = Math.min(it.t, lim);
  }
  // pushed past the left end (over capacity): clamp, overlapping (cleanRoom sends the overflow back first)
  if (items.length) items[0].t = Math.max(items[0].f / 2, items[0].t);
  return items;
}
// what's in the player's hands takes space; a locked thing kept in the save (hidden) doesn't
export const live = (list) => list.filter((e) => available(e.ref));
export const usedOn = (list, sid, not = null) => live(list).filter((e) => e.surface === sid && e.ref !== not).reduce((t, e) => t + (SURFACES[sid].kind === 'line' ? sizeOf(e.ref).foot : 1), 0);

// does ref fit on surface sid (list: the room, ref itself left out)? null, or the reason it doesn't
export function fitReason(list, ref, sid) {
  const Sf = SURFACES[sid];
  if (!Sf) return 'unknown';
  if (!Sf.accepts.includes(acceptKey(ref))) return 'not-here';
  if (Sf.kind !== 'line') return null; // hooks and drapes hold one: a blanket swaps, a hook piece has its own hook
  const { h, foot } = sizeOf(ref);
  if (h > Sf.maxH + 1e-6) return 'too-tall';
  if (foot > Sf.capacity + 1e-6) return 'too-wide';
  if (usedOn(list, sid, ref) + foot > Sf.capacity + 1e-6) return 'full';
  return null;
}

// the gentle line for a reason
export function reasonText(reason, ref, sid) {
  const where = SURFACES[sid] ? SURFACES[sid].name : 'there';
  if (reason === 'not-here') {
    if (ref === 'piece:lamp') return 'The lamp stands on the floor';
    if (ref === 'piece:chest' || ref === 'piece:table') return `${nameOf(ref)} stands on the floor`;
    if (kindOf(ref) === 'blanket') return 'Blankets go over the armchair or the window seat';
    if (ref === 'piece:garland') return 'The garland hangs in the window';
    if (ref === 'piece:frame') return 'The picture hangs on the wall by the window';
    return `${nameOf(ref)} can't go on ${where}`;
  }
  if (reason === 'too-tall') return `Too tall for ${where}`;
  if (reason === 'too-wide') return `Too big for ${where}`;
  if (reason === 'full') return `No room left on ${where}`;
  if (reason === 'room-full') return 'The room is full. Put something away first.';
  if (reason === 'nowhere') return 'Put it on the rug, a seat or a shelf';
  if (reason === 'locked') return 'Not yours yet';
  return "That can't go there";
}

// ---------------------------------------------------------------- placing
// Put ref on surface sid at t (ru from the surface's left end). Mutates list on success: the thing goes in
// at t, every thing on that surface gets its packed t (the save is what you see) and the newcomer the top z.
// A blanket on a drape that has one swaps it (the old one back to Your things). Returns {ok, surface, t,
// reason, swapped}.
export function place(list, ref, sid, t) {
  const k = kindOf(ref);
  if (!k) return { ok: false, reason: 'unknown', surface: sid, t };
  if (!available(ref)) return { ok: false, reason: 'locked', surface: sid, t };
  const Sf = SURFACES[sid];
  if (!Sf) return { ok: false, reason: 'unknown', surface: sid, t };
  const had = list.find((e) => e.ref === ref);
  if (!had && live(list).length >= MAX_THINGS) return { ok: false, reason: 'room-full', surface: sid, t };
  const why = fitReason(list, ref, sid);
  if (why) return { ok: false, reason: why, surface: sid, t };
  let swapped = null;
  if (Sf.kind !== 'line') {
    const there = live(list).find((e) => e.surface === sid && e.ref !== ref);
    if (there) { swapped = there.ref; list.splice(list.indexOf(there), 1); }
    t = 0.5;
  }
  const { foot } = sizeOf(ref);
  const cap = Sf.kind === 'line' ? Sf.capacity : 1;
  t = Math.max(foot / 2, Math.min(cap - foot / 2, Number.isFinite(+t) ? +t : cap / 2));
  if (Sf.kind !== 'line') t = 0.5;
  const z = live(list).filter((e) => e.surface === sid && e.ref !== ref).reduce((m, e) => Math.max(m, e.z + 1), 0);
  const entry = had || { ref, surface: sid, t, flip: false, z };
  if (had) list.splice(list.indexOf(had), 1);
  entry.surface = sid; entry.t = t; entry.z = z;
  if (Sf.kind === 'line') {
    for (const it of packSurface(live(list), sid, entry)) it.e.t = Math.round(it.t * 1000) / 1000;
  }
  list.push(entry);
  return { ok: true, surface: sid, t: entry.t, reason: null, swapped };
}
export function bringToFront(list, ref) {
  const e = list.find((x) => x.ref === ref); if (!e) return false;
  const top = list.filter((x) => x.surface === e.surface && x !== e).reduce((m, x) => Math.max(m, x.z), -1);
  if (e.z > top) return false;
  e.z = top + 1; return true;
}

// ---------------------------------------------------------------- the save, at boot (needs the book)
// keeps entries whose ref is a known placeable thing, sends an unknown surface to the rug (a surface that
// won't take it: its first one that does), clamps t, packs each surface (what overflows goes back to Your
// things) and renumbers z per surface. Locked dolls and pieces stay (they're drawn only when unlocked).
export function cleanRoom() {
  const s = S.get();
  const raw0 = Array.isArray(s.room) ? s.room : [];
  // what the player has claims its place first; a locked thing stays (hidden) only where it still fits
  const raw = [...raw0.filter((e) => available(e.ref)), ...raw0.filter((e) => !available(e.ref))];
  const out = [];
  for (const e of raw) {
    const k = kindOf(e.ref);
    if (!k) continue;
    if (!turns(e.ref)) e.flip = false;
    let sid = SURFACES[e.surface] ? e.surface : 'rug';
    const key = acceptKey(e.ref);
    if (!SURFACES[sid].accepts.includes(key)) sid = SURFACE_IDS.find((id) => SURFACES[id].accepts.includes(key)) || null;
    if (!sid) continue;
    const Sf = SURFACES[sid];
    if (Sf.kind !== 'line') { if (out.some((x) => x.surface === sid)) continue; out.push({ ...e, surface: sid, t: 0.5 }); continue; }
    const { h, foot } = sizeOf(e.ref);
    if (h > Sf.maxH + 1e-6 || foot > Sf.capacity + 1e-6) continue;
    const usedAll = out.filter((x) => x.surface === sid).reduce((n, x) => n + sizeOf(x.ref).foot, 0);
    if (usedAll + foot > Sf.capacity + 1e-6) continue; // overflow: back to Your things
    out.push({ ...e, surface: sid, t: Math.max(foot / 2, Math.min(Sf.capacity - foot / 2, e.t)) });
  }
  out.sort((a, b) => raw0.findIndex((x) => x.ref === a.ref) - raw0.findIndex((x) => x.ref === b.ref)); // the saved order
  if (out.length > MAX_THINGS) out.length = MAX_THINGS;
  for (const sid of SURFACE_IDS) {
    const on = out.filter((e) => e.surface === sid);
    if (SURFACES[sid].kind === 'line') for (const it of packSurface(live(out), sid)) it.e.t = Math.round(it.t * 1000) / 1000;
    on.sort((a, b) => a.z - b.z).forEach((e, i) => { e.z = i; });
  }
  s.room = out;
  return out;
}

// everything the player could put in the room, in Your things' order: dolls, the cat, toys (newest
// first), soft things, room pieces
export function allThings() {
  const s = S.get();
  const out = [];
  for (const d of DOLLS) if (d !== 'purl' && S.isUnlocked(`doll:${d}`)) out.push({ ref: `doll:${d}`, sec: 'Dolls' });
  out.push({ ref: 'doll:purl', sec: S.catName() });
  const gal = s.gallery.slice().sort((a, b) => b.finished - a.finished);
  for (const g of gal) if (kindOf(g.id) === 'toy') out.push({ ref: g.id, sec: 'Toys' });
  for (const g of gal) { const k = kindOf(g.id); if (k === 'pillow' || k === 'blanket') out.push({ ref: g.id, sec: 'Soft things' }); }
  for (const it of PIECE_ORDER) if (S.isUnlocked(`room:${it}`)) out.push({ ref: `piece:${it}`, sec: 'Room pieces' });
  return out;
}
export { DOLLS };
