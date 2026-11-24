// patternKit.js — helpers for writing Knit Knack's pattern charts (used by patterns.js).
// Pure module: runs in the browser and in node. It only builds the three text layers that
// chart.js reads (shape, stitch, color, top row first) plus cable span records.
//
// The usual recipe for a chart is: a silhouette (ASCII art whose letters are the color slots),
// a texture (a stitch pattern laid whole and centred on the repeat row), motifs (colorwork),
// then shapeEdges, which turns the outline's steps into real flat-knitting shaping:
//   - a 1-stitch step is a decrease in the run's end cell (k2tog '<' on the left edge, ssk '>' on
//     the right edge, so each leans with its edge and the two edges mirror) or a make-one 'm'
//     one stitch in from the edge;
//   - a step of 2 or more is a bind-off (inward) or a cast-on '+' (outward) at the START of a row:
//     the right edge on RS (odd) rows, the left edge on WS (even) rows. A step that lands on the
//     wrong row is moved up one row, so a step on both sides becomes two rows
//     ("BO 3 sts at beg of next 2 rows"). In an island section (ears, legs, fronts) each part's
//     own right end (RS) or left end (WS) is its row start.
//   - a gap opening inside a run is bound off under the gap ("k5, BO 3, k to end"); a gap closing
//     is cast on across it ("k4, turn, CO 2 sts, turn, k4").
//
// Coordinates: rows r = 1..H from the bottom (row 1 = the cast-on row, RS), columns c = 0..W-1
// from the left, as seen from the front.

const isRS = (r) => r % 2 === 1;

// ---------------------------------------------------------------- ASCII pictures (top row first)

// pic(`...`) -> lines. Each line is trimmed; blank lines dropped; spaces inside become '.'.
export function pic(src) {
  const arr = Array.isArray(src) ? src : String(src).split('\n');
  return arr.map((s) => String(s).trim()).filter((s) => s.length).map((s) => s.replace(/ /g, '.'));
}
export const rect = (w, h, ch = 'A') => Array.from({ length: h }, () => ch.repeat(w));
// tile lines nx times across and ny times up
export function repeat(lines, nx = 1, ny = 1) {
  const row = lines.map((l) => l.repeat(nx));
  let out = [];
  for (let i = 0; i < ny; i++) out = out.concat(row);
  return out;
}
// mirror left-right
export const mirror = (lines) => lines.map((l) => [...l].reverse().join(''));
// a symmetric picture from its left half; odd: the half's last column is the centre column
export const symmetric = (half, odd = false) => half.map((l) => l + [...l].reverse().join('').slice(odd ? 1 : 0));
// stack pictures (top first), padding to the widest, centred
export function stack(...parts) {
  const all = parts.flat();
  const W = Math.max(...all.map((l) => l.length));
  return all.map((l) => { const p = W - l.length, a = Math.floor(p / 2); return '.'.repeat(a) + l + '.'.repeat(p - a); });
}
// pad lines to width W (centred) and/or height
export function pad(lines, W, H = lines.length, ch = '.') {
  const out = lines.map((l) => { const p = W - l.length, a = Math.floor(p / 2); return ch.repeat(a) + l + ch.repeat(p - a); });
  while (out.length < H) out.unshift(ch.repeat(W));
  return out;
}

// ---------------------------------------------------------------- shape helpers (masks as art)

// an ellipse-ish blob of letter ch, w × h
export function ellipse(w, h, ch = 'A') {
  const out = [];
  for (let i = 0; i < h; i++) {
    const y = (i + 0.5) / h * 2 - 1;
    let s = '';
    for (let c = 0; c < w; c++) { const x = (c + 0.5) / w * 2 - 1; s += x * x + y * y <= 1.02 ? ch : '.'; }
    out.push(s);
  }
  return out;
}
// polygon(W, H, pts) -> art: cells whose centre lies inside the polygon (pts in cell units,
// x from the left, y from the TOP). Used for stars and other straight-edged outlines.
export function polygon(W, H, pts, ch = 'A') {
  const inside = (x, y) => {
    let s = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s;
    }
    return s;
  };
  const out = [];
  for (let i = 0; i < H; i++) { let l = ''; for (let c = 0; c < W; c++) l += inside(c + 0.5, i + 0.5) ? ch : '.'; out.push(l); }
  return out;
}
// stretch(lines, rows): resample a picture drawn with square cells to `rows` rows. A knitted
// stitch is wider than tall (rows are 0.72 of a stitch wide), so a picture drawn square needs
// about 1.4 times as many rows to keep its proportions.
export function stretch(lines, rows) {
  const L = pic(lines), n = L.length, out = [];
  for (let i = 0; i < rows; i++) out.push(L[Math.min(n - 1, Math.floor(((i + 0.5) * n) / rows))]);
  return out;
}
// rows given as widths, bottom first, centred in W (leftOff lets a row sit off-centre)
export function widths(W, list, ch = 'A') {
  const out = list.map((w) => {
    const [n, off] = Array.isArray(w) ? w : [w, null];
    const a = off == null ? Math.floor((W - n) / 2) : off;
    return '.'.repeat(a) + ch.repeat(n) + '.'.repeat(W - a - n);
  });
  return out.reverse();
}

// ---------------------------------------------------------------- grids

// Grid: rows 1..H, each an array of W cells. g[r][c].
const grid = (W, H, v) => { const g = [null]; for (let r = 1; r <= H; r++) g.push(new Array(W).fill(v)); return g; };
export function runsOf(row) {
  const runs = [];
  for (let c = 0; c < row.length; c++) {
    if (!row[c]) continue;
    if (runs.length && runs[runs.length - 1].b === c - 1) runs[runs.length - 1].b = c;
    else runs.push({ a: c, b: c });
  }
  return runs;
}

// ---------------------------------------------------------------- shapeEdges

// shapeEdges(mask, opts) — mask: rows 1..H of booleans (mutated: steps that land on the wrong
// row are moved up a row). Returns {mask, marks, moved}: marks[r][c] is '<', '>', 'm' or '+'.
// opts.singles: 'any' (default) puts 1-st steps on any row; 'rs' only on RS rows (garter and
// textured fabrics, whose WS decreases would show the wrong way), moving WS ones up a row.
// opts.fill(r, c, fromR) is called when a cell is added to a row by a moved step.
//
// EDGE_CO_MAX: the most stitches cast on at a row start in one go. chart.js (rowAtoms) words a
// '+' that is not at a run's very end as a gap cast-on ("turn, cast on 3 sts, turn"), so an edge
// cast-on of 2 or more reads wrongly ("cast on 1 st, turn, cast on 3 sts, turn"). Until that is
// fixed, an outward step at a row start is worked as "cast on 1 st, k1, M1" (2 sts a row) and a
// wider step is spread over the next rows. Set it to Infinity once chart.js words "cast on 4 sts".
export let EDGE_CO_MAX = Infinity;
export const setEdgeCoMax = (n) => { EDGE_CO_MAX = n; };
export function shapeEdges(mask, opts = {}) {
  const coMax = opts.coMax ?? EDGE_CO_MAX;
  const H = mask.length - 1, W = mask[1].length;
  const marks = grid(W, H, null);
  const singles = opts.singles || 'any'; // or fn(r) -> 'any' | 'rs'
  const moved = [];
  const add = (r, c) => { if (!mask[r][c]) { mask[r][c] = true; opts.fill && opts.fill(r, c); } };
  for (let r = 2; r <= H; r++) {
    const rs = isRS(r);
    const mode = typeof singles === 'function' ? singles(r) : singles;
    const singleOk = mode === 'any' || rs;
    // up to a few passes: a moved step changes this row's runs
    for (let pass = 0; pass < 12; pass++) {
      let changed = false;
      const prev = runsOf(mask[r - 1]), cur = runsOf(mask[r]);
      for (const u of cur) {
        const over = prev.filter((p) => p.b >= u.a && p.a <= u.b);
        if (!over.length) continue; // a new island: '+' everywhere (checked by chart.js)
        const pl = over[0], pr = over[over.length - 1];
        // which cur runs share these prev runs (a split)?
        const sibL = cur.filter((v) => v !== u && v.b >= pl.a && v.a <= pl.b && v.b < u.a);
        const sibR = cur.filter((v) => v !== u && v.b >= pr.a && v.a <= pr.b && v.a > u.b);
        // ---- left edge (row start on WS)
        if (!sibL.length) {
          const d = u.a - pl.a;
          if (d >= 2 && rs) { for (let c = pl.a; c < u.a; c++) add(r, c); moved.push([r, 'L', d]); changed = true; break; }
          if (d === 1 && !singleOk) { add(r, pl.a); moved.push([r, 'L', d]); changed = true; break; }
          if (d <= -2 && rs) { for (let c = u.a; c < pl.a; c++) mask[r][c] = false; moved.push([r, 'L', d]); changed = true; break; }
          if (d < -2 && coMax === 1) { for (let c = u.a; c < pl.a - 2; c++) mask[r][c] = false; moved.push([r, 'L', d]); changed = true; break; }
          // garter-style WS rows take no M1: the row-start side may still cast on 1 st
          if (d === -2 && coMax === 1 && !singleOk) { mask[r][u.a] = false; moved.push([r, 'L', d]); changed = true; break; }
        }
        // ---- right edge (row start on RS)
        if (!sibR.length) {
          const d = pr.b - u.b;
          if (d >= 2 && !rs) { for (let c = u.b + 1; c <= pr.b; c++) add(r, c); moved.push([r, 'R', d]); changed = true; break; }
          if (d === 1 && !singleOk) { add(r, pr.b); moved.push([r, 'R', d]); changed = true; break; }
          if (d <= -2 && !rs) { for (let c = pr.b + 1; c <= u.b; c++) mask[r][c] = false; moved.push([r, 'R', d]); changed = true; break; }
          if (d < -2 && coMax === 1) { for (let c = pr.b + 3; c <= u.b; c++) mask[r][c] = false; moved.push([r, 'R', d]); changed = true; break; }
        }
        // ---- (the end-of-part check follows the loop)
        // ---- a 1-st run cannot take 3 sts (chart.js gives a lone decrease both neighbours):
        // keep 2 sts, adding the one at the row's end side
        if (u.a === u.b && pl === pr && pl.b - pl.a >= 2 && !sibL.length && !sibR.length) {
          const c = rs ? u.a - 1 : u.b + 1;
          if (c >= pl.a && c <= pl.b) { add(r, c); moved.push([r, 'tip', 1]); changed = true; break; }
          if (d === -1 && !singleOk) { mask[r][u.b] = false; moved.push([r, 'R', d]); changed = true; break; }
        }
      }
      if (!changed) {
        // a part that stops here is bound off: only allowed where it sits at the row's start
        // (no stitches of this row to its right on RS rows, to its left on WS rows); else it
        // is worked one more row
        for (const p of prev) {
          if (cur.some((u) => p.b >= u.a && p.a <= u.b)) continue;
          const ahead = cur.some((u) => (rs ? u.a > p.b : u.b < p.a));
          if (ahead) { for (let c = p.a; c <= p.b; c++) add(r, c); moved.push([r, 'end', p.a]); changed = true; }
        }
      }
      if (!changed) break;
    }
    // ---- marks for the settled row
    const prev = runsOf(mask[r - 1]), cur = runsOf(mask[r]);
    for (const u of cur) {
      const over = prev.filter((p) => p.b >= u.a && p.a <= u.b);
      if (!over.length) { for (let c = u.a; c <= u.b; c++) marks[r][c] = '+'; continue; }
      const pl = over[0], pr = over[over.length - 1];
      const sibL = cur.some((v) => v !== u && v.b >= pl.a && v.a <= pl.b && v.b < u.a);
      const sibR = cur.some((v) => v !== u && v.b >= pr.a && v.a <= pr.b && v.a > u.b);
      // gaps closing inside this run: cast on across them
      for (let j = 0; j + 1 < over.length; j++) for (let c = over[j].b + 1; c < over[j + 1].a; c++) marks[r][c] = '+';
      const width = u.b - u.a + 1;
      let dl = sibL ? 0 : u.a - pl.a, dr = sibR ? 0 : pr.b - u.b;
      // a 1-wide run cannot hold two decreases: bind off the row-start side instead
      if (width === 1 && dl === 1 && dr === 1) { if (rs) dr = 99; else dl = 99; }
      if (dl === 1) marks[r][u.a] = '<';
      else if (dl === -1 && !singleOk && !rs) marks[r][u.a] = '+'; // CO 1 at the WS row start
      else if (dl === -1) marks[r][width >= 3 ? u.a + 1 : u.a] = 'm';
      else if (dl <= -2 && coMax === 1) { marks[r][u.a] = '+'; marks[r][pl.a] = 'm'; }
      else if (dl <= -2) for (let c = u.a; c < pl.a; c++) marks[r][c] = '+';
      if (dr === 1) marks[r][u.b] = '>';
      else if (dr === -1) marks[r][width >= 3 ? u.b - 1 : u.b] = 'm';
      else if (dr <= -2 && coMax === 1) { marks[r][u.b] = '+'; marks[r][pr.b] = 'm'; }
      else if (dr <= -2) for (let c = pr.b + 1; c <= u.b; c++) marks[r][c] = '+';
    }
  }
  return { mask, marks, moved };
}

// ---------------------------------------------------------------- textures (local coordinates)
// A texture is fn(r, c) -> stitch char, with r = 1.. the texture's own first row and c = 0.. its
// first column, so a repeat starts whole at the left edge of the repeat row ("centred").
// Every one shows the RIGHT side, as the chart does.

export const TEX = {
  stockinette: () => 'k',
  reverse: () => 'p',
  garter: (r, c, i) => (isRS(i ? i.r : r) ? 'k' : 'p'),             // knit every row: WS reads "k"
  rib1: (r, c) => (c % 2 === 0 ? 'k' : 'p'),                      // k1, *p1, k1
  rib2: (r, c) => (c % 4 < 2 ? 'k' : 'p'),                        // k2, *p2, k2 (stacked)
  seed: (r, c) => ((r + c) % 2 === 1 ? 'k' : 'p'),               // k1, *p1, k1 alternating every row
  moss: (r, c) => ((Math.floor((r - 1) / 2) + c) % 2 === 0 ? 'k' : 'p'), // 2-row blocks, 4-row repeat
  basketweave: (r, c) => ((Math.floor((r - 1) / 4) + Math.floor(c / 4)) % 2 === 0 ? 'k' : 'p'),
  basket3: (r, c) => ((Math.floor((r - 1) / 3) + Math.floor(c / 3)) % 2 === 0 ? 'k' : 'p'),
  brokenRib: (r, c, i) => (isRS(i ? i.r : r) ? (c % 2 === 0 ? 'k' : 'p') : 'k'), // RS k1,*p1,k1; WS purl
};
export const texture = (t) => (typeof t === 'function' ? t : TEX[t]);

// tile(repeatLines) -> texture. repeatLines: a small chart, top row first, as printed in a
// stitch dictionary. Its bottom line is the texture's row 1. Cable cells: runs of F/f (front)
// or R/r (back) become one cable span (C2F, C4B, …).
export function tile(lines, { dr = 0, dc = 0 } = {}) {
  const L = pic(lines);
  const h = L.length, w = L[0].length;
  return (r, c) => {
    const rr = ((r - 1 + dr) % h + h) % h, cc = ((c + dc) % w + w) % w;
    return L[h - 1 - rr][cc];
  };
}
// a texture with plain edge columns: n stitches of `edge` each side, `inner` between (its c
// counted from the first inner column). Edge widths are relative to each row's run.
export function framed(inner, { left = 1, right = left, edge = 'garter' } = {}) {
  const I = texture(inner), E = texture(edge);
  return (r, c, info) => {
    if (info && (info.c - info.L < left || info.R - info.c < right)) return E(r, c, info);
    return I(r, c - left, info);
  };
}
// Colorwork: motif(lines, slotOf) -> color fn(r, c) for a tiled motif. Letters are slots
// (or map them with slotOf); '.' and ' ' keep the base color.
export function motif(lines, { dr = 0, dc = 0, tileX = true, tileY = true } = {}) {
  const L = pic(lines);
  const h = L.length, w = L[0].length;
  return (r, c) => {
    let rr = r - 1 + dr, cc = c + dc;
    if (tileY) rr = ((rr % h) + h) % h; else if (rr < 0 || rr >= h) return null;
    if (tileX) cc = ((cc % w) + w) % w; else if (cc < 0 || cc >= w) return null;
    const ch = L[h - 1 - rr][cc];
    return ch === '.' || ch === ' ' ? null : ch;
  };
}

// ---------------------------------------------------------------- the builder

// knit(art) -> a Piece. art: color art (top row first), '.' = no stitch, A-D = slot.
export function knit(art) { return new Piece(pic(art)); }

export class Piece {
  constructor(lines) {
    this.W = Math.max(...lines.map((l) => l.length));
    // every line of the art must be the same width: a wider line once made a chart whose middle
    // rows had stitches with nothing below them (the heart pillow's row 3, 22 sts on 20)
    this.ragged = lines.map((l, i) => [lines.length - i, l.length]).filter(([, n]) => n !== this.W);
    this.H = lines.length;
    const W = this.W, H = this.H;
    this.mask = grid(W, H, false);
    this.col = grid(W, H, 'A');
    this.st = grid(W, H, null);
    this.fixed = grid(W, H, false); // cells set by an overlay (textures don't overwrite them)
    this.spots = {};
    for (let i = 0; i < H; i++) {
      const r = H - i, l = lines[i].padEnd(W, '.');
      for (let c = 0; c < W; c++) {
        const ch = l[c]; if (ch === '.') continue;
        this.mask[r][c] = true;
        if (/[A-D]/.test(ch)) this.col[r][c] = ch;
        else if (/[a-d]/.test(ch)) { this.col[r][c] = ch.toUpperCase(); this.st[r][c] = 'p'; this.fixed[r][c] = true; } // purl in that slot
        else { this.col[r][c] = 'A'; (this.spots[ch] = this.spots[ch] || []).push([r, c]); } // a marked spot (eyes…)
      }
    }
    this.marks = grid(W, H, null);
    this.cableList = [];
    this.layers = [];
    this.shaped = false;
  }
  runs(r) { return runsOf(this.mask[r]); }
  span(r) { const rr = this.runs(r); return rr.length ? { L: rr[0].a, R: rr[rr.length - 1].b } : null; }
  count() { let n = 0; for (let r = 1; r <= this.H; r++) for (let c = 0; c < this.W; c++) if (this.mask[r][c]) n++; return n; }

  // shapeEdges on the silhouette (call before textures; textures then cover moved cells too)
  shape(opts = {}) {
    const self = this;
    const { marks, moved } = shapeEdges(this.mask, {
      singles: opts.singles,
      fill(r, c) { // a moved step adds a cell: take the color of the cell below (or beside)
        self.col[r][c] = self.mask[r - 1] && self.mask[r - 1][c] ? self.col[r - 1][c] : (self.col[r][c + 1] || self.col[r][c - 1] || 'A');
      },
    });
    this.marks = marks; this.moved = moved; this.shaped = true;
    return this;
  }

  // texture(t, {rows:[a,b], cols:[a,b], origin:[r0,c0], where(r,c)}) — fills stitches.
  // The origin defaults to the first row of the region and the leftmost stitch of that row,
  // so the repeat sits whole at the region's left edge.
  texture(t, o = {}) {
    const fn = texture(t);
    const [ra, rb0] = o.rows || [1, this.H], rb = Math.min(rb0, this.H);
    const [ca, cb] = o.cols || [0, this.W - 1];
    let [r0, c0] = o.origin || [null, null];
    if (r0 == null) r0 = ra;
    if (c0 == null) {
      c0 = Infinity;
      for (let c = ca; c <= cb; c++) if (this.mask[r0] && this.mask[r0][c]) { c0 = c; break; }
      if (c0 === Infinity) c0 = ca;
    }
    for (let r = ra; r <= rb; r++) {
      const sp = this.span(r); if (!sp) continue;
      const runs = this.runs(r);
      for (let c = ca; c <= cb; c++) {
        if (!this.mask[r][c] || this.fixed[r][c]) continue;
        if (o.where && !o.where(r, c)) continue;
        const run = runs.find((u) => c >= u.a && c <= u.b);
        this.st[r][c] = fn(r - r0 + 1, c - c0, { r, c, L: Math.max(run.a, ca), R: Math.min(run.b, cb), W: this.W });
      }
    }
    return this;
  }
  // colors: fn(r, c) -> slot|null, over a region (local coordinates as in texture)
  colors(fn, o = {}) {
    const [ra, rb0] = o.rows || [1, this.H], rb = Math.min(rb0, this.H);
    const [ca, cb] = o.cols || [0, this.W - 1];
    const [r0, c0] = o.origin || [ra, ca];
    for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) {
      if (!this.mask[r][c] || (o.where && !o.where(r, c))) continue;
      const s = fn(r - r0 + 1, c - c0, { r, c });
      if (s) this.col[r][c] = s;
    }
    return this;
  }
  // stitch overlay from art (top row first, same size as the piece or placed at x, y = the
  // overlay's bottom row). '.', ' ' and '?' keep what's there.
  stitches(lines, x = 0, y = 1) {
    const L = pic(lines);
    for (let i = 0; i < L.length; i++) {
      const r = y + (L.length - 1 - i);
      for (let j = 0; j < L[i].length; j++) {
        const ch = L[i][j], c = x + j;
        if (ch === '.' || ch === '?' || r < 1 || r > this.H || !this.mask[r][c]) continue;
        this.st[r][c] = ch; this.fixed[r][c] = true;
      }
    }
    return this;
  }
  set(r, c, ch) { if (this.mask[r][c]) { this.st[r][c] = ch; this.fixed[r][c] = true; } return this; }
  paint(lines, x = 0, y = 1) { // color overlay, same placement rules as stitches()
    const L = pic(lines);
    for (let i = 0; i < L.length; i++) {
      const r = y + (L.length - 1 - i);
      for (let j = 0; j < L[i].length; j++) { const ch = L[i][j], c = x + j; if (/[A-D]/.test(ch) && r >= 1 && r <= this.H && this.mask[r][c]) this.col[r][c] = ch; }
    }
    return this;
  }

  // the three layers and the cable spans
  def() {
    const W = this.W, H = this.H;
    const S = grid(W, H, '.');
    for (let r = 1; r <= H; r++) for (let c = 0; c < W; c++) {
      if (!this.mask[r][c]) continue;
      let s = this.st[r][c] || 'k';
      const m = this.marks[r][c];
      if (m) s = m;
      S[r][c] = s;
    }
    // cable letters -> 'x' + spans
    const cables = [];
    for (let r = 1; r <= H; r++) {
      let c = 0;
      while (c < W) {
        const ch = S[r][c];
        if ('FfRr'.includes(ch) && ch !== '.') {
          let e = c; while (e + 1 < W && S[r][e + 1] === ch) e++;
          let n = e - c + 1;
          // runs longer than 6 of one letter: split into 6s / 4s / 2s from the left
          let a = c;
          while (n > 0) {
            const take = n >= 6 && n !== 8 ? 6 : n >= 4 ? 4 : 2;
            cables.push({ row: r, col: a, type: `C${take}${/[Ff]/.test(ch) ? 'F' : 'B'}` });
            for (let q = a; q < a + take; q++) S[r][q] = 'x';
            a += take; n -= take;
          }
          c = e + 1;
        } else c++;
      }
    }
    const lines = (f) => { const out = []; for (let r = H; r >= 1; r--) { let s = ''; for (let c = 0; c < W; c++) s += f(r, c); out.push(s); } return out; };
    return {
      shape: lines((r, c) => (this.mask[r][c] ? '#' : '.')),
      stitch: lines((r, c) => S[r][c]),
      color: lines((r, c) => (this.mask[r][c] ? this.col[r][c] : '.')),
      cables,
    };
  }
}

// ---------------------------------------------------------------- small conveniences

// knit-order row (as written for an RS row, right to left) -> chart cells left to right
export const rsCells = (s) => [...s].reverse().join('');
