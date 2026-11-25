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

// =====================================================================================
// (Change 2) Knitting in the round
// =====================================================================================
// A round piece's chart is the tube unrolled at the beginning-of-round marker (between col W−1 and
// col 0), seen from the outside. Its width is the widest round's stitch count plus any columns that
// are only used by part of it (gussets, a thumb, the yoke's sleeves); '.' in a row is filler. Rounds
// are knit from col W−1 down to col 0, every one from the right side; flat ranges inside the piece
// (a heel flap) are worked back and forth over a run of the ring (from its `cut`). Steps (join, hold,
// gather, graft, seam) are chart rows of their own, listed in def.steps (chart.js C.4).
//
// Round(W) builds such a chart row by row in knitting terms: work(ops) takes the live stitches in
// knitting order, one op (a stitch char) per stitch it makes, and places each op's cell at a column
// among the stitches it takes (a decrease's at their middle) or, for an increase, in a free column
// next to the last cell.

const KUSES = { k: 1, p: 1, b: 1, x: 1, s: 1, _: 1, '<': 2, '>': 2, q: 2, o: 0, m: 0, '+': 0, u: 0, v: 0 };
const CABLE_N = { C2F: 2, C2B: 2, C4F: 4, C4B: 4, C6F: 6, C6B: 6 };
export const JOIN_TEXT = 'Join to work in the rnd, being careful not to twist sts; pm for beg of rnd.';

export class Round {
  constructor(W) {
    this.W = W; this.rows = []; this.steps = []; this.sections = []; this.flat = []; this.needles = []; this.cables = [];
    this.live = []; this.held = new Set(); this._flat = null; this.marks = {};
  }
  get r() { return this.rows.length; }
  castOn(cols) { this.live = [...cols].sort((a, b) => a - b); return this; }
  section(label) { this.sections.push({ from: this.r + 1, label }); return this; }
  needle(n) { this.needles.push({ from: this.r + 1, ...n }); return this; }
  pos(c, cut = 0) { const W = this.W; return (((c - cut) % W) + W) % W; }
  // the live, unheld stitches in knitting order (RS: from the ring's high end down)
  order(rs = true, cut = 0, extraHeld = []) {
    const h = new Set([...this.held, ...extraHeld]);
    const L = this.live.filter((c) => !h.has(c)).sort((a, b) => this.pos(a, cut) - this.pos(b, cut));
    return rs ? L.reverse() : L;
  }
  count() { return this.order().length; }
  side() { const f = this._flat; if (!f) return true; return ((this.r + 1 - f.from) % 2 === 0) === (f.first === 'RS'); }
  // a flat range from the next row: {first: 'RS' | 'WS', cut (its low end in ring order), span (its width)}
  flatStart({ first = 'RS', cut = 0, span = this.W } = {}) { this._flat = { from: this.r + 1, first, cut, span }; return this; }
  flatEnd() { if (this._flat) { this.flat.push({ ...this._flat, to: this.r }); this._flat = null; } return this; }
  blank() { return { st: new Array(this.W).fill('.'), co: new Array(this.W).fill('.') }; }
  step(kind, text, taps, opts = {}) {
    this.rows.push(this.blank());
    this.steps.push({ row: this.r, kind, text, taps, ...(opts.label ? { label: opts.label } : {}) });
    const taken = new Set(taps.flatMap((t) => t.takes || []));
    this.live = this.live.filter((c) => !taken.has(c));
    return this;
  }
  join(slot = 'A') { return this.step('join', JOIN_TEXT, [{ col: Math.max(...this.live), slot, takes: [] }]); }
  // put groups of live stitches on waste yarn: one tap a group, at its centre column
  hold(groups, text, slot = 'A') {
    const taps = groups.map((g) => ({ col: g[Math.floor((g.length - 1) / 2)], slot, takes: [] }));
    this.step('hold', text, taps);
    for (const g of groups) for (const c of g) this.held.add(c);
    return this;
  }
  release(cols) { for (const c of cols) this.held.delete(c); return this; }
  // cut the yarn and thread it through the live stitches, one tap each (in knitting order)
  gather(text, slot = 'A') { return this.step('gather', text, this.order().map((c) => ({ col: c, slot, takes: [c] }))); }
  // Kitchener stitch: pairs [[front, back], …], one tap a pair
  graft(pairs, text, slot = 'A', kind = 'graft') { return this.step(kind, text, pairs.map(([f, b]) => ({ col: f, slot, takes: b == null ? [f] : [f, b] }))); }
  // work one row. ops: a string of stitch chars or a list of tokens {s, slot, col, cable} in knitting
  // order over the live unheld stitches. o: {slot: 'A' | fn(j, s) -> slot, hold: cols left unworked this
  // row (a short row), step: {kind, text, label} (a set-up or joining round)}
  work(ops, o = {}) {
    const W = this.W, f = this._flat;
    const rs = f ? this.side() : true;
    const cut = f ? f.cut : 0;
    const extra = o.hold || [];
    const order = this.order(rs, cut, extra);
    const toks = (typeof ops === 'string' ? [...ops] : ops).map((t) => (typeof t === 'string' ? { s: t } : t));
    const row = this.blank();
    const R = this.r + 1;
    const fail = (m) => { throw new Error(`Round row ${R}: ${m}`); };
    for (const c of [...this.held, ...extra]) { if (!this.live.includes(c)) fail(`col ${c} is held but not live`); row.st[c] = '-'; row.co[c] = 'A'; }
    const slotOf = (j, t) => t.slot || (typeof o.slot === 'function' ? o.slot(j, t.s) : o.slot || 'A');
    const dir = rs ? -1 : 1; // knitting runs down the ring on RS rows
    // pass 1: the stitches each op takes, in knitting order
    let q = 0;
    const tk = toks.map((t, j) => {
      const u = KUSES[t.s];
      if (u == null) fail(`unknown op '${t.s}'`);
      const takes = order.slice(q, q + u); q += u;
      if (takes.length < u) fail(`op ${j + 1} '${t.s}' runs out of stitches (${order.length} to work)`);
      return takes;
    });
    // pass 2: the cells of the ops that take stitches. A decrease sits at the middle of its stitches,
    // or, beside a yarn-over or M1, at the end away from it so the increase has the column it freed
    const cols = toks.map((t, j) => {
      if (t.col != null) return t.col;
      const takes = tk[j];
      if (!takes.length) return null;
      if (takes.length === 1) return takes[0];
      const incBefore = j > 0 && !tk[j - 1].length, incAfter = j + 1 < toks.length && !tk[j + 1].length;
      if (incAfter && !incBefore) return takes[0];
      if (incBefore && !incAfter) return takes[takes.length - 1];
      const a = this.pos(takes[0], cut), b = this.pos(takes[takes.length - 1], cut);
      const m = Math.round((a + b) / 2 + (a > b ? 0.01 : -0.01));
      const mc = (m + cut) % W;
      return row.st[mc] === '-' ? takes[0] : mc;
    });
    for (let j = 0; j < toks.length; j++) if (cols[j] != null) { if (row.st[cols[j]] !== '.') fail(`col ${cols[j]} used twice`); row.st[cols[j]] = '#'; }
    // pass 3: increases in a free column between their neighbours' cells (nearest the one before)
    let last = null;
    for (let j = 0; j < toks.length; j++) {
      if (cols[j] == null) {
        let nx = null; for (let k = j + 1; k < toks.length; k++) if (cols[k] != null) { nx = cols[k]; break; }
        const from = last != null ? this.pos(last, cut) : rs ? W : -1;
        const to = nx != null ? this.pos(nx, cut) : rs ? -1 : W;
        for (let p = from + dir; p !== to; p += dir) { const c = (p + cut) % W; if (row.st[c] === '.') { cols[j] = c; break; } }
        if (cols[j] == null) fail(`op ${j + 1} '${toks[j].s}': no free column for the new stitch`);
        row.st[cols[j]] = '#';
      }
      last = cols[j];
    }
    let span = null;
    toks.forEach((t, j) => {
      const col = cols[j];
      row.st[col] = t.s; row.co[col] = slotOf(j, t);
      if (t.s === 'x') {
        if (t.cable) span = { type: t.cable, n: CABLE_N[t.cable], cols: [] };
        if (!span) fail(`op ${j + 1} 'x' outside a cable`);
        span.cols.push(col);
        if (span.cols.length === span.n) { this.cables.push({ row: R, col: Math.min(...span.cols), type: span.type }); span = null; }
      }
    });
    if (q < order.length) fail(`${order.length - q} sts left unworked (ops cover ${q})`);
    this.rows.push(row);
    this.live = [];
    for (let c = 0; c < W; c++) if (row.st[c] !== '.' && row.st[c] !== '_') this.live.push(c);
    if (o.step) this.steps.push({ row: R, ...o.step });
    return this;
  }
  // n rounds (or rows) of a texture: fn(j, i) -> stitch char or {s, slot} (j: knitting-order index, i: 0.. the round)
  rounds(n, fn, o = {}) {
    for (let i = 0; i < n; i++) {
      const N = this.order(this.side(), this._flat ? this._flat.cut : 0, o.hold).length;
      const ops = Array.from({ length: N }, (_, j) => { const v = fn(j, i, N); return typeof v === 'string' ? { s: v } : v; });
      this.work(ops, { ...o, slot: typeof o.slot === 'function' ? (j, s) => o.slot(j, s, i) : o.slot });
    }
    return this;
  }
  def() {
    const H = this.r;
    const lines = (f) => { const out = []; for (let r = H; r >= 1; r--) out.push(this.rows[r - 1][f].join('')); return out; };
    const stitch = lines('st');
    const color = lines('co');
    const shape = stitch.map((l) => l.replace(/[^.]/g, '#'));
    return { round: true, shape, stitch, color, cables: this.cables, steps: this.steps, sections: this.sections, flat: this.flat, needles: this.needles };
  }
}

const rep = (s, n) => s.repeat(Math.max(0, n));
// knitting-order textures for rounds: rib('kkpp')(j) -> 'k'…
export const ribOps = (unit) => (j) => unit[j % unit.length];

// A crown decreased evenly in wedges: each decrease round is "*k(m−2), k2tog" round the `wedges`
// wedges (m sts each), with a plain round after each of the first `everyOther` decrease rounds, down
// to one st a wedge. slot: as Round.work.
export function crownRounds(b, wedges, { everyOther = 0, slot = 'A', dec = '<' } = {}) {
  let n = b.count(), i = 0;
  while (n / wedges > 1) {
    const m = n / wedges;
    if (m !== Math.floor(m)) throw new Error(`crownRounds: ${n} sts in ${wedges} wedges`);
    b.work(rep(rep('k', m - 2) + dec, wedges), { slot });
    i++; n -= wedges;
    if (i <= everyOther && n / wedges > 1) b.work(rep('k', n), { slot });
  }
  return b;
}

// A wedge toe on a sock's ring: the instep is the stitches in `instep` columns, the sole the rest. Each
// decrease round is "k to 3 sts before the instep, k2tog, k1; k1, ssk, k to 3 sts before its end,
// k2tog, k1; k1, ssk, k to end" (4 sts fewer), with a plain round after each of the first
// `everyOther`, down to `to` sts. instepOps(j) may pattern the instep's plain rounds.
export function toeRounds(b, { to, everyOther = 2, instep, slot = 'A' }) {
  const isIn = (c) => instep.has(c);
  let i = 0;
  while (b.count() > to) {
    const L = b.order();
    const s1 = L.findIndex(isIn), I = L.filter(isIn).length, s2 = L.length - s1 - I;
    if (s1 < 3 || s2 < 2 || I < 4) throw new Error(`toeRounds: ${s1}/${I}/${s2} sts`);
    b.work(rep('k', s1 - 3) + '<k' + 'k>' + rep('k', I - 6) + '<k' + 'k>' + rep('k', s2 - 3), { slot });
    i++;
    if (i <= everyOther && b.count() > to) b.work(rep('k', b.count()), { slot });
  }
  return b;
}

// The heel turn on a flap of B sts (short rows, worked flat: chart.js C.3), ending with E sts.
// Row 1 (RS): sl1, k(B − u − 4), ssk, k1, turn (u = B − 2 − E sts left unworked); row 2 (WS): sl1,
// p…, p2tog, p1, turn (u unworked at the other side); then "sl1, k to 1 st before the gap, ssk, k1, turn"
// and "sl1, p to 1 st before the gap, p2tog, p1, turn" until every side st is worked.
function heelTurn(b, E, slot) {
  const cut = b._flat.cut;
  const flap = () => b.order(false, cut); // the flap's live sts, low to high in ring order (the instep is held)
  const B = flap().length, u0 = B - 2 - E;
  if (u0 < 0 || u0 % 2) throw new Error(`heelTurn: ${B} sts to ${E}`);
  // work st[from..to] (indices into the flap, RS from the top down, WS from the bottom up): sl1, plain,
  // a decrease, then k1 unless single; everything else is left unworked (held for the row)
  const row = (rs, n, plain, single) => {
    const st = flap();
    const ops = ['s', ...rep('k', plain), rs ? '>' : '<', ...(single ? [] : ['k'])];
    const start = rs ? st.length - 1 - uHigh : uLow;
    const idx = []; for (let k = 0; k < n; k++) idx.push(rs ? start - k : start + k);
    const w = new Set(idx.map((i) => st[i]));
    b.work(ops.map((x) => ({ s: x, slot })), { hold: st.filter((c) => !w.has(c)) });
  };
  let uLow = 0, uHigh = 0;
  // row 1 (RS) from the top: sl1, k(B − u0 − 4), ssk, k1, turn
  row(true, B - u0, B - u0 - 4, false); uLow = u0;
  // row 2 (WS) from the k1: sl1, p…, p2tog, p1, turn, leaving u0 at the top
  { const n = flap().length, x = n - uLow - u0 - 4; row(false, x + 4, x, false); uHigh = u0; }
  let rs = true;
  while (uLow > 0 || uHigh > 0) {
    const n = flap().length;
    if (rs) { const single = uLow === 1, start = n - 1 - uHigh, plain = start - uLow - 1; row(true, plain + (single ? 3 : 4), plain, single); uLow -= single ? 1 : 2; }
    else { const single = uHigh === 1, plain = (n - 1 - uHigh) - uLow - 1; row(false, plain + (single ? 3 : 4), plain, single); uHigh -= single ? 1 : 2; }
    rs = !rs;
  }
  if (!rs) throw new Error('heelTurn: the turn must end with a WS row');
  return flap().length;
}

// sockChart: a cuff-down sock on DPNs (CHANGE_2.md C.2): cuff, leg, slipped heel flap over the back
// half, heel turned with short rows, gusset picked up along the flap and decreased, foot, wedge toe,
// grafted. Columns from the left: half the back (the sole after the heel), the left gusset, the
// instep, the right gusset, the other half of the back; the marker sits at the centre back.
// opts: {co, gusset, cuff, leg, flapRows, heelTo, foot, toeTo, toeEvery, slots: {main, cuff, heel, toe},
//   cuffOp(j, i), legOp(j, i, N), instepOp(k, i) (k: 0.. across the instep in knitting order),
//   legFlat: {rows, op(j, i, N), seamText} (the leg worked flat and seamed up the back), dpn: [counts]}
export function sockChart(o) {
  const co = o.co, B = Math.floor(co / 2), I = co - B, g = o.gusset;
  const [bL, bR] = o.backSplit || [Math.floor(B / 2), B - Math.floor(B / 2)];
  const W = B + I + 2 * g;
  const colsL = range(0, bL), gL = range(bL, bL + g), inst = range(bL + g, bL + g + I), gR = range(bL + g + I, bL + 2 * g + I), colsR = range(W - bR, W);
  const S = o.slots || {};
  const main = S.main || 'A', sCuff = S.cuff || main, sHeel = S.heel || main, sToe = S.toe || main;
  const b = new Round(W);
  b.castOn([...colsL, ...inst, ...colsR]);
  const instSet = new Set(inst);
  const dpn = o.dpn || evenSplit(co, 3);
  if (o.legFlat) {
    const lf = o.legFlat;
    b.needle({ kind: 'straight' });
    b.section('Leg (worked flat)');
    b.flatStart({ first: 'RS', cut: 0 });
    for (let i = 0; i < lf.rows; i++) {
      const rs = b.side(), L = b.order(rs, 0), N = L.length;
      const ops = L.map((c, j) => { const v = lf.op(j, i, N, rs, c); return typeof v === 'string' ? { s: v } : v; });
      b.work(ops, { slot: main });
    }
    b.flatEnd();
    // the seam: one tap for every 2 rows, at the seam's edge
    const n = Math.ceil(lf.rows / 2);
    b.step('seam', lf.seamText, Array.from({ length: n }, (_, k) => ({ col: k % 2 ? W - 1 : 0, slot: main, takes: [] })), { label: 'Seam the leg' });
  } else {
    b.needle({ kind: 'dpn', n: 3, counts: dpn });
    b.join(sCuff);
    // the leg's parts: [{label, rnds, op(j, i, N) -> char | {s, slot} | a whole round's tokens via ops(i)}]
    const parts = o.legParts || [{ label: 'Cuff', rnds: o.cuff, op: o.cuffOp, slot: sCuff }, { label: 'Leg', rnds: o.leg, op: o.legOp || (() => 'k'), ops: o.legOps, slot: main }];
    for (const pt of parts) {
      if (pt.label) b.section(pt.label);
      for (let i = 0; i < pt.rnds; i++) {
        if (pt.ops) { b.work(pt.ops(i), { slot: pt.slot || main }); continue; }
        const N = b.count();
        b.work(Array.from({ length: N }, (_, j) => { const v = pt.op(j, i, N); return typeof v === 'string' ? { s: v } : v; }), { slot: pt.slot || main });
      }
    }
  }
  // ---- heel flap over the back half: set-up "k{bR}, turn", then rows from the WS
  b.section(`Heel flap (worked back and forth over ${B} sts; the other ${I} wait on a spare DPN for the instep)`);
  for (const c of inst) b.held.add(c);
  b.flatStart({ first: o.legFlat ? (o.legFlat.rows % 2 ? 'WS' : 'RS') : 'RS', cut: W - bR, span: B });
  if (b.side()) b.work(rep('k', bR), { slot: sHeel, hold: colsL });
  for (let i = 0; i < o.flapRows; i++) {
    const N = b.count();
    b.work('s' + rep('k', N - 1), { slot: sHeel });
  }
  if (!b.side()) throw new Error('sockChart: the heel flap must end with a WS row');
  b.section('Turn heel');
  const E = heelTurn(b, o.heelTo, sHeel);
  if (E !== o.heelTo) throw new Error(`sockChart: the heel ends with ${E} sts`);
  // to the centre of the heel: the heel's sts left of the marker (cols below W/2), on an RS row
  const heel = b.order(true, W - bR);
  const toCentre = heel.filter((c) => c < W / 2);
  const rest = heel.filter((c) => c >= W / 2);
  const nC = toCentre.length;
  b.work(rep('k', nC), { slot: sHeel, hold: rest, step: { kind: 'centre', text: `K${nC} (to the centre of the heel); this is the new beg of rnd.`, label: 'To the centre' } });
  b.flatEnd();
  // ---- gusset set-up round: k the heel's other half, pick up along the flap, k the instep, pick up, k to the marker
  b.section('Gusset');
  b.release(inst);
  const pick = Math.round(o.flapRows / 2 + 0.5);
  if (pick !== g) throw new Error(`sockChart: ${o.flapRows} flap rows give ${pick} sts to pick up, the gusset has ${g}`);
  if (o.legFlat) b.needle({ kind: 'dpn', n: 3, counts: [b.order().filter((c) => c >= W / 2 && !instSet.has(c)).length + g, I, g + nC],
    text: 'From here on work in the rnd on 3 DPNs: the sole sts and a gusset on each of 2 needles, the instep on the third.' });
  {
    const L = b.order();
    const ops = [];
    const nR = L.filter((c) => c >= W / 2 && !instSet.has(c)).length; // the heel sts right of the marker, worked first
    for (let k = 0; k < nR; k++) ops.push({ s: 'k', slot: main });
    for (let k = 0; k < g; k++) ops.push({ s: 'u', slot: main, col: gR[g - 1 - k] });
    for (let k = 0; k < I; k++) ops.push({ s: 'k', slot: main });
    for (let k = 0; k < g; k++) ops.push({ s: 'u', slot: main, col: gL[g - 1 - k] });
    for (let k = 0; k < nC; k++) ops.push({ s: 'k', slot: main });
    const total = nR + g + I + g + nC;
    b.work(ops, { step: { kind: 'setup', label: 'Set-up rnd', text: `Set-up rnd: k${nR}, pick up and k ${g} sts along the edge of the heel flap, k${I}, pick up and k ${g} sts along the other edge, k${nC} (${total} sts).` } });
  }
  // gusset decreases: "k to 3 sts before the instep, k2tog, k1, k across the instep, k1, ssk, k to end", every other round
  // a round with the instep in pattern (o.instepOps(i): tokens covering the I instep sts; default plain)
  const instepRound = (i, decs) => {
    const L = b.order();
    const s1 = L.findIndex((c) => instSet.has(c)), n = L.length, e = s1 + I;
    const inst = o.instepOps ? [...o.instepOps(i)] : rep('k', I).split('');
    const kk = (m) => rep('k', m).split('');
    if (!decs) return [...kk(s1), ...inst, ...kk(n - e)];
    // "k to 3 sts before the instep, k2tog, k1, [instep], k1, ssk, k to end"
    return [...kk(s1 - 3), '<', 'k', ...inst, 'k', '>', ...kk(n - e - 3)];
  };
  let gi = 0;
  while (b.count() > co) { b.work(instepRound(gi++, true), { slot: main }); if (b.count() > co) b.work(instepRound(gi++, false), { slot: main }); }
  b.section('Foot');
  for (let i = 0; i < o.foot; i++) b.work(instepRound(gi++, false), { slot: main });
  b.section('Toe');
  toeRounds(b, { to: o.toeTo, everyOther: o.toeEvery ?? 2, instep: instSet, slot: sToe });
  // graft: the instep half against the sole half
  const L = b.order();
  const front = L.filter((c) => instSet.has(c)).sort((x, y) => x - y), back = L.filter((c) => !instSet.has(c)).sort((x, y) => b.pos(x, W / 2) - b.pos(y, W / 2));
  const n = front.length;
  b.graft(front.map((f, k) => [f, back[n - 1 - k]]), `Divide rem ${2 * n} sts onto 2 needles, ${n} for the instep and ${n} for the sole. Graft with Kitchener stitch (${n} sts).`, sToe);
  const d = b.def();
  return { ...d, W, instep: inst, gussets: [gL, gR] };
}
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
export const evenSplit = (n, k) => Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));

export const GATHER = (n) => `Cut yarn, leaving a 6" tail; thread it through the rem ${n} sts, pull tight and fasten off.`;

// hatChart: a hat knit up from the brim on a 16" circular, the crown decreased in wedges on DPNs and
// gathered. o: {co, brim: [n, op(j, i)], body: [n, op(j, i)], slot(j, s, i, part), crown: {wedges,
// everyOther} | fn(b), dpn: n (DPNs for the crown), labels: {brim, body}}
export function hatChart(o) {
  const b = new Round(o.co);
  b.castOn(range(0, o.co));
  const sl = (part) => (j, s, i) => (o.slot ? o.slot(j, s, i, part) : 'A');
  b.needle({ kind: 'circular', len: o.len || 16 });
  b.join(sl('brim')(0, 'k', 0));
  b.section(o.labels?.brim || 'Brim');
  b.rounds(o.brim[0], o.brim[1], { slot: sl('brim') });
  if (o.body && o.body[0]) { if (o.labels?.body !== null) b.section(o.labels?.body || 'Body'); b.rounds(o.body[0], o.body[1], { slot: sl('body') }); }
  b.section('Crown');
  const before = b.r;
  if (typeof o.crown === 'function') o.crown(b, sl('crown'));
  else crownRounds(b, o.crown.wedges, { everyOther: o.crown.everyOther, slot: sl('crown') });
  // change to DPNs on the crown's first round
  const n1 = countAfter(b, before + 1), k = o.dpn || 4;
  b.needles.push({ from: before + 1, kind: 'dpn', n: k, counts: evenSplit(n1, k) });
  b.needles.sort((x, y) => x.from - y.from);
  b.gather(GATHER(b.count()), sl('crown')(0, 'k', 0));
  return b.def();
}
function countAfter(b, r) { const row = b.rows[r - 1]; let n = 0; for (const c of row.st) if (c !== '.' && c !== '_' && c !== '-') n++; return n; }

// mittenChart: a mitten on DPNs: cuff, a set-up round placing markers for the thumb gusset, the gusset
// increased (M1L after the first marker, M1R before the second), the thumb sts held on waste yarn, the
// gap cast over, the hand, the top decreased at both sides and gathered, then the thumb picked up and
// knit as a small tube and gathered. Columns from the left: the hand's last part, the thumb's 2
// picked-up sts, the gusset, the hand's 2 cast-on sts, the hand's first part.
// o: {hA, hB, base: 2, incs: 3, cuff: [n, op], gussetRnds (default 8: inc on rnds 2, 5, 8), hand: [n, op(j, i, N)],
//   top: {to, every: [plain after each dec?]}, thumb: n, slots: {main, cuff}, handSlot(j, i, N)}
export function mittenChart(o) {
  const base = o.base || 2, incs = o.incs || 3, G = base + 2 * incs;
  const hA = o.hA, hB = o.hB, co = hA + base + hB;
  const W = hB + 2 + G + 2 + hA;
  const colsB = range(0, hB), tU = range(hB, hB + 2), gus = range(hB + 2, hB + 2 + G), hCO = range(hB + 2 + G, hB + 4 + G), colsA = range(W - hA, W);
  const S = o.slots || {}, main = S.main || 'A', sCuff = S.cuff || main;
  const b = new Round(W);
  const g0 = incs; // the base's first index in the gusset block
  b.castOn([...colsB, ...gus.slice(g0, g0 + base), ...colsA]);
  b.needle({ kind: 'dpn', n: 3, counts: evenSplit(co, 3) });
  b.join(sCuff);
  b.section('Cuff');
  b.rounds(o.cuff[0], o.cuff[1], { slot: o.cuff[2] || sCuff });
  b.section('Thumb gusset');
  b.work(rep('k', co), { slot: main, step: { kind: 'markers', label: 'Set-up rnd', text: `Set-up rnd: k${hA}, pm, k${base}, pm, k${hB}.` } });
  const R = o.gussetRnds || 8;
  let k = 0;
  for (let i = 1; i <= R; i++) {
    const inc = i % 3 === 2 && k < incs;
    const n = base + 2 * k;
    if (inc) {
      k++;
      b.work([...rep('k', hA), { s: 'm', col: gus[g0 + base - 1 + k] }, ...rep('k', n), { s: 'm', col: gus[g0 - k] }, ...rep('k', hB)], { slot: main });
    } else b.work(rep('k', hA + n + hB), { slot: main });
  }
  if (k !== incs) throw new Error('mittenChart: gusset rounds too few');
  b.hold([gus], `Place the ${G} thumb sts (between the markers) on waste yarn, removing the markers.`, main);
  b.section('Hand');
  b.work([...rep('k', hA), { s: '+', col: hCO[1] }, { s: '+', col: hCO[0] }, ...rep('k', hB)], { slot: main });
  for (let i = 0; i < o.hand[0]; i++) {
    const L = b.order(), N = L.length;
    b.work(L.map((c, j) => { const v = o.hand[1](j, i, N); return typeof v === 'string' ? { s: v } : v; }), { slot: main });
  }
  b.section('Top');
  let d = 0;
  while (b.count() > o.top.to) {
    const n = b.count(), h = n / 2;
    b.work(('k>' + rep('k', h - 6) + '<k').repeat(2), { slot: main });
    d++;
    if (d <= (o.top.plain || 0) && b.count() > o.top.to) b.work(rep('k', b.count()), { slot: main });
  }
  b.gather(GATHER(b.count()), main);
  b.section('Thumb');
  b.release(gus);
  b.work([...rep('k', G), { s: 'u', col: tU[1] }, { s: 'u', col: tU[0] }], { slot: main,
    step: { kind: 'thumb', label: 'Thumb set-up rnd', text: `Return the ${G} held sts to DPNs; k${G}, then pick up and k 2 sts in the gap (${G + 2} sts).` } });
  b.rounds(o.thumb, () => 'k', { slot: main });
  b.work(rep('<', (G + 2) / 2), { slot: main });
  b.gather(GATHER(b.count()), main);
  return { ...b.def(), W, cols: { hand: [...colsA, ...hCO, ...colsB], gusset: gus, thumbPick: tU } };
}
