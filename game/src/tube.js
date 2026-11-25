// tube.js — (Change 2, CHANGE_2.md E) round pieces as the objects they are: one shape map per kind maps a
// round chart's stitches onto a 3D tube, so the dolls, the preview card, the gallery peg, the finish and the
// knitting view's ghost all show a hat, a sock or a mitten as a true tube, never a flat swatch.
//
//   shapeOf(chart, pattern)        -> shape | null (null for a flat chart). Cached per chart.
//     shape.kind                   'dome' (hats; the pouch, tip down), 'ring' (headbands, ear warmer, cowls),
//                                  'sock', 'mitten' (mitts too), 'body' (the Yoke and Dog Sweaters)
//     shape.cells[]                {r, c, part, u0, u1, y0, y1, uf}: every drawn stitch cell. u (0..1 round the
//                                  tube, 0 at the marker at the back) comes from the cell's place in its row's ring;
//                                  y0..y1 is its row's span in the chart's row→y table. part: 'main' | 'thumb'
//     shape.F(u, y, part, pose)    -> [x, y, z, lit]: the tube in local units (1 = one stitch's width; x right,
//                                  y down; z > 0 toward the viewer; lit 0..1 the lamp on the surface there)
//     shape.anchors                {top (dome's gathered top / pouch's opening), heel, toe, thumb, cuff, ...}
//                                  in local units; shape.sw is 1 (local units are stitch widths)
//   fitPlace(shape, box, opts)     -> place: fits the object (both halves) into box {x, y, w, h} (screen px),
//                                  opts {align: 'bottom' | 'top' | 'centre', flip, pose, rot}. A place is
//                                  {s, sy, ox, oy, rot, flip, pose, tilt}: screen = R(rot)·(±s·x, s·sy·y) + (ox, oy)
//   toScreen(place, p)             local [x, y] -> screen [x, y]
//   drawTube(ctx, baked, shape, place, {half, dark, parts, only})
//                                  draws one half: 'back' (z < 0, darkened by `dark`, default 0.35, drawn first,
//                                  behind the doll or prop), 'front' (z >= 0) or 'all'. baked is a bake as worn.js
//                                  bakeChart makes it ({canvas, W, H, x0, y0, cols, rows, rowTop(r)?}: rowTop gives the
//                                  top of row r in the bake, else y0 + (rows - r)·H): each cell is cut from
//                                  it (the real stitch sprites) and laid on the tube under a small affine.
//                                  only(cell) -> bool leaves cells out (a piece in progress: its unknit back)
//   outline(shape, place, {half}) -> convex polygons in screen px, one per row band: filled together they are the
//                                  piece's silhouette (the knitting view's ghost, a card's soft shadow)
//   bounds(shape, place)           -> {x0, y0, x1, y1} screen px of the whole object
// Nothing here runs per frame: callers cache what they draw (worn.js layers, render.js object renders).

const TAU = Math.PI * 2;
const ROW = 0.72; // a row's height in stitch widths (as every renderer here)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const LIGHT = (() => { const v = [-0.42, -0.55, 0.72]; const l = Math.hypot(...v); return v.map((x) => x / l); })(); // from the upper left, in front

const cache = new WeakMap();
// how far above the piece we look from, per pose (a ring's ellipse: its minor/major axes)
const TILT = { worn: 0.2, cowl: 0.34, sleeve: 0.1, hang: 0.12, ring: 0.42, profile: 0.12, flat: 0 };

// ---------------------------------------------------------------- the shape (per chart)
// opts.asTube: map a flat chart as a seamless tube too (the Yoke Sweater's virtual sleeves)
export function shapeOf(chart, pattern, opts = {}) {
  if (!chart || !(chart.round || opts.asTube) || !Number.isFinite(chart.height)) return null;
  let s = cache.get(chart);
  if (s) return s;
  s = build(chart, pattern || chart.def || {});
  cache.set(chart, s);
  return s;
}

function kindOf(chart, pattern) {
  const k = (pattern && pattern.kind) || chart.def.kind;
  if (k) return k;
  const w = pattern && pattern.wear;
  if (w && w.slot === 'feet') return 'sock';
  if (w && w.slot === 'hands') return 'mitten';
  if (w && w.slot === 'body') return 'body';
  if (w && w.fit === 'dome') return 'dome';
  return 'ring';
}

function build(chart, pattern) {
  const kind = kindOf(chart, pattern);
  const H = chart.height, Wc = chart.width;
  const thumbSec = (chart.sections || []).find((x) => /^thumb$/i.test(x.label));
  const partOf = (r) => (thumbSec && r >= thumbSec.from ? 'thumb' : 'main');
  // the drawn cells of each row, and each row's ring positions
  const rows = [null];
  let lastRoundPos = null;
  for (let r = 1; r <= H; r++) {
    const h = chart.rowHeight(r);
    const cells = chart.cells(r) || [];
    const drawn = [];
    for (let c = 0; c < Wc; c++) { const cl = cells[c]; if (cl && cl.s !== '-') drawn.push(c); }
    const yTop = chart.yOf(r), yBot = yTop - h;
    const flat = chart.flatAt ? chart.flatAt(r) : null;
    const R = chart.row(r) || {};
    let pos = null, n = drawn.length;
    if (flat && lastRoundPos && !(flat.from <= chart.firstRow + 1 && flat.span >= n)) {
      // a flat range inside a round piece (a heel flap and its turn): its stitches stay where they sat on the leg
      pos = lastRoundPos;
      n = pos.n;
    } else if (drawn.length) {
      // ring order from the row's cut (rounds cut at 0, so u = 0 at the marker at the back)
      const cut = R.cut || 0;
      const order = drawn.slice().sort((a, b) => ((a - cut + Wc) % Wc) - ((b - cut + Wc) % Wc));
      const m = new Map(); order.forEach((c, j) => m.set(c, j));
      pos = { m, n: order.length, cut };
      if (!flat || flat.span >= order.length) lastRoundPos = pos;
    }
    rows.push({ r, h, yTop, yBot, drawn, pos, n, flat: !!flat, part: partOf(r), round: !!R.round, step: R.step ? R.step.kind : null });
  }
  // a heel's turn rows work fewer sts than the flap (their sides wait, unworked): spread them over the flap's
  // width, so the turned heel's cup is whole where it faces you
  const cen = (u) => ((((u + 0.5) % 1) + 1) % 1) - 0.5; // 0 at the marker (the back)
  let flapLo = null, flapHi = null, flapN = 0;
  for (const R of rows) {
    if (!R || !R.flat || !R.pos || R.pos.n === R.drawn.length || R.drawn.length < flapN) continue;
    const vs = R.drawn.map((c) => R.pos.m.get(c)).filter((j) => j != null).map((j) => cen((j + 0.5) / R.n));
    if (!vs.length) continue;
    flapN = R.drawn.length; flapLo = Math.min(...vs) - 0.5 / R.n; flapHi = Math.max(...vs) + 0.5 / R.n;
  }
  // each cell's u span
  const cells = [];
  const firstWorked = rows.find((x) => x && x.h > 0 && x.drawn.length);
  const lastWorked = [...rows].reverse().find((x) => x && x.h > 0 && x.drawn.length);
  const gathered = rows.some((x) => x && (x.step === 'gather' || x.step === 'graft') && x.part === 'main');
  for (let r = 1; r <= H; r++) {
    const R = rows[r];
    if (!R.h || !R.pos) continue;
    for (const c of R.drawn) {
      let j = R.pos.m.get(c);
      if (j == null) {
        // a column the reference ring doesn't have: put it beside its nearest neighbour that it does
        let best = null, bd = 1e9;
        for (const [cc, jj] of R.pos.m) { const d = Math.abs(cc - c); if (d < bd) { bd = d; best = jj + (c > cc ? 0.5 : -0.5); } }
        j = best ?? 0;
      }
      cells.push({ r, c, part: R.part, u0: j / R.n, u1: (j + 1) / R.n, y0: R.yBot, y1: R.yTop, bot: R === firstWorked, top: R === lastWorked && !gathered });
    }
    if (R.flat && flapN && R.drawn.length < flapN && R.pos.n !== R.drawn.length) {
      // side by side (no filler gaps), in ring order from the flap's edge
      const mine = cells.filter((x) => x.r === r).sort((p, q) => cen(p.u0 + 1e-9) - cen(q.u0 + 1e-9));
      const k = mine.length, w = (flapHi - flapLo) / k;
      mine.forEach((x, i) => { x.u0 = flapLo + i * w; x.u1 = x.u0 + w; }); // centred u (may be negative): the map is periodic
    }
  }
  const S = { kind, chart, pattern, rows, cells, W: Wc, H, gathered, anchors: {} };
  // the reference ring (the size most rounds have): radii are relative to it
  const nOf = (part) => {
    const cnt = new Map();
    for (const R of rows) if (R && R.h && R.part === part && R.n) cnt.set(R.n, (cnt.get(R.n) || 0) + R.drawn.length);
    let best = 0, bn = 1; for (const [n, v] of cnt) if (v > best) { best = v; bn = n; }
    return bn;
  };
  S.nRef = nOf('main');
  // a sweater's reference is its body below the yoke (the yoke's ring holds the sleeves too)
  if (kind === 'body' && firstWorked) S.nRef = firstWorked.n;
  // profiles per part: radius and axis length at row boundaries (in stitch widths)
  S.prof = {};
  for (const part of ['main', 'thumb']) {
    const list = rows.filter((R) => R && R.h > 0 && R.part === part && R.n);
    if (!list.length) continue;
    const ys = [list[0].yBot], rho = [], S0 = [0];
    const rr = list.map((R) => R.n / TAU);
    // rows' radii at boundaries: averages of the rows either side
    rho.push(rr[0]);
    for (let i = 0; i < list.length; i++) {
      ys.push(list[i].yTop);
      rho.push(i + 1 < list.length ? (rr[i] + rr[i + 1]) / 2 : rr[i]);
    }
    for (let i = 0; i < list.length; i++) {
      const dr = rho[i + 1] - rho[i];
      const len = ROW * list[i].h;
      // a row that narrows (a crown) lies over toward the axis: it rises less than its height
      S0.push(S0[i] + Math.sqrt(Math.max((len * 0.45) ** 2, len * len - dr * dr)));
    }
    S.prof[part] = { ys, rho, S: S0, y0: ys[0], y1: ys[ys.length - 1], nRef: part === 'main' ? S.nRef : nOf(part) };
  }
  setupKind(S);
  return S;
}

// piecewise-linear lookups on a part's profile
function at(P, key, y) {
  const ys = P.ys, a = P[key];
  if (y <= ys[0]) return a[0] + (key === 'S' ? (y - ys[0]) * ROW : 0);
  const n = ys.length - 1;
  if (y >= ys[n]) return a[n] + (key === 'S' ? (y - ys[n]) * ROW : 0);
  let lo = 0, hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ys[m] <= y) lo = m; else hi = m; }
  const t = ys[hi] > ys[lo] ? (y - ys[lo]) / (ys[hi] - ys[lo]) : 0;
  return lerp(a[lo], a[hi], t);
}

// ---------------------------------------------------------------- per kind
function setupKind(S) {
  const { kind, chart, rows } = S;
  const P = S.prof.main;
  if (!P) return;
  const rho0 = P.nRef / TAU;
  S.rho0 = rho0;
  const pid = (S.pattern && S.pattern.id) || '';
  if (kind === 'dome' && P.rho[P.rho.length - 1] < P.rho[0] * 0.6) {
    // a hat: its body rounds over the head and the crown closes to the gathered top (a superellipse dome; the
    // rings' own sizes still rule where they're smaller)
    const top = P.S[P.S.length - 1];
    P.rho = P.rho.map((r, i) => { const t = clamp(P.S[i] / top, 0, 1); return Math.min(r, rho0 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.6)), 1 / 2.6)); });
  }
  if (kind === 'sock') {
    // the heel: the flat range that isn't the leg (CHANGE_2 C.1 flat ranges); the bend runs from its first row's
    // bottom to its last row's top (heel flap and turn), then the set-up round starts the foot
    const fr = (chart.flatRanges || []).filter((f) => f.span < S.nRef || f.from > chart.firstRow + 1);
    const heel = fr[fr.length - 1];
    if (heel) { S.yA = chart.yOf(heel.from) - chart.rowHeight(heel.from); S.yB = chart.yOf(heel.to); } else { S.yA = P.y1 * 0.45; S.yB = S.yA + 6; }
    S.SA = at(P, 'S', S.yA); S.SB = at(P, 'S', S.yB);
    // the gusset: picked up along the flap's edges, so its first round hugs the heel's side and the leg's front,
    // and its rounds sweep forward to the foot's straight tube by the end of the gusset decreases
    const gs = (chart.sections || []).find((x) => /gusset/i.test(x.label) && x.from > (heel ? heel.to : 0));
    S.yG = gs ? chart.yOf(gs.to) : S.yB + 4;
    S.SG = Math.max(S.SB + 0.5, at(P, 'S', S.yG));
    S.legSeam = (chart.flatRanges || []).some((f) => f.from <= chart.firstRow + 1 && f.span >= S.nRef);
    S.view = 1;
  } else if (kind === 'mitten') {
    // the thumb (or the mitts' thumb hole) faces the side; the rest of the hand turns to the viewer
    let ug = 0.5;
    const hole = S.cells.filter((x) => { const cl = chart.cell(x.r, x.c); return cl && (cl.s === '_' || cl.s === 'm' || cl.s === '+'); });
    if (hole.length) ug = hole.reduce((t, x) => t + (x.u0 + x.u1) / 2, 0) / hole.length;
    // which side of the thumb shows the motif (the back of the hand): more cells away from slot A
    let a = 0, b = 0;
    for (const x of S.cells) {
      const cl = chart.cell(x.r, x.c); if (!cl || cl.slot === 'A' || x.part !== 'main') continue;
      const d = (((x.u0 + x.u1) / 2 - ug) % 1 + 1) % 1;
      if (d < 0.5) a++; else b++;
    }
    S.ug = ug;
    S.uFront = (((ug + (b > a ? -0.25 : 0.25)) % 1) + 1) % 1;
    S.thumbSide = b > a ? 1 : -1; // + : the thumb at local +x
    const hold = rows.find((R) => R && R.step === 'hold');
    S.yHold = hold ? hold.yTop : null;
    S.hasThumb = !!S.prof.thumb;
    if (S.hasThumb) S.thumbS0 = S.prof.thumb.S[0];
  } else if (kind === 'body') {
    // the front panel: the first body sts knit after the marker on the joining round (the yoke), else the middle
    const join = rows.find((R) => R && R.step === 'joining');
    let cf = null;
    if (join) {
      const ks = join.drawn.filter((c) => { const cl = chart.cell(join.r, c); return cl && cl.s !== 'v'; });
      const runs = []; let cur = null;
      for (const c of ks) { if (cur && c === cur[cur.length - 1] + 1) cur.push(c); else { cur = [c]; runs.push(cur); } }
      runs.sort((p, q) => q[0] - p[0]);
      if (runs.length) cf = (runs[0][0] + runs[0][runs[0].length - 1] + 1) / 2;
      S.yJoin = join.yBot;
      // the sleeve columns (v) on the joining round: they go over the shoulders
      S.sleeveCols = join.drawn.filter((c) => { const cl = chart.cell(join.r, c); return cl && cl.s === 'v'; });
    }
    S.frontCol = cf;
    // per row: the u that faces the viewer (the front panel's centre stays at the front through the join)
    S.uFrontRow = new Map();
    for (const R of rows) {
      if (!R || !R.pos) continue;
      let uf = 0.5;
      if (cf != null) {
        let lo = null, hi = null;
        for (const [c, j] of R.pos.m) { if (c < cf && (lo == null || c > lo[0])) lo = [c, j]; if (c >= cf && (hi == null || c < hi[0])) hi = [c, j]; }
        if (lo && hi) uf = (lo[1] + 1) / R.n; else if (lo) uf = (lo[1] + 1) / R.n; else if (hi) uf = hi[1] / R.n;
      }
      S.uFrontRow.set(R.r, uf);
    }
    S.yokeY = S.yJoin ?? P.y1;
  } else {
    S.uFront = 0.5;
  }
  // a rolled brim: the first rounds of plain stockinette curl outward
  S.roll = kind === 'dome' && /rolled/.test(pid) ? 2.2 : 0;
  S.cinch = S.pattern && S.pattern.touch && (S.pattern.touch.kind || S.pattern.touch) === 'cinch';
  S.F = (u, y, part = 'main', pose = 'worn', r = 0) => F(S, u, y, part, pose, r);
  anchorsOf(S);
}

function lit(nx, ny, nz) { const l = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]; return clamp(0.5 + 0.5 * l, 0, 1); }

// The map itself: local units, y down. Returns [x, y, z, lit].
function F(S, u, y, part, pose, row) {
  const P = S.prof[part] || S.prof.main;
  const rho = at(P, 'rho', y);
  const tilt = TILT[pose] ?? 0.2;
  if (S.kind === 'sock') return sockF(S, P, u, y, rho, tilt);
  if (S.kind === 'mitten') return mittenF(S, P, u, y, rho, part, tilt, pose);
  // upright tubes: dome, ring, body (axis up from the cast-on edge)
  const uf = S.kind === 'body' ? (S.uFrontRow.get(row || rowAt(S, y)) ?? 0.5) : S.uFront;
  const th = TAU * (u - uf);
  let r = rho, s = at(P, 'S', y);
  // a yoke's extra width is the sleeves' tops, which go off along the arms: the yoke itself only just
  // spreads over the shoulders
  if (S.kind === 'body' && r > S.rho0) r = S.rho0;
  if (S.roll && y < S.roll) { const t = 1 - y / S.roll; r *= 1 + 0.07 * t; s -= 0.25 * t; }
  // the ear warmer's cinch: gathered narrow at the front centre
  let half = 0;
  if (S.cinch) { const du = ((((u - uf) % 1) + 1.5) % 1) - 0.5; half = Math.exp(-(du * du) / 0.0018); }
  if (half > 0.01) { const ym = (P.y0 + P.y1) / 2; const sm = at(P, 'S', ym); s = sm + (s - sm) * (1 - 0.55 * half); r *= 1 + 0.03 * half; }
  const sn = Math.sin(th), cs = Math.cos(th);
  // slope of the surface (a crown lies over): the normal tips up
  const dr = at(P, 'rho', y + 0.5) - at(P, 'rho', y - 0.5);
  const ds = Math.max(0.05, at(P, 'S', y + 0.5) - at(P, 'S', y - 0.5));
  const al = Math.atan2(-dr, ds);
  const ca = Math.cos(al), sa = Math.sin(al);
  let yy = -s + tilt * r * cs;
  // a cowl slouches: its front dips onto the chest
  if (pose === 'cowl') yy += 0.22 * r * Math.max(0, cs) ** 2 * (1 - 0.5 * (s / Math.max(1, P.S[P.S.length - 1])));
  return [r * sn, yy, cs, lit(sn * ca, -sa, cs * ca)];
}

function rowAt(S, y) {
  for (const R of S.rows) if (R && R.h > 0 && y >= R.yBot - 1e-6 && y <= R.yTop + 1e-6) return R.r;
  return S.H;
}

// sock: in profile, the leg hangs from the cuff (y = 0 at the cuff, going down), the heel bends it through a quarter
// turn about the front of the ankle, and the foot runs to the toe at +x. The instep (u = 0.5) faces the toe.
function sockF(S, P, u, y, rho, tilt) {
  const th = TAU * (u - 0.5);
  const sn = Math.sin(th), cs = Math.cos(th);
  const z = S.view * sn; // the side of the sock faces the viewer
  const r0 = S.rho0;
  const a = rho * cs; // across, + toward the toe
  const s = at(P, 'S', y);
  let x, yy, nx, ny;
  if (y <= S.yA) { x = a; yy = s; nx = cs; ny = 0; } else if (y < S.yB) {
    const ph = -(Math.PI / 2) * clamp((s - S.SA) / Math.max(0.01, S.SB - S.SA), 0, 1);
    const cp = Math.cos(ph), sp = Math.sin(ph);
    x = r0 + (a - r0) * cp; yy = S.SA + (a - r0) * sp;
    nx = cs * cp; ny = cs * sp;
  } else {
    x = r0 + (s - S.SB); yy = S.SA + r0 - a; nx = 0; ny = -cs;
    if (s < S.SG && a > 0) {
      // in the gusset: from the set-up round's path (up the flap's edge, an arc about the ankle's front, then
      // along the leg's front edge) to the foot's straight cross-section
      const t = clamp((s - S.SB) / (S.SG - S.SB), 0, 1);
      const e = t * t * (3 - 2 * t);
      const la = r0 * Math.PI / 2, lt = la + r0;
      const p = clamp(a / r0, 0, 1) * lt;
      let x0, y0;
      if (p <= la) { const ps = p / r0; x0 = r0 - r0 * Math.sin(ps); y0 = S.SA + r0 * Math.cos(ps); } else { x0 = p - la; y0 = S.SA; }
      const x1 = r0 + (S.SG - S.SB), y1 = S.SA + r0 - a;
      x = lerp(x0, x1, e); yy = lerp(y0, y1, e);
    }
  }
  yy += tilt * rho * z;
  return [x, yy, z, lit(nx, ny, z)];
}

// mitten: the hand hangs from the cuff (y = 0 at the top, fingertips down); the thumb is its own small tube
// from the hold round's height, at the side
function mittenF(S, P, u, y, rho, part, tilt, pose) {
  if (part === 'thumb' && S.hasThumb) {
    const Pm = S.prof.main;
    const sg = S.thumbSide;
    const yb = S.yHold != null ? S.yHold : Pm.y1 * 0.45;
    const rb = at(Pm, 'rho', yb);
    const bx = sg * rb * 0.82, by = at(Pm, 'S', yb);
    const d = [sg * 0.62, 0.78];
    const n = [d[1] * sg, -d[0] * sg]; // across the thumb, + away from the hand's tip side
    const th = TAU * (u - 0.5);
    const sn = Math.sin(th), cs = Math.cos(th);
    const s = at(P, 'S', y) - S.thumbS0 + rho * 0.2;
    const ac = rho * sn * sg;
    const x = bx + d[0] * s + n[0] * ac, yy = by + d[1] * s + n[1] * ac + tilt * rho * cs;
    return [x, yy, cs * 0.9 + 0.08, lit(n[0] * sn * sg, n[1] * sn * sg, cs)];
  }
  const th = TAU * (u - S.uFront);
  const sn = Math.sin(th), cs = Math.cos(th);
  const s = at(P, 'S', y);
  // the gathered top rounds off rather than ending square
  return [rho * sn, s + tilt * rho * cs, cs, lit(sn, 0.15, cs)];
}

function anchorsOf(S) {
  const P = S.prof.main;
  const A = S.anchors;
  if (S.kind === 'sock') {
    A.cuff = [0, 0];
    A.heel = [-S.rho0, S.SA + S.rho0];
    A.sole = S.SA + 2 * S.rho0;
    A.toe = [S.rho0 + (P.S[P.S.length - 1] - S.SB), S.SA + S.rho0];
  } else if (S.kind === 'mitten') {
    A.cuff = [0, 0];
    A.tip = [0, P.S[P.S.length - 1]];
  } else {
    A.base = [0, 0];
    A.top = [0, -P.S[P.S.length - 1]];
  }
}

// ---------------------------------------------------------------- placing
export function toScreen(pl, p) {
  const x = (pl.flip ? -p[0] : p[0]) * pl.s, y = p[1] * pl.s * pl.sy;
  if (!pl.rot) return [pl.ox + x, pl.oy + y];
  const c = Math.cos(pl.rot), s = Math.sin(pl.rot);
  return [pl.ox + x * c - y * s, pl.oy + x * s + y * c];
}
const ident = (pose) => ({ s: 1, sy: 1, ox: 0, oy: 0, rot: 0, flip: false, pose: pose || 'worn' });

// local bounds of the object (sampled)
export function localBounds(S, pose = 'worn', spin = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const part of Object.keys(S.prof)) {
    const P = S.prof[part];
    const n = Math.max(2, Math.ceil((P.y1 - P.y0) * 2));
    for (let i = 0; i <= n; i++) {
      const y = P.y0 + ((P.y1 - P.y0) * i) / n;
      for (let k = 0; k < 24; k++) {
        const [x, yy] = S.F(k / 24 + spin, y, part, pose);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy);
      }
    }
  }
  return { x0, y0, x1, y1 };
}

// fit into a box {x, y, w, h}: contain, centred, aligned
export function fitPlace(S, box, opts = {}) {
  const pose = opts.pose || 'worn';
  const b = localBounds(S, pose, opts.spin || 0);
  const lw = Math.max(1e-3, b.x1 - b.x0), lh = Math.max(1e-3, b.y1 - b.y0);
  const sy = Math.abs(opts.sy || 1);
  const s = Math.min(box.w / lw, box.h / (lh * sy));
  if (opts.invert) {
    // upside down (a neck-down sweater on its hanger)
    const cxL = (b.x0 + b.x1) / 2;
    const ox = box.x + box.w / 2 - (opts.flip ? -cxL : cxL) * s;
    const oy = box.y + box.h / 2 + ((b.y0 + b.y1) / 2) * s * sy;
    return { s, sy: -sy, ox, oy, rot: 0, flip: !!opts.flip, pose, spin: opts.spin || 0 };
  }
  const flip = !!opts.flip;
  const cxL = (b.x0 + b.x1) / 2;
  const ox = box.x + box.w / 2 - (flip ? -cxL : cxL) * s;
  const align = opts.align || 'centre';
  const oy = align === 'top' ? box.y - b.y0 * s * sy : align === 'bottom' ? box.y + box.h - b.y1 * s * sy : box.y + box.h / 2 - ((b.y0 + b.y1) / 2) * s * sy;
  return { s, sy, ox, oy, rot: 0, flip, pose, spin: opts.spin || 0 };
}

export function bounds(S, pl) {
  const b = localBounds(S, pl.pose, pl.spin || 0);
  const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map((p) => toScreen(pl, p));
  return { x0: Math.min(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), y1: Math.max(...pts.map((p) => p[1])) };
}

// ---------------------------------------------------------------- drawing
let scratch = null;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

// Draw one half of the piece. ctx is drawn into as is (any transform on it is kept): the half is composed on a
// scratch canvas first (so its shading lands on the piece only), then drawn over whatever ctx holds.
export function drawTube(ctx, baked, S, pl, opts = {}) {
  if (!baked || !S) return;
  const half = opts.half || 'front';
  const dark = opts.dark ?? 0.35;
  const parts = opts.parts || null;
  const pose = pl.pose || 'worn';
  const bx = bounds(S, pl);
  const pad = Math.ceil(pl.s * 1.5) + 4;
  const X0 = Math.floor(bx.x0) - pad, Y0 = Math.floor(bx.y0) - pad;
  const w = Math.ceil(bx.x1 - bx.x0) + pad * 2, h = Math.ceil(bx.y1 - bx.y0) + pad * 2;
  if (w < 2 || h < 2 || w > 8192 || h > 8192) return;
  if (!scratch || scratch.width < w || scratch.height < h) scratch = mk(Math.max(w, scratch ? scratch.width : 0), Math.max(h, scratch ? scratch.height : 0));
  const g = scratch.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const src = baked.canvas, W = baked.W, Hc = baked.H;
  const cw = src.width, chh = src.height;
  const sc = (p) => { const q = toScreen(pl, p); return [q[0] - X0, q[1] - Y0]; };
  const sp = pl.spin || 0; // turned round its axis (the gallery close-up)
  // which cells, nearest last
  const list = [];
  for (const cl of S.cells) {
    if (parts && !parts.includes(cl.part)) continue;
    if (opts.only && !opts.only(cl)) continue;
    const um = (cl.u0 + cl.u1) / 2, ym = (cl.y0 + cl.y1) / 2;
    const p = S.F(um + sp, ym, cl.part, pose, cl.r);
    const front = p[2] >= 0;
    if (half === 'front' ? !front : half === 'back' ? front : false) continue;
    list.push({ cl, z: p[2] + (cl.part === 'thumb' ? (half === 'back' ? -2 : 2) : 0), lit: p[3] });
  }
  list.sort((a, b) => a.z - b.z);
  // one piece of a cell: source rect (sx0..sx1, syT..syB) <-> map rect (u0..u1, y0..y1); split in four where the
  // map bends too much for one affine (the heel's gusset, a crown's top)
  const piece = (cl, u0, u1, y0, y1, sx0, sx1, syT, syB, dk, depth, eT, eB) => {
    const um = (u0 + u1) / 2, ym = (y0 + y1) / 2;
    const Fp = (u, y) => sc(S.F(u + sp, y, cl.part, pose, cl.r));
    const Lp = Fp(u0, ym), Rp = Fp(u1, ym), Tp = Fp(um, y1), Bp = Fp(um, y0), Cp = Fp(um, ym);
    const sw = sx1 - sx0, sh = syB - syT;
    const a = (Rp[0] - Lp[0]) / sw, b = (Rp[1] - Lp[1]) / sw, c = (Bp[0] - Tp[0]) / sh, d = (Bp[1] - Tp[1]) / sh;
    if (!Number.isFinite(a + b + c + d)) return;
    const sxm = (sx0 + sx1) / 2, sym = (syT + syB) / 2;
    if (depth < 3) {
      // how far a corner lands from where the affine puts it
      const k0 = Fp(u0, y1), k1 = Fp(u1, y0);
      const e0 = Math.hypot(Cp[0] + a * (sx0 - sxm) + c * (syT - sym) - k0[0], Cp[1] + b * (sx0 - sxm) + d * (syT - sym) - k0[1]);
      const e1 = Math.hypot(Cp[0] + a * (sx1 - sxm) + c * (syB - sym) - k1[0], Cp[1] + b * (sx1 - sxm) + d * (syB - sym) - k1[1]);
      if (Math.max(e0, e1) > 1.1) {
        const sxc = sxm, syc = sym;
        piece(cl, u0, um, ym, y1, sx0, sxc, syT, syc, dk, depth + 1, eT, false);
        piece(cl, um, u1, ym, y1, sxc, sx1, syT, syc, dk, depth + 1, eT, false);
        piece(cl, u0, um, y0, ym, sx0, sxc, syc, syB, dk, depth + 1, false, eB);
        piece(cl, um, u1, y0, ym, sxc, sx1, syc, syB, dk, depth + 1, false, eB);
        return;
      }
    }
    g.setTransform(a, b, c, d, Cp[0] - a * sxm - c * sym, Cp[1] - b * sxm - d * sym);
    // overlap neighbours by about a device pixel, each way on its own (a foreshortened strip mustn't grow tall)
    const pdx = clamp(0.9 / Math.max(0.05, Math.hypot(a, b)), 0.4, Math.max(0.6, W * 0.25));
    const pdy = clamp(0.9 / Math.max(0.05, Math.hypot(c, d)), 0.4, Math.max(0.6, Hc * 0.25));
    let qx0 = Math.max(0, sx0 - pdx), qx1 = Math.min(cw, sx1 + pdx), qy0 = Math.max(0, syT - pdy), qy1 = Math.min(chh, syB + pdy);
    // the chart's outer columns meet round the back at the marker: never sample the bake's margin beyond them
    if (cl.c === 0) qx0 = Math.max(qx0, baked.x0 - 0.05); else if (cl.c === S.W - 1) qx1 = Math.min(qx1, baked.x0 + S.W * W + 0.05);
    if (eB) qy1 = Math.min(chh, syB + Hc * 0.75); // the cast-on edge
    if (eT) qy0 = Math.max(0, syT - Hc * 0.8); // the bind-off chain
    if (qx1 - qx0 < 0.3 || qy1 - qy0 < 0.3) return;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(src, qx0, qy0, qx1 - qx0, qy1 - qy0, qx0, qy0, qx1 - qx0, qy1 - qy0);
    if (Math.abs(dk) > 0.01) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = dk > 0 ? `rgba(36,16,34,${dk.toFixed(3)})` : `rgba(255,244,222,${(-dk).toFixed(3)})`;
      g.fillRect(qx0, qy0, qx1 - qx0, qy1 - qy0);
    }
  };
  for (const { cl, z, lit: L } of list) {
    const sx0 = baked.x0 + cl.c * W, sx1 = sx0 + W;
    const syT = baked.rowTop ? baked.rowTop(cl.r) : baked.y0 + (baked.rows - cl.r) * Hc, syB = syT + Hc;
    // shade the cell: the lamp on the surface, darker toward the sides; the back half, inside, darker still
    let dk = clamp(0.5 - L * 0.62, -0.1, 0.5);
    if (half === 'back' || (half === 'all' && z < 0)) dk = 1 - (1 - clamp(0.12 + 0.25 * (1 + z) * 0.5, 0, 0.5)) * (1 - dark);
    piece(cl, cl.u0, cl.u1, cl.y0, cl.y1, sx0, sx1, syT, syB, dk, 0, cl.top, cl.bot);
  }
  g.globalCompositeOperation = 'source-over';
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (half !== 'back') overlays(g, S, pl, X0, Y0, baked);
  ctx.drawImage(scratch, 0, 0, w, h, X0, Y0, w, h);
}

// small touches the stitches can't show: the gathered top's pucker, the Argyle's back seam
function overlays(g, S, pl, X0, Y0, baked) {
  const pose = pl.pose || 'worn';
  const k = pl.s;
  if (S.gathered && (S.kind === 'dome' || S.kind === 'mitten')) {
    // the yarn drawn tight through the last loops: a little pucker of radiating folds
    const P = S.prof.main;
    const y = P.y1 - 0.15;
    const c = toScreen(pl, S.F(S.kind === 'mitten' ? S.uFront : 0.5, y, 'main', pose));
    const cx = c[0] - X0, cy = c[1] - Y0;
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const r = Math.max(2, k * 1.3);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
    gr.addColorStop(0, 'rgba(30,12,26,0.55)'); gr.addColorStop(1, 'rgba(30,12,26,0)');
    g.fillStyle = gr; g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
    g.restore();
  }
  if (S.kind === 'sock' && S.legSeam) {
    // mattress-stitched up the back: a fine ladder line where the leg's two edges meet
    const P = S.prof.main;
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = 'rgba(40,16,30,0.55)'; g.lineWidth = Math.max(1, k * 0.22);
    g.beginPath();
    const yEnd = Math.min(S.yA, P.y1);
    // the seam is at u = 0 (the back): in profile it's the leg's back edge, a touch inside the silhouette
    for (let i = 0; i <= 16; i++) {
      const y = (yEnd * i) / 16;
      const p = toScreen(pl, S.F(S.view > 0 ? 0.965 : 0.035, y, 'main', pose));
      i ? g.lineTo(p[0] - X0, p[1] - Y0) : g.moveTo(p[0] - X0, p[1] - Y0);
    }
    g.stroke();
    g.restore();
  }
}

// ---------------------------------------------------------------- outline (the ghost, shadows)
function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
export function outline(S, pl, opts = {}) {
  const out = [];
  const half = opts.half || 'all';
  pl = pl || ident();
  for (const part of Object.keys(S.prof)) {
    const P = S.prof[part];
    for (let i = 0; i + 1 < P.ys.length; i++) {
      const ya = P.ys[i], yb = P.ys[i + 1];
      if (yb - ya < 1e-6) continue;
      const pts = [];
      for (const y of [ya, yb]) for (let k = 0; k < 24; k++) {
        const p = S.F(k / 24 + (pl.spin || 0), y, part, pl.pose);
        if (half === 'front' && p[2] < -0.05) continue;
        if (half === 'back' && p[2] > 0.05) continue;
        pts.push(toScreen(pl, p));
      }
      if (pts.length >= 3) out.push(hull(pts));
    }
  }
  return out;
}
export function fillOutline(ctx, polys) {
  ctx.beginPath();
  for (const poly of polys) poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.fill();
}
