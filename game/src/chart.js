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
  M1R: 'make 1 right (right-leaning increase)', M1LP: 'make 1 left purlwise (leans left as seen from the right side)',
  M1RP: 'make 1 right purlwise (leans right as seen from the right side)',
  MB: 'make bobble: (k1, p1, k1, p1, k1) into the next st, turn, p5, turn, k5, then pass the 2nd, 3rd, 4th and 5th sts over the first',
  CO: 'cast on (at the start of a row, a knitted or cable cast-on onto the left needle; the new sts are then worked)',
  BO: 'bind off (the st left on the right needle after a bind-off is the first st of the count that follows)',
  RS: 'right side', WS: 'wrong side',
  st: 'stitch', sts: 'stitches', rep: 'repeat', rem: 'remaining',
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
      // a make-one lifts the strand between two stitches: never the first or last cell of a run
      if (cl.s === 'm' && !this.endless && (!cells[c - 1] || !cells[c + 1])) err(`col ${c}: 'm' at the end of a run (there is no strand to lift there)`);
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

  // ---- parts. A part is a run of stitches followed up the rows (_parts); the written pattern's
  // plan (_plan) says which rows are worked as separate parts. partIndex(r, col) is the part id
  // of a stitch on a row that is worked part by part (else -1); partName(r, id) its name.
  partIndex(r, col) {
    const ctx = this._plan().rows.get(r);
    if (!ctx || !ctx.some((x) => x.key != null)) return -1;
    return this.nodeAt(r, col);
  }
  partName(r, id) { return this._plan().names.get(id) || ''; }
  nodeAt(r, col) {
    const R = this.row(r); if (!R || this.endless) return -1;
    const i = R.runs.findIndex((u) => col >= u.a && col <= u.b);
    return i < 0 ? -1 : this._parts().rowNodes[r][i];
  }
  // rows worked part by part, as ranges {from, to, parts}
  islandSections() {
    if (this._sections) return this._sections;
    const out = [];
    if (this.endless) return (this._sections = out);
    const P = this._plan();
    for (let r = 1; r <= this.height; r++) {
      const ctx = P.rows.get(r) || [];
      if (!ctx.some((x) => x.key != null)) continue;
      const last = out[out.length - 1];
      if (last && last.to === r - 1) { last.to = r; last.parts = Math.max(last.parts, ctx.length); } else out.push({ from: r, to: r, parts: ctx.length });
    }
    return (this._sections = out);
  }

  // The part tree: nodes {id, from, to, runs: Map r -> run, parents, children, kind, end}.
  // kind: 'root' (cast on in row 1), 'split' (one of the parts a run divides into), 'merge'
  // (parts joined by casting on across the gap), 'new' (an island cast on mid-piece).
  // end: the row in which the part's last stitches are bound off (none of them is worked on).
  _parts() {
    if (this.__parts) return this.__parts;
    const nodes = [], rowNodes = [null];
    const out = { nodes, rowNodes };
    if (this.endless || this.errors.length) { for (let r = 1; r <= (this.endless ? 0 : this.height); r++) rowNodes.push((this.rows[r] ? this.rows[r].runs : []).map(() => 0)); return (this.__parts = out); }
    const mk = (r, run, parents, kind) => {
      const n = { id: nodes.length, from: r, to: r, runs: new Map([[r, run]]), parents, children: [], kind, end: null };
      nodes.push(n); for (const p of parents) nodes[p].children.push(n.id);
      return n.id;
    };
    for (let r = 1; r <= this.height; r++) {
      const R = this.rows[r];
      if (r === 1) { rowNodes.push(R.runs.map((u) => mk(1, u, [], 'root'))); continue; }
      const P = this.rows[r - 1];
      const prevRun = (pi) => { const c = R.prevCols[pi]; return P.runs.findIndex((u) => c >= u.a && c <= u.b); };
      const takers = P.runs.map(() => new Set()), from = R.runs.map(() => new Set());
      R.runs.forEach((u, j) => {
        for (const e of R.map) if (e.col >= u.a && e.col <= u.b) for (const t of e.takes) { const pr = prevRun(t); from[j].add(pr); takers[pr].add(j); }
      });
      rowNodes.push(R.runs.map((u, j) => {
        const ps = [...from[j]];
        if (!ps.length) return mk(r, u, [], 'new');
        if (ps.length > 1) return mk(r, u, ps.map((p) => rowNodes[r - 1][p]), 'merge');
        const pid = rowNodes[r - 1][ps[0]];
        if (takers[ps[0]].size === 1) { const n = nodes[pid]; n.to = r; n.runs.set(r, u); return pid; }
        return mk(r, u, [pid], 'split');
      }));
      P.runs.forEach((u, p) => { if (!takers[p].size) nodes[rowNodes[r - 1][p]].end = r; });
      // the part a bound-off stitch belongs to (its run in the row below)
      R.boNode = R.prevCols.map((c, pi) => rowNodes[r - 1][prevRun(pi)]);
    }
    return (this.__parts = out);
  }

  // The written pattern's plan: layout items in order, and for each row the contexts it is
  // worded in ({ids, key, name}: key null = the whole piece, else a part's listing).
  _plan() {
    if (this.__plan) return this.__plan;
    const layout = [], rows = new Map(), names = new Map();
    const plan = { layout, rows, names, warnings: [] };
    this.__plan = plan;
    if (this.endless || this.errors.length || !this.height) return plan;
    const { nodes } = this._parts();
    const def = this.def, H = this.height;
    // def.parts: a noun, or one noun per group of parts in the order they appear (['leg', 'ear']);
    // def.partLabels: names right to left for the first group (['Thumb', 'Hand']), or one list per group
    let group = -1;
    const nounAt = (g) => { const p = def.parts || def.islands || 'part'; return Array.isArray(p) ? p[Math.min(g, p.length - 1)] : p; };
    const labelsAt = (g) => { const L = def.partLabels; if (!L || !L.length) return null; return Array.isArray(L[0]) ? L[g] || null : g === 0 ? L : null; };
    const cap = (w) => w[0].toUpperCase() + w.slice(1);
    let partNo = 0;
    const push = (ctx, r, ids) => {
      const last = layout[layout.length - 1];
      if (last && last.kind === 'rows' && last.key === ctx.key) last.rows.push({ r, ids });
      else layout.push({ kind: 'rows', key: ctx.key, depth: ctx.depth, name: ctx.name, rows: [{ r, ids }] });
      if (!rows.has(r)) rows.set(r, []);
      rows.get(r).push({ ids, key: ctx.key, name: ctx.name });
    };
    const line = (kind, text, ctx, extra = {}) => layout.push({ kind, text, key: ctx ? ctx.key : null, depth: ctx ? ctx.depth : 0, ...extra });
    const runAt = (n, r) => nodes[n].runs.get(r) || nodes[n].runs.get(nodes[n].from);
    const endText = (ids) => {
      const cells = this.row(H).map.filter((e) => ids.includes(this.nodeAt(H, e.col)));
      if (cells.length === 1) return 'Fasten off.';
      const kinds = new Set(cells.map((e) => e.stitch));
      if (kinds.has('k') && kinds.has('p') && kinds.size === 2) {
        const stacked = H > 1 && cells.every((e) => { const b = this.cell(H - 1, e.col); return b && b.s === e.stitch; });
        return stacked ? 'Bind off loosely in rib.' : 'Bind off in pattern.';
      }
      return 'Bind off all sts.';
    };
    // name siblings (ordered right to left by their position in row r)
    const nameSiblings = (kids, r) => {
      group++;
      const phys = kids.slice().sort((a, b) => runAt(b, r).a - runAt(a, r).a);
      const labels = labelsAt(group), noun = nounAt(group);
      phys.forEach((k, i) => names.set(k, labels && labels[i] ? labels[i] : phys.length === 2 ? `${i === 0 ? 'Right' : 'Left'} ${noun}` : `${cap(noun)} ${i + 1}`));
    };
    const order = (kids, r) => kids.slice().sort((a, b) => (r % 2 ? runAt(b, r).a - runAt(a, r).a : runAt(a, r).a - runAt(b, r).a));
    const chain = (n, ctx, start) => {
      const node = nodes[n];
      for (let r = start; r <= node.to; r++) push(ctx, r, [n]);
      if (node.to === H) { line('end', endText([n]), ctx); return null; }
      if (node.end === node.to + 1) { push(ctx, node.to + 1, [n]); return null; }
      const kids = node.children;
      if (!kids.length) { plan.warnings.push(`part ${n} ends at row ${node.to} without a bind-off`); return null; }
      if (nodes[kids[0]].kind === 'merge') return kids[0];
      const s = node.to + 1;
      // a one-row split that joins again on the next row (a buttonhole): worked across
      const m0 = nodes[kids[0]].children[0];
      if (kids.every((k) => nodes[k].to === s && nodes[k].children.length === 1 && nodes[k].children[0] === m0) && m0 != null && nodes[m0].kind === 'merge'
        && nodes[m0].parents.length === kids.length) {
        push(ctx, s, kids);
        return chain(m0, ctx, s + 1);
      }
      const R = this.row(s);
      const gapBO = R.boundOff.some((pi) => R.boNode[pi] === n);
      let first = s;
      if (gapBO) { push(ctx, s, kids); first = s + 1; }
      nameSiblings(kids, s);
      line('section', `Work each ${nounAt(group)} separately.`, ctx);
      let merge = null;
      const side = first % 2 ? 'RS' : 'WS';
      order(kids, first).forEach((k, j) => {
        const sub = { key: ++partNo, depth: ctx.depth + 1, name: names.get(k) };
        const rejoin = j === 0 ? '' : kids.length === 2 ? ` (rejoin yarn at the inner edge, ${side} facing)` : ` (rejoin yarn, ${side} facing)`;
        line('part', `${names.get(k)}${rejoin}:`, sub, { part: sub.key });
        if (nodes[k].to < first) { plan.warnings.push(`part ${names.get(k)} has no row of its own`); return; }
        const res = chain(k, sub, first);
        if (res != null) merge = res;
      });
      if (merge == null) return null;
      if (ctx.key == null) { line('section', 'Continue across all sts.', ctx); return chain(merge, ctx, nodes[merge].from); }
      const sub = { key: ++partNo, depth: ctx.depth, name: ctx.name };
      line('part', `${cap(ctx.name)}, all sts together:`, sub, { part: sub.key });
      return chain(merge, sub, nodes[merge].from);
    };
    const top = { key: null, depth: 0, name: '' };
    const roots = nodes.filter((x) => x.kind === 'root').map((x) => x.id);
    for (const x of nodes) if (x.kind === 'new') plan.warnings.push(`row ${x.from}: a part is cast on on its own mid-piece`);
    if (roots.length === 1) chain(roots[0], top, 1);
    else {
      nameSiblings(roots, 1);
      line('section', `Work each ${nounAt(group)} separately.`, top);
      let merge = null;
      order(roots, 1).forEach((k) => {
        const sub = { key: ++partNo, depth: 1, name: names.get(k) };
        line('part', `${names.get(k)}:`, sub, { part: sub.key });
        const res = chain(k, sub, 1);
        if (res != null) merge = res;
      });
      if (merge != null) { line('section', 'Continue across all sts.', top); chain(merge, top, nodes[merge].from); }
    }
    return plan;
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
//
// Conventions of the written pattern (as a knitting tech editor expects them):
//   - "bind off n sts" works n + 1 sts and passes n over: the stitch left on the right needle is
//     the first stitch of what follows, so the next count leaves it out ("bind off 2 sts, p to
//     end"; "p8, bind off 3 sts, p1"). A part's last stitches: "bind off rem n sts" / "fasten off".
//   - a cast-on at the start of a row goes onto the left needle (knitted or cable cast-on) and the
//     new stitches are then worked: "cast on 1 st, k2, M1R, k7".
//   - a cast-on across a gap: "turn, cast on n sts, turn".
//   - M1L / M1R lean outward: away from the stitch an M1 pairs round (a peak), else toward the
//     nearer edge of its run. On WS rows M1LP / M1RP lean the same way, as seen from the RS.

function mLean(chart, r, col) {
  const R = chart.row(r);
  const s = (c) => { const cl = chart.cell(r, c); return cl ? cl.s : null; };
  // a pair round one stitch: m, st, m -> the left one leans left, the right one right
  if (s(col + 2) === 'm' && s(col + 1) && s(col + 1) !== 'm') return 'L';
  if (s(col - 2) === 'm' && s(col - 1) && s(col - 1) !== 'm') return 'R';
  const run = R.runs.find((u) => col >= u.a && col <= u.b) || { a: 0, b: chart.width - 1 };
  const dl = col - run.a, dr = run.b - col;
  if (dl !== dr) return dl < dr ? 'L' : 'R';
  const lo = Math.min(...R.cols), hi = Math.max(...R.cols);
  return col * 2 < lo + hi ? 'L' : 'R';
}

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
    // worked purlwise when the stitches beside it are purled (WS stockinette, RS reverse stockinette)
    const map = chart.row(e.r).map;
    const nb = [map[e.k - 1], map[e.k + 1]].find((x) => x && (x.stitch === 'k' || x.stitch === 'p'));
    const purled = nb ? (nb.stitch === 'k') !== rs : !rs;
    return 'M1' + mLean(chart, e.r, e.col) + (purled ? 'P' : '');
  }
  return s;
}

const COUNTABLE = new Set(['k', 'p']);
const NEED = (op) => (op === 'k2tog' || op === 'ssk' || op === 'p2tog' || op === 'ssp' ? 2 : op.startsWith('M1') || op === 'yo' ? 0 : /^C\d/.test(op) ? +op[1] : 1);

// atoms: the row's operations in knitting order. cells = knitting-order cell indices covered.
// node: the part (see Chart._parts) a cell's run belongs to; for a bind-off, its run below.
function rowAtoms(chart, r) {
  const R = chart.row(r);
  const rs = R.rs;
  const parts = chart.endless ? null : chart._parts();
  const atoms = [];
  const bo = (list) => { for (const pi of list) atoms.push({ op: 'BO', slot: '', cells: [], uses: 1, col: R.prevCols[pi], node: R.boNode ? R.boNode[pi] : 0 }); };
  const nodeOf = (c) => { if (!parts) return 0; const i = R.runs.findIndex((u) => c >= u.a && c <= u.b); return parts.rowNodes[r][i]; };
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
      atoms.push({ op: span.type, slot: e.slot, cells, uses: cells.length, node: nodeOf(e.col) });
      for (let j = 0; j < cells.length; j++) bo(map[k + j].boundOffAfter);
      k = q - 1;
      continue;
    }
    let gap = false;
    if (e.stitch === '+') {
      // a '+' stretch with stitches of its run on both sides is cast on across a gap; one at the
      // run's end is cast on at the row (or part) start
      const run = R.runs.find((u) => e.col >= u.a && e.col <= u.b);
      let a = e.col, b = e.col;
      while (a - 1 >= run.a && stitchAt(chart, r, a - 1) === '+') a--;
      while (b + 1 <= run.b && stitchAt(chart, r, b + 1) === '+') b++;
      gap = a > run.a && b < run.b;
    }
    atoms.push({ op: opOf(e, rs, chart), slot: e.slot, cells: [k], uses: e.takes.length, gap, node: nodeOf(e.col) });
    bo(e.boundOffAfter);
  }
  return atoms;
}
const stitchAt = (chart, r, c) => { const cl = chart.cell(r, c); return cl ? cl.s : null; };

// is atom a (of row r) in the part listing of nodes ids? A part's first row also takes the
// bind-offs of the parts it grew from (a split's gap, a join's last stitches).
function inPart(chart, r, a, ids) {
  if (ids.includes(a.node)) return true;
  if (a.op !== 'BO') return false;
  const { nodes } = chart._parts();
  return ids.some((id) => nodes[id].from === r && nodes[id].parents.includes(a.node));
}

// prepare atoms for wording: a row-start cast-on becomes "cast on n sts" (CO markers, no cells)
// and the new stitches are worked; the stitch after a bind-off is the one left on the right needle.
// need: stitches taken from the left needle (a row-start cast-on adds to it).
function prepAtoms(atoms, rs, warn) {
  const out = [];
  let i = 0;
  while (i < atoms.length) {
    const a = atoms[i];
    if (a.op === 'CO' && !a.gap) {
      let j = i; while (j < atoms.length && atoms[j].op === 'CO' && !atoms[j].gap) j++;
      for (let q = i; q < j; q++) out.push({ op: 'CO', slot: atoms[q].slot, cells: [], uses: 0, need: -1, edge: true, node: atoms[q].node });
      for (let q = i; q < j; q++) out.push({ ...atoms[q], op: rs ? 'k' : 'p', need: 1, fromCO: true });
      i = j; continue;
    }
    out.push({ ...a, need: a.op === 'BO' ? 1 : a.op === 'CO' ? 0 : a.uses });
    i++;
  }
  for (let q = 0; q < out.length; q++) {
    if (out[q].op !== 'BO' || (out[q + 1] && out[q + 1].op === 'BO')) continue;
    const nx = out[q + 1];
    if (!nx) {
      if (out.some((x) => x.cells.length)) { warn('a bind-off at the end of a part\'s row (bind off at the start of a row instead)'); continue; }
      for (let b = q; b >= 0 && out[b].op === 'BO'; b--) out[b].rem = true;
      continue;
    }
    if (COUNTABLE.has(nx.op) && !nx.fromCO) nx.leftover = true;
    else warn(`the stitch after a bind-off is "${nx.op}", not a plain stitch (one st is left on the right needle after a bind-off)`);
  }
  return out;
}

const keyOf = (a, colored) => (a.leftover ? 'LO' : a.op === 'CO' ? (a.edge ? 'COe' : 'COg') : a.op) + (colored && a.op !== 'BO' ? '|' + a.slot : '');

// group consecutive equal atoms -> [{op, slot, atoms:[...]}]; a leftover joins its bind-off
function groupAtoms(atoms, colored) {
  const g = [];
  for (const a of atoms) {
    const last = g[g.length - 1];
    if (last && a.leftover && last.op === 'BO') { last.atoms.push(a); last.lo = a; continue; }
    if (last && !last.lo && keyOf(last.atoms[0], colored) === keyOf(a, colored)) last.atoms.push(a);
    else g.push({ op: a.op, slot: a.slot, gap: a.gap, edge: a.edge, atoms: [a], lo: null });
  }
  return g;
}

const sts = (n) => `${n} st${n === 1 ? '' : 's'}`;
function groupText(gp, colored, rs) {
  const sl = colored ? ' ' + gp.slot : '';
  if (gp.op === 'BO') {
    const n = gp.atoms.filter((a) => a.op === 'BO').length;
    if (gp.lo) {
      const how = gp.lo.op !== (rs ? 'k' : 'p') ? (rs ? ' purlwise' : ' knitwise') : '';
      return `bind off ${sts(n)}${how}${colored ? ' in ' + gp.lo.slot : ''}`;
    }
    if (gp.atoms[0].rem) return n === 1 ? 'fasten off' : `bind off rem ${sts(n)}`;
    return `bind off ${sts(n)}`;
  }
  const n = gp.atoms.length;
  if (COUNTABLE.has(gp.op)) return `${gp.op}${n}${sl}`;
  if (gp.op === 'CO') return gp.edge ? `cast on ${sts(n)}${sl}` : `turn, cast on ${sts(n)}${sl}, turn`;
  if (n === 1) return gp.op + sl;
  if (n === 2) return `${gp.op}${sl}, ${gp.op}${sl}`; // never "yo twice": that means a double wrap
  return `[${gp.op}${sl}] ${n} times`;
}

function groupsCost(atoms, colored) { return atoms.length ? groupAtoms(atoms, colored).length : 0; }
const needOf = (list) => list.reduce((t, a) => t + a.need, 0);

// a "*…; rep from *" repeat. With the pattern's repeat (def.repeat.width > 1) it must be that
// many stitches and cover most of the row, so it never cuts a motif apart; without one any
// repeat that shortens the row is used.
function findRepeat(atoms, colored, rep, aligned) {
  const N = atoms.length;
  if (rep && !(rep.width > 1)) return null;
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
      const unit = atoms.slice(s, s + L);
      const rg = groupsCost(unit, colored);
      if (rg < 2 && new Set(unit.map((a, j) => keys[s + j])).size < 2) continue; // "k1" reps: grouping says it better
      if (unit.some((a) => a.op === 'BO' || a.op === 'CO' || a.leftover || a.fromCO)) continue;
      const pre = atoms.slice(0, s), suf = atoms.slice(s + n * L);
      if (rep) {
        // the motif's width (a plain texture may also repeat a divisor of it: 2×2 rib in an 8-st pattern)
        const w = needOf(unit);
        if (w !== rep.width && (colored || rep.width % w)) continue;
        // a unit that itself repeats (k1 A, k1 C, k1 A, k1 C …) is said better with brackets
        if (Array.from({ length: L - 1 }, (_, q) => q + 1).some((q) => L % q === 0 && keys.slice(s, s + L).every((k, j) => k === keys[s + (j % q)]))) continue;
        if (needOf(unit) * n <= needOf(pre) + needOf(suf)) continue;
      }
      let cost = groupsCost(pre, colored) + rg + groupsCost(suf, colored) + (suf.length ? 0.5 : 0) + s * 0.001;
      if (pre.length && keys[s - 1] === keys[s]) cost += 0.6;
      if (suf.length && keys[s + n * L] === keys[s]) cost += 0.6;
      if (unit.length > 1 && keys[s] === keys[s + L - 1]) cost += 0.6;
      if (aligned && !aligned(s)) cost += 0.7; // prefer a repeat that starts on a motif boundary
      if (!best || cost < best.cost) best = { s, L, n, cost };
    }
  }
  if (best && (rep || best.cost < plain)) return best;
  return null;
}

// tokens: [{text, from, to, rep, need, kind, op, n}] -> brackets for repeated runs of tokens:
// "[yo, k1] 6 times", "[p1, k1] twice"
function bracketTokens(toks) {
  const out = [];
  let i = 0;
  const plainTok = (t) => t.kind !== 'BO' && t.kind !== 'CO' && t.from !== null;
  while (i < toks.length) {
    let best = null;
    for (let L = 2; L <= 4; L++) {
      let n = 1;
      while (i + (n + 1) * L <= toks.length) {
        let ok = true;
        for (let j = 0; j < L; j++) if (toks[i + n * L + j].text !== toks[i + j].text) { ok = false; break; }
        if (!ok) break;
        n++;
      }
      const unit = toks.slice(i, i + L);
      if (n < 2 || !unit.every(plainTok) || new Set(unit.map((t) => t.text)).size < 2) continue;
      const save = n * L - 1;
      if (!best || save > best.save) best = { L, n, save };
    }
    if (best) {
      const span = toks.slice(i, i + best.L * best.n), unit = span.slice(0, best.L);
      out.push({ text: `[${unit.map((t) => t.text).join(', ')}] ${best.n === 2 ? 'twice' : `${best.n} times`}`, from: span[0].from, to: span[span.length - 1].to,
        rep: span[0].rep, need: span.reduce((s, t) => s + t.need, 0), kind: 'bracket' });
      i += best.L * best.n;
    } else out.push(toks[i++]);
  }
  return out;
}

// rowWording(chart, r, {part, name}) -> {r, rs, label, text, tokens:[{text, from, to, rep}], repeat|null, count, …}
//   part: a part id or a list of ids (see Chart._plan), or -1 / none for the whole row.
//   tokens map onto knitting-order cell indices [from, to); rep: true for tokens inside the repeat
//   (they describe the FIRST repeat; use wordingCursor for the live position).
export function rowWording(chart, r, opts = {}) {
  const R = chart.row(r);
  const rs = R.rs;
  const colored = chart.slotsUsed.size > 1;
  const ids = opts.part == null || opts.part === -1 || chart.endless ? null : [].concat(opts.part);
  let raw = rowAtoms(chart, r);
  if (ids) raw = raw.filter((a) => inPart(chart, r, a, ids));
  const warnings = [];
  const atoms = prepAtoms(raw, rs, (m) => warnings.push(m));
  const allSlots = new Set(atoms.filter((a) => a.op !== 'BO').map((a) => a.slot));
  const uniformSlot = allSlots.size === 1 ? [...allSlots][0] : null;
  const perAtomColor = colored && !uniformSlot;
  const name = opts.name != null ? opts.name : ids && ids.length === 1 ? chart.partName(r, ids[0]) : '';
  const label = (name ? name + ' · ' : '') + `Row ${r} (${rs ? 'RS' : 'WS'})`;
  const tokens = [];
  const cellsOf = (list) => list.flatMap((a) => a.cells);
  const tok = (gps, rep) => gps.map((gp) => {
    const cs = cellsOf(gp.atoms);
    return { text: groupText(gp, perAtomColor, rs), from: cs.length ? cs[0] : null, to: cs.length ? cs[cs.length - 1] + 1 : null, rep,
      need: needOf(gp.atoms), kind: gp.op === 'BO' ? 'BO' : gp.op === 'CO' ? 'CO' : COUNTABLE.has(gp.op) ? 'count' : 'op', op: gp.op, n: gp.atoms.length, lo: !!gp.lo };
  });
  let text, repeat = null;
  const groups = groupAtoms(atoms, perAtomColor);
  if (groups.length === 1 && COUNTABLE.has(groups[0].op) && groups[0].atoms.length > 1) {
    text = `${groups[0].op} to end`;
    const cs = cellsOf(groups[0].atoms);
    tokens.push({ text, from: cs[0], to: cs[cs.length - 1] + 1, rep: false });
  } else {
    // motif boundaries (as the stitch markers): lo + left edge + j × width
    const rp = chart.def.repeat;
    let aligned = null;
    if (rp && rp.width > 1) {
      const [el] = edgePair(rp.edges);
      const lo = Math.min(...atoms.filter((a) => a.cells.length).map((a) => R.map[a.cells[0]].col));
      aligned = (s) => { const a = atoms[s]; if (!a.cells.length) return false; const c = R.map[a.cells[0]].col, b = rs ? c + 1 : c; return ((b - lo - el) % rp.width + rp.width) % rp.width === 0; };
    }
    const fr = findRepeat(atoms, perAtomColor, rp || null, aligned);
    if (fr) {
      const pre = atoms.slice(0, fr.s), rep = atoms.slice(fr.s, fr.s + fr.L), suf = atoms.slice(fr.s + fr.n * fr.L);
      tokens.push(...bracketTokens(tok(groupAtoms(pre, perAtomColor), false)));
      const rt = bracketTokens(tok(groupAtoms(rep, perAtomColor), true));
      rt[0].text = '*' + rt[0].text;
      tokens.push(...rt);
      const repCells = cellsOf(rep);
      repeat = { from: repCells[0], cells: repCells.length, count: fr.n };
      const sufNeed = needOf(suf);
      if (suf.length) {
        tokens.push({ text: `rep from * to last ${sufNeed === 1 ? 'st' : `${sufNeed} sts`}`, from: null, to: null, rep: false, glue: '; ' });
        tokens.push(...bracketTokens(tok(groupAtoms(suf, perAtomColor), false)));
      } else tokens.push({ text: 'rep from * to end', from: null, to: null, rep: false, glue: '; ' });
    } else {
      const T = bracketTokens(tok(groups, false));
      // "to end" after a bind-off; "k to last n sts" for a long plain stretch near the end
      if (!perAtomColor && T.length > 1) {
        const last = T[T.length - 1], before = T[T.length - 2];
        if (last.kind === 'count' && before.kind === 'BO' && before.lo) last.text = `${last.op} to end`;
        else {
          let gi = -1;
          T.forEach((t, j) => { if (t.kind === 'count' && t.n >= 10 && (gi < 0 || t.n >= T[gi].n)) gi = j; });
          if (gi >= 0) {
            const after = T.slice(gi + 1), nd = after.reduce((s, t) => s + t.need, 0);
            if (!after.length && gi > 0) T[gi].text = `${T[gi].op} to end`;
            else if (after.length && after.length <= 3 && nd <= 4 && after.every((t) => t.kind !== 'BO' && t.kind !== 'CO')) T[gi].text = `${T[gi].op} to last ${nd === 1 ? 'st' : `${nd} sts`}`;
          }
        }
      }
      tokens.push(...T);
    }
    text = tokens.map((t, i) => (i ? t.glue || ', ' : '') + t.text).join('');
  }
  if (colored && uniformSlot) text = `with ${uniformSlot}, ${text}`;
  const count = ids ? atoms.reduce((t, a) => t + a.cells.length, 0) : R.map.length;
  const prevCount = ids ? raw.reduce((t, a) => t + a.uses, 0) : R.prevCols.length;
  const islands = R.runs.length > 1;
  for (const t of tokens) { delete t.need; delete t.kind; delete t.op; delete t.n; delete t.lo; }
  return { r, rs, label, text, tokens, repeat, count, prevCount, countChanged: count !== prevCount, islands, part: ids ? ids.join('+') : -1, slot: uniformSlot, atoms, warnings };
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

// The wording strip's line for stitch k of row r: part-aware where the pattern works parts separately.
export function stripWording(chart, r, k) {
  const R = chart.row(r);
  if (chart.endless || !R.map.length) return rowWording(chart, r);
  const ctx = chart._plan().rows.get(r) || [];
  const keyed = ctx.filter((x) => x.key != null);
  if (!keyed.length) return rowWording(chart, r);
  const e = R.map[Math.min(k, R.map.length - 1)];
  const node = chart.nodeAt(r, e.col);
  const c = keyed.find((x) => x.ids.includes(node)) || keyed[0];
  return rowWording(chart, r, { part: c.ids, name: c.name });
}

const TIMES = ['zero times', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times', 'eight times', 'nine times', 'ten times', 'eleven times', 'twelve times'];
const times = (n) => TIMES[n] || `${n} times`;
const rowText = (w, r) => w.text + (w.countChanged && r > 1 && w.count ? ` (${sts(w.count)})` : '');

// pass 3: merge identical rows and repeating blocks of rows. list: [{r, t}] (consecutive rows)
function mergeRows(list) {
  const out = [];
  const side = (x) => (x % 2 ? 'RS' : 'WS');
  let i = 0;
  while (i < list.length) {
    let best = null;
    // identical consecutive rows
    let L = 1;
    while (i + L < list.length && list[i + L].t === list[i].t && list[i + L].r === list[i].r + L) L++;
    if (L >= 2) best = { p: 1, L };
    // a block of p rows repeating the p rows before it
    for (let p = 2; p <= 8 && i - p >= 0; p++) {
      let n = 0;
      while (i + n < list.length && list[i + n].t === list[i + n - p].t && list[i + n].r === list[i].r + n && list[i - p].r === list[i].r - p) n++;
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
// -> {lines: [{kind, label, text, rows, part, depth}], text, abbreviations, keys}
//   keys: Map 'r' | 'r|part' -> {r, ids} (which stitches each row line describes; for roundTrip)
export function writtenPattern(chart, opts = {}) {
  const def = chart.def;
  const colored = chart.slotsUsed.size > 1;
  const noun0 = (() => { const p = def.parts || def.islands || 'part'; return Array.isArray(p) ? p[0] : p; })();
  const lines = [];
  const info = (text) => lines.push({ kind: 'info', label: '', text });
  if (opts.name || def.name) lines.push({ kind: 'title', label: '', text: opts.name || def.name });
  if (opts.source || def.source) info(`Stitch pattern: ${opts.source || def.source}.`);
  const yarns = opts.yarns || def.slots;
  if (yarns && typeof Object.values(yarns)[0] === 'string') info('Yarn: ' + [...chart.slotsUsed].sort().map((k) => `${k} ${yarns[k]}`).join(', ') + '.');
  info(`Size: ${chart.width} sts × ${chart.height} rows, scaled down for the game.`);
  for (const n of def.notes || []) info(`Note: ${n}`);
  const first = chart.row(1);
  const firstSlot = chart.cell(1, first.cols[0]).slot;
  if (first.runs.length > 1) {
    const ws = first.runs.map((u) => u.b - u.a + 1);
    const each = ws.every((w) => w === ws[0]);
    info(each ? `Cast on ${ws[0]} sts for each ${noun0} (${ws.length} ${noun0}s)${colored ? ` in ${firstSlot}` : ''}.`
      : `Cast on ${ws.slice().reverse().join(', ')} sts for the ${noun0}s${colored ? ` in ${firstSlot}` : ''}.`);
  } else info(`Cast on ${first.cols.length} sts${colored ? ` in ${firstSlot}` : ''}.`);

  const used = new Set(['st', 'sts', 'RS', 'WS']);
  const keys = new Map();
  const warnings = [];
  const plan = chart._plan();
  warnings.push(...plan.warnings);
  for (const it of plan.layout) {
    if (it.kind !== 'rows') { lines.push({ kind: it.kind, label: '', text: it.text, part: it.part, depth: it.depth }); continue; }
    const list = [];
    for (const { r, ids } of it.rows) {
      const w = rowWording(chart, r, { part: ids });
      for (const a of w.atoms) used.add(a.op);
      if (w.atoms.some((a) => a.rem)) used.add('rem');
      warnings.push(...w.warnings.map((m) => `row ${r}: ${m}`));
      list.push({ r, t: rowText(w, r) });
      keys.set(it.key == null ? `${r}` : `${r}|${it.key}`, { r, ids });
    }
    for (const l of mergeRows(list)) lines.push({ kind: 'row', part: it.key == null ? undefined : it.key, depth: it.depth, ...l });
  }
  if (def.finishing) lines.push({ kind: 'end', label: '', text: def.finishing });
  used.add('BO');
  if ([...used].some((u) => u === 'k' || u === 'p')) { used.add('k'); used.add('p'); }
  const abbreviations = [...used].filter((a) => GLOSSARY[a]).map((a) => ({ abbr: a, meaning: GLOSSARY[a] }));
  const text = lines.map((l) => (l.label ? `${l.label}: ` : '') + l.text).join('\n');
  return { lines, text, abbreviations, keys, warnings };
}

// ---------------------------------------------------------------- round trip: text -> rows -> tokens

// split "a, b, [c, d] 3 times, turn, cast on 2 sts, turn" into items at bracket depth 0
function splitItems(t) {
  const raw = [];
  let depth = 0, cur = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (ch === ',' && depth === 0) { raw.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) raw.push(cur.trim());
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === 'turn' && /^cast on /.test(raw[i + 1] || '') && raw[i + 2] === 'turn') { out.push(`turn, ${raw[i + 1]}, turn`); i += 2; continue; }
    out.push(raw[i]);
  }
  return out.filter(Boolean);
}

// parseRowText('p2, *k2, p2; rep from * to end', 14, rs) -> [{op, slot}] (one per atom)
// `width` = stitches on the left needle at the start of the row (for "to end" / "to last n").
export function parseRowText(text, width, rs = true) {
  let t = text.replace(/\s*\(\d+ sts?\)$/, '');
  let slot = '';
  const wm = t.match(/^with (\w), /); if (wm) { slot = wm[1]; t = t.slice(wm[0].length); }
  const out = [];
  let left = width;
  const plainOp = rs ? 'k' : 'p';
  const exec = (raw, sink) => {
    let m;
    const push = (op, sl, need) => { sink.push({ op, slot: sl }); left -= need; };
    if ((m = raw.match(/^turn, cast on (\d+) sts?(?: ([A-D]))?, turn$/))) { for (let i = 0; i < +m[1]; i++) push('CO', m[2] || slot, 0); return; }
    if ((m = raw.match(/^cast on (\d+) sts?(?: ([A-D]))?$/))) { for (let i = 0; i < +m[1]; i++) push('CO', m[2] || slot, -1); return; }
    if ((m = raw.match(/^bind off rem (\d+) sts?$/))) { for (let i = 0; i < +m[1]; i++) push('BO', '', 1); return; }
    if (raw === 'fasten off') { push('BO', '', 1); return; }
    if ((m = raw.match(/^bind off (\d+) sts?( purlwise| knitwise)?(?: in ([A-D]))?$/))) {
      for (let i = 0; i < +m[1]; i++) push('BO', '', 1);
      push(m[2] === ' purlwise' ? 'p' : m[2] === ' knitwise' ? 'k' : plainOp, m[3] || slot, 1);
      return;
    }
    if ((m = raw.match(/^(k|p) to end$/))) { const n = left; for (let i = 0; i < n; i++) push(m[1], slot, 1); return; }
    if ((m = raw.match(/^(k|p) to last (?:(\d+) sts|st)$/))) { const n = left - (m[2] ? +m[2] : 1); if (n < 0) throw new Error(`"${raw}" with ${left} sts left`); for (let i = 0; i < n; i++) push(m[1], slot, 1); return; }
    if ((m = raw.match(/^(k|p)(\d+)(?: ([A-D]))?$/))) { for (let i = 0; i < +m[2]; i++) push(m[1], m[3] || slot, 1); return; }
    if ((m = raw.match(/^\[(.+)\] (?:(\d+) times|(twice)|(once))$/))) {
      const n = m[2] ? +m[2] : m[3] ? 2 : 1;
      const inner = splitItems(m[1]);
      for (let i = 0; i < n; i++) for (const it of inner) exec(it, sink);
      return;
    }
    if ((m = raw.match(/^(\S+?)(?: ([A-D]))?$/))) { push(m[1], m[2] || slot, NEED(m[1])); return; }
    throw new Error(`cannot read "${raw}"`);
  };
  const run = (part, sink = out) => { for (const it of splitItems(part)) exec(it, sink); };
  const star = t.indexOf('*');
  if (star < 0) { run(t); return out; }
  run(t.slice(0, star));
  const semi = t.indexOf('; rep from *');
  if (semi < 0) throw new Error(`no "; rep from *" in "${t}"`);
  const repText = t.slice(star + 1, semi);
  const tail = t.slice(semi + 2);
  let suf = '', keep = 0, m;
  if ((m = tail.match(/^rep from \* to last (?:(\d+) sts|st), (.*)$/))) { keep = m[1] ? +m[1] : 1; suf = m[2]; }
  else if (!/^rep from \* to end$/.test(tail)) throw new Error(`cannot read repeat tail "${tail}"`);
  const at = left;
  const one = []; run(repText, one);
  const per = at - left; left = at;
  const avail = left - keep;
  if (per <= 0 || avail % per) throw new Error(`repeat of ${per} does not fit ${avail} sts`);
  for (let i = 0; i < avail / per; i++) run(repText);
  if (suf) run(suf);
  return out;
}

// Reads a written pattern back into per-row texts: Map key `r` or `r|part` -> row text.
// Parts are numbered 1, 2, … in the order their headers appear.
export function parseWrittenPattern(text) {
  const rows = new Map();
  let part = null, partNo = 0;
  for (const line of text.split('\n')) {
    let m;
    if (/^Work each .* separately\.$/.test(line)) continue;
    if (/^Continue across all sts\.$/.test(line)) { part = null; continue; }
    if (/^(Bind off|Fasten off)/.test(line)) continue;
    if (/^[A-Z][\w ,]*( \([^)]*\))?:$/.test(line)) { partNo++; part = partNo; continue; }
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
  const tag = `row ${r}${part !== -1 && part != null ? ` (${w.label.split(' · ')[0]})` : ''}`;
  let ops;
  try { ops = parseRowText(text, w.prevCount, w.rs); } catch (e) { return `${tag}: ${e.message} in "${text}"`; }
  const colored = chart.slotsUsed.size > 1;
  const want = w.atoms.map((a) => a.op + (colored && a.op !== 'BO' ? a.slot : ''));
  const got = ops.map((o) => o.op + (colored && o.op !== 'BO' ? o.slot : ''));
  if (want.join(',') !== got.join(',')) return `${tag}: "${text}" reads back as [${got.join(' ')}], chart is [${want.join(' ')}]`;
  return null;
}

// The whole round trip: written pattern text -> rows -> tokens, compared with the row map, and
// every stitch and bind-off of every row described exactly once.
export function roundTrip(chart, opts) {
  const wp = writtenPattern(chart, opts);
  const rows = parseWrittenPattern(wp.text);
  const errs = [];
  const cover = new Map(); // r -> count of atoms described
  for (const [key, { r, ids }] of wp.keys) {
    if (!rows.has(key)) { errs.push(`row ${r}: missing from the written pattern (${key})`); continue; }
    const e = roundTripRow(chart, r, rows.get(key), ids); if (e) errs.push(e);
    const n = rowAtoms(chart, r).filter((a) => inPart(chart, r, a, ids)).length;
    cover.set(r, (cover.get(r) || 0) + n);
  }
  for (let r = 1; r <= chart.height; r++) {
    const n = rowAtoms(chart, r).length;
    if ((cover.get(r) || 0) !== n) errs.push(`row ${r}: the written pattern describes ${cover.get(r) || 0} of its ${n} stitches and bind-offs`);
  }
  for (const m of wp.warnings) errs.push(m);
  return errs;
}
// ---------------------------------------------------------------- drape: how the fabric hangs
//
// Increases and decreases make the rows of a chevron or Old Shale rise and fall: the stitches lean
// away from the yarn-overs (peaks) toward the decreases (valleys), so stripes zigzag and the cast-on
// edge scallops. drapeOf(chart) -> Float32Array(width) of vertical offsets in rows (+ = down), or
// null for a flat piece. From the pattern's `drape`:
//   {type: 'auto', amplitude, shape: 'linear' | 'cos', row}  peaks at the yarn-over groups and
//       valleys at the decrease groups of the first lace row (or `row`); amplitude = half the
//       peak-to-valley height, in rows
//   {type: 'wave', period, amplitude, phase, shape}  a plain wave across the columns
export function drapeOf(chart) {
  if (chart._drape !== undefined) return chart._drape;
  const d = chart.def && chart.def.drape;
  chart._drape = null;
  if (!d || chart.endless || chart.errors.length) return null;
  const W = chart.width, A = d.amplitude ?? 1;
  const out = new Float32Array(W);
  const ease = d.shape === 'cos' ? (t) => (1 - Math.cos(Math.PI * t)) / 2 : (t) => t;
  if (d.type === 'wave') {
    const P = d.period || W, ph = d.phase || 0;
    for (let c = 0; c < W; c++) {
      const t = (((c + ph) / P) % 1 + 1) % 1; // 0 valley, 0.5 peak, 1 valley
      out[c] = A * (1 - 2 * ease(t < 0.5 ? t * 2 : 2 - t * 2));
    }
    return (chart._drape = out);
  }
  // auto: the lace row's yarn-overs and decreases
  let r = d.row || 1;
  if (!d.row) while (r <= chart.height && !chart.cells(r).some((x) => x && x.s === 'o')) r++;
  if (r > chart.height) return null;
  const marks = [];
  for (const cl of chart.cells(r)) if (cl && (cl.s === 'o' || cl.s === '<' || cl.s === '>')) marks.push({ c: cl.c, v: cl.s === 'o' ? -1 : 1 });
  // groups of the same kind within 2 columns of each other -> one extremum at their centre
  const ext = [];
  for (const m of marks) {
    const g = ext[ext.length - 1];
    if (g && g.v === m.v && m.c - g.last <= 2) { g.sum += m.c; g.n++; g.last = m.c; } else ext.push({ v: m.v, sum: m.c, n: 1, last: m.c });
  }
  if (ext.length < 2) return null;
  const xs = ext.map((g) => g.sum / g.n);
  for (let c = 0; c < W; c++) {
    let v;
    if (c <= xs[0]) v = ext[0].v;
    else if (c >= xs[xs.length - 1]) v = ext[ext.length - 1].v;
    else {
      let i = 0; while (xs[i + 1] < c) i++;
      const t = (c - xs[i]) / (xs[i + 1] - xs[i]);
      v = ext[i].v + (ext[i + 1].v - ext[i].v) * ease(t);
    }
    out[c] = A * v;
  }
  return (chart._drape = out);
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
