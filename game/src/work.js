// work.js — the knitted work on screen: a windowed fabric canvas (stamped from the stitch data),
// the view canvas (background, shadow, fabric, needles, live loops, strand, markers, row counter,
// lamp light, effects), the tap animation and the row turn.
import { getSprite, yarnColorAt, palette, drawEffects, drawTwinkle, holeEllipse, hash, CELL_ASPECT, typeInfo } from './stitches.js';
import { drapeOf } from './chart.js';

const KNITLIKE = new Set(['k', 'x', '<', '>', 'm', '+', 'b']);
const RAMP = 3; // rows below the needle over which a drape reaches its full wave
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ---------------------------------------------------------------- needle, marker, counter styles
// Easy to extend: add an entry. kind: wood | metal | glass | acrylic. Colors are [shadow, base, light].
export const NEEDLE_STYLES = {
  bamboo:   { name: 'Bamboo', kind: 'wood', body: ['#8f6431', '#c99b5c', '#ecd09a'], grain: 'rgba(110,70,30,0.35)', nodes: true, cap: 'knob' },
  birch:    { name: 'Birch', kind: 'wood', body: ['#b08e5f', '#e3c99a', '#fbeccc'], grain: 'rgba(150,110,60,0.3)', cap: 'knob' },
  rosewood: { name: 'Rosewood', kind: 'wood', body: ['#3e160e', '#7d3423', '#b8684a'], grain: 'rgba(30,8,4,0.45)', cap: 'knob' },
  cherry:   { name: 'Cherry with brass tips', kind: 'wood', body: ['#5e2615', '#a4502f', '#d8875c'], grain: 'rgba(60,20,8,0.4)', cap: 'knob', tip: ['#7a5a14', '#d4a83a', '#fff0b0'] },
  ebony:    { name: 'Ebony with silver ends', kind: 'wood', body: ['#0e0b0a', '#2d2522', '#6a5d56'], grain: 'rgba(0,0,0,0.5)', cap: 'knob', capColor: ['#6e737a', '#c9ced4', '#ffffff'], tip: ['#6e737a', '#c9ced4', '#ffffff'] },
  nickel:   { name: 'Nickel-plated', kind: 'metal', body: ['#4c535b', '#a9b1ba', '#f4f7fa'], cap: 'disc' },
  rainbow:  { name: 'Rainbow aluminium', kind: 'metal', rainbow: true, body: ['#555', '#aaa', '#fff'], cap: 'disc' },
  candy:    { name: 'Candy-cane stripe', kind: 'acrylic', body: ['#c9bfb3', '#f6f1ea', '#ffffff'], stripes: '#c8283c', cap: 'knob' },
  glass:    { name: 'Clear glass', kind: 'glass', body: ['#7fa6b0', '#d8eef2', '#ffffff'], cap: 'ball' },
  gold:     { name: 'Gold-tipped', kind: 'wood', body: ['#3b2a20', '#5b4334', '#8d6d55'], grain: 'rgba(20,10,5,0.4)', cap: 'knob', tip: ['#8a6410', '#e6b83e', '#fff3b8'], capColor: ['#8a6410', '#e6b83e', '#fff3b8'] },
  glowtip:  { name: 'Glow-tipped', kind: 'acrylic', body: ['#5d6b82', '#a8b6cc', '#e6eefb'], cap: 'ball', glowTip: '#aaffee' },
  oak:      { name: 'Heirloom carved oak', kind: 'wood', body: ['#6b4520', '#a87a45', '#e0b77c'], grain: 'rgba(80,45,15,0.45)', cap: 'carved', carved: true },
};
export const MARKER_STYLES = {
  ring:  { name: 'Plain rings', ring: '#d9b45a', charm: null },
  heart: { name: 'Hearts', ring: '#d9b45a', charm: 'heart', color: '#d2405a' },
  star:  { name: 'Stars', ring: '#cfd4da', charm: 'star', color: '#f1c64a' },
  acorn: { name: 'Acorns', ring: '#b8894a', charm: 'acorn', color: '#8a5a2b' },
  cat:   { name: 'Tiny cats', ring: '#d9b45a', charm: 'cat', color: '#f3e6d2' },
};
export const COUNTER_STYLES = {
  brass:  { name: 'Brass barrel', body: ['#6e4c12', '#c9982f', '#ffe9a0'], face: '#2b1d10', ink: '#ffe9b0' },
  wood:   { name: 'Wooden dial', body: ['#5a3818', '#a0703c', '#e2b57c'], face: '#f7ecd6', ink: '#4a2c14' },
  flower: { name: 'Enamel flower', body: ['#7a2a40', '#d0607e', '#ffc4d4'], face: '#fff8f0', ink: '#7a2a40' },
};

// ---------------------------------------------------------------- the fabric (stamped from data)

class Fabric {
  constructor(chart, src) {
    this.chart = chart;
    this.src = src; // {done(), yarn(i), castOnYarn, finished(), liveRow()?}
    this.canvas = null;
    this.rowIdx = new Map();
    // the drape (chart.js drapeOf): per-column offsets in rows, + = down. On the needles the
    // stitches sit in a straight line; the waves form in the rows below (full after RAMP rows)
    this.drape = drapeOf(chart);
    if (this.drape) { let lo = 0, hi = 0; for (const v of this.drape) { lo = Math.min(lo, v); hi = Math.max(hi, v); } this.dUp = -lo; this.dDown = hi; }
    else { this.dUp = 0; this.dDown = 0; }
  }
  liveRow() { return this.src.liveRow && !this.src.finished() ? this.src.liveRow() : Infinity; }
  // vertical drape offset of the stitch at (r, c), in rows
  dyRows(r, c) {
    if (!this.drape) return 0;
    const v = this.drape[Math.max(0, Math.min(this.drape.length - 1, c))];
    const live = this._live ?? this.liveRow();
    return live === Infinity ? v : v * clamp((live - r) / RAMP, 0, 1);
  }
  idx(r, c) {
    let a = this.rowIdx.get(r);
    if (!a) {
      const R = this.chart.row(r);
      if (!R) return -1;
      a = new Int32Array(this.chart.width).fill(-1);
      const s = this.chart.rowStart(r);
      for (const e of R.map) a[e.col] = s + e.k;
      this.rowIdx.set(r, a);
    }
    return a[c] ?? -1;
  }
  knit(r, c) { const i = this.idx(r, c); return i >= 0 && i < this.src.done(); }
  // when is the stitch of row r at col c bound off? -> stitch-count threshold, or Infinity
  boVisible(r, c) {
    const ch = this.chart;
    if (this.src.finished() && r === this.topRow()) return true;
    const R1 = ch.endless ? (this.src.done() > ch.rowStart(r + 1) ? ch.row(r + 1) : null) : ch.row(r + 1);
    if (!R1) return false;
    const pi = R1.prevCols.indexOf(c);
    if (pi < 0 || !R1.boundOff.includes(pi)) return false;
    if (R1.boundOffBefore.includes(pi)) return this.src.done() >= ch.rowStart(r + 1) && this.knit(r, c);
    const host = R1.map.find((e) => e.boundOffAfter.includes(pi));
    return host ? this.src.done() > ch.rowStart(r + 1) + host.k : false;
  }
  topRow() { return this.chart.endless ? this.chart.locate(Math.max(0, this.src.done() - 1)).r : this.chart.height; }

  // window: cols [c0, c1), rows [r0, rTop]; W = cell device px
  setWindow(c0, c1, r0, rTop, W) {
    const H = Math.round(W * CELL_ASPECT);
    this.c0 = c0; this.c1 = c1; this.r0 = r0; this.rTop = rTop; this.W = W; this.H = H;
    this.padX = Math.ceil(W * 1.2);
    this.dTop = Math.ceil(this.dUp * H); this.dBot = Math.ceil(this.dDown * H); // room for the drape
    this.padT = Math.ceil(H * 1.0) + this.dTop; this.padB = Math.ceil(H * 1.6) + this.dBot;
    const w = (c1 - c0) * W + this.padX * 2, h = (rTop - r0 + 1) * H + this.padT + this.padB;
    if (!this.canvas) this.canvas = mk(w, h);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.g = this.canvas.getContext('2d');
    this.stampAll();
  }
  xy(r, c) {
    const j = hash(r + 7, c + 3, 5);
    return [this.padX + (c - this.c0) * this.W + (((j & 255) / 255) - 0.5) * 0.04 * this.W,
      this.padT + (this.rTop - r + this.dyRows(r, c)) * this.H + ((((j >> 8) & 255) / 255) - 0.5) * 0.05 * this.H];
  }
  stampAll() {
    const g = this.g;
    this._live = this.drape ? this.liveRow() : undefined;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.region(this.r0 - 1, this.rTop, this.c0 - 3, this.c1 + 3);
    this.dirty = true;
  }
  // redraw the small band around (r, c): clip, clear, redraw rows r-2..r+2 bottom-up, re-cut holes
  band(r, c) {
    if (!this.canvas || r < this.r0 - 2 || r > this.rTop + 2) return;
    // with a drape the rows below the needle move when the needle row changes: restamp
    if (this.drape && this.liveRow() !== this._live) { this.stampAll(); return; }
    const ch = this.chart;
    let cA = c - 2, cB = c + 2;
    for (const rr of [r - 1, r, r + 1, r + 2, r + 3]) for (let cc = cA; cc <= cB; cc++) {
      const cl = ch.cell(rr, cc);
      if (cl && cl.cable) { cA = Math.min(cA, cl.cable.span.col); cB = Math.max(cB, cl.cable.span.col + cl.cable.span.n - 1); }
    }
    const g = this.g;
    const x0 = this.padX + (cA - this.c0) * this.W - 1, x1 = this.padX + (cB + 1 - this.c0) * this.W + 1;
    // the drape shifts columns up (dTop) or down (dBot): the clip covers them, the redraw a few rows more
    const y0 = this.padT + (this.rTop - (r + 1)) * this.H - (r + 1 >= this.rTop ? this.padT : this.dTop);
    // cable pieces reach ~3.4 rows down, so the band reaches 4 rows below the stitch
    const y1 = r - 4 <= this.r0 ? this.canvas.height : Math.min(this.canvas.height, this.padT + (this.rTop - (r - 4) + 1) * this.H + this.dBot);
    const k = this.drape ? Math.ceil(this.dUp + this.dDown) : 0;
    g.save();
    g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.clearRect(x0, y0, x1 - x0, y1 - y0);
    this.region(r - 6 - k, r + 3 + k, cA - 3, cB + 3);
    g.restore();
    this.dirty = true;
  }
  yarnOf(i) { return this.src.yarn(i); }
  region(rLo, rHi, cLo, cHi) {
    const ch = this.chart, g = this.g, W = this.W, H = this.H;
    rLo = Math.max(1, rLo, this.r0); rHi = Math.min(rHi, this.rTop, ch.endless ? Infinity : ch.height);
    cLo = Math.max(0, cLo, this.c0 - 3); cHi = Math.min(ch.width - 1, cHi, this.c1 + 2);
    const late = [], holes = [];
    const spr = (kind, yarn, i, r, c, v) => {
      const color = yarnColorAt(yarn, i);
      const s = getSprite(kind, yarn, W, v, color);
      const [x, y] = this.xy(r, c);
      g.drawImage(s.canvas, Math.round(x - s.ox), Math.round(y - s.oy));
      return [x, y, color];
    };
    for (let r = rLo; r <= rHi; r++) {
      const cells = ch.cells(r);
      if (!cells) continue;
      // cast-on edge (row 1 always: the cast-on exists before the first stitch) and '+' cast-ons
      for (let c = cLo; c <= cHi; c++) {
        const cl = cells[c];
        if (!cl) continue;
        if (r === 1) spr('castOn', this.src.castOnYarn, 0, r, c, 0);
        else if (cl.s === '+' && this.knit(r, c)) { const i = this.idx(r, c); spr('castOn', this.yarnOf(i), i, r, c, 0); }
      }
      // a solid underlay so the work is never see-through between loops (eyelets are cut later)
      for (let c = cLo; c <= cHi; c++) {
        const cl = cells[c];
        const i = this.idx(r, c);
        if (!cl || i < 0 || i >= this.src.done()) continue;
        const P = palette(yarnColorAt(this.yarnOf(i), i), this.yarnOf(i).type);
        const [x, y] = this.xy(r, c);
        const kl = this.knit(r, c - 1), kr = this.knit(r, c + 1);
        const x0 = kl ? x - 1 : x + W * 0.1, x1 = kr ? x + W + 1 : x + W * 0.9;
        g.fillStyle = rgba(P.trough);
        g.fillRect(x0, y + H * 0.15, x1 - x0, H * (r === 1 ? 0.95 : 1.0));
      }
      const spans = new Set();
      for (let c = cLo; c <= cHi; c++) {
        const cl = cells[c];
        if (!cl) continue;
        const i = this.idx(r, c);
        if (i < 0 || i >= this.src.done()) continue;
        const yarn = this.yarnOf(i);
        const v = hash(r, c) & 3;
        if (cl.s === 'x' && cl.cable) { spans.add(cl.cable.span); continue; }
        if (cl.s === 'b') { spr('k', yarn, i, r, c, v); late.push([r, c, i]); continue; }
        // under a knit cable cross, this row's stitch is drawn by the cable piece (it leans across)
        const above = ch.cell(r + 1, c);
        if (above && above.cable && cl.s !== 'x' && this.knit(r + 1, c)) continue;
        if (cl.s === 'o') holes.push([r, c]);
        spr(cl.s, yarn, i, r, c, v);
      }
      // cables: back strands, then front strands (with their shadow), each in its own stitch's yarn
      for (const sp of spans) {
        for (const front of [false, true]) for (let j = 0; j < sp.n; j++) {
          const c = sp.col + j, i = this.idx(r, c);
          if (i < 0 || i >= this.src.done()) continue;
          const isFront = sp.front === 'F' ? j < sp.half : j >= sp.half;
          if (isFront !== front) continue;
          spr(`cable:${sp.type}:${j}`, this.yarnOf(i), i, r, c, 0);
        }
      }
      this.shadeRow(r, cells, cLo, cHi);
      // bind-off chains on this row's stitches
      for (let c = cLo; c <= cHi; c++) if (cells[c] && this.boVisible(r, c)) { const i = this.idx(r, c); spr('bindOff', this.yarnOf(i), i, r, c, 0); }
      // mohair halo etc. (seeded per stitch)
      for (let c = cLo; c <= cHi; c++) {
        const i = this.idx(r, c);
        if (!cells[c] || i < 0 || i >= this.src.done()) continue;
        const yarn = this.yarnOf(i);
        if (yarn.type === 'mohair') { const [x, y] = this.xy(r, c); const ab = ch.cell(r + 1, c); const cab = cells[c].cable || (ab && ab.cable && this.knit(r + 1, c)); drawEffects(g, cab ? 'cable:' : cells[c].s, x, y, W, yarn, hash(r, c, 9), yarnColorAt(yarn, i)); }
      }
    }
    for (const [r, c, i] of late) spr('b', this.yarnOf(i), i, r, c, 0);
    // yarn-over holes are cut last, through everything drawn above
    if (holes.length) {
      g.save();
      g.globalCompositeOperation = 'destination-out';
      for (const [r, c] of holes) {
        const [x, y] = this.xy(r, c);
        const h = holeEllipse(x, y, W);
        const gr = g.createRadialGradient(h.cx, h.cy, 0, h.cx, h.cy, h.rx * 1.05);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.8, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(h.cx, h.cy, h.rx * 1.05, h.ry * 1.05, 0, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
  }
  // purl columns beside knit columns sink into shadow; edge stitches get a darker rim
  shadeRow(r, cells, cLo, cHi) {
    const g = this.g, W = this.W, H = this.H;
    g.save();
    g.globalCompositeOperation = 'source-atop';
    for (let c = cLo; c <= cHi; c++) {
      const cl = cells[c];
      if (!cl || !this.knit(r, c)) continue;
      const [x, y] = this.xy(r, c);
      // shade toward the stitch's own deep tone (never a grey or black wash)
      const i = this.idx(r, c), P = palette(yarnColorAt(this.yarnOf(i), i), this.yarnOf(i).type);
      const sc = mixc(P.troughDeep, [28, 10, 26], 0.35);
      const side = (dx, a, w) => {
        const x0 = dx < 0 ? x : x + W, x1 = dx < 0 ? x + W * w : x + W * (1 - w);
        const gr = g.createLinearGradient(x0, 0, x1, 0);
        gr.addColorStop(0, rgba(sc, a)); gr.addColorStop(1, rgba(sc, 0));
        g.fillStyle = gr;
        g.fillRect(Math.min(x0, x1) - (dx < 0 ? W * 0.15 : 0), y - H * 0.1, Math.abs(x1 - x0) + W * 0.15, H * 1.45);
      };
      for (const dx of [-1, 1]) {
        const nb = cells[c + dx];
        if (!nb) side(dx, 0.42, 0.38);
        else if (cl.s === 'p' && KNITLIKE.has(nb.s)) {
          // a purl COLUMN (rib) sinks between the knit columns; a lone purl (seed, moss) stays pebbly
          const up = this.chart.cell(r + 1, c), dn = this.chart.cell(r - 1, c);
          const col = (up && up.s === 'p') || (dn && dn.s === 'p');
          side(dx, col ? 0.55 : 0.22, col ? 0.5 : 0.3);
        }
      }
    }
    g.restore();
  }
}

// ---------------------------------------------------------------- swatch renderer (static)

// Renders a whole chart, all stitches knit, onto a new canvas: {canvas, W, H}.
// opts: {yarnAt(i) -> yarn, cellPx (device px), castOnYarn, bindOff: true, background: css | null, shadow: true, margin}
export function renderSwatch(chart, opts) {
  const W = Math.round(opts.cellPx);
  const total = chart.total;
  const fab = new Fabric(chart, { done: () => total, yarn: opts.yarnAt, castOnYarn: opts.castOnYarn || opts.yarnAt(0), finished: () => opts.bindOff !== false });
  fab.setWindow(0, chart.width, 1, chart.height, W);
  const m = opts.margin ?? Math.round(W * 0.6);
  // the drape's waves reach dTop above the top row and dBot below the cast-on: room for both
  const out = mk(fab.canvas.width - fab.padX * 2 + m * 2 + fab.padX * 0.5, fab.canvas.height - fab.padT - fab.padB + fab.dTop + fab.dBot + m * 2 + fab.H * 1.4);
  const g = out.getContext('2d');
  if (opts.background) { g.fillStyle = opts.background; g.fillRect(0, 0, out.width, out.height); }
  const ox = m - fab.padX, oy = m - fab.padT + fab.dTop + fab.H * 0.4;
  if (opts.shadow !== false) drawShadow(g, fab.canvas, ox, oy, fab.canvas.width, fab.canvas.height, W);
  g.drawImage(fab.canvas, ox, oy);
  return { canvas: out, W, H: fab.H };
}

function silhouette(src, scale) {
  const s = mk(src.width * scale, src.height * scale);
  const g = s.getContext('2d');
  g.imageSmoothingQuality = 'low';
  g.drawImage(src, 0, 0, s.width, s.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = 'rgb(30,10,32)';
  g.fillRect(0, 0, s.width, s.height);
  return s;
}
function drawShadow(g, src, x, y, w, h, W, sil) {
  sil = sil || silhouette(src, 1 / 10);
  g.save();
  g.imageSmoothingEnabled = true;
  g.globalAlpha = 0.5;
  g.drawImage(sil, x + W * 0.22, y + W * 0.38, w, h);
  g.globalAlpha = 0.25;
  g.drawImage(sil, x + W * 0.5, y + W * 0.8, w * 1.01, h * 1.01);
  g.restore();
  return sil;
}

// ---------------------------------------------------------------- the Work view

export class Work {
  // canvas: the visible view canvas. opts: {dpr, fitBox(w,h)->{x,y,w,h}, minFit, maxFit, background(ctx,w,h), ballPoint(w,h)->{x,y}}
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.dpr = opts.dpr || (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    this.zoomLevels = [1, 1.5, 2, 3];
    this.zoomIndex = 0;
    this.needleStyle = 'bamboo';
    this.markerStyle = 'ring';
    this.counterStyle = 'brass';
    this.cam = { x: 0, y: 0, ok: false };
    this.anim = { tap: null, turn: null, pop: null, twitch: 0, counter: 0 };
    this.nextYarn = { color: '#efe4cf', type: 'wool' };
    this.lightsOut = false;
    this.finished = false;
    this.running = false;
    this._frame = this._frame.bind(this);
    this.resize();
  }

  // ---- data
  load(chart, { yarns = [], done = 0, castOnYarn, nextYarn } = {}) {
    this.chart = chart;
    this.yarns = yarns.slice();
    this.done = done;
    this.finished = false;
    if (nextYarn) this.nextYarn = nextYarn;
    this.castOnYarn = castOnYarn || this.yarns[0] || this.nextYarn;
    this.fabric = new Fabric(chart, { done: () => this.done, yarn: (i) => this.yarns[i] || this.nextYarn, castOnYarn: this.castOnYarn, finished: () => this.finished, liveRow: () => this._needleRow().r });
    this.anim = { tap: null, turn: null, pop: null, twitch: 0, counter: 0 };
    this.cam.ok = false;
    this._layout(true);
    this._kick();
  }
  setNextYarn(y) { this.nextYarn = y; this._kick(); }
  setNeedles(style) { if (NEEDLE_STYLES[style]) { this.needleStyle = style; this._kick(); } }
  setMarkers(style) { if (MARKER_STYLES[style]) { this.markerStyle = style; this._kick(); } }
  setCounter(style) { if (COUNTER_STYLES[style]) { this.counterStyle = style; this._kick(); } }
  setLightsOut(on) { this.lightsOut = !!on; this._kick(); }

  // one tap: knit the next stitch in `yarn`. Returns {index, r, col, rowEnd, finished} or null.
  knit(yarn = this.nextYarn, { animate = true } = {}) {
    if (!this.chart || this.finished) return null;
    if (!this.chart.endless && this.done >= this.chart.total) return null;
    this._cut();
    const i = this.done;
    const L = this.chart.locate(i);
    const before = this.chart.needles(i);
    this.yarns[i] = yarn;
    this.done++;
    const rowEnd = this.chart.endless ? L.k === this.chart.row(L.r).map.length - 1 : this.done === this.chart.rowStart(L.r + 1);
    const t = now();
    if (animate) {
      // unhurried taps get a longer, easier-to-follow stitch (~230 ms); drumming keeps the quick 120 ms one
      const gap = t - (this._lastKnitT ?? -1e9);
      this._lastKnitT = t;
      const dur = gap > 250 ? 230 : 120;
      this.anim.tap = { t0: t, i, r: L.r, col: L.entry.col, before, stamped: false, rowEnd, yarn, dur };
      this.anim.twitch = t;
      if (rowEnd) this.anim.turnQueued = true;
    } else this._stamp(i);
    if (rowEnd && !animate) this.anim.counter = t;
    this._layout();
    this._kick();
    return { index: i, r: L.r, col: L.entry.col, stitch: L.entry.stitch, rowEnd, finished: !this.chart.endless && this.done >= this.chart.total };
  }
  rip() {
    if (!this.chart || this.done <= 0) return null;
    this._cut();
    this.finished = false;
    this.done--;
    const i = this.done;
    const L = this.chart.locate(i);
    this.yarns.length = i;
    this.anim.twitch = now();
    this._stamp(i);
    this._layout();
    this._kick();
    return { index: i, r: L.r, col: L.entry.col };
  }
  finish() { this.finished = true; this._cut(); if (this.fabric.canvas) this.fabric.stampAll(); this._kick(); }

  // ---- zoom and layout
  zoomIn() { this.setZoom(this.zoomIndex + 1); }
  zoomOut() { this.setZoom(this.zoomIndex - 1); }
  setZoom(i) { this.zoomIndex = clamp(i, 0, this.zoomLevels.length - 1); this._layout(true); this._kick(); }
  // the starting zoom: the smallest step whose stitches are at least minPx (the camera then follows the
  // needle); step 0 always shows the whole piece. Big pieces get extra steps so they can reach it.
  comfortZoom(minPx) {
    if (!this.chart) return this.setZoom(0);
    this.zoomIndex = 0; this._layout();
    const fit = this.cp;
    const levels = [1];
    while (levels[levels.length - 1] < Math.max(3, (minPx / fit) * 1.5)) levels.push(Math.round(levels[levels.length - 1] * 1.5 * 1000) / 1000);
    this.zoomLevels = levels;
    let i = levels.findIndex((l) => fit * l >= minPx - 0.01);
    if (i < 0) i = levels.length - 1;
    this.cam.ok = false;
    this.setZoom(i);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { width: this.canvas.width, height: this.canvas.height };
    this.vw = Math.max(50, r.width || this.canvas.clientWidth || 300);
    this.vh = Math.max(50, r.height || this.canvas.clientHeight || 300);
    this.canvas.width = Math.round(this.vw * this.dpr);
    this.canvas.height = Math.round(this.vh * this.dpr);
    if (this.chart) this._layout(true);
    this._kick();
  }
  _box() { return this.opts.fitBox ? this.opts.fitBox(this.vw, this.vh) : { x: 0, y: 0, w: this.vw, h: this.vh }; }
  _rowsShown() { return this.chart.endless ? Math.max(4, this.chart.locate(this.done).r + 1) : this.chart.height; }
  _layout(force) {
    const ch = this.chart;
    if (!ch) return;
    const box = this._box();
    const rows = ch.endless ? 14 : ch.height;
    // side room in stitch widths for the needles (about 5 each side beside a panel, so a needle never
    // reaches under it at the start of a row)
    const pad = typeof this.opts.padCols === 'function' ? this.opts.padCols() : this.opts.padCols ?? 5;
    let fit = Math.min(box.w / (ch.width + pad), box.h / ((rows + 3.2) * CELL_ASPECT));
    fit = clamp(fit, this.opts.minFit ?? 8, this.opts.maxFit ?? 28);
    this.cp = fit * this.zoomLevels[this.zoomIndex];
    const W = this._deviceCell();
    if (force || !this.fabric.canvas || W !== this.fabric.W || this._windowStale()) this._rewindow(W);
  }
  _deviceCell() {
    // backing scale capped: 4096 px a side, 8 MP
    let W = Math.round(this.cp * this.dpr);
    const vis = this._visibleCells(W);
    const est = (w) => { const h = w * CELL_ASPECT; return [(vis.cols + 2.4) * w, (vis.rows + 2.6) * h]; };
    for (let k = 0; k < 40; k++) {
      const [a, b] = est(W);
      if (a <= 4096 && b <= 4096 && a * b <= 8e6) break;
      W = Math.max(4, Math.floor(W * 0.95));
    }
    return W;
  }
  _visibleCells() {
    const ch = this.chart;
    const cols = Math.min(ch.width, Math.ceil(this.vw / this.cp) + 9);
    const rows = Math.min(ch.endless ? 1e9 : ch.height, Math.ceil(this.vh / (this.cp * CELL_ASPECT)) + 10);
    return { cols, rows };
  }
  _camTarget() {
    const ch = this.chart, box = this._box();
    const rowsShown = this._rowsShown();
    const ns = this._needleRow();
    const zoomed = this.zoomIndex > 0 || ch.endless;
    const visC = box.w / this.cp, visR = box.h / (this.cp * CELL_ASPECT);
    let x = ch.width / 2, y = (rowsShown + 1.8) / 2;
    if (zoomed) {
      x = ns.col + 0.5; y = ns.r - 0.2;
      // room for the needles past the work's edges (about 4 stitch widths each side)
      if (visC < ch.width + 8) x = clamp(x, visC / 2 - 4, ch.width - visC / 2 + 4); else x = ch.width / 2;
      const top = rowsShown + 2;
      // low rows sit about three-quarters down the view (room below for the needle and yarn), not on its edge
      y = clamp(y, Math.min(visR * 0.3, top - visR / 2), Math.max(visR * 0.3, top - visR / 2 + 0.5));
      if (ch.endless) y = Math.max(ns.r + 2.2 - visR * 0.35, visR / 2 - 1.2);
    }
    return { x, y };
  }
  _needleRow() {
    const ch = this.chart;
    if (!ch.endless && this.done >= ch.total) { const R = ch.row(ch.height); return { r: ch.height, col: R.map[R.map.length - 1].col }; }
    const L = ch.locate(this.done);
    return { r: L.r, col: L.entry.col };
  }
  _windowStale() {
    const f = this.fabric, ch = this.chart;
    if (!f.canvas) return true;
    const t = this._camTarget();
    const box = this._box();
    const halfC = box.w / this.cp / 2 + 1, halfR = box.h / (this.cp * CELL_ASPECT) / 2 + 1;
    const c0 = Math.max(0, Math.floor(t.x - halfC)), c1 = Math.min(ch.width, Math.ceil(t.x + halfC));
    const rLo = Math.max(1, Math.floor(t.y - halfR)), rHi = Math.ceil(t.y + halfR);
    const needR = this._needleRow().r;
    return c0 < f.c0 || c1 > f.c1 || (rLo < f.r0 && f.r0 > 1) || Math.min(rHi, needR + 1) > f.rTop;
  }
  _rewindow(W) {
    const ch = this.chart, f = this.fabric;
    const t = this._camTarget();
    const box = this._box();
    const halfC = box.w / this.cp / 2 + 1, halfR = box.h / (this.cp * CELL_ASPECT) / 2 + 1;
    const c0 = Math.max(0, Math.floor(t.x - halfC) - 4), c1 = Math.min(ch.width, Math.ceil(t.x + halfC) + 4);
    const needR = this._needleRow().r;
    const top = ch.endless ? Math.max(needR + 3, Math.ceil(t.y + halfR)) : ch.height;
    const r0 = Math.max(1, Math.min(needR, Math.floor(t.y - halfR)) - 8);
    f.setWindow(c0, c1, r0, Math.min(top, ch.endless ? Infinity : ch.height), W);
    f.sil = null;
  }
  _stamp(i) {
    const L = this.chart.locate(i);
    if (!L) return;
    const f = this.fabric;
    if (!f.canvas || L.r > f.rTop) { this._layout(true); return; }
    f.band(L.r, L.entry.col);
    // bind-offs that hang on this tap (or on the row's first tap) appear / vanish with it
    const R = this.chart.row(L.r);
    const bo = [...L.entry.boundOffAfter, ...(L.k === 0 ? R.boundOffBefore : [])];
    for (const pi of bo) f.band(L.r - 1, R.prevCols[pi]);
    f.sil = null;
  }
  _cut() {
    const a = this.anim;
    if (a.tap) { if (!a.tap.stamped) this._stamp(a.tap.i); if (a.tap.rowEnd) a.counter = now(); a.tap = null; }
    a.turn = null; a.turnQueued = false; a.pop = null;
  }

  // ---- loop
  _kick() { if (!this.running && typeof requestAnimationFrame !== 'undefined') { this.running = true; requestAnimationFrame(this._frame); } }
  _frame(t) {
    const busy = this.draw(t);
    if (busy) requestAnimationFrame(this._frame); else this.running = false;
  }

  // ---- public getters
  // geometry(): the view's current mapping, CSS px: {cp, ch, colL(c), colC(c), rowT(r)}, or null before load
  geometry() { return this.chart && this.fabric && this.fabric.canvas ? this._geo() : null; }
  // needleTip(): the right needle's tip as last drawn, CSS px {x, y}, or null
  needleTip() { return this._lastNeedle ? { x: this._lastNeedle.tip.x, y: this._lastNeedle.tip.y } : null; }
  setMaxFit(px) { if (this.opts.maxFit !== px) { this.opts.maxFit = px; if (this.chart) this._layout(true); this._kick(); } }

  // ---- geometry helpers (CSS px)
  _geo() {
    const box = this._box();
    const cp = this.cp, chh = cp * (this.fabric.H / this.fabric.W);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    return {
      cp, ch: chh,
      colL: (c) => cx + (c - this.cam.x) * cp,
      colC: (c) => cx + (c + 0.5 - this.cam.x) * cp,
      rowT: (r) => cy + (this.cam.y - r) * chh,
    };
  }

  // the needles' layout for a needle state ns (chart.needles), in CSS px
  _needleLayout(ns, G) {
    const ch = this.chart;
    const rs = ns.rs, dir = rs ? -1 : 1;
    const r = ns.r;
    const R = ch.row(r);
    let loopX;
    let purlAction = false;
    if (ns.next) {
      const tk = ns.next.takes.map((t) => R.prevCols[t]);
      const lc = tk.length ? (rs ? Math.max(...tk) : Math.min(...tk)) : ns.next.col;
      loopX = G.colC(lc) + (tk.length ? 0 : -dir * 0.5 * G.cp);
      const s = ns.next.stitch;
      purlAction = rs ? s === 'p' : s !== 'p';
    } else {
      const cols = R.cols;
      loopX = G.colC(rs ? Math.min(...cols) : Math.max(...cols)) + dir * 0.7 * G.cp;
    }
    const yL = G.rowT(r) + 0.42 * G.ch;
    const yR = G.rowT(r) - 0.62 * G.ch;
    const rest = { x: loopX - dir * 0.5 * G.cp, y: yL - 0.28 * G.ch };
    const tipIn = { x: loopX + dir * 0.28 * G.cp, y: yL + 0.1 * G.ch };
    // right needle far point (holding the new loops)
    const right = ns.right;
    let farX = right.length ? G.colC(rs ? Math.max(...right) : Math.min(...right)) - dir * 0.6 * G.cp : rest.x - dir * 3 * G.cp;
    if (Math.abs(farX - rest.x) < 3 * G.cp) farX = rest.x - dir * 3 * G.cp;
    // left needle extent (holding the old loops)
    const left = ns.left;
    const lFar = left.length ? G.colC(rs ? Math.min(...left) : Math.max(...left)) + dir * 0.6 * G.cp : loopX + dir * 2.5 * G.cp;
    return { dir, r, yL, yR, rest, tipIn, farX, lTipX: loopX - dir * 0.75 * G.cp, lFar, purlAction };
  }

  // ---- drawing
  draw(t = now()) {
    const g = this.ctx;
    if (!this.chart || !this.fabric.canvas) return false;
    let busy = false;
    const a = this.anim;
    // tap timeline (fractions of a.tap.dur, 120-230 ms): 0-30% tip in, 30-60% wrap, 60-100% pull through and slide
    if (a.tap) {
      const p = (t - a.tap.t0) / a.tap.dur;
      if (p >= 0.6 && !a.tap.stamped) { this._stamp(a.tap.i); a.tap.stamped = true; a.pop = { t0: t, i: a.tap.i, dur: a.tap.dur > 120 ? 190 : 130 }; }
      if (p >= 1) {
        if (a.tap.rowEnd) { a.turn = { t0: t, swapped: false }; a.turnQueued = false; }
        a.tap = null;
      }
      busy = true;
    }
    if (a.turn) {
      const p = (t - a.turn.t0) / 280;
      if (p >= 0.5 && !a.turn.swapped) { a.turn.swapped = true; a.counter = t; }
      if (p >= 1) a.turn = null;
      busy = true;
    }
    if (a.pop && t - a.pop.t0 > a.pop.dur) a.pop = null;
    if (a.pop) busy = true;
    if (t - a.twitch < 450 || t - a.counter < 350) busy = true;
    // camera
    const tgt = this._camTarget();
    if (!this.cam.ok) { this.cam.x = tgt.x; this.cam.y = tgt.y; this.cam.ok = true; }
    const k = 1 - Math.exp(-(Math.min(64, t - (this._lt || t)) / 1000) * 9);
    this._lt = t;
    this.cam.x += (tgt.x - this.cam.x) * k; this.cam.y += (tgt.y - this.cam.y) * k;
    if (Math.abs(tgt.x - this.cam.x) > 0.005 || Math.abs(tgt.y - this.cam.y) > 0.005) busy = true;
    if (this._windowStale()) this._rewindow(this._deviceCell());

    const W = this.vw, H = this.vh;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (this.opts.background) this.opts.background(g, W, H); else defaultBackground(g, W, H);
    const G = this._geo();
    const f = this.fabric;
    const s = G.cp / f.W; // CSS px per fabric px
    const fx = G.colL(f.c0) - f.padX * s, fy = G.rowT(f.rTop) - f.padT * s;
    // the turn: squash on x around the work's middle, needles swap at the squash
    let sq = 1;
    if (a.turn) sq = 1 - 0.82 * Math.sin(Math.PI * clamp((t - a.turn.t0) / 280, 0, 1));
    const midX = G.colL(this.chart.width / 2);
    g.save();
    if (sq !== 1) { g.translate(midX, 0); g.scale(sq, 1); g.translate(-midX, 0); }
    if (!f.sil || f.dirty) { f.sil = silhouette(f.canvas, 1 / 10); f.dirty = false; }
    // beside a side panel the work (not the yarn to the ball) stays in its own area
    const cb = this.opts.clipBox ? this.opts.clipBox() : null;
    const clipOn = () => { g.save(); if (cb) { const m = g.getTransform(); g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.beginPath(); g.rect(cb.x, cb.y, cb.w, cb.h); g.clip(); g.setTransform(m); } };
    clipOn();
    drawShadow(g, f.canvas, fx, fy, f.canvas.width * s, f.canvas.height * s, G.cp * 0.9, f.sil);
    g.restore();
    // the working yarn hangs behind the work (held at the back), from the newest loop to the ball
    if (this._strand && !this.finished) drawStrand(g, this._strand, this.nextYarn, G.cp, Math.exp(-(t - a.twitch) / 120) * Math.sin((t - a.twitch) / 22) * G.cp * 0.35);
    else if (!this._strand && !this.finished) busy = true; // first frame: needles compute the strand route
    clipOn();
    g.imageSmoothingEnabled = true;
    g.drawImage(f.canvas, fx, fy, f.canvas.width * s, f.canvas.height * s);
    if (this.lightsOut) this._drawLightsOut(g, G);
    // the new stitch pops in (1.25 -> 1)
    if (a.pop) {
      const L = this.chart.locate(a.pop.i);
      const cl = this.chart.cell(L.r, L.entry.col);
      const yarn = this.yarns[a.pop.i];
      if (cl && cl.s !== 'x' && cl.s !== 'o' && yarn) {
        const sp = getSprite(cl.s, yarn, f.W, hash(L.r, L.entry.col) & 3, yarnColorAt(yarn, a.pop.i));
        const pp = clamp((t - a.pop.t0) / a.pop.dur, 0, 1);
        const sc = 1.25 - 0.25 * ease(pp);
        const [x, y] = f.xy(L.r, L.entry.col);
        const cxp = fx + (x + f.W / 2) * s, cyp = fy + (y + f.H / 2) * s;
        g.save();
        g.translate(cxp, cyp); g.scale(sc, sc); g.translate(-cxp, -cyp);
        g.globalAlpha = 0.9 * (1 - pp * 0.6);
        g.drawImage(sp.canvas, fx + (x - sp.ox) * s, fy + (y - sp.oy) * s, sp.canvas.width * s, sp.canvas.height * s);
        g.restore();
      }
    }
    if (!this.finished) this._drawNeedles(g, G, t);
    g.restore();
    g.restore();
    // twinkles for sparkle yarn
    if (this._drawTwinkles(g, G, t)) busy = true;
    lamp(g, W, H);
    return busy;
  }

  _stateForDrawing(t) {
    const a = this.anim, ch = this.chart;
    // returns {ns, tip, phase, p, tap}
    if (a.tap) {
      const p = clamp((t - a.tap.t0) / a.tap.dur, 0, 1);
      const before = a.tap.before;
      if (p < 0.6) return { ns: before, p, tap: a.tap };
      const after = a.tap.rowEnd ? endOfRow(ch, a.tap.r) : ch.needles(this.done);
      return { ns: after, p, tap: a.tap, from: before };
    }
    if (a.turn && !a.turn.swapped) { const L = ch.locate(this.done - 1); return { ns: endOfRow(ch, L.r) }; }
    if (!ch.endless && this.done >= ch.total) return { ns: endOfRow(ch, ch.height) };
    return { ns: ch.needles(this.done) };
  }

  _drawNeedles(g, G, t) {
    const st = this._stateForDrawing(t);
    const ns = st.ns;
    const lay = this._needleLayout(ns, G);
    const style = NEEDLE_STYLES[this.needleStyle] || NEEDLE_STYLES.bamboo;
    const rad = Math.max(1.6, G.cp * 0.11);
    const dir = lay.dir;
    // where is the right needle's tip?
    let tip = { ...lay.rest };
    // the tap, exaggerated so it reads at a glance:
    //  0-30%  the tip slides into the front of the next loop on the left needle (the loop lifts to meet it)
    // 30-60%  the working yarn wraps once round the tip
    // 60-100% the tip pulls the new loop through and back; the old loop slips off and drops into the fabric
    let wrap = 0, slide = null, target = null;
    if (st.tap) {
      const p = st.p;
      const back = { x: lay.rest.x - dir * 0.35 * G.cp, y: lay.rest.y - 0.3 * G.ch };
      const deep = { x: lay.tipIn.x + dir * 0.12 * G.cp, y: lay.tipIn.y + 0.06 * G.ch };
      if (p < 0.3) { const q = ease(p / 0.3); tip = { x: lerp(back.x, deep.x, q), y: lerp(back.y, deep.y, q) }; target = 0.4 + 0.6 * q; }
      else if (p < 0.6) { const q = (p - 0.3) / 0.3; tip = { ...deep }; tip.y += Math.sin(q * Math.PI) * 0.15 * G.ch; wrap = q; target = 1; }
      else {
        const lb = this._needleLayout(st.from, G);
        const dp = { x: lb.tipIn.x + dir * 0.12 * G.cp, y: lb.tipIn.y + 0.06 * G.ch };
        const q = ease((p - 0.6) / 0.4);
        tip = { x: lerp(dp.x, lay.rest.x, q), y: lerp(dp.y - 0.25 * G.ch * Math.sin(q * Math.PI), lay.rest.y, q) };
        slide = { q, lb, ql: (p - 0.6) / 0.4 };
      }
    }
    // the right needle's line: through the tip and the far point above the new loops
    const far = { x: lay.farX, y: lay.yR };
    const ux0 = far.x - tip.x, uy0 = far.y - tip.y, ul = Math.hypot(ux0, uy0);
    const ux = ux0 / ul, uy = uy0 / ul;
    // the needles' ends stay inside the work area (never reaching under a side panel): a shorter needle
    const bx = this._box(), bL = bx.x + 0.15 * G.cp, bR = bx.x + bx.w - 0.15 * G.cp;
    const keepIn = (A, E, minLen) => {
      const ex = E.x > bR ? bR : E.x < bL ? bL : null;
      if (ex === null || Math.abs(E.x - A.x) < 1e-3) return E;
      const len = Math.hypot(E.x - A.x, E.y - A.y), k = Math.max(minLen / len, (ex - A.x) / (E.x - A.x));
      return k >= 1 ? E : { x: A.x + (E.x - A.x) * k, y: A.y + (E.y - A.y) * k };
    };
    const rEnd = keepIn(tip, { x: far.x + ux * 2.4 * G.cp, y: far.y + uy * 2.4 * G.cp }, ul + 1.6 * G.cp);
    const rY = (x) => tip.y + ((x - tip.x) / ux) * uy;
    // left needle: horizontal through the old loops
    const lTip = { x: lay.lTipX, y: lay.yL - 0.05 * G.ch };
    const lEnd = keepIn(lTip, { x: lay.lFar + dir * 2.2 * G.cp, y: lay.yL + 0.02 * G.ch }, Math.abs(lay.lFar - lTip.x) + 0.8 * G.cp);
    const yarnL = (c) => {
      if (ns.leftRow < 1) return this.castOnYarn;
      const i = this.fabric.idx(ns.leftRow, c);
      return this.yarns[i] || this.nextYarn;
    };
    const yarnR = (c) => { const i = this.fabric.idx(ns.rightRow, c); return this.yarns[i] || this.nextYarn; };
    const colorAt = (y, c, row) => yarnColorAt(y, this.fabric.idx(row, c));
    const tcols = target && ns.next ? ns.next.takes.map((ti) => this.chart.row(ns.r).prevCols[ti]) : [];
    const loopsL = ns.left.map((c) => ({ x: G.colC(c), yN: lay.yL, yS: G.rowT(ns.r) + 1.02 * G.ch, yarn: yarnL(c), color: colorAt(yarnL(c), c, ns.leftRow), lift: tcols.includes(c) ? target : 0 }));
    const newest = st.tap && slide ? st.tap.col : null;
    const loopsR = ns.right.map((c) => {
      let x = G.colC(c), yN = rY(x);
      if (c === newest && slide) { x = lerp(tip.x + dir * 0.1 * G.cp, x, slide.q); yN = lerp(tip.y, yN, slide.q); }
      return { x, yN, yS: G.rowT(ns.r) + 0.05 * G.ch, yarn: yarnR(c), color: colorAt(yarnR(c), c, ns.rightRow) };
    });
    // the working loop sliding off the left needle
    let ghost = null;
    if (slide && st.from.next && st.from.next.takes.length) {
      const R = this.chart.row(st.from.r);
      ghost = st.from.next.takes.map((ti) => {
        const c = R.prevCols[ti];
        const y = yarnL(c);
        // slips off the left needle's tip and drops onto the new stitch, fading as the stitch pops in
        const yN = lerp(lay.yL, G.rowT(ns.r) + 0.75 * G.ch, slide.ql);
        return { x: lerp(G.colC(c), G.colC(st.tap.col), slide.ql), yN, yS: yN + 0.5 * G.ch, yarn: y, color: colorAt(y, c, st.from.r - 1), alpha: slide.ql < 0.5 ? 1 : Math.max(0, 1 - (slide.ql - 0.5) / 0.4) };
      });
    }
    // strand from the newest loop to the ball
    const ball = this.opts.ballPoint ? this.opts.ballPoint(this.vw, this.vh) : { x: this.vw * 0.06, y: this.vh + 30 };
    const strandFrom = loopsR.length ? (dir < 0 ? loopsR[0] : loopsR[loopsR.length - 1]) : { x: tip.x, yN: tip.y };
    const tw = Math.exp(-(t - this.anim.twitch) / 120) * Math.sin((t - this.anim.twitch) / 22) * G.cp * 0.35;
    // the working yarn leaves the needle at the stitch just made (or the wrap on the tip), drops behind
    // the work and comes out at the side nearest the ball
    const sFrom = wrap > 0 ? { x: tip.x - dir * 0.1 * G.cp, y: tip.y + rad } : { x: strandFrom.x + dir * 0.12 * G.cp, y: strandFrom.yN + rad };
    const Rw = this.chart.row(ns.r);
    const wcols = Rw.cols.length ? Rw.cols : [0];
    const midX = G.colL(this.chart.width / 2);
    const leftSide = ball.x < midX;
    const edgeX = leftSide ? G.colL(Math.min(...wcols)) - 0.45 * G.cp : G.colL(Math.max(...wcols) + 1) + 0.45 * G.cp;
    const edgeY = G.rowT(ns.r) + 2.2 * G.ch;
    // zoomed in on a big piece the work's side is off screen: the yarn drops straight down behind the work
    // and comes out below it, heading for the ball, instead of a long detour to the far edge
    if (edgeX < 0 || edgeX > this.vw) this._strand = { from: sFrom, to: ball, edge: { x: sFrom.x, y: Math.max(edgeY, G.rowT(1) + 1.6 * G.ch) }, out: ball.x < sFrom.x ? -1 : 1 };
    else this._strand = { from: sFrom, to: ball, edge: { x: edgeX, y: edgeY }, out: leftSide ? -1 : 1 };
    if (wrap > 0) { // the strand comes up in front to make the wrap
      const P = palette(this.nextYarn.color, this.nextYarn.type);
      g.save(); g.lineCap = 'round';
      for (const [c, w] of [[rgba(P.deep, 0.85), Math.max(1.8, G.cp * 0.17)], [rgba(P.base), Math.max(1.4, G.cp * 0.13)]]) {
        g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(sFrom.x, sFrom.y); g.quadraticCurveTo(sFrom.x - dir * 0.1 * G.cp, sFrom.y + 0.8 * G.ch, sFrom.x - dir * 0.05 * G.cp, sFrom.y + 1.6 * G.ch); g.stroke();
      }
      g.restore();
    }

    // needle shadows on the fabric
    const sh = (a0, b0) => { g.save(); g.strokeStyle = 'rgba(30,10,30,0.22)'; g.lineWidth = rad * 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(a0.x + G.cp * 0.12, a0.y + G.ch * 0.42); g.lineTo(b0.x + G.cp * 0.12, b0.y + G.ch * 0.42); g.stroke(); g.restore(); };
    sh(lTip, lEnd); sh(tip, rEnd);
    const markers = this.chart.markers(ns.r);
    const drawLeft = () => {
      for (const L of loopsL) drawLoop(g, L, rad, G.cp, 'back');
      drawNeedle(g, lTip, lEnd, rad, style, G.cp, t);
      for (const L of loopsL) drawLoop(g, L, rad, G.cp, 'front');
      for (const b of markers) if (!onRight(b, ns)) drawMarker(g, G.colL(b), lay.yL, rad, G.cp, MARKER_STYLES[this.markerStyle]);
    };
    const drawRight = () => {
      for (const L of loopsR) drawLoop(g, L, rad, G.cp, 'back');
      drawNeedle(g, tip, rEnd, rad, style, G.cp, t);
      for (const L of loopsR) drawLoop(g, L, rad, G.cp, 'front');
      for (const b of markers) if (onRight(b, ns)) { const x = G.colL(b); drawMarker(g, x, rY(x), rad, G.cp, MARKER_STYLES[this.markerStyle]); }
      // row counter near the needle's end
      const cpT = { x: far.x + ux * 1.2 * G.cp, y: far.y + uy * 1.2 * G.cp };
      const pop = clamp((t - this.anim.counter) / 300, 0, 1);
      drawCounter(g, cpT, Math.atan2(uy, ux), rad, G.cp, ns.r, COUNTER_STYLES[this.counterStyle], pop < 1 ? 1 + 0.35 * Math.sin(pop * Math.PI) : 1);
    };
    if (lay.purlAction) { drawLeft(); drawRight(); }
    else {
      // knit: the tip goes behind the front of the working loop
      for (const L of loopsL) drawLoop(g, L, rad, G.cp, 'back');
      drawNeedle(g, lTip, lEnd, rad, style, G.cp, t);
      drawRight();
      for (const L of loopsL) drawLoop(g, L, rad, G.cp, 'front');
      for (const b of markers) if (!onRight(b, ns)) drawMarker(g, G.colL(b), lay.yL, rad, G.cp, MARKER_STYLES[this.markerStyle]);
    }
    // the wrap: the working yarn goes once round the tip, in front of everything
    if (wrap > 0) drawWrap(g, tip, { x: ux, y: uy }, rad, G.cp, this.nextYarn, wrap, dir);
    // the old loop, dropping (one copy, no ghosts left on the needle)
    if (ghost) for (const L of ghost) { g.save(); g.globalAlpha = L.alpha; drawLoop(g, L, rad, G.cp, 'back'); drawLoop(g, L, rad, G.cp, 'front'); g.restore(); }
    this._lastNeedle = { tip, lTip, lEnd, rEnd, rs: ns.rs, row: ns.r };
  }

  _drawTwinkles(g, G, t) {
    const f = this.fabric, ch = this.chart;
    let any = false;
    const c0 = Math.max(f.c0, Math.floor(this.cam.x - this.vw / G.cp / 2)), c1 = Math.min(f.c1, Math.ceil(this.cam.x + this.vw / G.cp / 2));
    const r0 = Math.max(f.r0, Math.floor(this.cam.y - this.vh / G.ch / 2)), r1 = Math.min(f.rTop, Math.ceil(this.cam.y + this.vh / G.ch / 2));
    for (let r = r0; r <= r1; r++) for (let c = c0; c < c1; c++) {
      const i = f.idx(r, c);
      if (i < 0 || i >= this.done) continue;
      const y = this.yarns[i];
      if (!y || y.type !== 'sparkle') continue;
      any = true;
      const h = hash(r, c, 3);
      const ph = ((t / 1000) * 0.6 + (h % 1000) / 1000 * 4) % 4;
      if (ph < 0.3) {
        const a = Math.sin((ph / 0.3) * Math.PI);
        drawTwinkle(g, G.colL(c) + ((h >> 4) % 100) / 100 * G.cp, G.rowT(r) + (f.dyRows(r, c) + ((h >> 11) % 100) / 100) * G.ch, G.cp * 0.28, a);
      }
    }
    return any;
  }

  _drawLightsOut(g, G) {
    const f = this.fabric;
    g.save();
    g.fillStyle = 'rgba(10,12,40,0.62)';
    g.fillRect(0, 0, this.vw, this.vh);
    g.globalCompositeOperation = 'lighter';
    for (let r = f.r0; r <= f.rTop; r++) for (let c = f.c0; c < f.c1; c++) {
      const i = f.idx(r, c);
      if (i < 0 || i >= this.done || !this.yarns[i] || this.yarns[i].type !== 'glow') continue;
      const P = palette(yarnColorAt(this.yarns[i], i), 'glow');
      const x = G.colC(c), y = G.rowT(r) + G.ch * (0.6 + f.dyRows(r, c));
      const gr = g.createRadialGradient(x, y, 0, x, y, G.cp * 0.9);
      gr.addColorStop(0, rgba(P.hi, 0.5)); gr.addColorStop(1, rgba(P.base, 0));
      g.fillStyle = gr; g.fillRect(x - G.cp, y - G.cp, G.cp * 2, G.cp * 2);
    }
    g.restore();
  }

  state() {
    const ch = this.chart;
    const L = ch ? ch.locate(Math.min(this.done, ch.endless ? this.done : ch.total - 1)) : null;
    return {
      done: this.done, total: ch ? ch.total : 0, row: L ? L.r : 0, col: L ? L.entry.col : 0, rs: L ? ch.row(L.r).rs : true,
      finished: this.finished, cellPx: this.cp, zoom: this.zoomLevels[this.zoomIndex], needleStyle: this.needleStyle,
      fabricCanvas: this.fabric && this.fabric.canvas ? { w: this.fabric.canvas.width, h: this.fabric.canvas.height } : null,
      window: this.fabric ? { c0: this.fabric.c0, c1: this.fabric.c1, r0: this.fabric.r0, rTop: this.fabric.rTop, W: this.fabric.W } : null,
      animating: !!(this.anim.tap || this.anim.turn), needle: this._lastNeedle || null,
    };
  }
}

function onRight(b, ns) { return ns.right.includes(b - 1) && ns.right.includes(b); }
function endOfRow(ch, r) {
  const R = ch.row(r);
  return { r, k: R.map.length, rs: R.rs, done: true, next: null, left: [], right: R.cols.slice(), leftRow: r - 1, rightRow: r };
}

// ---------------------------------------------------------------- scene pieces

export function defaultBackground(g, w, h) {
  const gr = g.createLinearGradient(0, 0, w * 0.4, h);
  gr.addColorStop(0, '#9a7088'); gr.addColorStop(1, '#6b4a66');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
function lamp(g, w, h) {
  g.save();
  g.globalCompositeOperation = 'soft-light';
  const R = Math.max(w, h) * 1.1;
  const gr = g.createRadialGradient(w * 0.08, h * 0.02, 0, w * 0.08, h * 0.02, R);
  gr.addColorStop(0, 'rgba(255,214,140,0.85)'); gr.addColorStop(0.45, 'rgba(255,200,130,0.25)'); gr.addColorStop(1, 'rgba(40,20,60,0.5)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  const v = g.createRadialGradient(w * 0.45, h * 0.45, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
  v.addColorStop(0, 'rgba(30,10,40,0)'); v.addColorStop(1, 'rgba(30,10,40,0.28)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  g.restore();
}

const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function hexRgb(h) { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

// a needle from its tip a to its end b (end cap at b)
export function drawNeedle(g, a, b, rad, st, cp, t = 0) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const tipLen = Math.min(len * 0.3, cp * 1.1 + rad * 3);
  g.save();
  g.translate(a.x, a.y); g.rotate(ang);
  const flip = Math.cos(ang) < 0; // keep the light from above whichever way the needle points
  const up = flip ? 1 : -1;
  const body = () => {
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(tipLen * 0.35, -rad * 0.7, tipLen, -rad);
    g.lineTo(len, -rad); g.lineTo(len, rad); g.lineTo(tipLen, rad);
    g.quadraticCurveTo(tipLen * 0.35, rad * 0.7, 0, 0);
    g.closePath();
  };
  const cross = (cols, alpha = 1) => {
    const [d, m, l] = cols.map(hexRgb);
    const gr = g.createLinearGradient(0, up * rad, 0, -up * rad);
    gr.addColorStop(0, rgba(m, alpha)); gr.addColorStop(0.25, rgba(l, alpha)); gr.addColorStop(0.5, rgba(m, alpha)); gr.addColorStop(0.85, rgba(d, alpha)); gr.addColorStop(1, rgba(d, alpha));
    return gr;
  };
  // body
  body();
  if (st.kind === 'glass') {
    g.fillStyle = cross(st.body, 0.38); g.fill();
    g.save(); body(); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(0.8, rad * 0.35);
    g.beginPath(); g.moveTo(tipLen * 0.6, up * rad * 0.45); g.lineTo(len, up * rad * 0.45); g.stroke();
    g.strokeStyle = 'rgba(120,170,185,0.6)'; g.lineWidth = Math.max(0.6, rad * 0.25);
    g.beginPath(); g.moveTo(tipLen, -up * rad * 0.7); g.lineTo(len, -up * rad * 0.7); g.stroke();
    g.restore();
    body(); g.strokeStyle = 'rgba(90,130,145,0.7)'; g.lineWidth = Math.max(0.6, rad * 0.15); g.stroke();
  } else {
    g.fillStyle = cross(st.body); g.fill();
    g.save(); body(); g.clip();
    if (st.rainbow) {
      // anodised bands: six hues, one full cycle every ~2 stitch widths, then the round shading back on top
      const HUES = ['#e2483d', '#f08a2c', '#efc93a', '#4cae5b', '#3f86d6', '#8a5bc9'];
      const bw = Math.max(rad * 1.2, (cp * 2) / 6);
      g.globalAlpha = 0.82;
      for (let x = tipLen * 0.15, k = 0; x < len; x += bw, k++) { g.fillStyle = HUES[k % 6]; g.fillRect(x, -rad, bw + 0.6, rad * 2); }
      g.globalAlpha = 1;
      g.fillStyle = cross(['#000000', '#000000', '#ffffff'], 0.3); g.fillRect(0, -rad, len, rad * 2);
    }
    if (st.stripes) {
      g.fillStyle = st.stripes;
      const w = rad * 2.2;
      for (let x = tipLen * 0.5; x < len + w; x += w * 2.2) { g.beginPath(); g.moveTo(x, -rad); g.lineTo(x + w, -rad); g.lineTo(x + w - rad * 1.6, rad); g.lineTo(x - rad * 1.6, rad); g.closePath(); g.fill(); }
      const sh = cross(['#000000', '#000000', '#ffffff'], 0.18); g.fillStyle = sh; g.fillRect(0, -rad, len, rad * 2);
    }
    if (st.grain) {
      g.strokeStyle = st.grain; g.lineWidth = Math.max(0.5, rad * 0.1);
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        const y0 = k * rad * 0.38;
        g.moveTo(tipLen * 0.4, y0);
        for (let x = tipLen * 0.4; x < len; x += cp * 0.6) g.quadraticCurveTo(x + cp * 0.3, y0 + Math.sin(x * 0.37 + k * 2) * rad * 0.14, x + cp * 0.6, y0);
        g.stroke();
      }
    }
    if (st.nodes) {
      for (let x = tipLen + cp * 2.2; x < len - cp * 0.5; x += cp * 3.6) {
        g.fillStyle = 'rgba(90,55,20,0.45)'; g.fillRect(x, -rad, Math.max(1, rad * 0.35), rad * 2);
        g.fillStyle = 'rgba(255,240,200,0.35)'; g.fillRect(x + rad * 0.35, -rad, Math.max(0.8, rad * 0.25), rad * 2);
      }
    }
    if (st.carved) {
      g.strokeStyle = 'rgba(60,35,10,0.55)'; g.lineWidth = Math.max(0.6, rad * 0.18);
      for (let x = len - cp * 2.2; x < len; x += rad * 1.3) { g.beginPath(); g.moveTo(x, -rad); g.quadraticCurveTo(x + rad * 0.6, 0, x, rad); g.stroke(); }
    }
    if (st.kind === 'metal') {
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(tipLen * 0.5, up * rad * 0.55 - rad * 0.12, len, Math.max(0.8, rad * 0.24));
    }
    // a metal tip
    if (st.tip) { g.fillStyle = cross(st.tip); g.fillRect(-1, -rad - 1, tipLen * 1.05, rad * 2 + 2); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(tipLen * 1.05, -rad, Math.max(1, rad * 0.25), rad * 2); }
    g.restore();
    body(); g.strokeStyle = 'rgba(40,20,20,0.45)'; g.lineWidth = Math.max(0.6, rad * 0.14); g.stroke();
  }
  if (st.glowTip) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const pulse = 0.75 + 0.25 * Math.sin(t / 400);
    const gr = g.createRadialGradient(rad, 0, 0, rad, 0, rad * 5);
    gr.addColorStop(0, `rgba(170,255,238,${0.8 * pulse})`); gr.addColorStop(1, 'rgba(170,255,238,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(rad, 0, rad * 5, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // end cap
  const capCols = st.capColor || st.body;
  if (st.cap === 'knob' || st.cap === 'ball' || st.cap === 'carved') {
    const R = rad * (st.cap === 'ball' ? 2.2 : 1.9);
    const [d, m, l] = capCols.map(hexRgb);
    const gr = g.createRadialGradient(len + R * 0.6, up * R * 0.45, R * 0.1, len + R * 0.8, 0, R * 1.1);
    gr.addColorStop(0, rgba(l, st.kind === 'glass' ? 0.8 : 1)); gr.addColorStop(0.5, rgba(m, st.kind === 'glass' ? 0.5 : 1)); gr.addColorStop(1, rgba(d, st.kind === 'glass' ? 0.6 : 1));
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(len + R * 0.75, 0, R * 0.85, R, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(40,20,20,0.4)'; g.lineWidth = Math.max(0.6, rad * 0.14); g.stroke();
  } else if (st.cap === 'disc') {
    const [d, m, l] = capCols.map(hexRgb);
    g.fillStyle = cross(st.body); g.fillRect(len, -rad * 1.9, rad * 1.1, rad * 3.8);
    g.strokeStyle = rgba(d); g.lineWidth = Math.max(0.6, rad * 0.14); g.strokeRect(len, -rad * 1.9, rad * 1.1, rad * 3.8);
  }
  g.restore();
}

// a live loop hanging on a needle: an inverted U over the rod; back half behind it, front half in front
function drawLoop(g, L, rad, cp, part) {
  const P0 = palette(L.color, L.yarn.type);
  const lift = L.lift || 0;
  const P = lift ? { ...P0, base: mixc(P0.base, P0.hi, 0.35 * lift), mid: mixc(P0.mid, P0.light, 0.3 * lift) } : P0;
  const w = cp * (0.15 + 0.05 * lift);
  const lw = Math.max(1.6, cp * 0.22 * typeInfo(L.yarn.type).thick) * (1 + 0.15 * lift);
  const top = L.yN - rad - lw * 0.35 - lift * cp * 0.12;
  const path = () => {
    g.beginPath();
    if (part === 'back') { g.moveTo(L.x + w, L.yS); g.lineTo(L.x + w, L.yN); g.quadraticCurveTo(L.x + w, top, L.x, top); }
    else { g.moveTo(L.x, top); g.quadraticCurveTo(L.x - w, top, L.x - w, L.yN); g.lineTo(L.x - w * 0.9, L.yS); }
  };
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  path(); g.strokeStyle = rgba(P.deep, 0.85); g.lineWidth = lw * 1.32; g.stroke();
  path(); g.strokeStyle = rgba(part === 'back' ? P.mid : P.base); g.lineWidth = lw; g.stroke();
  g.translate(-lw * 0.18, -lw * 0.18);
  path(); g.strokeStyle = rgba(P.hi, part === 'back' ? 0.25 : 0.5); g.lineWidth = lw * 0.3; g.stroke();
  g.restore();
}

function drawWrap(g, tip, u, rad, cp, yarn, amt, dir) {
  const P = palette(yarn.color, yarn.type);
  const cx = tip.x + u.x * cp * 0.3, cy = tip.y + u.y * cp * 0.3;
  const lw = Math.max(2, cp * 0.22);
  g.save();
  g.lineCap = 'round';
  const a0 = -Math.PI * 0.5, a1 = a0 + Math.PI * 2 * clamp(amt * 1.15, 0, 1);
  for (const [c, w] of [[rgba(P.deep, 0.9), lw * 1.3], [rgba(P.base), lw], [rgba(P.hi, 0.5), lw * 0.3]]) {
    g.strokeStyle = c; g.lineWidth = w;
    g.beginPath(); g.ellipse(cx, cy, cp * 0.13, rad + lw * 0.75, Math.atan2(u.y, u.x), a0, a1); g.stroke();
  }
  g.restore();
}

function drawStrand(g, S, yarn, cp, twitch) {
  const P = palette(yarn.color, yarn.type);
  const lw = Math.max(1.4, cp * 0.13);
  const a = S.from, b = S.to, e = S.edge || { x: (a.x + b.x) / 2, y: a.y + cp }, o = S.out || -1;
  const dist = Math.hypot(b.x - e.x, b.y - e.y);
  const path = (k) => {
    g.beginPath();
    g.moveTo(a.x + k, a.y + k);
    // down behind the stitch just made, then across behind the work to its side edge
    g.bezierCurveTo(a.x + k + twitch * 0.3, a.y + (e.y - a.y) * 0.9 + k, e.x - o * cp * 0.8 + k, e.y + k, e.x + k + twitch, e.y + k);
    // then off to the ball, sagging a little
    g.bezierCurveTo(e.x + o * Math.min(dist * 0.35, cp * 3) + k + twitch, e.y + dist * 0.15 + k, b.x + k, b.y - dist * 0.3 + k, b.x + k, b.y + k);
  };
  g.save();
  g.lineCap = 'round';
  for (const [c, w, k] of [[rgba(P.deep, 0.8), lw * 1.35, 0], [rgba(P.base), lw, 0], [rgba(P.hi, 0.45), lw * 0.3, -lw * 0.2]]) {
    g.strokeStyle = c; g.lineWidth = w; path(k); g.stroke();
  }
  g.restore();
}

function drawMarker(g, x, y, rad, cp, st) {
  if (!st) return;
  const ring = hexRgb(st.ring);
  const r = Math.max(2.2, rad * 1.7);
  g.save();
  g.lineWidth = Math.max(1, cp * 0.05);
  g.strokeStyle = rgba(ring.map((v) => v * 0.55)); g.beginPath(); g.ellipse(x, y, r * 0.55, r, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = Math.max(0.7, cp * 0.03); g.strokeStyle = st.ring; g.beginPath(); g.ellipse(x - 0.4, y - 0.4, r * 0.55, r, 0, 0, Math.PI * 2); g.stroke();
  if (st.charm) {
    const s = Math.max(3, cp * 0.17), cy = y + r + s * 1.1;
    g.strokeStyle = st.ring; g.beginPath(); g.moveTo(x, y + r); g.lineTo(x, cy - s * 0.6); g.stroke();
    g.fillStyle = st.color; g.strokeStyle = 'rgba(40,20,20,0.6)'; g.lineWidth = Math.max(0.6, s * 0.12);
    g.beginPath();
    if (st.charm === 'heart') { g.moveTo(x, cy + s * 0.8); g.bezierCurveTo(x - s * 1.3, cy - s * 0.1, x - s * 0.6, cy - s * 1.0, x, cy - s * 0.35); g.bezierCurveTo(x + s * 0.6, cy - s * 1.0, x + s * 1.3, cy - s * 0.1, x, cy + s * 0.8); }
    else if (st.charm === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); }
    else if (st.charm === 'acorn') { g.ellipse(x, cy + s * 0.2, s * 0.6, s * 0.75, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.fillStyle = '#5a3a1a'; g.ellipse(x, cy - s * 0.35, s * 0.75, s * 0.35, 0, 0, Math.PI * 2); }
    else if (st.charm === 'cat') { g.arc(x, cy, s * 0.7, 0, Math.PI * 2); g.moveTo(x - s * 0.65, cy - s * 0.2); g.lineTo(x - s * 0.5, cy - s * 1.0); g.lineTo(x - s * 0.1, cy - s * 0.6); g.moveTo(x + s * 0.65, cy - s * 0.2); g.lineTo(x + s * 0.5, cy - s * 1.0); g.lineTo(x + s * 0.1, cy - s * 0.6); }
    g.fill(); g.stroke();
  }
  g.restore();
}

function drawCounter(g, p, ang, rad, cp, row, st, scale) {
  if (!st) return;
  const w = Math.max(10, cp * 0.62), h = Math.max(10, rad * 5.2);
  g.save();
  g.translate(p.x, p.y); g.rotate(ang); g.scale(scale, scale);
  if (Math.cos(ang) < 0) g.scale(-1, -1); // keep the digits upright
  const [d, m, l] = st.body.map(hexRgb);
  const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, rgba(d)); gr.addColorStop(0.3, rgba(l)); gr.addColorStop(0.55, rgba(m)); gr.addColorStop(1, rgba(d));
  g.fillStyle = gr;
  roundRect(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.3); g.fill();
  g.strokeStyle = 'rgba(40,20,10,0.6)'; g.lineWidth = Math.max(0.6, cp * 0.025); g.stroke();
  // ridges
  g.strokeStyle = 'rgba(40,20,10,0.35)';
  for (const sx of [-0.36, 0.36]) { g.beginPath(); g.moveTo(sx * w, -h / 2 + 1); g.lineTo(sx * w, h / 2 - 1); g.stroke(); }
  // window with the row number
  const fw = w * 0.5, fh = h * 0.58;
  g.fillStyle = st.face; roundRect(g, -fw / 2, -fh / 2, fw, fh, fh * 0.2); g.fill();
  g.fillStyle = st.ink;
  g.font = `700 ${Math.max(6, fh * 0.82)}px Fredoka, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = String(row);
  const tw = g.measureText(txt).width;
  const sx = Math.min(1, (fw * 0.92) / Math.max(1, tw));
  g.save(); g.scale(sx, 1); g.fillText(txt, 0, fh * 0.06); g.restore();
  g.restore();
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
