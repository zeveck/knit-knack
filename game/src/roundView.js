// roundView.js — (Change 2) the knitting view of a round piece: the turning tube (CHANGE_2.md B).
//
// The flat fabric canvas (stamped from the stitch data, windowed over every column) is drawn as a tube:
// each band of rows with the same ring is cut into column strips, and strip j of n goes round the tube at
// θ = 2π((j + ½)/n − f), where f (frontPos, in turns) is the ring position at the front. Strips on the
// back are skipped (the top rows' inside is drawn behind, darkened). Rows are a helix: a round band's
// strip j is lifted by (n − 1 − j)/n of a row, so the round's last stitch sits a row above its first and
// the jog shows at the beginning-of-round marker. We look down on the tube a little (ELLIPSE), so rows
// curve and the top rim is an ellipse.
//
// The front moves left to right (finished stitches leave on the right). The needle tip travels over the
// front stitches and the tube turns in eased steps: every s = clamp(round(n/10), 4, 6) sts on a circular,
// once per DPN on DPNs. Flat sections (a heel flap, the Argyle leg, the Dog Sweater's back) freeze the tube
// with the section at the front and use the flat needle logic and the squash turn.
import { ZERO_HEIGHT_STEPS } from './chart.js';
import { getSprite, yarnColorAt, palette, hash, typeInfo } from './stitches.js';
import { drawNeedle, drawLoop, drawMarker, drawStrand, NEEDLE_STYLES, MARKER_STYLES } from './work.js';

const TAU = Math.PI * 2;
export const ELLIPSE = 0.15; // how far we look down on the tube: the rim's depth, as a share of its radius
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wrapS = (x) => x - Math.round(x); // to [-0.5, 0.5]
const easeIO = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
export const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const WASTES = ['#3fb6c8', '#f07a3a', '#e8c547', '#d94f8a']; // bright scraps of waste yarn
const hexRgb = (h) => { const v = parseInt(String(h).replace('#', '').slice(0, 6), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const CUP_S = 0.42; // a folded heel's rows, squashed: the cup curves away from us
const CUP_BULGE = 0.14; // how far the heel cup stands out from the tube at its middle
const SHEAR_ROWS = 3; // the rows over which a level bottom edge rises into the helix

// ---------------------------------------------------------------- the geometry (per chart, pure)

export class RoundGeo {
  constructor(ch) {
    this.ch = ch;
    const H = ch.height, W = ch.width;
    const rows = [null];
    for (let r = 1; r <= H; r++) {
      const R = ch.row(r);
      const zero = !!(R.step && ZERO_HEIGHT_STEPS.has(R.step.kind));
      const cells = ch.cells(r) || [];
      const geo = [], all = [];
      if (!zero) for (let c = 0; c < W; c++) if (cells[c]) { all.push(c); if (cells[c].s !== '-') geo.push(c); }
      rows.push({ r, zero, step: R.step ? R.step.kind : null, round: !!R.round, flat: R.flat || null, geo, all, g: 0 });
    }
    this.rows = rows;
    this.firstRow = ch.firstRow || 1;
    // the seam (the Argyle leg): the flat range just below it is a leg that curls into a tube as it is seamed
    this.seam = null;
    for (let r = 1; r <= H; r++) if (rows[r].step === 'seam') {
      const f = ch.flatRanges.find((x) => x.to === r - 1) || null;
      if (f) this.seam = { row: r, from: f.from, to: f.to, taps: ch.row(r).map.length };
    }
    // the thumb (a mitten): a 'thumb' set-up round starts group 1, a small tube at the hand's side
    this.groups = [{ g: 0 }];
    for (let r = 1; r <= H; r++) if (rows[r].step === 'thumb') {
      const sec = ch.sectionAt(r);
      const to = sec && sec.from <= r ? sec.to : H;
      for (let rr = r; rr <= to; rr++) rows[rr].g = 1;
      let hold = r - 1; while (hold >= 1 && rows[hold].step !== 'hold') hold--;
      this.groups.push({ g: 1, from: r, to, hold: Math.max(1, hold) });
      break;
    }
    // flat ranges: their frame (the tube they sit on) and the worked centre, which faces the front
    this.flats = ch.flatRanges.map((f) => {
      const set = new Set();
      let b = f.from - 1; while (b >= 1 && rows[b].zero) b--;
      if (b >= 1 && !rows[b].flat) rows[b].geo.forEach((c) => set.add(c));
      for (let r = f.from; r <= f.to; r++) rows[r].all.forEach((c) => set.add(c));
      const frame = [...set].sort((x, y) => x - y);
      const pos = new Map(frame.map((c, j) => [c, j]));
      // the circular mean of the worked (not held) cells' positions
      let sx = 0, sy = 0;
      for (let r = f.from; r <= f.to; r++) for (const c of rows[r].geo) { const a = TAU * (pos.get(c) + 0.5) / frame.length; sx += Math.cos(a); sy += Math.sin(a); }
      const uC = ((Math.atan2(sy, sx) / TAU) + 1) % 1;
      const leg = !!(this.seam && this.seam.from === f.from);
      // the heel cup: a flat range that holds stitches (the instep waits while the flap and turn are knit)
      // with rounds after it. Once the rounds go on, its rows fold into a cup at the back of the tube
      // and the rounds above sit straight on the leg (as the instep does), so the tube stays whole
      let cup = null;
      let held = false;
      for (let r = f.from; r <= f.to && !held; r++) if (!rows[r].zero) for (const c of rows[r].all) if (ch.cell(r, c).s === '-') { held = true; break; }
      let after = false;
      for (let r = f.to + 1; r <= H; r++) if (!rows[r].zero && !rows[r].flat) { after = true; break; }
      if (held && after && !leg && b >= 1) { const J = ch.yOf(b); cup = { J, hY: ch.yOf(f.to) - J }; }
      return { ...f, frame, pos, uC, leg, cup, below: b };
    });
    // bands: consecutive drawn rows with the same group, mode and projection ring
    this.bands = [];
    let last = null;
    for (let r = 1; r <= H; r++) {
      const o = rows[r];
      if (o.zero) continue;
      const fl = o.flat ? this.flats.find((x) => r >= x.from && r <= x.to) : null;
      const mode = fl ? (fl.leg ? 'leg' : 'frozen') : 'round';
      const cols = fl ? fl.frame : o.geo;
      const pair = fl && fl.leg ? Math.floor((r - fl.from) / 2) : -1; // the leg closes 2 rows a seam tap
      // a short row of a heel turn (worked stitches with gaps between them in the frame: decreases' filler,
      // the held sides) closes up round its middle, at the frame's spacing
      let pos = fl ? fl.pos : new Map(cols.map((c, j) => [c, j])), own = '';
      if (fl && !fl.leg && o.geo.length) {
        const ps = o.geo.map((c) => fl.pos.get(c)).sort((a, b) => a - b);
        const N = fl.frame.length;
        // unwrap round the cut: start after the widest empty stretch
        let gapAt = 0, gapW = -1;
        for (let k = 0; k < ps.length; k++) { const nx = k + 1 < ps.length ? ps[k + 1] : ps[0] + N; if (nx - ps[k] > gapW) { gapW = nx - ps[k]; gapAt = k + 1; } }
        const un = ps.slice(gapAt).concat(ps.slice(0, gapAt).map((x) => x + N));
        const span = un[un.length - 1] - un[0] + 1;
        if (span > un.length) {
          const mid = (un[0] + un[un.length - 1]) / 2;
          const byPos = new Map(o.geo.map((c) => [fl.pos.get(c), c]));
          pos = new Map(fl.frame.map((c, j) => [c, j]).filter(([c]) => !o.geo.includes(c)));
          un.forEach((x, k) => pos.set(byPos.get(x % N), (((mid - (un.length - 1) / 2 + k) % N) + N) % N));
          own = '|own' + r;
        }
      }
      const key = `${o.g}|${mode}|${pair}|${cols.join(',')}${own}`;
      if (!last || last.key !== key) {
        last = { i: this.bands.length, key, ra: r, rb: r, g: o.g, mode, cols: own ? o.geo.slice() : cols, pos, n: fl ? fl.frame.length : cols.length, fl, pair };
        this.bands.push(last);
      } else last.rb = r;
      o.band = last.i;
    }
    // zero-height rows take the band below (the join: the first band)
    let bi = this.bands.length ? 0 : -1;
    for (let r = 1; r <= H; r++) { if (rows[r].zero) rows[r].band = bi; else bi = rows[r].band; }
    this.groupFirst = new Map();
    for (const b of this.bands) if (!this.groupFirst.has(b.g)) this.groupFirst.set(b.g, b.ra);
    // a round band over the cast-on, or over a band with no helix (a seamed leg), keeps a level bottom
    for (const b of this.bands) {
      b.shear = null;
      if (b.mode !== 'round') continue;
      if (this.groupFirst.get(b.g) === b.ra) { b.shear = ch.yOf(b.ra) - 1; continue; }
      let pb = b.i - 1; while (pb >= 0 && (this.bands[pb].g !== b.g || (this.bands[pb].fl && this.bands[pb].fl.cup))) pb--;
      if (pb >= 0 && this.bands[pb].mode !== 'round') b.shear = ch.yOf(b.ra) - 1;
    }
    this.maxN = [0, 0];
    for (const b of this.bands) this.maxN[b.g] = Math.max(this.maxN[b.g], b.n);
    // the thumb's place: beside the hand, its first row on the hold row's top
    const th = this.groups[1];
    if (th) {
      let base = th.hold - 1; while (base >= 1 && rows[base].zero) base--;
      th.base = base;
      const hb = this.bands[rows[base].band];
      const heldCols = ch.row(th.from).map.filter((e) => e.takes.length).map((e) => e.col);
      let sx = 0, sy = 0;
      for (const c of heldCols) { const j = hb.pos.get(c); if (j == null) continue; const a = TAU * (j + 0.5) / hb.n; sx += Math.cos(a); sy += Math.sin(a); }
      th.uGap = ((Math.atan2(sy, sx) / TAU) + 1) % 1;
      th.dy = ch.yOf(base) - (ch.yOf(th.from) - 1);
      // touching the hand's side at the hold row, overlapping it a little (the pick-ups join them)
      th.rHand = hb.n / TAU;
      th.axis = th.rHand + (this.maxN[1] / TAU) * 0.55;
    }
  }
  band(r) {
    if (r < 1) return this.bands[0];
    const o = this.rows[Math.min(r, this.ch.height)];
    return this.bands[o.band] || this.bands[0];
  }
  // the world y (rows from the cast-on edge) of the top of row r; rows below the first are the cast-on edge
  topY(r) { return r < this.firstRow ? this.ch.yOf(this.firstRow) - 1 : this.ch.yOf(r); }
  // DPN groups of row r: [k0, k1) ranges over its map, from the needles' counts scaled to the row
  dpnGroups(r) {
    const ch = this.ch, R = ch.row(r), m = R.map.length;
    let nd = ch.needleAt(r);
    if (!nd || nd.kind !== 'dpn') return null;
    if (!nd.n) { const L = (ch.def.needles || []).filter((x) => x.from <= r && x.kind === 'dpn' && x.n); nd = L[L.length - 1] || { n: 3 }; }
    const N = nd.n || 3;
    const counts = nd.counts && nd.counts.length === N ? nd.counts : new Array(N).fill(1);
    const tot = counts.reduce((a, b) => a + b, 0);
    const out = [];
    let acc = 0, k0 = 0;
    for (let i = 0; i < N; i++) { acc += counts[i]; const k1 = i === N - 1 ? m : Math.round((m * acc) / tot); if (k1 > k0) out.push([k0, k1]); k0 = Math.max(k0, k1); }
    return out;
  }
  needleKind(r) { const nd = this.ch.needleAt(Math.max(1, r)); return nd ? nd.kind : 'circular'; }
}

// ---------------------------------------------------------------- the view (per Work)

export class RoundView {
  constructor(work, chart) {
    this.w = work;
    this.ch = chart;
    this.geo = new RoundGeo(chart);
    this.tw = new Map(); // tweens: key -> {from, to, t0, dur, v}
    this.bufs = [null, null, null];
    this.small = null;
    this.drawCalls = 0;
    this.events = []; // step animations: {kind, t0, ...}
    this.fp = [null, null]; // displayed frontPos per group
  }

  dispose() { for (const c of [...this.bufs, this.small]) if (c) { c.width = 0; c.height = 0; } this.bufs = [null, null, null]; this.small = null; }

  // ---- tweens
  _tween(key, target, dur, t, wrapTurns = false) {
    let o = this.tw.get(key);
    if (!o) { o = { from: target, to: target, t0: t, dur: 1, v: target }; this.tw.set(key, o); return target; }
    if (o.to !== target) {
      let from = o.v;
      if (wrapTurns) from = target + wrapS(from - target); // the short way round
      o.from = from; o.to = target; o.t0 = t; o.dur = reduceMotion() ? 0 : dur;
    }
    const p = o.dur > 0 ? (t - o.t0) / o.dur : 1;
    o.v = p >= 1 ? o.to : lerp(o.from, o.to, easeIO(p));
    return o.v;
  }
  _tweening(t) { for (const o of this.tw.values()) if (o.v !== o.to || t - o.t0 < o.dur) return true; return false; }

  // ---- state at the next stitch
  _cur() {
    const ch = this.ch, w = this.w;
    const i = Math.min(w.done, ch.total - 1);
    const L = ch.locate(i);
    const fin = w.done >= ch.total;
    return { i, L, r: L.r, k: fin ? L.k + 1 : L.k, R: ch.row(L.r), o: this.geo.rows[L.r], fin };
  }
  // the front position each group wants (in turns of its own ring), and why
  _targets() {
    const geo = this.geo, ch = this.ch, cur = this._cur();
    const { r, R, o } = cur;
    let k = cur.k;
    const out = { 0: 0.5, 1: 0.5, dur0: 220, dur1: 220 };
    const g = o.g;
    const st = o.step;
    const posU = (b, c) => { const j = b.pos.get(c); return j == null ? null : (j + 0.5) / b.n; };
    const meanU = (b, cols) => {
      let sx = 0, sy = 0, any = false;
      for (const c of cols) { const u = posU(b, c); if (u == null) continue; sx += Math.cos(TAU * u); sy += Math.sin(TAU * u); any = true; }
      return any ? ((Math.atan2(sy, sx) / TAU) + 1) % 1 : null;
    };
    let u = null, dur = 220;
    const fl = o.flat ? geo.flats.find((x) => r >= x.from && r <= x.to) : null;
    if (geo.seam && st === 'seam') { u = this.w.done > ch.rowStart(r) ? 0 : 0.5; dur = 380; }
    else if (fl && fl.leg) u = 0.5;
    else if (fl) { u = fl.uC; dur = 520; }
    else if (st === 'join') u = 0;
    else if (st === 'hold' || st === 'graftUnderarm') {
      const e = R.map[Math.min(k, R.map.length - 1)];
      const b = geo.band(r - 1);
      const cols = st === 'hold' ? (R.map[Math.min(k, R.map.length - 1)].col != null ? heldGroup(ch, r, e) : []) : [e.col];
      u = meanU(b, cols.length ? cols : [e.col]); dur = 420;
    } else if (st === 'graft') {
      const b = geo.band(r - 1);
      u = meanU(b, R.map.map((e) => e.col)); dur = 420;
    } else if (st === 'gather') {
      const b = geo.band(r - 1);
      u = this.fp[g] != null ? this.fp[g] : meanU(b, R.map.map((e) => e.col));
    } else {
      // a round: the needle tip travels, the tube turns in steps
      const b = geo.band(r);
      const m = R.map.length;
      if (cur.fin) k = m - 1;
      k = clamp(k, 0, m - 1);
      const kind = geo.needleKind(r);
      const groups = kind === 'dpn' ? geo.dpnGroups(r) : null;
      const cols = [];
      if (groups) {
        const gi = groups.findIndex(([a, z]) => k >= a && k < z);
        const [a, z] = groups[Math.max(0, gi)];
        for (let q = a; q < z; q++) cols.push(R.map[q].col);
        dur = 320;
      } else {
        const s = reduceMotion() ? Math.max(1, Math.round(b.n / 4)) : clamp(Math.round(b.n / 10), 4, 6);
        const k0 = Math.floor(k / s) * s;
        for (let q = k0; q < Math.min(m, k0 + s); q++) cols.push(R.map[q].col);
      }
      u = meanU(b, cols);
      // a round's first stitches: a ring narrower than the one below still turns by its own ring
    }
    if (u == null) u = this.fp[g] != null ? this.fp[g] : 0.5;
    out[g] = u; out['dur' + g] = dur;
    if (g === 1) out[0] = (geo.groups[1].uGap - 0.25 + 1) % 1; // the hand turns its thumb gap to the side
    return out;
  }

  // per-frame update of the animated values; returns busy
  update(t) {
    const tg = this._targets();
    for (const g of [0, 1]) this.fp[g] = this._tween(`f${g}`, tg[g], tg['dur' + g], t, true);
    // the join curls the cast-on into a ring; the seam curls the leg
    const geo = this.geo, ch = this.ch, done = this.w.done;
    this.joinPhi = this._tween('join', ch.stepAt(1) && ch.stepAt(1).kind === 'join' && done === 0 ? 0.93 : 1, 420, t);
    if (geo.seam) {
      const k = clamp(done - ch.rowStart(geo.seam.row), 0, geo.seam.taps);
      this.seamK = k;
      this.legPhi = this._tween('leg', k > 0 ? 1 : 0, 380, t);
      for (let p = 0; p < 32; p++) {
        const closed = k >= geo.seam.taps || p < k;
        this._tween('gap' + p, k > 0 && !closed ? 0.1 : 0, 300, t);
      }
    }
    const live = this._liveRow();
    for (const fl of geo.flats) if (fl.cup) fl.cupK = this._tween('cup' + fl.from, live > fl.to ? 1 : 0, 650, t);
    this.knots = [this._knotsOf(0), this._knotsOf(1)];
    const busy = this._tweening(t) || this.events.some((e) => t - e.t0 < (e.dur || 500));
    this.events = this.events.filter((e) => t - e.t0 < (e.dur || 500) + 50);
    return busy;
  }

  // the band's parameters this frame
  params(b) {
    const geo = this.geo;
    let phi = 1, gap = 0;
    if (b.mode === 'leg') { phi = Math.max(this.legPhi ?? 0, 0); const o = this.tw.get('gap' + b.pair); gap = o ? o.v : 0; }
    if (b.ra === geo.firstRow && b.g === 0) phi = Math.min(phi, this.joinPhi ?? 1);
    const g = b.g, n = b.n;
    const uf = this.fp[g] ?? 0.5;
    const axis = g === 1 ? geo.groups[1].axis : 0;
    const gdy = g === 1 ? geo.groups[1].dy : 0;
    const phiE = Math.max(phi, 0.02), Rc = n / (TAU * phiE);
    return { b, n, phi, phiE, gap, uf, axis, gdy, Rc, lift: b.mode === 'round' };
  }
  // angle of ring position jf (fractional) in band params P; 0 = the front, + to the right
  theta(P, jf) {
    const u = jf / P.n;
    if (P.phi >= 0.999 && P.gap === 0) return TAU * wrapS(u - P.uf);
    const s = u - 0.5; // the piece's middle (a leg, an unjoined cast-on) is position n/2
    const th = TAU * s * P.phiE * (1 - P.gap) + clamp((P.phi - 0.3) / 0.5, 0, 1) * TAU * wrapS(0.5 - P.uf);
    return P.phi > 0.5 ? TAU * wrapS(th / TAU) : th; // (−π, π] once it is a ring
  }
  xc(P, th) { return P.axis + P.Rc * Math.sin(th); }
  liftOf(P, j) { return P.lift ? P.phi * (P.n - 1 - j) / P.n : 0; }
  // the helix lift at fabric height y: a band that starts the tube (over the cast-on) or sits on a band
  // with no helix (a seamed leg) keeps its bottom edge level, so the jog never steps the hem: the lift
  // grows over its lowest rows
  liftAt(P, j, y) {
    const v = this.liftOf(P, j);
    if (!v || P.b.shear == null) return v;
    return v * clamp((y - P.b.shear) / SHEAR_ROWS, 0, 1);
  }
  // the same at a fractional ring position jf (a strip's edge): the lift runs on smoothly round the
  // ring, so neighbouring strips (and the band above, whatever its count) meet without a step
  liftF(P, jf, y) {
    if (!P.lift) return 0;
    const v = P.phi * (P.n - 0.5 - jf) / P.n;
    return P.b.shear == null ? v : v * clamp((y - P.b.shear) / SHEAR_ROWS, 0, 1);
  }

  // ---- the vertical map (fabric y -> drawn y): a heel's flat rows fold into a cup once the rounds go on
  isCup(b) { return !!(b.fl && b.fl.cup); }
  mapY(b, y) {
    let d = 0;
    for (const fl of this.geo.flats) {
      const K = fl.cup ? fl.cupK || 0 : 0;
      if (!K || b.g !== 0) continue;
      if (b.fl === fl) return fl.cup.J + (y - fl.cup.J) * lerp(1, CUP_S, K) - K * fl.cup.hY * CUP_S + d; // (hanging below the rounds)
      if (b.ra > fl.to) d -= K * fl.cup.hY;
    }
    return y + d;
  }
  // the row a live loop at (r, c) was last knit on: held ('-') and empty cells pass it down
  lastKnit(r, c) {
    const ch = this.ch;
    for (let rr = r; rr >= 1; rr--) { const cl = ch.cell(rr, c); if (cl && cl.s !== '-') return rr; }
    return r;
  }
  // the drawn top of row r (rows below the first: the cast-on edge)
  wyTop(r) { return this.mapY(this.geo.band(r), this.geo.topY(r)); }
  // the radius knots of group g: each band's ring at its middle rows (both ends of a taller band), so the
  // radius runs smoothly from ring to ring and crowns and toes curve as domes and cones
  _knotsOf(g) {
    const geo = this.geo, ch = this.ch, K = [];
    for (const b of geo.bands) {
      if (b.g !== g || this.isCup(b) || b.mode === 'leg') continue;
      const P = this.params(b);
      if (P.phi < 0.999) continue;
      const y0 = this.mapY(b, ch.yOf(b.ra) - 1), y1 = this.mapY(b, ch.yOf(b.rb));
      if (y1 - y0 < 0.01) continue;
      // (a short band, a crown's or a gusset's, gives one knot at its middle, so a run of them makes an
      // even slope rather than steps; a tall one holds its ring to a row from either end)
      if (y1 - y0 >= 3.5) K.push({ y: y0 + 1, R: P.Rc }, { y: y1 - 1, R: P.Rc }); else K.push({ y: (y0 + y1) / 2, R: P.Rc });
    }
    return K.sort((a, b) => a.y - b.y);
  }
  // the tube's radius (stitch widths) for band b at drawn height yD (fabric height yF, for the cup)
  radiusAt(P, yD, yF) {
    const b = P.b;
    if (this.isCup(b)) {
      const fl = b.fl, K = fl.cupK || 0;
      return P.Rc * (1 + CUP_BULGE * K * Math.sin(Math.PI * clamp((yF - fl.cup.J) / fl.cup.hY, 0, 1)));
    }
    const kn = this.knots && this.knots[b.g];
    if (b.mode === 'leg' || P.phi < 0.999 || !kn || !kn.length) return P.Rc;
    if (yD <= kn[0].y) return kn[0].R;
    for (let i = 1; i < kn.length; i++) if (yD <= kn[i].y) { const a = kn[i - 1], z = kn[i]; return z.y - a.y < 1e-6 ? z.R : lerp(a.R, z.R, (yD - a.y) / (z.y - a.y)); }
    return kn[kn.length - 1].R;
  }

  // the frame's screen mapping
  _F(G) {
    const w = this.w, box = w._box();
    return { G, cx: box.x + box.w / 2, cy: box.y + box.h / 2, cp: G.cp, chh: G.ch, camX: w.cam.x, camY: w.cam.y, live: this._liveRow() };
  }
  X(F, xc) { return F.cx + (xc - F.camX) * F.cp; }
  Y(F, wy) { return F.cy + (F.camY - wy) * F.chh; }
  yE(F, P, th, R = P.Rc) { return P.phi < 0.05 ? 0 : -ELLIPSE * R * (1 - Math.cos(th)) * F.cp; }
  _liveRow() { const w = this.w, ch = this.ch; return w.done >= ch.total ? ch.height : ch.locate(w.done).r; }
  // screen point of the top-left (sub 0) .. top-right (sub 1) of the cell (r, c), with its angle
  cellTop(F, r, c, sub = 0.5) {
    const geo = this.geo, b = geo.band(r), P = this.params(b);
    const j = b.pos.get(c);
    if (j == null) return null;
    const th = this.theta(P, j + sub);
    const yF = geo.topY(r), yD = this.mapY(b, yF), lf = this.liftAt(P, j, yF), R = this.radiusAt(P, yD + lf, yF);
    return { x: this.X(F, P.axis + R * Math.sin(th)), y: this.Y(F, yD + lf + P.gdy) + this.yE(F, P, th, R), th, cos: P.phi > 0.6 ? Math.cos(th) : 1, P, j, w: Math.abs(Math.cos(th)) * F.cp, R };
  }

  // ---- the camera
  camTarget(zoomed, visC, visR) {
    const ch = this.ch, geo = this.geo, cur = this._cur();
    const g = cur.o.g;
    let x = g === 1 ? geo.groups[1].axis : 0;
    // (the piece's drawn height: a folded heel takes its rows out of the tube)
    const hY = this.mapY(geo.bands[geo.bands.length - 1] || geo.bands[0], ch.heightY ?? ch.height);
    let y = (hY + 1.8) / 2;
    if (g === 1 && !zoomed) x = geo.groups[1].axis / 2;
    // the thumb's view keeps the hand in it: the hand's far side stays a stitch inside the left edge
    if (g === 1) x = Math.min(x, Math.max(geo.groups[1].axis / 2, -geo.groups[1].rHand + visC / 2 - 1.2));
    if (zoomed) {
      const st = cur.o.step;
      let ry = this.wyTop(cur.r) + (cur.o.zero ? 1 : 0);
      if (st === 'graftUnderarm') ry = this.wyTop(geo.rows[cur.r].band >= 0 ? geo.band(cur.r - 1).rb : cur.r);
      const P = this.params(geo.band(cur.r));
      if (P.lift) { const e = cur.R.map[Math.min(cur.k, cur.R.map.length - 1)]; const j = e ? geo.band(cur.r).pos.get(e.col) : null; if (j != null) ry += this.liftAt(P, j, geo.topY(cur.r)); }
      y = ry - 0.2 + (g === 1 ? geo.groups[1].dy : 0);
      const top = hY + 2;
      y = clamp(y, Math.min(visR * 0.3, top - visR / 2), Math.max(visR * 0.3, top - visR / 2 + 0.5));
    }
    return { x, y };
  }
  visualWidth() {
    const geo = this.geo;
    const leg = geo.seam ? geo.bands.filter((b) => b.mode === 'leg').reduce((m, b) => Math.max(m, b.n), 0) : 0;
    const w0 = Math.max(geo.maxN[0] / Math.PI, leg && this.w.done <= this.ch.rowStart(geo.seam.row) ? leg : 0);
    return geo.groups[1] && this._cur().o.g === 1 ? geo.groups[1].axis + geo.maxN[1] / TAU + w0 / 2 : w0;
  }

  // ---- drawing
  _buf(i, F, clear = true) {
    const w = this.w, dpr = w.dpr;
    let c = this.bufs[i];
    const W = Math.round(w.vw * dpr), H = Math.round(w.vh * dpr);
    if (!c) { c = document.createElement('canvas'); this.bufs[i] = c; }
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; c._resized = true; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    // clear what was drawn last frame (its box), or all of it after a resize
    if (clear) { const b = c._bb; if (b && !c._resized) g.clearRect(Math.floor(b.x0 * dpr) - 2, Math.floor(b.y0 * dpr) - 2, Math.ceil((b.x1 - b.x0) * dpr) + 4, Math.ceil((b.y1 - b.y0) * dpr) + 4); else g.clearRect(0, 0, W, H); c._resized = false; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = true;
    return g;
  }

  // the strips of every band up to the live row: 'front' (the outside, front half) or 'back' (the top
  // rows' inside, seen over the front's rim). Each band is a closed ring of its own live stitches, evenly
  // round it; its radius runs smoothly from ring to ring (radiusAt), so a band is cut into horizontal
  // slices where the radius changes (crowns, toes, gussets) and drawn whole elsewhere. A heel's folded
  // rows (the cup) are drawn last, over the tube.
  _strips(gb, F, pass) {
    const f = this.w.fabric, ch = this.ch, geo = this.geo, live = Math.max(F.live, geo.firstRow);
    const curG = geo.rows[Math.min(ch.height, live)].g;
    const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const grow = (x0, y0, x1, y1) => { bb.x0 = Math.min(bb.x0, x0); bb.y0 = Math.min(bb.y0, y0); bb.x1 = Math.max(bb.x1, x1); bb.y1 = Math.max(bb.y1, y1); };
    const cy0 = (wy) => f.padT + (f.yT - wy) * f.H;
    const tg = gb;
    const list = geo.bands.filter((b) => b.ra <= live && !(b.g === 1 && curG !== 1));
    const order = pass === 'front' ? list.filter((b) => !this.isCup(b)).concat(list.filter((b) => this.isCup(b))) : list;
    for (const b of order) {
      const P = this.params(b);
      const cup = this.isCup(b) && (b.fl.cupK || 0) > 0.001;
      let rLo = b.ra, rHi = Math.min(b.rb, live);
      if (pass === 'back') { if (cup || P.phi < 0.6 || b.g !== curG) continue; if (b.mode !== 'leg' || !(this.seamK > 0 && this.seamK < (geo.seam ? geo.seam.taps : 0))) rLo = Math.max(rLo, live - 3); if (rLo > rHi) continue; }
      // the top: the live row's loops reach a little above it; under a band that may sit higher (a round
      // above a band with no helix) a row more fills the gap; otherwise a hair of overlap
      let nb = geo.bands[b.i + 1];
      while (nb && this.isCup(nb) && (nb.fl.cupK || 0) > 0.001) nb = geo.bands[nb.i + 1];
      const gapAbove = nb && nb.g === b.g && nb.mode === 'round' && b.mode !== 'round' && nb.shear == null;
      const topW = geo.topY(rHi) + (rHi >= live ? 0.6 : gapAbove ? 1.0 : cup ? 0 : 0.06);
      const first = geo.groupFirst.get(b.g) === b.ra && rLo === b.ra;
      // the bottom: the cast-on edge below the first band; other bands reach a little down over the band
      // below, so no hairline opens between them
      const botW = ch.yOf(rLo) - 1 - (first ? 1.6 : pass === 'front' && !cup ? 0.15 : 0);
      if (topW - botW < 0.02) continue;
      // the slices, in fabric y: [bot, top, R(top), R(bot)]
      const slices = this._slices(b, P, botW, topW, F, cup);
      // a flat band (a heel flap, its turn, the folded cup) draws only its own worked columns: the held
      // ones in its frame are empty there and would only hide the tube behind
      let cols = b.cols;
      if (b.mode === 'frozen') {
        const own = new Set();
        for (let r = rLo; r <= rHi; r++) for (const c of geo.rows[r].geo) own.add(c);
        cols = cols.filter((c) => own.has(c));
      }
      const fade = cup ? clamp(b.fl.cupK * 1.5, 0, 1) : 1;
      // each strip x slice is an affine quad: its corners sit on the tube (the radius at the slice's own
      // top and bottom, the helix lift and the rim's ellipse at the strip's own edges), so neighbours meet
      // edge to edge and the outline runs smoothly where the ring narrows. Each quad reaches one device
      // pixel right and down over its neighbours (drawn after it), so no antialiased seam opens; it is
      // shaded over all it drew (the fabric is opaque, so nothing under it is darkened twice)
      const quads = [];
      for (let j = 0; j < cols.length; j++) {
        const c = cols[j], jj = b.pos.get(c);
        const ta = this.theta(P, jj);
        const tb = P.phi >= 0.999 && P.gap === 0 ? ta + TAU / P.n : ta + TAU * wrapS((this.theta(P, jj + 1) - ta) / TAU);
        let fa = 0, fb = 1, edgeR = false;
        if (P.phi > 0.6) {
          // keep the front half (cos > 0) or the back half (cos < 0), clipping a strip at ±90°
          const ca = Math.cos(ta), cb = Math.cos(tb);
          const want = pass === 'front' ? 1 : -1;
          if (ca * want <= 0 && cb * want <= 0) continue;
          if (ca * want < 0 || cb * want < 0) {
            const edge = Math.sin((ta + tb) / 2) > 0 ? Math.PI / 2 : -Math.PI / 2;
            let te = edge; while (te < Math.min(ta, tb) - 1e-9) te += TAU; while (te > Math.max(ta, tb) + 1e-9) te -= TAU;
            const fe = clamp((te - ta) / (tb - ta), 0, 1);
            if (ca * want < 0) fa = fe; else { fb = fe; edgeR = true; }
            if (fb - fa < 0.004) continue;
          }
        }
        const t0 = lerp(ta, tb, fa), t1 = lerp(ta, tb, fb), tm = (t0 + t1) / 2;
        const sx = f.padX + (c - f.c0 + fa) * f.W, sw = (fb - fa) * f.W;
        // the tube's roundness: darker toward the sides, a soft lamp highlight up and to the left
        let shade = null;
        if (pass === 'front' && P.phi >= 0.15) {
          const sn = Math.sin(tm), cs = Math.max(0, Math.cos(tm));
          const dark = 0.58 * Math.pow(1 - cs, 0.85) * P.phi;
          const hl = Math.max(0, 1 - Math.abs(sn + 0.36) / 0.32) * 0.13 * P.phi;
          if (dark > 0.01 || hl > 0.01) shade = hl > dark ? `rgba(255,236,200,${(hl - dark * 0.5).toFixed(3)})` : `rgba(34,12,34,${dark.toFixed(3)})`;
        }
        quads.push({ c, jj, j0: jj + fa, j1: jj + fb, t0, t1, sx, sw, shade, edgeR, x: Math.sin(tm) });
      }
      // the right half is drawn right to left, so each strip's overlap always reaches toward the middle
      // and the outline's own strips are never overdrawn past the edge
      quads.sort((q1, q2) => (q1.x < 0 && q2.x < 0 ? q1.x - q2.x : q1.x >= 0 && q2.x >= 0 ? q2.x - q1.x : q1.x - q2.x));
      const dpr = this.w.dpr;
      // (the radius is the tube's at the height the corner is drawn, its helix lift included: past the
      // marker a column sits a row higher, and on a crown it must take the narrower ring there)
      const pt = (q, side, sl, top) => {
        const t = side ? q.t1 : q.t0, yF = top ? sl.top : sl.bot, yD = (top ? sl.dTop : sl.dBot) + this.liftF(P, side ? q.j1 : q.j0, yF);
        const R = this.radiusAt(P, yD, yF);
        return [this.X(F, P.axis + R * Math.sin(t)), this.Y(F, yD + P.gdy) + this.yE(F, P, t, R)];
      };
      if (fade < 1) tg.globalAlpha = fade;
      for (const sl of slices) {
        const sy0 = cy0(sl.top), sy1 = cy0(sl.bot), sh = sy1 - sy0;
        if (sh < 0.05) continue;
        const down = !(sl.first && first);
        for (const q of quads) {
          const TL = pt(q, 0, sl, true), TR = pt(q, 1, sl, true), BL = pt(q, 0, sl, false);
          let ax = TR[0] - TL[0], ay = TR[1] - TL[1];
          const cx = BL[0] - TL[0], cyy = BL[1] - TL[1];
          if (Math.abs(ax) < 0.02 || cyy < 0.02) continue;
          // one device pixel of overlap toward the tube's middle (the left half reaches right, the right
          // half left) and down: the quad is stretched by it (its own stitches, never a neighbour's
          // column, which in a decreased or held ring may be empty fabric). A quad is a parallelogram, so
          // where the radius changes down the slice its inner bottom corner misses the true one by a
          // little: the overlap grows by that much (the next strip, drawn after, covers it)
          const BR = pt(q, 1, sl, false), miss = Math.abs(BR[0] - (TR[0] + cx));
          const kx = 1 + (1 / dpr + miss) / Math.abs(ax);
          let ox0 = TL[0], oy0 = TL[1];
          if (q.x >= 0) { ox0 -= ax * (kx - 1); oy0 -= ay * (kx - 1); }
          ax *= kx; ay *= kx;
          const a = ax / q.sw, bq = ay / q.sw, cq = cx / sh, d = cyy / sh;
          // (down, the source itself runs on a pixel: the same column's fabric continues below)
          const ovy = down ? Math.min(sh, 1 / (d * dpr)) : 0;
          tg.setTransform(dpr * a, dpr * bq, dpr * cq, dpr * d, dpr * (ox0 - a * q.sx - cq * sy0), dpr * (oy0 - bq * q.sx - d * sy0));
          tg.drawImage(f.canvas, q.sx, sy0, q.sw, sh + ovy, q.sx, sy0, q.sw, sh + ovy);
          if (q.shade) {
            tg.globalCompositeOperation = 'source-atop';
            tg.fillStyle = q.shade;
            tg.fillRect(q.sx, sy0, q.sw, sh + ovy); // (its overlap too: it covers what was there)
            tg.globalCompositeOperation = 'source-over';
          }
          this.drawCalls++;
          const xs = [ox0, ox0 + ax, ox0 + cx, ox0 + ax + cx], ys = [oy0, oy0 + ay, oy0 + cyy + 1, oy0 + ay + cyy + 1];
          grow(Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 2);
        }
      }
      tg.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (fade < 1) tg.globalAlpha = 1;
    }
    const v = this.w;
    bb.x0 = Math.max(0, Math.floor(bb.x0)); bb.y0 = Math.max(0, Math.floor(bb.y0)); bb.x1 = Math.min(v.vw, Math.ceil(bb.x1)); bb.y1 = Math.min(v.vh, Math.ceil(bb.y1));
    return bb.x1 > bb.x0 && bb.y1 > bb.y0 ? bb : null;
  }
  // a band's horizontal slices between fabric heights bot and top: whole where the radius holds, cut
  // finer where it changes (about 3 px of radius a slice), each with its drawn heights and radius
  _slices(b, P, bot, top, F, cup) {
    const cuts = [bot, top], keep = new Set();
    const d0 = this.mapY(b, 0), s = cup ? (this.mapY(b, 1) - d0) : 1;
    const toF = (yD) => (yD - d0) / s;
    if (cup) { for (let y = Math.ceil(bot / 2) * 2; y < top; y += 2) if (y > bot) cuts.push(y); } // (its bulge, every two rows)
    else {
      const kn = this.knots && this.knots[b.g];
      // (a knot is cut where the unlifted and the fully lifted columns reach it: past the marker a column
      // is drawn up to a row higher, at the radius there)
      if (kn && b.mode !== 'leg' && P.phi >= 0.999) for (const k of kn) for (const yF of [toF(k.y), toF(k.y - (P.lift ? P.phi : 0))]) if (yF > bot && yF < top) cuts.push(yF);
      if (b.shear != null && P.lift) for (const yS of [b.shear, b.shear + SHEAR_ROWS]) if (yS > bot && yS < top) { cuts.push(yS); keep.add(yS); }
    }
    cuts.sort((a, z) => a - z);
    const out = [];
    const Rf = (yF, l = 0) => this.radiusAt(P, this.mapY(b, yF) + l, yF);
    const L = P.lift ? P.phi : 0;
    // (a cut where the radius runs straight on through it is dropped: fewer, taller slices)
    if (!cup) for (let i = cuts.length - 2; i >= 1; i--) {
      const a = cuts[i - 1], c = cuts[i], z = cuts[i + 1];
      if (z - a < 1e-6) { cuts.splice(i, 1); continue; }
      const t = (c - a) / (z - a);
      if (keep.has(c)) continue; // (where the helix starts to rise)
      if (Math.abs(lerp(Rf(a), Rf(z), t) - Rf(c)) * F.cp < 0.4 && Math.abs(lerp(Rf(a, L), Rf(z, L), t) - Rf(c, L)) * F.cp < 0.4) cuts.splice(i, 1);
    }
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], z = cuts[i + 1];
      if (z - a < 1e-4) continue;
      // where the radius changes a band is cut into slices of about 3 px of radius (lifted columns
      // included), so the outline bends smoothly
      const dR = Math.max(Math.abs(Rf(z) - Rf(a)), Math.abs(Rf(z, L) - Rf(a, L))) * F.cp;
      const n = clamp(Math.ceil(dR / 3), 1, 6);
      for (let q = 0; q < n; q++) {
        const sb = lerp(a, z, q / n), st = lerp(a, z, (q + 1) / n);
        out.push({ bot: sb, top: st, dBot: this.mapY(b, sb), dTop: this.mapY(b, st), Rb: Rf(sb), Rt: Rf(st) });
      }
    }
    if (out.length) out[0].first = true;
    return out;
  }

  draw(g, G, t) {
    const w = this.w, f = w.fabric;
    if (!f.canvas) return false;
    this.drawCalls = 0;
    const F = this._F(G);
    this.F = F;
    // back: the top rows' inside, darkened
    const gb1 = this._buf(0, F);
    const bb1 = this._strips(gb1, F, 'back');
    this.bufs[0]._bb = bb1;
    if (bb1) { gb1.save(); gb1.globalCompositeOperation = 'source-atop'; gb1.fillStyle = 'rgba(28,10,30,0.62)'; gb1.fillRect(bb1.x0, bb1.y0, bb1.x1 - bb1.x0, bb1.y1 - bb1.y0); gb1.restore(); }
    // front
    const gb2 = this._buf(1, F);
    const bb2 = this._strips(gb2, F, 'front');
    this.bufs[1]._bb = bb2;
    // copy just the drawn box of a buffer
    const blit = (dst, i, bb, k = 1) => { if (!bb) return; const d = w.dpr; dst.drawImage(this.bufs[i], bb.x0 * d, bb.y0 * d, (bb.x1 - bb.x0) * d, (bb.y1 - bb.y0) * d, bb.x0 * k, bb.y0 * k, (bb.x1 - bb.x0) * k, (bb.y1 - bb.y0) * k); };
    // compose: shadow, the inside, the far needles and loops, the tube, the near needles
    const dpr = w.dpr;
    if (!this.small) this.small = document.createElement('canvas');
    const sm = this.small, sw = Math.max(1, Math.round(w.vw / 10)), sh = Math.max(1, Math.round(w.vh / 10));
    if (sm.width !== sw || sm.height !== sh) { sm.width = sw; sm.height = sh; }
    const sg = sm.getContext('2d');
    sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, sw, sh);
    blit(sg, 1, bb2, sw / w.vw);
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgb(30,10,32)'; sg.fillRect(0, 0, sw, sh);
    this.drawCalls += 2;
    g.save();
    g.imageSmoothingEnabled = true;
    g.globalAlpha = 0.5; g.drawImage(sm, F.cp * 0.22, F.cp * 0.38, w.vw, w.vh);
    g.globalAlpha = 0.25; g.drawImage(sm, F.cp * 0.5, F.cp * 0.8, w.vw * 1.01, w.vh * 1.01);
    g.restore();
    blit(g, 0, bb1);
    this.drawCalls += 3;
    const nd = this.w.finished ? null : this._needleScene(F, t);
    if (nd) this._drawFar(g, F, nd, 'back', t);
    this._drawSleeveStubs(g, F);
    // the working yarn hangs from the newest loop on the right needle's tip: over the tube's side to a
    // ball on the right; to a ball on the left it drops in behind the work and comes out below it
    const S = w._strand;
    w._strandDrawn = S;
    const tw = Math.exp(-(t - w.anim.twitch) / 120) * Math.sin((t - w.anim.twitch) / 22) * F.cp * 0.35;
    // (in a step with no needle tip working, a gather or a graft, the strand keeps its route behind)
    const SO = S && !w.finished ? (nd && nd.tube ? this._strandOut(F, S) : S) : null;
    if (SO && SO === S) drawStrand(g, S, w.nextYarn, F.cp, tw);
    blit(g, 1, bb2);
    this.drawCalls++;
    if (SO && SO !== S) drawStrand(g, SO, w.nextYarn, F.cp, tw);
    else if (SO && nd && nd.tube) { const a = S.pts[0]; drawStrand(g, { ...S, pts: [a, { x: a.x + 0.08 * F.cp, y: a.y + 0.55 * F.chh }, { x: a.x + 0.05 * F.cp, y: a.y + 1.1 * F.chh }] }, w.nextYarn, F.cp, 0); }
    let busy = false;
    if (this.w.lightsOut) w._drawLightsOut(g, G);
    busy = this._drawPop(g, F, t) || busy;
    busy = this._drawSteps(g, F, t, 'under') || busy;
    if (nd) {
      this._drawFar(g, F, nd, 'front', t);
      if (nd.tube) w._drawNeedles(g, nd.G2, t, nd.tube);
      this._drawBOR(g, F, nd, t);
      if (nd.tube && nd.sleeve) this._drawSleeve(g, F, nd);
    }
    busy = this._drawSteps(g, F, t, 'over') || busy;
    return busy;
  }

  // a yoke's sleeves, once joined: a short tube out of each side at the joining round, toward the arm,
  // turning with the work (behind the body; the part on the near side shows past its edge)
  _drawSleeveStubs(g, F) {
    const geo = this.geo, ch = this.ch, w = this.w;
    if (this._joinRow === undefined) { this._joinRow = null; for (let r = 1; r <= ch.height; r++) if (geo.rows[r].step === 'joining') { this._joinRow = r; break; } }
    const jr = this._joinRow;
    if (!jr || F.live <= jr) return;
    const b = geo.band(jr), P = this.params(b), R0 = ch.row(jr);
    // the sleeves: runs of 'v' entries in the joining round
    const runs = [];
    for (const e of R0.map) { if (e.stitch !== 'v') continue; const last = runs[runs.length - 1]; if (last && last.k1 === e.k - 1) { last.cols.push(e.col); last.k1 = e.k; } else runs.push({ cols: [e.col], k0: e.k, k1: e.k }); }
    const yF = geo.topY(jr), yD = this.mapY(b, yF), R = this.radiusAt(P, yD, yF);
    for (const run of runs) {
      let sx = 0, sy = 0;
      for (const c of run.cols) { const j = b.pos.get(c); if (j == null) continue; const th = this.theta(P, j + 0.5); sx += Math.cos(th); sy += Math.sin(th); }
      const th = Math.atan2(sy, sx), sn = Math.sin(th);
      if (Math.abs(sn) < 0.3) continue;
      const dir = Math.sign(sn), vis = clamp((Math.abs(sn) - 0.3) / 0.4, 0, 1);
      const yarn = this._yarnAt(jr, run.cols[0]), Pc = palette(yarnColorAt(yarn, 0), yarn.type);
      const x0 = this.X(F, P.axis + R * 0.97 * sn), y0 = this.Y(F, yD + P.gdy) + this.yE(F, P, th, R) + 1.5 * F.chh;
      const ax = dir * Math.cos(0.8), ay = Math.sin(0.8), L = 2.8 * F.cp, rs = 1.45 * F.chh;
      const px = -ay, py = ax * dir * dir; // the perpendicular
      const e = { x: x0 + ax * L, y: y0 + ay * L };
      g.save(); g.globalAlpha = vis;
      const gr = g.createLinearGradient(x0 + px * rs, y0 + py * rs * dir, x0 - px * rs, y0 - py * rs * dir);
      gr.addColorStop(0, rgba(Pc.dark)); gr.addColorStop(0.35, rgba(Pc.light)); gr.addColorStop(0.7, rgba(Pc.base)); gr.addColorStop(1, rgba(Pc.deep));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x0 + px * rs, y0 + py * rs); g.lineTo(e.x + px * rs * 0.85, e.y + py * rs * 0.85);
      g.lineTo(e.x - px * rs * 0.85, e.y - py * rs * 0.85); g.lineTo(x0 - px * rs, y0 - py * rs); g.closePath(); g.fill();
      // its rows of stitches: soft Vs across the tube
      g.strokeStyle = rgba(Pc.deep, 0.45); g.lineWidth = Math.max(1, F.cp * 0.06);
      const nRows = Math.max(2, Math.round(L / (F.chh * 1.1)));
      for (let q = 1; q < nRows; q++) {
        const t = q / nRows, cx = x0 + ax * L * t, cy = y0 + ay * L * t, k = rs * (1 - 0.15 * t);
        g.beginPath(); g.moveTo(cx + px * k * 0.9, cy + py * k * 0.9); g.quadraticCurveTo(cx - ax * F.chh * 0.5, cy - ay * F.chh * 0.5, cx - px * k * 0.9, cy - py * k * 0.9); g.stroke();
      }
      // the cuff end: an open ellipse
      g.fillStyle = rgba(Pc.deep); g.beginPath(); g.ellipse(e.x, e.y, rs * 0.85, rs * 0.35, Math.atan2(py, px), 0, TAU); g.fill();
      g.restore();
      this.drawCalls += 3;
    }
  }

  // the strand's route on a tube: from the tip, out past the tube's right side a little below the needles,
  // then (as the flat route) down to the ball
  _strandOut(F, S) {
    const geo = this.geo, r = Math.min(this.ch.height, F.live), b = geo.band(r), P = this.params(b);
    const yF = geo.topY(r), R = this.radiusAt(P, this.mapY(b, yF), yF);
    const xR = this.X(F, P.axis + R) + 0.5 * F.cp;
    const a = S.pts[0], z = S.pts[S.pts.length - 1];
    if (a.x >= xR || z.x < xR) return S;
    const side = { x: xR, y: a.y + 1.6 * F.chh };
    const pts = [a, { x: lerp(a.x, xR, 0.6), y: a.y + 0.7 * F.chh }, side];
    const len = Math.hypot(z.x - side.x, z.y - side.y);
    if (len > F.cp * 2) pts.push({ x: (side.x + z.x) / 2, y: (side.y + z.y) / 2 + Math.min(len * 0.12, 36) });
    pts.push(z);
    return { ...S, pts };
  }

  // the new stitch pops in through the projection
  _drawPop(g, F, t) {
    const a = this.w.anim;
    if (!a.pop) return false;
    const ch = this.ch, f = this.w.fabric;
    const L = ch.locate(a.pop.i);
    const cl = ch.cell(L.r, L.entry.col);
    const yarn = this.w.yarns[a.pop.i];
    if (!cl || cl.s === 'x' || cl.s === 'o' || !yarn) return true;
    const p0 = this.cellTop(F, L.r, L.entry.col, 0), p1 = this.cellTop(F, L.r, L.entry.col, 1);
    if (!p0 || !p1 || p0.cos < 0.05) return true;
    const sp = getSprite(cl.s, yarn, f.W, hash(L.r, L.entry.col) & 3, yarnColorAt(yarn, a.pop.i));
    const pp = clamp((t - a.pop.t0) / a.pop.dur, 0, 1);
    const sc = 1.25 - 0.25 * ease(pp);
    const kx = Math.abs(p1.x - p0.x) / f.W, ky = F.chh / f.H;
    const x = Math.min(p0.x, p1.x), y = (p0.y + p1.y) / 2;
    const cxp = x + f.W * kx / 2, cyp = y + F.chh / 2;
    g.save();
    g.translate(cxp, cyp); g.scale(sc, sc); g.translate(-cxp, -cyp);
    g.globalAlpha = 0.9 * (1 - pp * 0.6);
    g.drawImage(sp.canvas, x - sp.ox * kx, y - sp.oy * ky, sp.canvas.width * kx, sp.canvas.height * ky);
    g.restore();
    this.drawCalls++;
    return true;
  }

  // ---- the needles
  // Everything the needles hold this frame: the near loops (on the tips, drawn by the flat needle code
  // through a local mapping), the rest (on the cable or the other DPNs), held loops, the marker.
  _needleScene(F, t) {
    const w = this.w, ch = this.ch, geo = this.geo;
    const st0 = w._stateForDrawing(t);
    const ns = st0.ns;
    if (!ns) return null;
    const r = ns.r, o = geo.rows[r], R = ch.row(r);
    const kind = geo.needleKind(r);
    const scene = { r, kind, far: [], chords: [], held: [], tube: null, G2: null, ns };
    // held loops (a spare needle or waste yarn), each at the row it was last knit
    const heldCols = (R.held || []).slice();
    if (o.zero && r > 1) for (const c of ch.row(r - 1).held || []) if (!heldCols.includes(c)) heldCols.push(c);
    for (const c of heldCols) {
      let rr = r - 1; while (rr >= 1) { const cl = ch.cell(rr, c); if (cl && cl.s !== '-') break; rr--; }
      if (rr < 1) continue;
      let waste = false; for (let q = rr + 1; q <= r; q++) if (geo.rows[q].step === 'hold') waste = true;
      scene.held.push({ r: rr, c, waste });
    }
    if (o.zero && o.step !== 'join') { scene.rim = this._liveLoops(r, ns); return scene; }
    const fl = o.flat;
    const b = geo.band(r);
    const P = this.params(b);
    const flatWork = !!fl || P.phi < 0.6;
    // the near loops and their rows
    const rowOf = new Map();
    let mapNs;
    if (flatWork) {
      mapNs = (n) => ({ ...n, rowOf: null });
    } else {
      const groups = kind === 'dpn' ? geo.dpnGroups(r) : null;
      const changeRound = kind === 'dpn' && geo.needleKind(r - 1) === 'circular' && ch.needleAt(r).from === r;
      this._nearLoops(ns, groups, changeRound, scene, true, o.step === 'join');
      mapNs = (n) => this._nearLoops(n, groups, changeRound, scene, false, o.step === 'join');
    }
    const G2 = this._localG(F, r, rowOf, scene);
    scene.G2 = G2;
    scene.tube = { map: mapNs, G2, rowOf, counterNo: ch.rowNo(r).unit === 'step' ? ch.rowNo(Math.max(1, r - 1)).n : ch.rowNo(r).n, dyS: (c, side) => G2.dyS(c, side), near: true };
    if (o.step === 'join') scene.tube.join = true;
    // the needles' far ends stay put just outside the tube (only the working tip travels as the tube
    // turns under it): the right needle rises to the right past the rim, the left lies along the rim
    if (!flatWork) {
      const yF = geo.topY(r), R = this.radiusAt(P, this.mapY(b, yF), yF);
      const xL = this.X(F, P.axis - R), xR = this.X(F, P.axis + R);
      const yT = G2.rowT(r);
      scene.tube.ends = { r: { x: xR + 3.4 * F.cp, y: yT - 1.5 * F.chh }, l: { x: xL - 1.5 * F.cp } };
    }
    // a joining round: the sleeve sts wait on a spare DPN beside the tip
    if (o.step === 'joining' && ns.next && ns.next.stitch === 'v') {
      let q = ns.k, n = 0; while (q < R.map.length && R.map[q].stitch === 'v') { q++; n++; }
      scene.sleeve = { n, slot: ns.next.slot };
    }
    return scene;
  }
  // round rows: the 4 loops each side of the tip go on the tips; DPN rows: the current needle's loops
  _nearLoops(n, groups, changeRound, scene, main, join = false) {
    const ch = this.ch, R = ch.row(n.r);
    const kL = n.left.slice().sort((a, b) => b - a); // next to knit first
    const made = R.map.slice(0, n.k).map((e) => e.col); // oldest first
    const leftRow = n.r - 1;
    const seq = kL.map((c) => ({ c, r: leftRow, side: 'L' })).concat(made.map((c) => ({ c, r: n.r, side: 'R' })));
    const L = seq.length;
    let nearL = [], nearR = [], far = [];
    if (groups && !changeRound) {
      // the current DPN: its stitches still to knit (left needle) and those knit onto the working one
      const gi = Math.max(0, groups.findIndex(([a, z]) => n.k >= a && n.k < z));
      const grpPrev = new Map(); // a loop of the row below -> the group whose entry takes it
      R.map.forEach((e) => { const gq = groups.findIndex(([a, z]) => e.k >= a && e.k < z); for (const tk of e.takes) grpPrev.set(R.prevCols[tk], gq); });
      const grpOf = (x) => (x.side === 'R' ? groups.findIndex(([a, z]) => R.map.findIndex((e) => e.col === x.c) >= a && R.map.findIndex((e) => e.col === x.c) < z) : grpPrev.get(x.c));
      const by = new Map();
      for (const x of seq) { const gq = grpOf(x); x.g = gq; if (gq === gi && !n.done) (x.side === 'L' ? nearL : nearR).push(x); else { if (!by.has(gq)) by.set(gq, []); by.get(gq).push(x); } }
      if (main) scene.chords = [...by.entries()].map(([gq, loops]) => ({ g: gq, loops }));
      if (nearL.length > 7) { if (main) { const extra = nearL.slice(7); scene.chordTail = extra; } nearL = nearL.slice(0, 7); }
    } else {
      const NL = Math.min(4, Math.floor(L / 2)), NR = Math.min(4, L - NL - 1);
      nearL = seq.slice(0, NL);
      nearR = NR > 0 ? seq.slice(L - NR) : [];
      far = seq.slice(NL, L - Math.max(0, NR));
      if (n.done || this.w.finished) { far = seq; nearL = []; nearR = []; }
      if (join && n.k === 0) { far = far.concat(nearR); nearR = []; } // before the join the right tip holds the last cast-on loop only
      if (join && n.k === 0 && far.length) { nearR = [far.pop()]; }
      if (changeRound && groups && main) {
        // the circular's stitches are dealt onto the DPNs: the knit ones sit on DPNs, the rest on the cable
        const kk = n.k;
        const gi = Math.max(0, groups.findIndex(([a, z]) => kk >= a && kk < z));
        const curStart = groups[gi][0];
        const onDpn = far.filter((x) => x.side === 'R' && R.map.findIndex((e) => e.col === x.c) < curStart);
        const dpnBy = new Map();
        for (const x of onDpn) { const q = R.map.findIndex((e) => e.col === x.c); const gq = groups.findIndex(([a, z]) => q >= a && q < z); if (!dpnBy.has(gq)) dpnBy.set(gq, []); dpnBy.get(gq).push(x); }
        scene.chords = [...dpnBy.entries()].map(([gq, loops]) => ({ g: gq, loops }));
        far = far.filter((x) => !onDpn.includes(x));
        // the working DPN holds every knit stitch of the current needle
        const curMade = made.slice(curStart).map((c) => ({ c, r: n.r, side: 'R' }));
        nearR = curMade.slice(-8);
      }
    }
    if (main) { scene.far = far; scene.seqLen = L; }
    const rowOf = new Map();
    for (const x of nearL) rowOf.set(x.c, x.r);
    for (const x of nearR) rowOf.set(x.c, x.r);
    const out = { ...n, left: nearL.map((x) => x.c), right: nearR.map((x) => x.c), rowOf, nearSide: new Map([...nearL.map((x) => [x.c, 'L']), ...nearR.map((x) => [x.c, 'R'])]) };
    if (main && scene.tube) scene.tube.rowOf = rowOf;
    if (main) scene.rowOf = rowOf;
    return out;
  }
  // the live loops on the needles during a step (no tip working): every loop not yet taken
  _liveLoops(r, ns) {
    const ch = this.ch, R = ch.row(r);
    const used = new Set();
    for (let k = 0; k < ns.k; k++) for (const tk of R.map[k].takes) used.add(tk);
    const held = new Set(ch.row(r - 1) ? ch.row(r - 1).held || [] : []);
    return R.prevCols.filter((c, i) => !used.has(i) && !held.has(c)).map((c) => ({ c, r: r - 1 }));
  }
  // a flat-looking local mapping around the tip for the flat needle code (CSS px)
  _localG(F, r, rowOf, scene) {
    const geo = this.geo, ch = this.ch, o = geo.rows[r];
    const self = this;
    const b = geo.band(r);
    const P = this.params(b);
    const ns = scene.ns;
    const tipCol = ns.next ? ns.next.col : null;
    let tipLift = 0, tipTh = 0;
    let tipR = P.Rc;
    if (tipCol != null) { const j = b.pos.get(tipCol); if (j != null) { tipLift = this.liftAt(P, j, geo.topY(r)); tipTh = this.theta(P, j + 0.5); } }
    { const yF = geo.topY(r); tipR = this.radiusAt(P, this.mapY(b, yF), yF); }
    const rowFor = (c) => {
      const rr = scene.rowOf && scene.rowOf.get(c);
      if (rr != null) return self.lastKnit(rr, c);
      return geo.band(r).pos.has(c) && ch.cell(r, c) ? r : self.lastKnit(r - 1, c);
    };
    const zeroTop = o.zero ? self.wyTop(r - 1) + 1 : null;
    const rowT = (rr) => {
      const wy = rr === r && zeroTop != null ? zeroTop : self.wyTop(rr);
      return self.Y(F, wy + tipLift + P.gdy) + self.yE(F, P, tipTh, tipR);
    };
    const pt = (c, sub) => { const p = self.cellTop(F, rowFor(c), c, sub); return p; };
    const G2 = {
      cp: F.cp, ch: F.chh, tube: true,
      colC: (c) => { const p = pt(c, 0.5); return p ? p.x : F.cx; },
      colL: (c) => { const p = pt(c, 0); return p ? p.x : F.cx; },
      rowT,
      // how far the fabric under a loop sits from the flat mapping (the rim's curve, the helix)
      dyS: (c, side) => {
        const rr = rowFor(c), p = self.cellTop(F, rr, c, 0.5);
        if (!p) return 0;
        const nom = side === 'R' ? r : r - 1;
        return p.y - rowT(nom);
      },
    };
    return G2;
  }

  // the far loops (on the cable or the other DPNs), held loops; pass 'back' or 'front'
  _drawFar(g, F, nd, pass, t) {
    const w = this.w, ch = this.ch, geo = this.geo;
    const style = NEEDLE_STYLES[w.needleStyle] || NEEDLE_STYLES.bamboo;
    const rad = Math.max(1.6, F.cp * 0.11);
    const want = (cos) => (pass === 'back' ? cos < 0 : cos >= 0);
    const loopAt = (x) => {
      const p = this.cellTop(F, this.lastKnit(Math.max(0, x.r), x.c), x.c, 0.5);
      if (!p) return null;
      const yarn = this._yarnAt(x.r, x.c);
      return { x: p.x, yN: p.y - 0.58 * F.chh, yS: p.y + 0.05 * F.chh, yarn, color: yarnColorAt(yarn, Math.max(0, w.fabric.idx(x.r, x.c))), cos: p.cos, th: p.th };
    };
    const drawLoops = (list, alpha = 1) => {
      g.save(); if (alpha < 1) g.globalAlpha = alpha;
      const k = pass === 'back' ? 0.8 : 1;
      for (const L of list) drawLoop(g, L, rad * k, F.cp * Math.max(0.35, Math.abs(L.cos)) * k, 'back');
      for (const L of list) drawLoop(g, L, rad * k, F.cp * Math.max(0.35, Math.abs(L.cos)) * k, 'front');
      g.restore();
    };
    // a step: every live loop on the rim, on DPNs or a parked circular
    if (nd.rim) {
      const loops = nd.rim.map(loopAt).filter(Boolean);
      const vis = loops.filter((L) => want(L.cos));
      if (nd.kind !== 'circular' || loops.length <= 14) this._chordsOf(g, F, nd.rim, loops, pass, style, rad, t);
      else this._cable(g, F, vis, pass, null, null);
      drawLoops(vis, pass === 'back' ? 0.75 : 1);
    } else {
      // the cable (a circular) through the far loops
      const far = nd.far.map(loopAt).filter(Boolean);
      if (nd.far.length && !(nd.kind === 'dpn' && !nd.chords.length && false)) {
        if (nd.kind !== 'dpn' || ch.needleAt(nd.r).from === nd.r) this._cable(g, F, far, pass, w._lastNeedle, nd);
      }
      drawLoops(far.filter((L) => want(L.cos)), pass === 'back' ? 0.75 : 1);
      // the other DPNs
      for (const C of nd.chords || []) {
        const loops = C.loops.map(loopAt).filter(Boolean);
        this._chord(g, F, loops, pass, style, rad, t);
      }
      if (nd.chordTail) { const loops = nd.chordTail.map(loopAt).filter(Boolean); this._chord(g, F, loops, pass, style, rad, t); }
    }
    // held stitches: a spare DPN or a bright scrap of waste yarn
    if (nd.held.length) {
      const runs = [];
      for (const h of nd.held) { const L = loopAt(h); if (!L) continue; L.waste = h.waste; L.h = h; const last = runs[runs.length - 1]; if (last && last.waste === h.waste && Math.abs(last.c1 - h.c) <= 1 && last.r === h.r) { last.loops.push(L); last.c1 = h.c; } else runs.push({ waste: h.waste, loops: [L], c1: h.c, r: h.r }); }
      for (const run of runs) {
        const vis = run.loops.filter((L) => want(L.cos));
        if (!vis.length) continue;
        if (run.waste) this._waste(g, F, vis, pass);
        else this._chord(g, F, run.loops, pass, style, rad, t);
        if (!run.waste) continue;
        drawLoops(vis, pass === 'back' ? 0.7 : 0.95);
        this._waste(g, F, vis, pass, true);
      }
    }
  }
  _yarnAt(r, c) {
    const w = this.w;
    if (r < this.geo.firstRow) return w.castOnYarn;
    const i = w.fabric.idx(r, c);
    return (i >= 0 && w.yarns[i]) || w.nextYarn;
  }
  // one DPN through its loops (a straight chord, a little past each end)
  _chord(g, F, loops, pass, style, rad, t) {
    if (!loops.length) return;
    const sorted = loops.slice().sort((a, b) => a.x - b.x);
    const mid = sorted[Math.floor(sorted.length / 2)];
    const cosM = loops.reduce((s, L) => s + L.cos, 0) / loops.length;
    if ((pass === 'back') !== (cosM < 0)) return;
    const a = sorted[0], z = sorted[sorted.length - 1];
    const dx = z.x - a.x, dy = z.yN - a.yN, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, ext = F.cp * 0.9;
    const p0 = { x: a.x - ux * ext, y: a.yN - uy * ext }, p1 = { x: z.x + ux * ext, y: z.yN + uy * ext };
    for (const L of loops) drawLoop(g, L, rad, F.cp * Math.max(0.35, Math.abs(L.cos)), 'back');
    g.save(); if (pass === 'back') g.globalAlpha = 0.8;
    drawNeedle(g, p0, p1, rad * (pass === 'back' ? 0.85 : 1), style, F.cp, t);
    g.restore();
    // the loops sit on the needle: snap their tops to its line
    for (const L of loops) { const q = (L.x - a.x) / (dx || 1); L.yN = lerp(a.yN, z.yN, clamp(q, 0, 1)); }
    for (const L of loops) drawLoop(g, L, rad, F.cp * Math.max(0.35, Math.abs(L.cos)), 'front');
    void mid;
  }
  _chordsOf(g, F, rim, loops, pass, style, rad, t) {
    // split the live loops into 3 or 4 runs (as the DPNs hold them) by angle
    const N = loops.length > 16 ? 4 : 3;
    const sorted = loops.slice().sort((a, b) => a.th - b.th);
    for (let i = 0; i < N; i++) {
      const part = sorted.slice(Math.round((i * sorted.length) / N), Math.round(((i + 1) * sorted.length) / N));
      if (part.length) this._chord(g, F, part, pass, style, rad, t);
    }
  }
  // a circular's nylon cable through loops, curving round the top behind the work
  _cable(g, F, loops, pass, ln, nd) {
    const pts = loops.slice().sort((a, b) => wrapS((a.th) / TAU) - wrapS((b.th) / TAU));
    if (pass === 'back') {
      // behind: the back loops, from one side round to the other (left side first)
      const back = pts.filter((L) => L.cos < 0).sort((a, b) => ((a.th + TAU) % TAU) - ((b.th + TAU) % TAU));
      if (!back.length) return;
      this._strokeCable(g, F, back.map((L) => ({ x: L.x, y: L.yN })), 0.75);
      return;
    }
    if (!ln) return;
    // in front: from each needle's end to the side, through the front far loops
    const right = pts.filter((L) => L.cos >= 0 && L.th > 0).sort((a, b) => a.th - b.th);
    const left = pts.filter((L) => L.cos >= 0 && L.th <= 0).sort((a, b) => b.th - a.th);
    const side = (sgn) => {
      const P = this.params(this.geo.band(nd.r));
      const th = sgn * Math.PI / 2;
      return { x: this.X(this.F, this.xc(P, th)), y: (sgn > 0 ? ln.rEnd.y : ln.lEnd.y) + this.yE(this.F, P, th) * 0.6 };
    };
    this._strokeCable(g, F, [ln.rEnd, ...right.map((L) => ({ x: L.x, y: L.yN })), side(1)], 1);
    this._strokeCable(g, F, [ln.lEnd, ...left.map((L) => ({ x: L.x, y: L.yN })), side(-1)], 1);
  }
  _strokeCable(g, F, pts, alpha) {
    if (pts.length < 2) return;
    const lw = Math.max(1.4, F.cp * 0.12);
    const path = (k) => {
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y + k);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        g.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6 + k, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6 + k, p2.x, p2.y + k);
      }
    };
    g.save(); g.globalAlpha = alpha; g.lineCap = 'round'; g.lineJoin = 'round';
    path(0); g.strokeStyle = 'rgba(60,40,50,0.55)'; g.lineWidth = lw * 1.5; g.stroke();
    path(0); g.strokeStyle = 'rgba(176,138,112,0.97)'; g.lineWidth = lw; g.stroke();
    path(-lw * 0.25); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = lw * 0.3; g.stroke();
    g.restore();
  }
  // the waste yarn: the bright scrap that stands out most from the piece's yarns (never teal on teal)
  _waste_() {
    if (this._wasteC) return this._wasteC;
    const ys = [this.w.castOnYarn, ...(this.w.yarns || []).slice(-60), this.w.nextYarn].filter(Boolean).map((y) => hexRgb(y.color));
    let best = WASTES[0], bd = -1;
    for (const c of WASTES) { const a = hexRgb(c); const d = Math.min(...ys.map((y) => Math.hypot(a[0] - y[0], a[1] - y[1], a[2] - y[2]))); if (d > bd) { bd = d; best = c; } }
    return (this._wasteC = best);
  }
  // a bright scrap of waste yarn through held loops (under them, or its two loose ends over)
  _waste(g, F, loops, pass, ends = false) {
    const pts = loops.slice().sort((a, b) => a.x - b.x).map((L) => ({ x: L.x, y: L.yN + F.chh * 0.08 }));
    if (!pts.length) return;
    const P = palette(this._waste_(), 'cotton');
    const lw = Math.max(1.6, F.cp * 0.16);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (pass === 'back') g.globalAlpha = 0.7;
    const a = pts[0], z = pts[pts.length - 1];
    const line = (k) => {
      g.beginPath();
      if (ends) { g.moveTo(a.x - F.cp * 0.45, a.y); g.quadraticCurveTo(a.x - F.cp * 0.8, a.y + F.chh * 0.3, a.x - F.cp * 0.7, a.y + F.chh * 0.9); g.moveTo(z.x + F.cp * 0.45, z.y); g.quadraticCurveTo(z.x + F.cp * 0.85, z.y + F.chh * 0.25, z.x + F.cp * 0.75, z.y + F.chh * 0.85); return; }
      g.moveTo(a.x - F.cp * 0.45, a.y + k);
      for (const p of pts) g.lineTo(p.x, p.y + k);
      g.lineTo(z.x + F.cp * 0.45, z.y + k);
    };
    for (const [c, wd, k] of [[rgba(P.deep, 0.9), lw * 1.35, 0], [rgba(P.base), lw, 0], [rgba(P.hi, 0.6), lw * 0.3, -lw * 0.2]]) { g.strokeStyle = c; g.lineWidth = wd; line(k); g.stroke(); }
    g.restore();
  }

  // the beginning-of-round marker: a charm on the needle between the round's last st and its first
  _drawBOR(g, F, nd, t) {
    const ch = this.ch, geo = this.geo, r = nd.r, o = geo.rows[r];
    if (o.flat || (o.zero && o.step !== 'join') || o.step === 'centre') return;
    const b = geo.band(r);
    const P = this.params(b);
    if (P.phi < 0.9 || b.mode !== 'round') return;
    const lo = b.cols[0], hi = b.cols[b.n - 1];
    const R = ch.row(r);
    const k = nd.ns.k;
    // on the left needle until the round's first stitch is knit, then on the right
    const onRight = k >= 1;
    const rr = onRight ? r : r - 1;
    const p = this.cellTop(F, rr, lo, 0) || this.cellTop(F, r, lo, 0);
    if (!p || p.cos < -0.15) return;
    const ln = this.w._lastNeedle;
    let y = p.y - 0.58 * F.chh;
    const nearOnNeedle = ln && Math.abs(p.x - (onRight ? ln.tip.x : ln.lTip.x)) < F.cp * 5;
    if (nearOnNeedle && ln) {
      // on a tip: follow the needle's line
      const A = onRight ? ln.tip : ln.lTip, B = onRight ? ln.rEnd : ln.lEnd;
      const q = (p.x - A.x) / ((B.x - A.x) || 1);
      if (q > -0.3 && q < 1.2) y = lerp(A.y, B.y, clamp(q, 0, 1));
    }
    const st = MARKER_STYLES[this.w.markerStyle] || MARKER_STYLES.ring;
    const bor = { ...st, ring: '#f6efe2', charm: st.charm || 'bead', color: st.charm ? st.color : '#d2405a', bor: true };
    const swing = this.w.anim.roundEnd ? Math.exp(-(t - this.w.anim.roundEnd) / 260) * Math.sin((t - this.w.anim.roundEnd) / 55) * 0.5 : 0;
    const rad = Math.max(1.6, F.cp * 0.11) * 1.35;
    g.save();
    g.globalAlpha = clamp(p.cos * 3 + 0.4, 0, 1);
    g.translate(p.x, y); g.rotate(swing); g.translate(-p.x, -y);
    drawMarker(g, p.x, y, rad, F.cp * 1.3, bor);
    g.restore();
    void hi; void R;
  }
  // the sleeve's stitches wait on a spare DPN, slid onto the circular one by one
  _drawSleeve(g, F, nd) {
    const ln = this.w._lastNeedle;
    if (!ln || !nd.sleeve) return;
    const style = NEEDLE_STYLES[this.w.needleStyle] || NEEDLE_STYLES.bamboo;
    const rad = Math.max(1.6, F.cp * 0.11);
    const n = nd.sleeve.n;
    const yarn = this.w.yarns[this.w.done - 1] || this.w.nextYarn;
    const a = { x: ln.lTip.x - F.cp * 0.3, y: ln.lTip.y + F.chh * 0.35 };
    const len = (n + 1.5) * F.cp * 0.72;
    const b = { x: a.x - len * 0.94, y: a.y + len * 0.34 };
    const loops = [];
    for (let i = 0; i < n; i++) { const q = (i + 0.8) / (n + 1.5); const x = lerp(a.x, b.x, q), y = lerp(a.y, b.y, q); loops.push({ x, yN: y, yS: y + F.chh * 0.9, yarn: this.w.nextYarn, color: this.w.nextYarn.color }); }
    for (const L of loops) drawLoop(g, L, rad, F.cp * 0.8, 'back');
    drawNeedle(g, a, b, rad, style, F.cp);
    for (const L of loops) drawLoop(g, L, rad, F.cp * 0.8, 'front');
    void yarn;
  }

  // ---- step animations (one per tap): the join's curl and chip, the hold's waste yarn, the gather, the
  // graft, the seam's ladder
  note(kind, info = {}) { this.events.push({ kind, t0: now(), dur: info.dur || 500, ...info }); this.w._kick(); }
  _drawSteps(g, F, t, layer) {
    const ch = this.ch, geo = this.geo, w = this.w;
    let busy = false;
    const cur = this._cur();
    // the gather: the threaded loops on the tail, a tapestry needle at the newest; the top cinches
    const gatherRow = this._stepRowNear('gather', cur);
    if (gatherRow && layer === 'over') busy = this._drawGather(g, F, t, gatherRow) || busy;
    const graftRow = this._stepRowNear('graft', cur) || this._stepRowNear('graftUnderarm', cur);
    if (graftRow && layer === 'over') this._drawGraft(g, F, t, graftRow);
    if (geo.seam && layer === 'under') this._drawSeam(g, F, t);
    // the hold: the waste yarn threads through (a short sweep)
    for (const e of this.events) {
      const p = (t - e.t0) / e.dur;
      if (p > 1) continue;
      busy = true;
      if (e.kind === 'join' && layer === 'over') {
        // a soft ring of light runs round the closing cast-on
        const b = geo.bands[0], P = this.params(b);
        g.save(); g.globalAlpha = Math.sin(Math.PI * p) * 0.7;
        g.strokeStyle = 'rgba(255,240,200,0.9)'; g.lineWidth = Math.max(1.5, F.cp * 0.12);
        g.beginPath();
        const y0 = this.Y(F, this.wyTop(geo.firstRow) - 1);
        for (let q = 0; q <= 24; q++) { const th = -Math.PI / 2 + Math.PI * q / 24; const x = this.X(F, this.xc(P, th)), y = y0 + this.yE(F, P, th); if (q) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke(); g.restore();
      }
      if (e.kind === 'hold' && layer === 'over') {
        const R = ch.row(e.r), entry = R.map[e.k];
        const cols = heldGroup(ch, e.r, entry);
        const loops = cols.map((c) => this.cellTop(F, e.r - 1, c, 0.5)).filter((x) => x && x.cos > 0).sort((a, b) => a.x - b.x);
        if (loops.length) {
          const P = palette(this._waste_(), 'cotton'), lw = Math.max(1.6, F.cp * 0.16);
          const upto = Math.max(1, Math.ceil(loops.length * ease(p * 1.4)));
          g.save(); g.lineCap = 'round';
          g.strokeStyle = rgba(P.base); g.lineWidth = lw;
          g.beginPath(); g.moveTo(loops[0].x - F.cp * 0.5, loops[0].y - 0.5 * F.chh);
          for (let q = 0; q < upto; q++) g.lineTo(loops[q].x, loops[q].y - 0.5 * F.chh - Math.sin(Math.PI * clamp(p * 1.5, 0, 1)) * F.chh * 0.4);
          g.stroke(); g.restore();
        }
      }
    }
    return busy;
  }
  // the step row being worked or just finished (for its overlay)
  _stepRowNear(kind, cur) {
    const ch = this.ch;
    const r = cur.r;
    if (this.geo.rows[r].step === kind && this.w.done > ch.rowStart(r)) return r;
    return null;
  }
  _drawGather(g, F, t, r) {
    const ch = this.ch, w = this.w, R = ch.row(r);
    const k = Math.min(R.map.length, w.done - ch.rowStart(r));
    const pts = [];
    for (let q = 0; q < k; q++) { const p = this.cellTop(F, r - 1, R.map[q].col, 0.5); if (p) pts.push(p); }
    if (!pts.length) return false;
    const yarn = w.yarns[ch.rowStart(r) + k - 1] || w.nextYarn;
    const P = palette(yarnColorAt(yarn, 0), yarn.type);
    const fin = k >= R.map.length;
    const cinch = fin ? clamp((t - (this._cinchT ?? (this._cinchT = t))) / 300, 0, 1) : 0;
    if (!fin) this._cinchT = null;
    const ax = this.X(F, this.params(this.geo.band(r - 1)).axis);
    const lw = Math.max(1.3, F.cp * 0.13 * typeInfo(yarn.type).thick);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const line = () => {
      g.beginPath();
      pts.forEach((p, i) => { const x = lerp(p.x, ax, cinch * 0.85), y = p.y - 0.35 * F.chh; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    };
    for (const [c, wd] of [[rgba(P.deep, 0.85), lw * 1.35], [rgba(P.base), lw], [rgba(P.hi, 0.5), lw * 0.35]]) { g.strokeStyle = c; g.lineWidth = wd; line(); g.stroke(); }
    // the tapestry needle at the newest loop (or the knot once cinched)
    const last = pts[pts.length - 1];
    if (!fin) {
      const style = { kind: 'metal', body: ['#6e737a', '#c9ced4', '#ffffff'], cap: 'disc' };
      drawNeedle(g, { x: last.x - F.cp * 0.2, y: last.y - 0.4 * F.chh }, { x: last.x + F.cp * 1.8, y: last.y - 1.6 * F.chh }, Math.max(1.2, F.cp * 0.07), style, F.cp * 0.6);
    } else {
      const ky = lerp(last.y, pts.reduce((s, p) => s + p.y, 0) / pts.length, 1) - 0.5 * F.chh;
      const rr = F.cp * (0.25 + 0.25 * cinch);
      const gr = g.createRadialGradient(ax - rr * 0.3, ky - rr * 0.3, 0, ax, ky, rr);
      gr.addColorStop(0, rgba(P.light)); gr.addColorStop(1, rgba(P.dark));
      g.fillStyle = gr; g.beginPath(); g.arc(ax, ky, rr, 0, TAU); g.fill();
    }
    g.restore();
    return fin && cinch < 1;
  }
  _drawGraft(g, F, t, r) {
    const ch = this.ch, w = this.w, R = ch.row(r), f = w.fabric;
    const k = Math.min(R.map.length, w.done - ch.rowStart(r));
    const under = R.step && R.step.kind === 'graftUnderarm';
    for (let q = 0; q < k; q++) {
      const e = R.map[q];
      let rr = r - 1; while (rr >= 1 && !(ch.cell(rr, e.col) && ch.cell(rr, e.col).s !== '-')) rr--;
      const p0 = this.cellTop(F, rr, e.col, 0), p1 = this.cellTop(F, rr, e.col, 1);
      if (!p0 || !p1 || p0.cos < 0.05) continue;
      const yarn = w.yarns[ch.rowStart(r) + q] || w.nextYarn;
      const sp = getSprite('k', yarn, f.W, (hash(r, e.col) & 3), yarnColorAt(yarn, 0));
      const kx = Math.abs(p1.x - p0.x) / f.W, ky = F.chh / f.H;
      const x = Math.min(p0.x, p1.x), y = (p0.y + p1.y) / 2 - F.chh * (under ? 0 : 1);
      g.drawImage(sp.canvas, x - sp.ox * kx, y - sp.oy * ky, sp.canvas.width * kx, sp.canvas.height * ky);
      this.drawCalls++;
    }
  }
  // the seam: a mattress-stitch ladder closes up the leg, two rows a tap
  _drawSeam(g, F, t) {
    const geo = this.geo, ch = this.ch, sm = geo.seam;
    const k = this.seamK || 0;
    if (!k) return;
    const b = geo.band(sm.from), P = this.params(b);
    if (P.phi < 0.9) return;
    const lo = b.cols[0], hi = b.cols[b.n - 1];
    const yarn = this.w.yarns[ch.rowStart(sm.row) + k - 1] || this.w.nextYarn;
    const Pc = palette(yarnColorAt(yarn, 0), yarn.type);
    const top = Math.min(sm.to, sm.from + 2 * k - 1);
    g.save(); g.lineCap = 'round';
    g.lineWidth = Math.max(1, F.cp * 0.08);
    for (let r = sm.from; r <= top; r++) {
      const a = this.cellTop(F, r, lo, 0), z = this.cellTop(F, r, hi, 1);
      if (!a || !z || a.cos < 0.2) continue;
      g.strokeStyle = rgba(Pc.dark, 0.5);
      g.beginPath(); g.moveTo(z.x, z.y + F.chh * 0.5); g.lineTo(a.x, a.y + F.chh * 0.5); g.stroke();
    }
    if (k < sm.taps) {
      const a = this.cellTop(F, top, lo, 0);
      if (a) {
        const style = { kind: 'metal', body: ['#6e737a', '#c9ced4', '#ffffff'], cap: 'disc' };
        drawNeedle(g, { x: a.x, y: a.y }, { x: a.x + F.cp * 1.6, y: a.y - F.chh * 2.2 }, Math.max(1.2, F.cp * 0.07), style, F.cp * 0.6);
      }
    }
    g.restore();
  }

  // ---- the ghost: the finished shape ahead, through the same projection
  drawGhost(g, G) {
    const F = this._F(G), geo = this.geo, ch = this.ch;
    const live = F.live;
    const curG = geo.rows[live].g;
    const L = [], Rr = [];
    let topPts = null;
    for (const b of geo.bands) {
      if (b.g !== curG && !(b.g === 0)) continue;
      if (b.g === 1 && curG !== 1) continue;
      const P = this.params(b);
      for (let r = b.ra; r <= b.rb; r++) {
        if (r < live - 1 && b.g === curG) continue;
        if (this.isCup(b) && (b.fl.cupK || 0) > 0.001) continue; // a folded heel is drawn as knit
        const yF = geo.topY(r), yD = this.mapY(b, yF), Rr = P.phi < 0.999 ? P.Rc : this.radiusAt(P, yD - 0.5, yF - 0.5);
        const yT = this.Y(F, yD + P.gdy), yB = this.Y(F, this.mapY(b, yF - 1) + P.gdy);
        const PR = { ...P, Rc: Rr };
        const xr = P.phi < 0.05 ? P.axis + P.n / 2 : P.axis + Rr;
        L.push({ g: b.g, xl: this.X(F, P.phi < 0.05 ? P.axis - P.n / 2 : P.axis - Rr), xr: this.X(F, xr), yT, yB, P: PR, r });
      }
    }
    if (!L.length) return;
    g.save();
    // a faint fill, row by row, curved with the rim
    g.beginPath();
    for (const s of L) {
      if (s.r <= live && s.g === curG) continue;
      const P = s.P, n = 10;
      for (let q = 0; q <= n; q++) { const th = -Math.PI / 2 + Math.PI * q / n; const x = this.X(F, this.xc(P, th)), y = s.yB + this.yE(F, P, th); if (q) g.lineTo(x, y); else g.moveTo(x, y); }
      for (let q = n; q >= 0; q--) { const th = -Math.PI / 2 + Math.PI * q / n; const x = this.X(F, this.xc(P, th)), y = s.yT + this.yE(F, P, th); g.lineTo(x, y); }
      g.closePath();
    }
    g.fillStyle = 'rgba(246,236,217,0.05)'; g.fill();
    // the outline: both sides, and the top rim of the last row
    g.beginPath();
    const groups = [...new Set(L.map((s) => s.g))];
    for (const gq of groups) {
      const S = L.filter((s) => s.g === gq && !(s.r <= live - 1 && gq === curG));
      if (!S.length) continue;
      for (const side of ['xl', 'xr']) {
        // a smooth side: through each row's middle, from the first row's bottom to the last row's top
        g.moveTo(S[0][side], S[0].yB);
        S.forEach((s) => g.lineTo(s[side], (s.yT + s.yB) / 2));
        g.lineTo(S[S.length - 1][side], S[S.length - 1].yT);
      }
      const last = S[S.length - 1], P = last.P;
      for (let q = 0; q <= 24; q++) { const th = -Math.PI / 2 + Math.PI * q / 24; const x = this.X(F, this.xc(P, th)), y = last.yT + this.yE(F, P, th); if (q) g.lineTo(x, y); else g.moveTo(x, y); }
      for (let q = 0; q <= 24; q++) { const th = Math.PI / 2 + Math.PI * q / 24; const x = this.X(F, this.xc(P, th)), y = last.yT + this.yE(F, P, th); if (q) g.lineTo(x, y); else g.moveTo(x, y); }
    }
    g.lineWidth = Math.max(1, Math.min(2, F.cp * 0.08));
    g.setLineDash([Math.max(2, F.cp * 0.18), Math.max(3, F.cp * 0.26)]);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(246,236,217,0.32)'; g.stroke();
    g.restore();
    void topPts; void Rr; void ch;
  }

  squashAxis() { const g = this._cur().o.g; return g === 1 ? this.geo.groups[1].axis : 0; }
  // the screen rect of a stitch (effects: sparkle row, twinkles, lights out), or null on the back
  cellRect(G, r, c) {
    const F = this.F && this.F.G === G ? this.F : this._F(G);
    const p0 = this.cellTop(F, r, c, 0), p1 = this.cellTop(F, r, c, 1);
    if (!p0 || !p1 || (p0.cos < 0.05 && p1.cos < 0.05)) return null;
    return { x: Math.min(p0.x, p1.x), y: (p0.y + p1.y) / 2, w: Math.abs(p1.x - p0.x), h: F.chh };
  }
  state() {
    const cur = this._cur(), b = this.geo.band(cur.r);
    return { frontPos: +(this.fp[cur.o.g] ?? 0).toFixed(3), ring: b ? b.n : null, band: b ? b.i : null, drawCalls: this.drawCalls, group: cur.o.g };
  }
}

// the columns a hold step's tap lifts onto waste yarn: the held run of the row above around its column
export function heldGroup(ch, r, e) {
  if (!e) return [];
  let up = r + 1; while (up <= ch.height && !(ch.row(up).held || []).length) up++;
  const held = up <= ch.height ? ch.row(up).held : [];
  const set = new Set(held);
  const W = ch.width;
  const out = [];
  // the contiguous run (round the marker too) that holds e.col or its nearest held column
  let start = e.col;
  if (!set.has(start)) { let best = null, bd = 1e9; for (const c of held) { const d = Math.min(Math.abs(c - e.col), W - Math.abs(c - e.col)); if (d < bd) { bd = d; best = c; } } if (best == null) return []; start = best; }
  out.push(start);
  for (let c = (start + 1) % W; set.has(c) && c !== start; c = (c + 1) % W) out.push(c);
  for (let c = (start - 1 + W) % W; set.has(c) && !out.includes(c); c = (c - 1 + W) % W) out.push(c);
  return out;
}
