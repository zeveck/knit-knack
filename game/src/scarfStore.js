// scarfStore.js — the Infinite Scarf's stitches, saved forever in IndexedDB ('knitknack-scarf'):
// two bytes per stitch (a Uint16 index into the scarf's own yarn table) in chunks of 1,200 stitches
// (1 m), plus a run list of stitch-pattern changes by row. Only dirty chunks are rewritten; saves are
// throttled (at most every 2 s while knitting, at each row end, on leaving and when the page hides).
// Also: the scarf's stitch patterns (front-view rows), its endless chart and fixed segment charts.
import { endlessChart, parseChart } from './chart.js';
import { yarnKey, normYarn } from './yarn.js';
import { yarnColorAt } from './stitches.js';

export const WIDTH = 12;
export const CHUNK = 1200;
export const STITCH_W_CM = 1 / 0.72; // a row is 1 cm; a stitch is 1/0.72 cm wide
export const SCARF_W_CM = WIDTH * STITCH_W_CM; // about 16.7 cm

// ---------------------------------------------------------------- stitch patterns (how each row looks from the front)
export const SCARF_PATTERNS = {
  garter: { name: 'Garter', note: 'k every row' },
  rib2: { name: '2×2 rib', note: 'k2, p2' },
  seed: { name: 'Seed', note: 'k1, p1, offset' },
  cable: { name: 'Centre cable', note: 'C4F every 6th row' },
  lace: { name: 'Lace column', note: 'eyelets up the middle' },
};
export function scarfRowSpec(pattern, r) {
  const rs = r % 2 === 1;
  const g = rs ? 'k' : 'p'; // garter edge, seen from the front
  if (pattern === 'rib2') return { stitch: 'kkppkkppkkpp' };
  if (pattern === 'seed') { let s = ''; for (let c = 0; c < WIDTH; c++) s += (r + c) % 2 === 1 ? 'k' : 'p'; return { stitch: s }; }
  if (pattern === 'cable') {
    const cross = r % 6 === 5;
    return { stitch: g + g + 'pp' + (cross ? 'xxxx' : 'kkkk') + 'pp' + g + g, cables: cross ? [{ col: 4, type: 'C4F' }] : [] };
  }
  if (pattern === 'lace') {
    let mid = 'kkkkkk';
    if (r > 1 && r % 4 === 1) mid = '<okko>';
    else if (r % 4 === 3) mid = 'o>kk<o';
    return { stitch: g + g + 'p' + mid + 'p' + g + g };
  }
  return { stitch: g.repeat(WIDTH) }; // garter
}
// runs: [{row, pattern}] sorted by row
export function patternAt(runs, r) {
  let lo = 0, hi = runs.length - 1, best = runs[0] ? runs[0].pattern : 'garter';
  while (lo <= hi) { const m = (lo + hi) >> 1; if (runs[m].row <= r) { best = runs[m].pattern; lo = m + 1; } else hi = m - 1; }
  return best;
}
export function scarfChart(runs) { return endlessChart(WIDTH, (r) => scarfRowSpec(patternAt(runs, r), r)); }

// A fixed chart of scarf rows r0..r1 (for the worn scarf and the comparison view's close-ups), with
// yarnAt mapped to the scarf's stitches. A segment that doesn't start at row 1 begins with one plain
// row (row r0-1 as all knit, a stand-in for the cast-on), and r0 is kept even so RS rows stay RS.
export function segmentChart(runs, r0, r1, scarfYarnAt) {
  const fake = r0 > 1;
  if (fake && r0 % 2 === 1) r0 -= 1;
  const lines = [], cables = [];
  const n = r1 - r0 + 1 + (fake ? 1 : 0);
  for (let j = 1; j <= n; j++) {
    const r = fake ? r0 + j - 2 : j;
    const spec = fake && j === 1 ? { stitch: 'k'.repeat(WIDTH) } : scarfRowSpec(patternAt(runs, r), r);
    lines.push(spec.stitch);
    for (const c of spec.cables || []) cables.push({ row: j, col: c.col, type: c.type });
  }
  const chart = parseChart({ stitch: lines.reverse().join('\n'), cables, slots: { A: null } });
  const base = fake ? (r0 - 2) * WIDTH : 0;
  return { chart, yarnAt: (i) => scarfYarnAt(base + i), castOnYarn: scarfYarnAt(base), fake, r0, rows: n };
}

// ---------------------------------------------------------------- the store
const DB = 'knitknack-scarf';
let db = null, failing = false;
function open() {
  if (db) return Promise.resolve(db);
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) { rej(new Error('no IndexedDB')); return; }
    let rq;
    try { rq = indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
    // (Change 4) an open that never answers (blocked by another tab, a stuck browser) gives up after 4 s,
    // so nothing waiting on the scarf hangs
    const timer = setTimeout(() => rej(new Error('IndexedDB open timed out')), 4000);
    rq.onupgradeneeded = () => { const d = rq.result; if (!d.objectStoreNames.contains('chunks')) d.createObjectStore('chunks'); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); };
    rq.onsuccess = () => { clearTimeout(timer); db = rq.result; res(db); };
    rq.onerror = () => { clearTimeout(timer); rej(rq.error); };
    rq.onblocked = () => { clearTimeout(timer); rej(new Error('IndexedDB open blocked')); };
  });
}

class ScarfStore {
  constructor() {
    this.idx = new Uint16Array(CHUNK * 4); this.n = 0;
    this.table = []; this.tkey = new Map();
    this.runs = [{ row: 1, pattern: 'garter' }];
    this.current = { color: '#9e2a3a', type: 'wool' };
    this.dirty = new Set(); this.metaDirty = false;
    this.version = 0; this.loaded = false; this.broken = false;
    this._timer = 0; this._last = 0;
    this.listeners = [];
    this._strips = []; this._stripDone = 0;
  }
  // ---- data
  yarnIndex(y) {
    const k = yarnKey(y);
    let j = this.tkey.get(k);
    if (j === undefined) { j = this.table.length; this.table.push({ color: y.color.toLowerCase(), type: y.type }); this.tkey.set(k, j); this.metaDirty = true; }
    return j;
  }
  yarnAt(i) { return this.table[this.idx[Math.min(i, this.n - 1)]] || this.current; }
  rows() { return Math.floor(this.n / WIDTH); }
  cm() { return this.n / WIDTH; }
  push(y) {
    if (this.n >= this.idx.length) { const a = new Uint16Array(this.idx.length * 2); a.set(this.idx); this.idx = a; }
    const j = this.yarnIndex(y);
    this.idx[this.n] = j;
    this.dirty.add(Math.floor(this.n / CHUNK));
    this.n++; this.version++;
  }
  pop() {
    if (this.n <= 0) return false;
    this.n--; this.dirty.add(Math.floor(this.n / CHUNK)); this.version++;
    if (this._stripDone > this.n) this._stripDone = this.n - (this.n % WIDTH);
    return true;
  }
  yarnsArray() { const out = new Array(this.n); for (let i = 0; i < this.n; i++) out[i] = this.table[this.idx[i]]; return out; }
  // a stitch-pattern change from row r on (later runs are dropped: the scarf only grows at the top)
  setPattern(pattern, r) {
    this.runs = this.runs.filter((x) => x.row < r);
    if (!this.runs.length || this.runs[this.runs.length - 1].pattern !== pattern) this.runs.push({ row: r, pattern });
    if (!this.runs.length) this.runs.push({ row: 1, pattern });
    this.metaDirty = true; this.version++;
  }
  patternAtRow(r) { return patternAt(this.runs, r); }
  // ---- saving
  async load() {
    try {
      const d = await open();
      const meta = await new Promise((res, rej) => { const t = d.transaction('meta').objectStore('meta').get('meta'); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); });
      if (meta) {
        this.table = (meta.yarns || []).map((y) => normYarn(y));
        this.tkey = new Map(this.table.map((y, j) => [yarnKey(y), j]));
        this.runs = meta.runs && meta.runs.length ? meta.runs : this.runs;
        if (meta.current) this.current = normYarn(meta.current);
        const n = meta.stitches || 0;
        this.idx = new Uint16Array(Math.max(CHUNK * 4, Math.ceil((n + CHUNK) / CHUNK) * CHUNK));
        const chunks = Math.ceil(n / CHUNK);
        const all = await new Promise((res, rej) => {
          const out = [];
          const t = d.transaction('chunks').objectStore('chunks').openCursor();
          t.onsuccess = () => { const c = t.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); };
          t.onerror = () => rej(t.error);
        });
        for (const [k, v] of all) if (k < chunks) this.idx.set(new Uint16Array(v).subarray(0, Math.min(CHUNK, n - k * CHUNK)), k * CHUNK);
        this.n = n;
      }
    } catch (e) { console.warn('scarf load', e); this.broken = true; }
    this.loaded = true; this.version++;
    return this;
  }
  saveSoon() {
    if (this._timer) return;
    const wait = Math.max(0, 2000 - (performance.now() - this._last));
    this._timer = setTimeout(() => this.saveNow(), wait);
  }
  async saveNow() {
    clearTimeout(this._timer); this._timer = 0; this._last = performance.now();
    if (!this.loaded) return false;
    // a store that didn't load never writes over what may still be there (it would save an empty scarf)
    if (this.broken) { this.listeners.forEach((f) => f(false, new Error('scarf store not loaded'))); return false; }
    const dirty = [...this.dirty]; this.dirty.clear();
    const metaDirty = true; this.metaDirty = false;
    try {
      if (failing) throw new Error('scarf save failing (failSaves)');
      const d = await open();
      await new Promise((res, rej) => {
        const tx = d.transaction(['chunks', 'meta'], 'readwrite');
        const cs = tx.objectStore('chunks');
        for (const k of dirty) {
          const a = this.idx.slice(k * CHUNK, Math.min(this.n, (k + 1) * CHUNK));
          cs.put(a.buffer, k);
        }
        if (metaDirty) tx.objectStore('meta').put({ yarns: this.table, runs: this.runs, stitches: this.n, current: this.current, width: WIDTH, chunk: CHUNK, saved: Date.now() }, 'meta');
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
      });
      this.listeners.forEach((f) => f(true));
      return true;
    } catch (e) {
      for (const k of dirty) this.dirty.add(k);
      this.metaDirty = true;
      this.listeners.forEach((f) => f(false, e));
      return false;
    }
  }
  onSave(fn) { this.listeners.push(fn); }
  failSaves(on) { failing = !!on; if (!on) this.saveNow(); }
  async reset() {
    this.idx = new Uint16Array(CHUNK * 4); this.n = 0; this.table = []; this.tkey = new Map(); this.runs = [{ row: 1, pattern: 'garter' }];
    this._strips = []; this._stripDone = 0; this.version++;
    try { const d = await open(); await new Promise((res) => { const tx = d.transaction(['chunks', 'meta'], 'readwrite'); tx.objectStore('chunks').clear(); tx.objectStore('meta').clear(); tx.oncomplete = res; tx.onerror = res; }); } catch { /* */ }
  }

  // ---- the zoomed-out picture: one pixel per stitch, 12 wide, in canvases of 4096 rows (row 1 at the bottom)
  strips() {
    const R = 4096;
    const rows = Math.ceil(this.n / WIDTH);
    const need = Math.max(1, Math.ceil(rows / R));
    while (this._strips.length < need) {
      const c = document.createElement('canvas'); c.width = WIDTH; c.height = R;
      this._strips.push({ c, g: c.getContext('2d'), img: null, dirty: true });
    }
    if (this._stripDone !== this.n) {
      const from = Math.min(this._stripDone, this.n);
      const touched = new Set();
      for (const s of this._strips) if (!s.img) s.img = s.g.createImageData(WIDTH, R);
      const memo = new Map();
      for (let i = from - (from % WIDTH); i < Math.max(this.n, this._stripDone); i++) {
        const r = Math.floor(i / WIDTH), c = i % WIDTH;
        const si = Math.floor(r / R), s = this._strips[si]; if (!s) continue;
        const y = R - 1 - (r % R);
        // the chart's knitting order: RS rows run right to left
        const col = (r + 1) % 2 === 1 ? WIDTH - 1 - c : c;
        const o = (y * WIDTH + col) * 4;
        if (i >= this.n) { s.img.data[o + 3] = 0; touched.add(si); continue; }
        const yarn = this.table[this.idx[i]];
        let hex = yarn.type === 'stripe' ? yarnColorAt(yarn, i) : yarn.color;
        let rgb = memo.get(hex);
        if (!rgb) { const v = parseInt(hex.slice(1), 16); rgb = [(v >> 16) & 255, (v >> 8) & 255, v & 255]; memo.set(hex, rgb); }
        s.img.data[o] = rgb[0]; s.img.data[o + 1] = rgb[1]; s.img.data[o + 2] = rgb[2]; s.img.data[o + 3] = 255;
        touched.add(si);
      }
      for (const si of touched) this._strips[si].g.putImageData(this._strips[si].img, 0, 0);
      this._stripDone = this.n;
    }
    return { R, list: this._strips.map((s) => s.c), rows };
  }
}

export const store = new ScarfStore();
