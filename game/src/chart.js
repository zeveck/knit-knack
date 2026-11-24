// chart.js — Knit Knack chart model. Pure module: runs in the browser and in node.
//
// A chart is three fixed-width text layers (top row first, as a chart is read):
//   shape  '#' a stitch, '.' no stitch          (optional: derived from `stitch` when missing)
//   stitch k p o(yo) <(k2tog) >(ssk) m(make one) +(cast on) b(bobble) x(cable cell) .(none)
//   color  A-D                                   (optional: all 'A')
// plus `cables: [{row, col, type}]` where row is 1-based from the bottom, col is the
// span's leftmost column (0-based), type is C2F C2B C4F C4B C6F C6B.
//
// Rows are numbered from 1 at the bottom. Odd rows are RS (knit right to left),
// even rows WS (left to right, as seen from the front). Every cell is one tap.
//
// The row map (the one stitch mapping) is built exactly as GAME_DESIGN "The row map" says,
// with the review's rule that multi-stitch bind-offs and edge cast-ons happen at the
// START of a row (right edge on RS, left edge on WS), except under / across a gap.

export const USES = { k: 1, p: 1, b: 1, x: 1, '<': 2, '>': 2, o: 0, m: 0, '+': 0 };
export const CABLES = { C2F: 2, C2B: 2, C4F: 4, C4B: 4, C6F: 6, C6B: 6 };
export const STITCH_CHARS = 'kpo<>m+bx';
const MAX_SHIFT = 3;

export const GLOSSARY = {
  k: 'knit', p: 'purl', yo: 'yarn over (makes a hole)', k2tog: 'knit 2 together (right-leaning decrease)',
  ssk: 'slip, slip, knit (left-leaning decrease)', p2tog: 'purl 2 together (right-leaning from the front)',
  ssp: 'slip, slip, purl (left-leaning from the front)', M1L: 'make 1 left (left-leaning increase)',
  M1R: 'make 1 right (right-leaning increase)', M1LP: 'make 1 left purlwise', M1RP: 'make 1 right purlwise',
  MB: 'make bobble', CO: 'cast on', BO: 'bind off', RS: 'right side', WS: 'wrong side',
  st: 'stitch', sts: 'stitches', rep: 'repeat',
  C2F: 'cable 2 front: slip 1 to cable needle, hold in front, k1, k1 from cable needle',
  C2B: 'cable 2 back: slip 1 to cable needle, hold in back, k1, k1 from cable needle',
  C4F: 'cable 4 front: slip 2 to cable needle, hold in front, k2, k2 from cable needle',
  C4B: 'cable 4 back: slip 2 to cable needle, hold in back, k2, k2 from cable needle',
  C6F: 'cable 6 front: slip 3 to cable needle, hold in front, k3, k3 from cable needle',
  C6B: 'cable 6 back: slip 3 to cable needle, hold in back, k3, k3 from cable needle',
};

// ---------------------------------------------------------------- layers

export function toLines(layer) {
  if (layer == null) return null;
  const arr = Array.isArray(layer) ? layer : String(layer).split('\n');
  return arr.map((s) => String(s).trim()).filter((s) => s.length > 0);
}

const isRS = (r) => r % 2 === 1;

// ---------------------------------------------------------------- Chart

export class Chart {
  constructor(def = {}) {
    this.def = def;
    this.errors = [];
    this.warnings = [];
    this.rows = [null]; // rows[r] = {cells: Array(width) of cell|null, cols, map, ...}
    this.rowStarts = [0, 0];
    this.endless = !!def.endless;
    this.slotsUsed = new Set();
    if (this.endless) this._initEndless(def);
    else this._initFixed(def);
  }

  // ---- construction
  _initFixed(def) {
    const st = toLines(def.stitch);
    if (!st || !st.length) { this.errors.push('no stitch layer'); st && (this.height = 0); this.width = 0; this.height = 0; this.total = 0; return; }
    const shape = toLines(def.shape) || st.map((l) => l.replace(/[^.]/g, '#'));
    const color = toLines(def.color) || st.map((l) => l.replace(/./g, 'A'));
    const H = st.length, W = st[0].length;
    this.width = W; this.height = H;
    for (const [name, L] of [['stitch', st], ['shape', shape], ['color', color]]) {
      if (L.length !== H) this.errors.push(`${name} layer has ${L.length} rows, stitch has ${H}`);
      L.forEach((l, i) => { if (l.length !== W) this.errors.push(`${name} layer row ${H - i} is ${l.length} wide, expected ${W}`); });
    }
    const slotNames = def.slots ? Object.keys(def.slots) : ['A', 'B', 'C', 'D'];
    const cells = [null];
    for (let r = 1; r <= H; r++) {
      const li = H - r;
      const row = new Array(W).fill(null);
      for (let c = 0; c < W; c++) {
        const sh = (shape[li] || '')[c] || '.';
        const s = (st[li] || '')[c] || '.';
        const slot = (color[li] || '')[c] || 'A';
        if (sh === '.') { if (s !== '.' && s !== ' ') this.errors.push(`row ${r} col ${c}: stitch '${s}' outside the shape`); continue; }
        if (sh !== '#') { this.errors.push(`row ${r} col ${c}: bad shape char '${sh}'`); continue; }
        if (s === '.') { this.errors.push(`row ${r} col ${c}: shape '#' but stitch '.'`); continue; }
        if (!STITCH_CHARS.includes(s)) { this.errors.push(`row ${r} col ${c}: unknown stitch '${s}'`); continue; }
        if (!slotNames.includes(slot)) this.errors.push(`row ${r} col ${c}: unknown slot '${slot}'`);
        this.slotsUsed.add(slot);
        row[c] = { r, c, s, slot, cable: null };
      }
      cells.push(row);
    }
    this._cells = cells;
    this._attachCables(def.cables || [], (r) => cells[r]);
    for (let r = 1; r <= H; r++) this._buildRow(r);
    this.total = this.rowStarts[H + 1];
    this._checkRepeat();
  }

  _initEndless(def) {
    // def: {endless:true, width, rowFn(r) -> {stitch:'kkpp…', color?:'AAAA…' | slot, cables?:[{col,type}]}}
    this.width = def.width; this.height = Infinity; this.total = Infinity;
    this._cells = [null];
    this._rowFn = def.rowFn;
    this.slotsUsed.add('A');
  }

  _endlessCells(r) {
    while (this._cells.length <= r) {
      const rr = this._cells.length;
      const spec = this._rowFn(rr) || {};
      const W = this.width;
      const row = new Array(W).fill(null);
      for (let c = 0; c < W; c++) {
        const s = (spec.stitch || '')[c] || 'k';
        const slot = typeof spec.color === 'string' && spec.color.length === W ? spec.color[c] : (spec.color || 'A');
        if (s === '.') continue;
        row[c] = { r: rr, c, s, slot, cable: null };
        this.slotsUsed.add(slot);
      }
      this._cells.push(row);
      this._attachCables((spec.cables || []).map((x) => ({ row: rr, col: x.col, type: x.type })), (q) => this._cells[q], rr);
    }
    return this._cells[r];
  }

  _attachCables(spans, rowOf) {
    this.spans = this.spans || [];
    for (const sp of spans) {
      const n = CABLES[sp.type];
      const tag = `cable ${sp.type} at row ${sp.row} col ${sp.col}`;
      if (!n) { this.errors.push(`${tag}: unknown type`); continue; }
      if (!isRS(sp.row)) this.errors.push(`${tag}: cables only on RS (odd) rows`);
      const row = rowOf(sp.row);
      if (!row) { this.errors.push(`${tag}: row out of range`); continue; }
      const span = { row: sp.row, col: sp.col, type: sp.type, n, half: n / 2, front: sp.type.endsWith('F') ? 'F' : 'B' };
      for (let i = 0; i < n; i++) {
        const cell = row[sp.col + i];
        if (!cell || cell.s !== 'x') { this.errors.push(`${tag}: cell ${sp.col + i} is not 'x'`); continue; }
        if (cell.cable) { this.errors.push(`${tag}: overlaps another cable`); continue; }
        cell.cable = { span, i };
      }
      this.spans.push(span);
    }
  }

  cells(r) {
    if (r < 1) return null;
    if (this.endless) return this._endlessCells(r);
    return r <= this.height ? this._cells[r] : null;
  }

  cell(r, c) { const row = this.cells(r); return row ? row[c] || null : null; }

  _buildRow(r) {
    const W = this.width;
    const cells = this.cells(r);
    const cols = [];
    for (let c = 0; c < W; c++) if (cells[c]) cols.push(c);
    const prev = r === 1 ? cols.slice() : this.rows[r - 1].cols; // row 0 = the cast-on
    const err = (m) => this.errors.push(`row ${r}: ${m}`);
    const entries = [];
    const byCol = new Map();
    for (const c of cols) {
      const cl = cells[c];
      if (cl.s === 'x' && !cl.cable && !this.endless) err(`col ${c}: 'x' not in a cable span`);
      if (r === 1 && cl.s !== 'k' && cl.s !== 'p') err(`row 1 may only hold k and p (col ${c} is '${cl.s}')`);
      if (!isRS(r) && (cl.s === 'o' || cl.s === 'b' || cl.s === 'x')) err(`col ${c}: '${cl.s}' only allowed on RS rows`);
      if (cl.s === '+' && r > 1 && this.cell(r - 1, c)) err(`col ${c}: '+' must sit over '.'`);
      const e = { r, col: c, stitch: cl.s, slot: cl.slot, takes: [], boundOffAfter: [] };
      entries.push(e); byCol.set(c, e);
    }
    // runs
    const runs = [];
    for (let i = 0; i < cols.length; i++) {
      if (i === 0 || cols[i] !== cols[i - 1] + 1) runs.push({ a: cols[i], b: cols[i] });
      else runs[runs.length - 1].b = cols[i];
    }
    const prevIdx = new Map(prev.map((c, i) => [c, i]));
    const claimed = new Array(prev.length).fill(false);
    for (const run of runs) {
      const block = [];
      prev.forEach((c, i) => { if (!claimed[i] && c >= run.a && c <= run.b) block.push(i); });
      const ls = cells[run.a].s, rs = cells[run.b].s;
      if ((ls === '<' || ls === '>') && prevIdx.has(run.a - 1) && !claimed[prevIdx.get(run.a - 1)]) block.unshift(prevIdx.get(run.a - 1));
      if ((rs === '<' || rs === '>') && prevIdx.has(run.b + 1) && !claimed[prevIdx.get(run.b + 1)]) block.push(prevIdx.get(run.b + 1));
      block.sort((x, y) => x - y);
      block.forEach((i) => (claimed[i] = true));
      let p = 0;
      for (let c = run.a; c <= run.b; c++) {
        const e = byCol.get(c);
        const u = USES[e.stitch];
        e.takes = block.slice(p, p + u);
        if (e.takes.length < u) err(`run ${run.a}-${run.b}: col ${c} '${e.stitch}' has no stitch to work (block of ${block.length})`);
        for (const t of e.takes) if (Math.abs(prev[t] - c) > MAX_SHIFT) err(`col ${c} takes a stitch from col ${prev[t]} (more than ${MAX_SHIFT} away)`);
        p += u;
      }
      if (p < block.length) err(`run ${run.a}-${run.b}: ${block.length - p} stitch(es) of the row below left unworked`);
    }
    const boundOff = [];
    claimed.forEach((cl, i) => { if (!cl) boundOff.push(i); });
    // knitting order
    const rs = isRS(r);
    entries.sort((x, y) => (rs ? y.col - x.col : x.col - y.col));
    entries.forEach((e, k) => (e.k = k));
    const before = [];
    const ahead = (c1, c2) => (rs ? c1 > c2 : c1 < c2); // c1 is worked before position c2
    for (const i of boundOff) {
      const bc = prev[i];
      let host = null;
      for (const e of entries) if (ahead(e.col, bc)) host = e;
      if (host) host.boundOffAfter.push(i); else before.push(i);
      // bind-off position rule: at the row's start, or under a gap (between two runs)
      const under = runs.some((a, j) => j < runs.length - 1 && bc > a.b && bc < runs[j + 1].a);
      const atStart = !host;
      if (!under && !atStart && !this.endless) err(`stitch at col ${bc} is bound off at the end of the row; bind off at the start of a row (or under a gap)`);
    }
    const sortKO = (arr) => arr.sort((x, y) => (rs ? prev[y] - prev[x] : prev[x] - prev[y]));
    sortKO(before); entries.forEach((e) => sortKO(e.boundOffAfter));
    // edge cast-on rule: '+' runs at a run's edge must be at the start side of the row
    for (const run of runs) {
      for (let c = run.a; c <= run.b; c++) {
        if (cells[c].s !== '+') continue;
        // find the '+' stretch
        let a = c; while (c + 1 <= run.b && cells[c + 1].s === '+') c++;
        const b = c;
        const atLeft = a === run.a, atRight = b === run.b;
        const gapJoin = !atLeft && !atRight;
        const island = runs.length > 1; // in an island section each part's own start counts as a row start
        const onStart = rs ? atRight && (island || run === runs[runs.length - 1]) : atLeft && (island || run === runs[0]);
        if (!gapJoin && !onStart && !(atLeft && atRight) && !this.endless) {
          err(`cast on at cols ${a}-${b} is at the end of the row; cast on at the start of a row (right edge on RS, left on WS) or across a gap`);
        }
      }
    }
    this.rows[r] = { r, rs, cols, runs, map: entries, boundOffBefore: before, boundOff, prevCols: prev };
    if (entries.length) entries[0].boundOffBefore = before;
    this.rowStarts[r + 1] = this.rowStarts[r] + entries.length;
    if (!entries.length && !this.endless) err('row has no stitches');
  }

  _ensure(r) {
    if (!this.endless) return;
    while (this.rows.length <= r) this._buildRow(this.rows.length);
  }

  // ---- queries
  row(r) { this._ensure(r); return this.rows[r] || null; }
  rowMap(r) { const R = this.row(r); return R ? R.map : null; }
  rowStart(r) { this._ensure(r); return this.endless ? (r - 1) * this._liveWidth() : this.rowStarts[r]; }
  _liveWidth() { return this.rows[1] ? this.rows[1].cols.length : this.width; }
  rowCount() { return this.height; }

  // stitch index (0-based, whole piece) -> {r, k, entry}
  locate(i) {
    if (i < 0) return null;
    if (this.endless) {
      const n = this._liveWidth() || this.width;
      const r = Math.floor(i / n) + 1; this._ensure(r);
      return { r, k: i - (r - 1) * n, entry: this.rows[r].map[i - (r - 1) * n] };
    }
    if (i >= this.total) return null;
    let lo = 1, hi = this.height;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.rowStarts[mid] <= i) lo = mid; else hi = mid - 1; }
    const k = i - this.rowStarts[lo];
    return { r: lo, k, entry: this.rows[lo].map[k] };
  }

  indexOf(r, c) {
    const R = this.row(r); if (!R) return -1;
    const e = R.map.find((x) => x.col === c);
    return e ? this.rowStart(r) + e.k : -1;
  }

  // What is on the needles before stitch i is worked.
  // left: loops of row r-1 still to work (cols), right: loops of row r already made (cols).
  needles(i) {
    const fin = !this.endless && i >= this.total;
    if (fin) {
      const R = this.rows[this.height];
      return { r: this.height, k: R.map.length, rs: R.rs, done: true, next: null, left: [], right: R.cols.slice(), leftRow: this.height - 1, rightRow: this.height };
    }
    const L = this.locate(i);
    const R = this.row(L.r);
    const used = new Set(R.boundOffBefore);
    for (let k = 0; k < L.k; k++) { const e = R.map[k]; e.takes.forEach((t) => used.add(t)); e.boundOffAfter.forEach((t) => used.add(t)); }
    const left = R.prevCols.filter((_, idx) => !used.has(idx));
    const right = R.map.slice(0, L.k).map((e) => e.col).sort((a, b) => a - b);
    return { r: L.r, k: L.k, rs: R.rs, done: false, next: L.entry, left, right, leftRow: L.r - 1, rightRow: L.r };
  }

  // Stitch markers: column boundaries (a marker sits between col b-1 and col b).
  markers(r) {
    const R = this.row(r); if (!R) return [];
    const rep = this.def.repeat;
    if (rep && rep.width) {
      const [el, er] = edgePair(rep.edges);
      const lo = Math.min(...R.cols), hi = Math.max(...R.cols) + 1;
      if (R.runs.length > 1 || (R.cols.length - el - er) % rep.width) return [];
      const out = [];
      for (let b = lo + el; b <= hi; b += rep.width) if (b > lo && b < hi) out.push(b);
      return out;
    }
    const w = rowWording(this, r);
    if (!w.repeat || w.repeat.count < 2 || w.repeat.cells < 2) return [];
    const ks = []; // boundaries in knitting order -> columns
    for (let j = 0; j <= w.repeat.count; j++) {
      const k = w.repeat.from + j * w.repeat.cells;
      const e = R.map[Math.min(k, R.map.length - 1)];
      if (!e) continue;
      if (k >= R.map.length) ks.push(R.rs ? e.col : e.col + 1);
      else ks.push(R.rs ? e.col + 1 : e.col);
    }
    const lo = Math.min(...R.cols), hi = Math.max(...R.cols) + 1;
    return [...new Set(ks)].filter((b) => b > lo && b < hi).sort((a, b) => a - b);
  }

  _checkRepeat() {
    const rep = this.def.repeat;
    if (!rep || !rep.width) return;
    const [el, er] = edgePair(rep.edges);
    const at = rep.at || 1;
    const R = this.row(at);
    const n = R ? R.cols.length : this.width;
    if ((n - el - er) % rep.width !== 0) this.errors.push(`repeat: (${n} sts on row ${at} - edges ${el + er}) is not a multiple of ${rep.width}`);
  }

  // islands: part index (0 = the right-most part, worked first on RS rows) and its name
  partIndex(r, col) {
    const R = this.row(r); if (!R || R.runs.length < 2) return -1;
    const order = R.runs.slice().sort((a, b) => b.a - a.a);
    return order.findIndex((u) => col >= u.a && col <= u.b);
  }
  partName(r, j) {
    const R = this.row(r); if (!R || R.runs.length < 2 || j < 0) return '';
    const noun = this.def.parts || this.def.islands || 'part';
    const cap = (w) => w[0].toUpperCase() + w.slice(1);
    if (R.runs.length === 2) return `${j === 0 ? 'Right' : 'Left'} ${noun}`;
    return `${cap(noun)} ${j + 1}`;
  }
  // island sections: >= 2 consecutive rows that each have the same number (>= 2) of runs
  islandSections() {
    if (this._sections) return this._sections;
    const out = [];
    if (this.endless) return out;
    let r = 1;
    while (r <= this.height) {
      const n = this.row(r).runs.length;
      if (n < 2) { r++; continue; }
      let e = r;
      while (e + 1 <= this.height && this.row(e + 1).runs.length === n) e++;
      if (e > r) out.push({ from: r, to: e, parts: n });
      r = e + 1;
    }
    return (this._sections = out);
  }

  validate() { return this.errors.slice(); }
}

function edgePair(edges) {
  if (Array.isArray(edges)) return [edges[0] | 0, edges[1] | 0];
  const e = edges | 0; return [Math.floor(e / 2), e - Math.floor(e / 2)];
}

export function parseChart(def) { return new Chart(def); }
export function endlessChart(width, rowFn) { return new Chart({ endless: true, width, rowFn }); }

// ---------------------------------------------------------------- texture helpers

export const TEXTURES = {
  stockinette: () => 'k',
  garter: (r) => (isRS(r) ? 'k' : 'p'),
  rib1: (r, c) => (c % 2 === 0 ? 'k' : 'p'),
  rib2: (r, c) => (c % 4 < 2 ? 'k' : 'p'),
  seed: (r, c) => ((r + c) % 2 === 1 ? 'k' : 'p'),
  moss: (r, c) => ((Math.floor((r - 1) / 2) + c) % 2 === 0 ? 'k' : 'p'),
  basketweave: (r, c) => ((Math.floor((r - 1) / 4) + Math.floor(c / 4)) % 2 === 0 ? 'k' : 'p'),
  brokenRib: (r, c) => (isRS(r) ? (c % 2 === 0 ? 'k' : 'p') : 'k'),
  reverse: () => 'p',
};

// fill(width, height, texture) -> stitch layer lines (top row first). texture: name or fn(r, c).
export function fill(w, h, texture) {
  const fn = typeof texture === 'function' ? texture : TEXTURES[texture];
  const lines = [];
  for (let r = h; r >= 1; r--) { let s = ''; for (let c = 0; c < w; c++) s += fn(r, c); lines.push(s); }
  return lines;
}

// ---------------------------------------------------------------- wording

function opOf(e, rs, chart) {
  const s = e.stitch;
  if (s === 'x') { const cl = chart.cell(e.r, e.col); return cl && cl.cable ? cl.cable.span.type : 'k'; }
  if (s === 'k') return rs ? 'k' : 'p';
  if (s === 'p') return rs ? 'p' : 'k';
  if (s === 'o') return 'yo';
  if (s === '<') return rs ? 'k2tog' : 'p2tog';
  if (s === '>') return rs ? 'ssk' : 'ssp';
  if (s === 'b') return 'MB';
  if (s === '+') return 'CO';
  if (s === 'm') {
    const R = chart.row(e.r);
    const run = R.runs.find((u) => e.col >= u.a && e.col <= u.b) || { a: 0, b: chart.width - 1 };
    const left = e.col - run.a < run.b - e.col;
    return (left ? 'M1L' : 'M1R') + (rs ? '' : 'P');
  }
  return s;
}

const COUNTABLE = new Set(['k', 'p']);

// atoms: the row's operations in knitting order. cells = knitting-order cell indices covered.
function rowAtoms(chart, r) {
  const R = chart.row(r);
  const rs = R.rs;
  const atoms = [];
  const bo = (list) => { for (const pi of list) atoms.push({ op: 'BO', slot: '', cells: [], uses: 1, col: R.prevCols[pi] }); };
  bo(R.boundOffBefore);
  const map = R.map;
  for (let k = 0; k < map.length; k++) {
    const e = map[k];
    const cl = chart.cell(r, e.col);
    if (e.stitch === 'x' && cl && cl.cable) {
      const span = cl.cable.span;
      const cells = [];
      let q = k;
      while (q < map.length && map[q].stitch === 'x') {
        const c2 = chart.cell(r, map[q].col);
        if (!c2.cable || c2.cable.span !== span) break;
        cells.push(q); q++;
      }
      atoms.push({ op: span.type, slot: e.slot, cells, uses: cells.length });
      for (let j = 0; j < cells.length; j++) bo(map[k + j].boundOffAfter);
      k = q - 1;
      continue;
    }
    const isGapCO = e.stitch === '+' && chart.cell(r - 1, e.col) === null && R.runs.some((u) => e.col > u.a && e.col < u.b);
    atoms.push({ op: opOf(e, rs, chart), slot: e.slot, cells: [k], uses: e.takes.length, gap: isGapCO });
    bo(e.boundOffAfter);
  }
  // each atom's part (islands): a bind-off belongs to the part it comes just before (that part's start)
  let next = -1;
  for (let j = atoms.length - 1; j >= 0; j--) {
    const a = atoms[j];
    if (a.cells.length) { a.part = chart.partIndex(r, map[a.cells[0]].col); next = a.part; }
    else a.part = next;
  }
  let prev = -1;
  for (const a of atoms) { if (a.part >= 0) prev = a.part; else a.part = prev; }
  return atoms;
}

const keyOf = (a, colored) => a.op + (colored ? '|' + a.slot : '') + (a.gap ? '|g' : '');

// group consecutive equal atoms -> [{op, slot, n, atoms:[...]}]
function groupAtoms(atoms, colored) {
  const g = [];
  for (const a of atoms) {
    const last = g[g.length - 1];
    if (last && keyOf(last.atoms[0], colored) === keyOf(a, colored)) last.atoms.push(a);
    else g.push({ op: a.op, slot: a.slot, gap: a.gap, atoms: [a] });
  }
  return g;
}

function groupText(gp, colored) {
  const n = gp.atoms.length;
  const sl = colored ? ' ' + gp.slot : '';
  if (COUNTABLE.has(gp.op)) return `${gp.op}${n}${sl}`;
  if (gp.op === 'BO') return `bind off ${n} st${n > 1 ? 's' : ''}`;
  if (gp.op === 'CO') return gp.gap ? `turn, cast on ${n} st${n > 1 ? 's' : ''}${sl}, turn` : `cast on ${n} st${n > 1 ? 's' : ''}${sl}`;
  if (n === 1) return gp.op + sl;
  if (n === 2) return `${gp.op}${sl}, ${gp.op}${sl}`; // never "yo twice": that means a double wrap
  return `[${gp.op}${sl}] ${n} times`;
}

function groupsCost(atoms, colored) { return atoms.length ? groupAtoms(atoms, colored).length : 0; }

function findRepeat(atoms, colored) {
  const N = atoms.length;
  const keys = atoms.map((a) => keyOf(a, colored));
  const plain = groupsCost(atoms, colored);
  let best = null;
  for (let L = 1; L <= N / 2; L++) {
    for (let s = 0; s + 2 * L <= N; s++) {
      let n = 1;
      while (s + (n + 1) * L <= N) {
        let ok = true;
        for (let j = 0; j < L; j++) if (keys[s + n * L + j] !== keys[s + j]) { ok = false; break; }
        if (!ok) break;
        n++;
      }
      if (n < 2) continue;
      const rep = atoms.slice(s, s + L);
      const rg = groupsCost(rep, colored);
      if (rg < 2 && new Set(rep.map((a, j) => keys[s + j])).size < 2) continue; // "k1" reps: grouping says it better
      if (rep.some((a) => a.op === 'BO' || a.op === 'CO')) continue;
      const pre = atoms.slice(0, s), suf = atoms.slice(s + n * L);
      let cost = groupsCost(pre, colored) + rg + groupsCost(suf, colored) + (suf.length ? 0.5 : 0) + s * 0.001;
      if (pre.length && keys[s - 1] === keys[s]) cost += 0.6;
      if (suf.length && keys[s + n * L] === keys[s]) cost += 0.6;
      if (rep.length > 1 && keys[s] === keys[s + L - 1]) cost += 0.6;
      if (!best || cost < best.cost) best = { s, L, n, cost };
    }
  }
  if (best && best.cost < plain) return best;
  return null;
}

// rowWording(chart, r) -> {r, rs, label, text, tokens:[{text, from, to, rep}], repeat|null, count, islands}
//   tokens map onto knitting-order cell indices [from, to); rep: true for tokens inside the repeat
//   (they describe the FIRST repeat; use wordingCursor for the live position).
export function rowWording(chart, r, opts = {}) {
  const R = chart.row(r);
  const rs = R.rs;
  const colored = chart.slotsUsed.size > 1;
  let atoms = rowAtoms(chart, r);
  const part = opts.part ?? -1;
  if (part >= 0) atoms = atoms.filter((a) => a.part === part);
  const allSlots = new Set(atoms.filter((a) => a.op !== 'BO').map((a) => a.slot));
  const uniformSlot = allSlots.size === 1 ? [...allSlots][0] : null;
  const perAtomColor = colored && !uniformSlot;
  const label = (part >= 0 ? chart.partName(r, part) + ' · ' : '') + `Row ${r} (${rs ? 'RS' : 'WS'})`;
  const tokens = [];
  const cellsOf = (list) => list.flatMap((a) => a.cells);
  const tok = (gps, rep) => gps.map((gp) => {
    const cs = cellsOf(gp.atoms);
    return { text: groupText(gp, perAtomColor), from: cs.length ? cs[0] : null, to: cs.length ? cs[cs.length - 1] + 1 : null, rep };
  });
  let text, repeat = null;
  const groups = groupAtoms(atoms, perAtomColor);
  if (groups.length === 1 && COUNTABLE.has(groups[0].op)) {
    text = `${groups[0].op} to end`;
    const cs = cellsOf(groups[0].atoms);
    tokens.push({ text, from: cs[0], to: cs[cs.length - 1] + 1, rep: false });
  } else {
    const fr = findRepeat(atoms, perAtomColor);
    if (fr) {
      const pre = atoms.slice(0, fr.s), rep = atoms.slice(fr.s, fr.s + fr.L), suf = atoms.slice(fr.s + fr.n * fr.L);
      tokens.push(...tok(groupAtoms(pre, perAtomColor), false));
      const rt = tok(groupAtoms(rep, perAtomColor), true);
      rt[0].text = '*' + rt[0].text;
      tokens.push(...rt);
      const repCells = cellsOf(rep);
      repeat = { from: repCells[0], cells: repCells.length, count: fr.n };
      const sufUses = suf.reduce((t, a) => t + a.uses, 0);
      if (suf.length) {
        tokens.push({ text: `rep from * to last ${sufUses} st${sufUses > 1 ? 's' : ''}`, from: null, to: null, rep: false, glue: '; ' });
        tokens.push(...tok(groupAtoms(suf, perAtomColor), false));
      } else tokens.push({ text: 'rep from * to end', from: null, to: null, rep: false, glue: '; ' });
    } else tokens.push(...tok(groups, false));
    text = tokens.map((t, i) => (i ? t.glue || ', ' : '') + t.text).join('');
  }
  if (colored && uniformSlot) text = `with ${uniformSlot}, ${text}`;
  const count = part >= 0 ? atoms.reduce((t, a) => t + a.cells.length, 0) : R.map.length;
  const prevCount = part >= 0 ? atoms.reduce((t, a) => t + a.uses, 0) : R.prevCols.length;
  const islands = R.runs.length > 1;
  return { r, rs, label, text, tokens, repeat, count, prevCount, countChanged: count !== prevCount, islands, part, slot: uniformSlot, atoms };
}

// Where cell k of row r sits in the wording: {token, rep, reps, st, of}
export function wordingCursor(w, k) {
  if (w.repeat && k >= w.repeat.from && k < w.repeat.from + w.repeat.cells * w.repeat.count) {
    const off = k - w.repeat.from;
    const rep = Math.floor(off / w.repeat.cells);
    const inRep = off % w.repeat.cells;
    const kk = w.repeat.from + inRep;
    const token = w.tokens.findIndex((t) => t.rep && t.from !== null && kk >= t.from && kk < t.to);
    return { token, rep: rep + 1, reps: w.repeat.count, st: inRep + 1, of: w.repeat.cells };
  }
  let token = w.tokens.findIndex((t) => !t.rep && t.from !== null && k >= t.from && k < t.to);
  if (token < 0 && w.repeat) {
    // a suffix token after the repeat: map by position past the repeat
    const past = w.repeat.from + w.repeat.cells * w.repeat.count;
    const sufTokens = w.tokens.filter((t) => !t.rep && t.from !== null && t.from >= w.repeat.from);
    let acc = past;
    for (const t of sufTokens) { const n = t.to - t.from; if (k < acc + n) { token = w.tokens.indexOf(t); break; } acc += n; }
  }
  return { token, rep: 0, reps: 0, st: 0, of: 0 };
}

// The wording strip's line for stitch k of row r: part-aware in an island section.
export function stripWording(chart, r, k) {
  const R = chart.row(r);
  const inSection = chart.islandSections().some((s) => r >= s.from && r <= s.to);
  if (!inSection || !R.map.length) return rowWording(chart, r);
  const e = R.map[Math.min(k, R.map.length - 1)];
  return rowWording(chart, r, { part: chart.partIndex(r, e.col) });
}

const TIMES = ['zero times', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times', 'eight times', 'nine times', 'ten times', 'eleven times', 'twelve times'];
const times = (n) => TIMES[n] || `${n} times`;
const rowText = (w, r) => w.text + (w.countChanged && r > 1 ? ` (${w.count} sts)` : '');

// pass 3: merge identical rows and repeating blocks of rows. list: [{r, t}] (consecutive rows)
function mergeRows(list) {
  const out = [];
  const side = (x) => (x % 2 ? 'RS' : 'WS');
  let i = 0;
  while (i < list.length) {
    let best = null;
    // identical consecutive rows
    let L = 1;
    while (i + L < list.length && list[i + L].t === list[i].t) L++;
    if (L >= 2) best = { p: 1, L };
    // a block of p rows repeating the p rows before it
    for (let p = 2; p <= 8 && i - p >= 0; p++) {
      let n = 0;
      while (i + n < list.length && list[i + n].t === list[i + n - p].t) n++;
      if (n >= p && (!best || n > best.L)) best = { p, L: n };
    }
    const a = list[i].r;
    if (best && best.p === 1) {
      const b = list[i + best.L - 1].r;
      const sides = new Set(); for (let q = a; q <= b; q++) sides.add(side(q));
      out.push({ rows: [a, b], label: `Rows ${a}–${b}${sides.size === 1 ? ` (${[...sides][0]})` : ''}`, text: list[i].t });
      i += best.L;
    } else if (best) {
      const b = list[i + best.L - 1].r;
      const s0 = list[i - best.p].r, s1 = list[i - 1].r;
      const full = Math.floor(best.L / best.p), q = best.L % best.p;
      const then = q ? `, then ${q === 1 ? `row ${s0}` : `rows ${s0}–${s0 + q - 1}`} once more` : '';
      out.push({ rows: [a, b], label: `Rows ${a}–${b}`, text: `rep rows ${s0}–${s1} ${times(full)}${then}` });
      i += best.L;
    } else {
      out.push({ rows: [a, a], label: `Row ${a} (${side(a)})`, text: list[i].t });
      i++;
    }
  }
  return out;
}

// The full written pattern. opts: {name, source, yarns: {A: 'Cream wool', …}}
// -> {lines: [{kind, label, text, rows}], text, abbreviations}
export function writtenPattern(chart, opts = {}) {
  const def = chart.def;
  const colored = chart.slotsUsed.size > 1;
  const noun = def.parts || def.islands || 'part';
  const lines = [];
  const info = (text) => lines.push({ kind: 'info', label: '', text });
  if (opts.name || def.name) lines.push({ kind: 'title', label: '', text: opts.name || def.name });
  if (opts.source || def.source) info(`Stitch pattern: ${opts.source || def.source}.`);
  const yarns = opts.yarns || def.slots;
  if (yarns && typeof Object.values(yarns)[0] === 'string') info('Yarn: ' + [...chart.slotsUsed].sort().map((k) => `${k} ${yarns[k]}`).join(', ') + '.');
  info(`Size: ${chart.width} sts × ${chart.height} rows, scaled down for the game.`);
  const first = chart.row(1);
  const firstSlot = chart.cell(1, first.cols[0]).slot;
  if (first.runs.length > 1) {
    const ws = first.runs.map((u) => u.b - u.a + 1);
    const each = ws.every((w) => w === ws[0]);
    info(each ? `Cast on ${ws[0]} sts for each ${noun} (${ws.length} ${noun}s)${colored ? ` in ${firstSlot}` : ''}.`
      : `Cast on ${ws.slice().reverse().join(', ')} sts for the ${noun}s${colored ? ` in ${firstSlot}` : ''}.`);
  } else info(`Cast on ${first.cols.length} sts${colored ? ` in ${firstSlot}` : ''}.`);

  const H = chart.height;
  const sections = chart.islandSections();
  const used = new Set(['st', 'sts', 'RS', 'WS']);
  const note = (w) => { for (const a of w.atoms) used.add(a.op === 'BO' || a.op === 'CO' ? a.op : a.op); };
  let r = 1;
  const flush = (from, to) => {
    if (to < from) return;
    const list = [];
    for (let q = from; q <= to; q++) { const w = rowWording(chart, q); note(w); list.push({ r: q, t: rowText(w, q) }); }
    for (const l of mergeRows(list)) lines.push({ kind: 'row', ...l });
  };
  for (const sec of sections) {
    let s = sec.from;
    // a split row that binds off under the gap is worded across the whole row first
    const R = chart.row(s);
    const gapBO = R.boundOff.some((pi) => R.runs.some((a, j) => j < R.runs.length - 1 && R.prevCols[pi] > a.b && R.prevCols[pi] < R.runs[j + 1].a));
    flush(r, s - 1 + (gapBO && s > 1 ? 1 : 0));
    if (gapBO && s > 1) s++;
    r = sec.to + 1;
    if (s > sec.to) continue;
    lines.push({ kind: 'section', label: '', text: `Work each ${noun} separately.` });
    for (let j = 0; j < sec.parts; j++) {
      const name = chart.partName(s, j);
      lines.push({ kind: 'part', label: '', text: j === 0 ? `${name}:` : `${name} (rejoin yarn at the inner edge):`, part: j });
      const list = [];
      for (let q = s; q <= sec.to; q++) { const w = rowWording(chart, q, { part: j }); note(w); list.push({ r: q, t: rowText(w, q) }); }
      for (const l of mergeRows(list)) lines.push({ kind: 'row', part: j, ...l });
    }
    if (r <= H) lines.push({ kind: 'section', label: '', text: 'Continue across all sts.' });
  }
  flush(r, H);
  lines.push({ kind: 'end', label: '', text: 'Bind off all sts.' });
  if (def.finishing) lines.push({ kind: 'end', label: '', text: def.finishing });
  used.add('BO');
  if ([...used].some((u) => u === 'k' || u === 'p')) { used.add('k'); used.add('p'); }
  const abbreviations = [...used].filter((a) => GLOSSARY[a]).map((a) => ({ abbr: a, meaning: GLOSSARY[a] }));
  const text = lines.map((l) => (l.label ? `${l.label}: ` : '') + l.text).join('\n');
  return { lines, text, abbreviations };
}

// ---------------------------------------------------------------- round trip: text -> rows -> tokens

// parseRowText('p2, *k2, p2; rep from * to end', 14) -> [{op, slot}] (one per atom)
// `width` = stitches on the left needle at the start of the row (for "to end" / "to last n").
export function parseRowText(text, width) {
  let t = text.replace(/\s*\(\d+ sts\)$/, '');
  let slot = '';
  const wm = t.match(/^with (\w), /); if (wm) { slot = wm[1]; t = t.slice(wm[0].length); }
  const usesOf = (op) => (op === 'k2tog' || op === 'ssk' || op === 'p2tog' || op === 'ssp' ? 2 : op.startsWith('M1') || op === 'yo' || op === 'CO' ? 0 : /^C\d/.test(op) ? +op[1] : 1);
  const expand = (part) => {
    const out = [];
    const items = part.replace(/turn, cast on/g, 'turn~cast on').replace(/(sts?(?: \w)?), turn/g, '$1~turn').split(/,\s*/).filter(Boolean).map((x) => x.replace(/~/g, ', '));
    for (let raw of items) {
      raw = raw.trim();
      let m;
      if ((m = raw.match(/^bind off (\d+) sts?$/))) { for (let i = 0; i < +m[1]; i++) out.push({ op: 'BO', slot: '' }); continue; }
      if ((m = raw.match(/^(?:turn, )?cast on (\d+) sts?(?: ([A-D]))?(?:, turn)?$/))) { for (let i = 0; i < +m[1]; i++) out.push({ op: 'CO', slot: m[2] || slot }); continue; }
      if ((m = raw.match(/^(k|p)(\d+)(?: ([A-D]))?$/))) { for (let i = 0; i < +m[2]; i++) out.push({ op: m[1], slot: m[3] || slot }); continue; }
      if ((m = raw.match(/^\[(\S+?)(?: ([A-D]))?\] (\d+) times$/))) { for (let i = 0; i < +m[3]; i++) out.push({ op: m[1], slot: m[2] || slot }); continue; }
      if ((m = raw.match(/^(\S+?)(?: ([A-D]))?$/))) { out.push({ op: m[1], slot: m[2] || slot }); continue; }
      throw new Error(`cannot read "${raw}"`);
    }
    return out;
  };
  const sumUses = (ops) => ops.reduce((s, o) => s + (o.op === 'BO' ? 1 : usesOf(o.op)), 0);
  let m;
  if ((m = t.match(/^(k|p) to end$/))) return Array.from({ length: width }, () => ({ op: m[1], slot }));
  const star = t.indexOf('*');
  if (star < 0) return expand(t);
  const pre = expand(t.slice(0, star));
  const semi = t.indexOf('; rep from *');
  const rep = expand(t.slice(star + 1, semi));
  const tail = t.slice(semi + 2);
  let suf = [], keep = 0;
  if ((m = tail.match(/^rep from \* to last (\d+) sts?, (.*)$/))) { keep = +m[1]; suf = expand(m[2]); }
  else if (!/^rep from \* to end$/.test(tail)) throw new Error(`cannot read repeat tail "${tail}"`);
  const avail = width - sumUses(pre) - keep;
  const per = sumUses(rep);
  if (per <= 0 || avail % per) throw new Error(`repeat of ${per} does not fit ${avail} sts`);
  const out = [...pre];
  for (let i = 0; i < avail / per; i++) out.push(...rep);
  return out.concat(suf);
}

// Reads a written pattern back into per-row texts: Map key `r` or `r|part` -> row text.
export function parseWrittenPattern(text) {
  const rows = new Map();
  let part = null, partNo = -1;
  for (const line of text.split('\n')) {
    let m;
    if (/^Work each .* separately\.$/.test(line)) { partNo = -1; part = null; continue; }
    if (/^Continue across all sts\.$/.test(line) || /^Bind off/.test(line)) { part = null; continue; }
    if (/^[A-Z][\w ]*( \(rejoin yarn at the inner edge\))?:$/.test(line)) { partNo++; part = partNo; continue; }
    const key = (r) => (part === null ? `${r}` : `${r}|${part}`);
    if ((m = line.match(/^Row (\d+) \((?:RS|WS)\): (.*)$/))) { rows.set(key(+m[1]), m[2]); continue; }
    if ((m = line.match(/^Rows (\d+)–(\d+): rep rows (\d+)–(\d+) ([\w ]+?)(?:, then rows? (\d+)(?:–(\d+))? once more)?$/))) {
      const [a, b, s0, s1] = [+m[1], +m[2], +m[3], +m[4]];
      for (let r = a; r <= b; r++) rows.set(key(r), rows.get(key(s0 + ((r - a) % (s1 - s0 + 1)))));
      continue;
    }
    if ((m = line.match(/^Rows (\d+)–(\d+)(?: \((?:RS|WS)\))?: (.*)$/))) { for (let r = +m[1]; r <= +m[2]; r++) rows.set(key(r), m[3]); continue; }
  }
  return rows;
}

// Compares one row's wording, read back, with the row map. Returns null or an error string.
export function roundTripRow(chart, r, text, part = -1) {
  const w = rowWording(chart, r, { part });
  if (text == null) text = w.text;
  let ops;
  try { ops = parseRowText(text, w.prevCount); } catch (e) { return `row ${r}${part >= 0 ? ` (${chart.partName(r, part)})` : ''}: ${e.message} in "${text}"`; }
  const colored = chart.slotsUsed.size > 1;
  const want = w.atoms.map((a) => a.op + (colored && a.op !== 'BO' ? a.slot : ''));
  const got = ops.map((o) => o.op + (colored && o.op !== 'BO' ? o.slot : ''));
  if (want.join(',') !== got.join(',')) return `row ${r}${part >= 0 ? ` (${chart.partName(r, part)})` : ''}: "${text}" reads back as [${got.join(' ')}], chart is [${want.join(' ')}]`;
  return null;
}

// The whole round trip: written pattern text -> rows -> tokens, compared with the row map.
export function roundTrip(chart, opts) {
  const wp = writtenPattern(chart, opts);
  const rows = parseWrittenPattern(wp.text);
  const errs = [];
  for (let r = 1; r <= chart.height; r++) {
    if (rows.has(`${r}`)) { const e = roundTripRow(chart, r, rows.get(`${r}`)); if (e) errs.push(e); continue; }
    const n = chart.row(r).runs.length;
    let found = false;
    for (let j = 0; j < n; j++) {
      if (!rows.has(`${r}|${j}`)) continue;
      found = true;
      const e = roundTripRow(chart, r, rows.get(`${r}|${j}`), j); if (e) errs.push(e);
    }
    if (!found) errs.push(`row ${r}: missing from the written pattern`);
  }
  return errs;
}

// ---------------------------------------------------------------- saving helpers (Uint16 per stitch)

export function u16ToBase64(arr) {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.length * 2);
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
export function base64ToU16(b64) {
  let bytes;
  if (typeof Buffer !== 'undefined') bytes = new Uint8Array(Buffer.from(b64, 'base64'));
  else { const s = atob(b64); bytes = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i); }
  const out = new Uint16Array(bytes.length >> 1);
  new Uint8Array(out.buffer).set(bytes.subarray(0, out.length * 2));
  return out;
}
