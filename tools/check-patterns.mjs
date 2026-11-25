// node tools/check-patterns.mjs [--solve] [--text] [--show id[,id…]] [--quiet]
// Checks all 47 patterns with chart.js (the code the game runs):
//   layer widths, row 1, the row-map rules (blocks used up, bind-offs and cast-ons at row starts or
//   at gaps, the 3-column limit), RS-only cables/bobbles/yarn-overs, cable spans, slot names, the
//   repeat rule ((sts on row repeat.at − edges) % width == 0), metadata, decreases that lean with
//   their edge, stitch counts against the design's table, real-knitting checks of the stitch
//   patterns, and the written pattern's round trip (text -> rows -> tokens == the row map).
//   --solve  runs every pattern's whole stitch order (needle simulation, needles(), the strip cursor)
//   --text   writes tools/patterns.txt: every written pattern with its finishing
//   --show   prints the stitch and color layers of the named patterns
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseChart, rowWording, writtenPattern, roundTrip, wordingCursor, stripWording, CABLES } from '../game/src/chart.js';
import { PATTERNS, PALETTE, CHAPTERS } from '../game/src/patterns.js';
import { TEX } from '../game/src/patternKit.js';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const quiet = has('--quiet');

// the design's table: [w, h, stitches] (approximate for shaped pieces; w, h unused). (Change 2) The 19
// patterns knit in the round (and the wristwarmer, flat and seamed) take CHANGE_2.md A's table.
const DESIGN = {
  'garter-dishcloth': [12, 12, 144], 'stockinette-coaster': [10, 10, 100], 'seed-bookmark': [7, 22, 154],
  'ribbed-wristwarmer': [24, 12, 288], 'striped-headband': [40, 10, 401], 'basketweave-mug-cozy': [20, 12, 240],
  'rolled-brim-beanie': [48, 16, 633], 'moss-ear-warmer': [56, 8, 449], 'bobble-hat': [48, 17, 681],
  'broken-rib-cowl': [60, 10, 601], 'fingerless-mitts': [24, 19, 453], 'cozy-sock': [34, 0, 749], 'chunky-mitten': [30, 0, 516],
  'fair-isle-coaster': [13, 13, 169], 'checkerboard-washcloth': [16, 16, 256], 'heart-pillow': [20, 20, 400],
  'star-ornament': [15, 15, 120], 'strawberry-pouch': [32, 17, 473], 'snowflake-mitten': [34, 0, 654], 'argyle-sock': [34, 0, 876],
  'cable-headband': [48, 10, 481], 'aran-mug-cozy': [20, 12, 240], 'honeycomb-cowl': [56, 12, 673], 'bobble-cushion': [21, 20, 420],
  'fisherman-beanie': [48, 18, 737], 'braided-scarf-panel': [13, 40, 520],
  'eyelet-dishcloth': [14, 14, 196], 'vine-lace-bookmark': [13, 28, 364], 'lace-doily': [21, 22, 462],
  'feather-fan-shawlette': [38, 18, 684], 'lace-sock': [40, 0, 869], 'chevron-baby-blanket': [28, 28, 784],
  'little-bunny': [16, 22, 220], 'cat-toy': [16, 18, 240], 'whale': [22, 14, 260], 'frog': [18, 16, 240], 'penguin': [14, 22, 260],
  'octopus': [18, 20, 280], 'fox': [18, 20, 280], 'teddy-bear': [18, 22, 300],
  'tea-cosy': [22, 24, 462], 'holiday-stocking': [48, 0, 1258], 'dog-sweater': [48, 0, 831], 'patchwork-blanket': [36, 36, 1296],
  'yoke-sweater': [72, 0, 1163], 'cabled-cardigan': [41, 48, 1191], 'heirloom-afghan': [40, 40, 1600],
};
const TYPES = ['wool', 'cotton', 'chunky', 'mohair', 'sparkle', 'stripe', 'velvet', 'glow'];
const WEAR = { head: ['dome', 'band'], neck: ['band', 'hang'], body: ['body'], hands: ['pair'], feet: ['pair'], shoulders: ['drape'] };

let fails = 0;
const problems = [];
const fail = (id, msg) => { fails++; problems.push(`FAIL ${id}: ${msg}`); };
const yarnsOf = (p) => Object.fromEntries(Object.entries(p.slots).map(([k, v]) => [k, `${v.color[0].toUpperCase() + v.color.slice(1)} ${v.type === 'stripe' ? 'self-striping' : v.type}`]));
const charts = new Map();

// ---------------------------------------------------------------- per-pattern checks
if (PATTERNS.length !== 47) fail('book', `${PATTERNS.length} patterns, expected 47`);
const ids = new Set();
let lastCh = 0;
for (const p of PATTERNS) {
  const id = p.id;
  if (ids.has(id)) fail(id, 'duplicate id'); ids.add(id);
  if (p.chapter < lastCh || p.chapter < 1 || p.chapter > 7) fail(id, `chapter ${p.chapter} out of book order`); lastCh = p.chapter;
  for (const f of ['name', 'technique', 'source', 'finishing']) if (!p[f] || typeof p[f] !== 'string') fail(id, `missing ${f}`);
  if (!/^Finishing: /.test(p.finishing || '')) fail(id, 'finishing should start "Finishing: "');
  if (!p.repeat || !(p.repeat.width >= 1) || p.repeat.edges == null || !(p.repeat.rows >= 1)) fail(id, 'repeat needs {width, edges, rows}');
  if (p.wear && !(WEAR[p.wear.slot] || []).includes(p.wear.fit)) fail(id, `bad wear ${JSON.stringify(p.wear)}`);
  if (!p.slots || !p.slots.A) fail(id, 'slots need A');
  for (const [k, v] of Object.entries(p.slots || {})) {
    if (!/^[A-D]$/.test(k)) fail(id, `bad slot name ${k}`);
    if (!PALETTE[v.color]) fail(id, `slot ${k}: color ${v.color} not in the palette`);
    if (!TYPES.includes(v.type)) fail(id, `slot ${k}: yarn type ${v.type}`);
    if (!v.label) fail(id, `slot ${k}: no label`);
  }
  const ch = parseChart(p);
  charts.set(id, ch);
  for (const e of ch.errors) fail(id, e);
  if (ch.errors.length) continue;
  // slots: used == declared
  for (const s of ch.slotsUsed) if (!p.slots[s]) fail(id, `color layer uses slot ${s}, not declared`);
  for (const s of Object.keys(p.slots)) if (!ch.slotsUsed.has(s) && !(p.touch && p.touch.slot === s)) fail(id, `slot ${s} declared but never used`);
  // the three layers: same height and width (chart.js reports mismatches; re-check the shape layer)
  for (const L of ['shape', 'stitch', 'color']) {
    const lines = p[L];
    if (!Array.isArray(lines) || lines.length !== ch.height || lines.some((l) => l.length !== ch.width)) fail(id, `${L} layer is not ${ch.width}×${ch.height}`);
  }
  // repeat rule, re-done here so it prints
  const rep = p.repeat, atRow = rep.at || 1, R = ch.row(atRow);
  const n = ch.round ? R.ring.length : R.cols.length;
  if (ch.round && rep.edges) fail(id, 'a round piece has no edge stitches (repeat.edges 0)');
  if ((n - rep.edges) % rep.width) fail(id, `repeat: row ${atRow} has ${n} sts; ${n} − ${rep.edges} is not a multiple of ${rep.width}`);
  // RS-only special stitches, cable spans
  for (let r = 1; r <= ch.height; r++) {
    for (const cl of ch.cells(r)) {
      if (!cl) continue;
      if (!ch.rsOf(r) && 'obx'.includes(cl.s)) fail(id, `row ${r} col ${cl.c}: '${cl.s}' on a WS row`);
      if (cl.s === 'x' && !cl.cable) fail(id, `row ${r} col ${cl.c}: 'x' outside a cable span`);
    }
  }
  for (const sp of ch.spans || []) {
    if (!CABLES[sp.type]) fail(id, `cable ${sp.type}`);
    // a cable's crossing stitches must be knit stitches in the rows below and above (a knit column)
    for (let i = 0; i < sp.n; i++) {
      const below = ch.cell(sp.row - 1, sp.col + i);
      if (!below || !'kx'.includes(below.s)) fail(id, `cable ${sp.type} row ${sp.row}: col ${sp.col + i} below is not a knit column`);
    }
  }
  // decreases lean with their edge: k2tog '<' at a run's left end, ssk '>' at its right end (flat
  // pieces; a round piece has no edges to shape: CHANGE_2.md D.3)
  for (let r = 2; r <= (ch.round ? 0 : ch.height); r++) {
    for (const u of ch.row(r).runs) {
      const a = ch.cell(r, u.a).s, b = ch.cell(r, u.b).s;
      if (u.b > u.a && a === '>') fail(id, `row ${r}: ssk at the left edge (col ${u.a}) leans against the edge`);
      if (u.b > u.a && b === '<') fail(id, `row ${r}: k2tog at the right edge (col ${u.b}) leans against the edge`);
    }
  }
  // the count against the design's table
  const d = DESIGN[id];
  if (!d) fail(id, 'not in the design table');
  else {
    const diff = (ch.total - d[2]) / d[2];
    if (Math.abs(diff) > 0.3) fail(id, `${ch.total} sts is ${Math.round(diff * 100)}% from the design's ${d[2]}`);
  }
  // round trip
  const rt = roundTrip(ch, { name: p.name, source: p.source, yarns: yarnsOf(p) });
  for (const e of rt) fail(id, 'round trip: ' + e);
  // the written pattern names the finishing and the cast-on
  const wp = writtenPattern(ch, { name: p.name, source: p.source, yarns: yarnsOf(p) });
  if (!wp.text.includes(p.finishing)) fail(id, 'written pattern lacks the finishing');
  if (!/Cast on /.test(wp.text)) fail(id, 'written pattern lacks the cast-on');
  if (!ch.round && /Rnd/.test(wp.text)) fail(id, 'written pattern says Rnd');
  if (ch.round) checkRound(p, ch, wp);
  if ((p.edition || 1) > 1) for (const l of ['Yarn: ', 'Needles: ', 'Gauge: ', 'Size: ']) if (!wp.text.split('\n').some((x) => x.startsWith(l) && (l !== 'Size: ' || /scaled down for the game/.test(x)))) fail(id, `written pattern lacks its "${l.trim()}" line`);
}

// ---------------------------------------------------------------- (Change 2) round pieces: CHANGE_2.md D.2 and D.4
function checkRound(p, ch, wp) {
  const id = p.id;
  if (!p.gauge) fail(id, 'a round piece needs a gauge {sts, per, yarn}');
  const spi = p.gauge ? p.gauge.sts / (p.gauge.per || 4) : 3;
  if (!wp.text.includes('Join to work in the rnd') && !ch.flatAt(1)) fail(id, 'no join');
  // every round section's repeat: whole repeats, edges 0, on its repeat row (above) and steps
  for (let r = 1; r <= ch.height; r++) {
    const R = ch.row(r);
    if (!R.step) continue;
    const st = R.step, t = st.text, taps = R.map.length;
    const num = (re) => { const m = t.match(re); return m ? +m[1] : null; };
    const used = R.map.reduce((a, e) => a + e.takes.length, 0);
    if (st.kind === 'join' || st.kind === 'seam' || st.kind === 'hold' || st.kind === 'gather' || st.kind === 'graft' || st.kind === 'graftUnderarm') {
      // zero-height steps: the live count before − what they take = the live count after (outCols)
      if (R.prevCols.length - used !== R.cols.length) fail(id, `row ${r} (${st.kind}): ${R.prevCols.length} live − ${used} taken ≠ ${R.cols.length} after`);
    }
    const want = {
      join: () => 1,
      seam: () => { const f = ch.flatRanges.find((x) => x.to === r - 1); return f ? Math.ceil((f.to - f.from + 1) / 2) : null; },
      hold: () => { const nx = ch.row(r + 1); const n0 = (R.prevCols.length ? ch.row(r - 1).held.length : 0); const n = num(/(\d+) (?:thumb )?sts/); const each = /each/.test(t); return nx && n != null && nx.held.length - n0 === n * (each ? taps : 1) ? taps : -1; },
      gather: () => { const n = num(/rem (\d+) sts/); return n === R.prevCols.length - R.held.length ? n : -1; },
      graft: () => { const n = num(/Kitchener stitch \((\d+) sts?\)/), rem = num(/rem (\d+) sts/); return rem === 2 * n && used === rem ? n : -1; },
      graftUnderarm: () => num(/\((\d+) sts\)/),
    }[st.kind];
    let expected;
    if (want) expected = want();
    else {
      // rounds with their own text (set-up, joining, thumb, markers, to the centre): the k counts and the
      // picked-up counts add up to the taps
      const body = t.replace(/\(\d+ sts?\)/g, '');
      expected = [...body.matchAll(/\b[kK](\d+)\b/g)].reduce((a, m) => a + +m[1], 0) + [...body.matchAll(/pick up and k (\d+)/g)].reduce((a, m) => a + +m[1], 0);
      const tot = num(/\((\d+) sts\)\.?$/);
      if (tot != null && tot !== R.ring.length) fail(id, `row ${r} (${st.kind}): says ${tot} sts, has ${R.ring.length}`);
    }
    if (expected !== taps) fail(id, `row ${r} (${st.kind}): ${taps} taps, its wording says ${expected} ("${t}")`);
  }
  // needles fit (D.4): a circular holds a round at least its length around; a DPN holds 2 to 14 sts
  // (loosened from 3: an 8-st tip or crown on 3 or 4 DPNs is how real knitters work it)
  const N = p.needles || [];
  if (!N.length) fail(id, 'no needles');
  N.forEach((n, i) => {
    const to = i + 1 < N.length ? N[i + 1].from - 1 : ch.height;
    if (n.kind === 'circular') {
      for (let r = n.from; r <= to; r++) {
        const R = ch.row(r);
        if (!R.round || (R.step && !R.map.some((e) => e.takes.length || e.stitch !== 'k'))) continue;
        const around = Math.max(R.ring.length, R.prevCols.length - R.held.length); // a one-round gap still goes all the way round
        if (around / spi < (n.len || 16) - 1e-9) { fail(id, `row ${r}: ${around} sts is ${(around / spi).toFixed(1)}" round, too few for the ${n.len || 16}" circular (change to DPNs)`); break; }
      }
    }
    if (n.kind === 'dpn' && n.counts) {
      const R = ch.row(Math.max(1, n.from));
      if (n.counts.some((c) => c < 2 || c > 14)) fail(id, `DPN counts ${n.counts} (each needle holds 2 to 14)`);
      // the counts are the sts the needles hold where the line is read: before that row, or after it (a set-up round)
      const sum = n.counts.reduce((a, b) => a + b, 0), before = R.prevCols.length - R.held.length;
      if (sum !== R.ring.length && sum !== before) fail(id, `DPN counts ${n.counts} at row ${n.from} add to ${sum}, the row has ${before} before and ${R.ring.length} after`);
    }
  });
  if (!wp.lines.some((l) => l.kind === 'section') && ch.height > 14) fail(id, 'a long round piece needs section headers');
}

// ---------------------------------------------------------------- real-knitting checks
const C = (id) => charts.get(id);
const W = (id, r, part) => rowWording(C(id), r, part == null ? {} : { part }).text;
const expect = (id, cond, msg) => { if (!cond) fail(id, msg); };
const knit = [];
const note = (s) => knit.push(s);
try {
  // textures
  const tx = (t, r, c) => TEX[t](r, c, { r, c });
  let ok = true;
  for (let r = 1; r <= 8; r++) for (let c = 0; c < 12; c++) {
    if (tx('rib2', r, c) !== (c % 4 < 2 ? 'k' : 'p')) ok = false;                     // stacked k2, p2
    if (tx('seed', r, c) === tx('seed', r, c + 1) || tx('seed', r, c) === tx('seed', r + 1, c)) ok = false; // alternates both ways
    if (tx('moss', r, c) === tx('moss', r, c + 1)) ok = false;
    if ((r - 1) % 2 === 0 && tx('moss', r, c) !== tx('moss', r + 1, c)) ok = false;   // 2-row blocks
    if (tx('moss', r, c) === tx('moss', r + 2, c)) ok = false;                          // offset: 4-row repeat
    if (tx('basketweave', r, c) !== tx('basketweave', r + 8, c) || tx('basketweave', r, c) === tx('basketweave', r + 4, c)) ok = false;
    if (tx('garter', r, c) !== (r % 2 ? 'k' : 'p')) ok = false;
    if (r % 2 === 0 && tx('brokenRib', r, c) !== 'k') ok = false;
  }
  expect('textures', ok, 'a texture is not its stitch pattern');
  note('textures: 2×2 rib stacked, seed alternates every row and stitch, moss 2-row blocks offset (4-row repeat), basketweave 4×4 blocks switching every 4 rows, garter k/p rows, broken rib knit (RS-appearance) between rib rows');
  // wording of the classics
  expect('garter-dishcloth', W('garter-dishcloth', 2) === 'k to end', `garter WS reads "${W('garter-dishcloth', 2)}"`);
  expect('striped-headband', /^with A, \*k2, p2; rep from \* around$/.test(W('striped-headband', 2)), `2×2 rib in the round reads "${W('striped-headband', 2)}"`);
  expect('seed-bookmark', W('seed-bookmark', 1) === 'k1, *p1, k1; rep from * to end' && W('seed-bookmark', 2) === 'k1, *p1, k1; rep from * to end', `seed reads "${W('seed-bookmark', 1)}" / "${W('seed-bookmark', 2)}"`);
  expect('broken-rib-cowl', /\*k1, p1; rep from \* around$/.test(W('broken-rib-cowl', 2)) && /knit$/.test(W('broken-rib-cowl', 3)), `broken rib: "${W('broken-rib-cowl', 2)}" / "${W('broken-rib-cowl', 3)}"`);
  expect('basketweave-mug-cozy', /k4, p4|p4, k4/.test(W('basketweave-mug-cozy', 3)) && W('basketweave-mug-cozy', 3) !== W('basketweave-mug-cozy', 7), `basketweave row 3: "${W('basketweave-mug-cozy', 3)}"`);
  note(`garter row 2 (WS): "${W('garter-dishcloth', 2)}"; 2×2 rib in the round: "${W('striped-headband', 2)}"; seed: "${W('seed-bookmark', 1)}"`);
  note(`basketweave rows 3 / 7 (RS): "${W('basketweave-mug-cozy', 3)}" / "${W('basketweave-mug-cozy', 7)}"; moss rnds 1-4 col 3: ${[2, 3, 4, 5].map((r) => C('moss-ear-warmer').cell(r, 3).s).join('')}`);
  // rope cable: C4F every 6th row on purl ground
  const cab = [...new Set(C('cable-headband').spans.map((s) => s.row))];
  expect('cable-headband', cab.every((r, i) => i === 0 || r - cab[i - 1] === 6) && C('cable-headband').spans.every((s) => s.type === 'C4F'), `cable rows ${cab}`);
  const cr = cab[0];
  expect('cable-headband', W('cable-headband', cr) === '*p2, C4F; rep from * around', `cable round: "${W('cable-headband', cr)}"`);
  note(`rope cable C4F on chart rows ${[...new Set(cab)].join(', ')} (every 6th rnd): "${W('cable-headband', cr)}"; next "${W('cable-headband', cr + 1)}"`);
  const aran = C('aran-mug-cozy').spans.map((s) => s.row);
  note(`Aran C4B rows ${[...new Set(aran)].join(', ')} (every 4th): "${W('aran-mug-cozy', 3)}"`);
  // honeycomb alternates C2B, C2F then C2F, C2B
  const hc3 = W('honeycomb-cowl', 4), hc7 = W('honeycomb-cowl', 8);
  expect('honeycomb-cowl', /^\*C2B, C2F; rep from \* around$/.test(hc3) && /^\*C2F, C2B; rep from \* around$/.test(hc7), `honeycomb: "${hc3}" / "${hc7}"`);
  expect('honeycomb-cowl', W('honeycomb-cowl', 2) === 'purl' && W('honeycomb-cowl', 3) === 'knit', `garter in the round: "${W('honeycomb-cowl', 2)}" / "${W('honeycomb-cowl', 3)}"`);
  note(`honeycomb rnd 3: "${hc3}"; rnd 7: "${hc7}"; garter ridge: "${W('honeycomb-cowl', 2)}" / "${W('honeycomb-cowl', 3)}"`);
  note(`plait: row 3 "${W('braided-scarf-panel', 3)}"; row 7 "${W('braided-scarf-panel', 7)}"`);
  // Old Shale: 18+2, count preserved on every row
  const fs = C('feather-fan-shawlette');
  let keep = true; for (let r = 2; r <= fs.height; r++) if (fs.row(r).cols.length !== fs.row(r - 1).cols.length) keep = false;
  const sh = W('feather-fan-shawlette', 5);
  expect('feather-fan-shawlette', keep && fs.width === 38, 'Old Shale must keep 38 sts on every row');
  expect('feather-fan-shawlette', /\[k2tog\] 3 times, \[yo, k1\] 6 times, \[k2tog\] 3 times/.test(sh), `Old Shale row 5: "${sh}"`);
  note(`Old Shale row 5 (RS): "${sh}" (38 sts on every row)`);
  // vine lace
  note(`vine lace rows 3 / 5: "${W('vine-lace-bookmark', 3)}" / "${W('vine-lace-bookmark', 5)}"`);
  expect('vine-lace-bookmark', /^k3, yo, k2, ssk, k2tog, k2, yo, k2$/.test(W('vine-lace-bookmark', 3)) && /^k2, yo, k2, ssk, k2tog, k2, yo, k3$/.test(W('vine-lace-bookmark', 5)), 'vine lace wording');
  note(`eyelets rows 5 / 9: "${W('eyelet-dishcloth', 5)}" / "${W('eyelet-dishcloth', 9)}"`);
  { const ls = C('lace-sock'); let r0 = 1; while (!ls.cells(r0).some((x) => x && x.s === 'o')) r0++;
    note(`lace rib rows ${r0} / ${r0 + 2}: "${W('lace-sock', r0)}" / "${W('lace-sock', r0 + 2)}"`); }
  note(`chevron row 3: "${W('chevron-baby-blanket', 3)}"`);
  // Fair Isle OXO: B appears as O and X
  const fi = C('fair-isle-coaster');
  note(`OXO coaster rows 4 / 10: "${W('fair-isle-coaster', 4)}" / "${W('fair-isle-coaster', 10)}"`);
  expect('fair-isle-coaster', fi.slotsUsed.size === 2, 'OXO uses 2 colors');
  // argyle: diamonds in B and C and lines in D on the leg
  const ag = C('argyle-sock');
  const legSlots = new Set(); for (let r = 5; r <= 16; r++) for (let c = 0; c < ag.width; c++) { const cl = ag.cell(r, c); if (cl) legSlots.add(cl.slot); }
  expect('argyle-sock', ['A', 'B', 'C', 'D'].every((s) => legSlots.has(s)), 'argyle leg needs A ground, B and C diamonds, D lines');
  // decreases: one k2tog right / ssk left pair on a shaped edge
  // (Change 2) crowns decrease evenly round: "*k4, k2tog; rep from * around (40 sts)"
  { const bc = C('rolled-brim-beanie'); let r = 1; while (r <= bc.height && !/k2tog/.test(W('rolled-brim-beanie', r))) r++;
    const w = writtenPattern(bc).text;
    expect('rolled-brim-beanie', /Rnd 1: with A, \*k4, k2tog; rep from \* around \(40 sts\)/.test(w), `crown rnd 1: "${W('rolled-brim-beanie', r)}"`);
    note(`beanie crown: "${W('rolled-brim-beanie', r)}" … "${W('rolled-brim-beanie', bc.height - 1)}"; then "${W('rolled-brim-beanie', bc.height)}"`); }
  // heels, gussets, thumbs and the yoke join read as real patterns
  { const w = writtenPattern(C('cozy-sock')).text;
    expect('cozy-sock', /Turn heel:\nRow 1 \(RS\): with B, sl1 wyib, k6, ssk, k1, turn\nRow 2 \(WS\): with B, sl1 wyif, p3, p2tog, p1, turn/.test(w), 'the cozy sock\'s heel turn reads "sl1, k6, ssk, k1, turn" / "sl1, p3, p2tog, p1, turn"');
    expect('cozy-sock', /Set-up rnd: with A, k4, pick up and k 5 sts evenly along the edge of the heel flap, k12, pick up and k 5 sts evenly along the other edge, k4 \(30 sts\)\./.test(w), 'the gusset set-up round');
    note('cozy sock: ' + w.split('\n').filter((l) => /^(Row 1 \(RS\): with B, sl1|Set-up rnd|Divide rem)/.test(l)).join(' | ')); }
  { const w = writtenPattern(C('yoke-sweater')).text;
    expect('yoke-sweater', /Sleeves \(make 2/.test(w) && /Joining rnd: k20 front sts, k12 sts of one sleeve, k20 back sts, k12 sts of the other sleeve \(64 sts\)/.test(w), 'the yoke joins its sleeves'); }
  { const w = writtenPattern(C('chunky-mitten')).text;
    expect('chunky-mitten', /slip the 8 sts between the markers onto waste yarn for the thumb/.test(w) && /k9, cast on 2 sts over the gap, k9 \(20 sts\)/.test(w) && /pick up and k 2 sts in the gap \(10 sts\)/.test(w), 'the mitten holds its thumb, casts over the gap and picks the thumb up'); }
  { const w = writtenPattern(C('fingerless-mitts')).text;
    expect('fingerless-mitts', /k10, bind off 4 sts, k to end \(20 sts\)/.test(w) && /k10, cast on 4 sts over the gap, k to end \(24 sts\)/.test(w), 'the mitts\' one-round thumb hole'); }
} catch (e) { fail('checks', e.stack); }

// ---------------------------------------------------------------- --solve: the whole stitch order
let solved = 0;
if (has('--solve')) {
  for (const p of PATTERNS) {
    const ch = charts.get(p.id);
    if (!ch || ch.errors.length) continue;
    let taps = 0;
    const err = (m) => fail(p.id, 'solve: ' + m);
    let bad = 0;
    for (let r = 1; r <= ch.height && bad < 3; r++) {
      const R = ch.row(r);
      // the left needle: row r-1's live stitches, tip first (RS: rightmost first; WS: leftmost first). In a
      // round piece: in ring order from the row's cut, without the held sts (on waste yarn or a spare DPN)
      const W0 = ch.width, ring = (c) => (ch.round ? (((c - R.cut) % W0) + W0) % W0 : c);
      const heldSet = new Set(R.held || []);
      const q = R.prevCols.map((c, i) => i).filter((i) => !heldSet.has(R.prevCols[i])).sort((a, b) => (R.rs ? ring(R.prevCols[b]) - ring(R.prevCols[a]) : ring(R.prevCols[a]) - ring(R.prevCols[b])));
      if (R.step && !R.runs.length) {
        // a step row: its taps take what they name, in their own order; the rest stays live
        const left = new Set(q);
        for (const e of R.map) {
          const nd = ch.needles(ch.rowStart(r) + e.k);
          if (nd.next !== e) { err(`row ${r} (${R.step.kind}) tap ${e.k + 1}: needles().next is not the step's entry`); bad++; }
          if (nd.step !== R.step.kind) { err(`row ${r}: needles().step is ${nd.step}`); bad++; }
          for (const t of e.takes) { if (!left.has(t) && !heldSet.has(R.prevCols[t]) && !(R.held || []).length) { err(`row ${r} (${R.step.kind}): tap ${e.k + 1} takes a st that isn't on the needle`); bad++; } left.delete(t); }
          taps++;
          const w = stripWording(ch, r, e.k);
          if (wordingCursor(w, e.k).token < 0) { err(`row ${r} tap ${e.k + 1}: no strip token`); bad++; }
        }
        const after = R.prevCols.length - R.map.reduce((a, e) => a + e.takes.length, 0);
        if (after !== R.cols.length) { err(`row ${r} (${R.step.kind}): ${after} sts left, outCols has ${R.cols.length}`); bad++; }
        continue;
      }
      const takeTip = (list, what) => {
        const want = new Set(list);
        const got = q.splice(0, list.length);
        if (got.some((g) => !want.has(g))) { err(`row ${r}: ${what} works stitches [${list}] but the needle tip holds [${got}]`); bad++; }
      };
      takeTip(R.boundOffBefore, 'start-of-row bind-off');
      for (const e of R.map) {
        // needles() must agree with the simulation before each tap
        const nd = ch.needles(ch.rowStart(r) + e.k);
        const leftCols = q.map((i) => R.prevCols[i]).sort((a, b) => a - b);
        if (JSON.stringify(nd.left) !== JSON.stringify(leftCols)) { err(`row ${r} st ${e.k + 1}: needles() left ${JSON.stringify(nd.left)} vs ${JSON.stringify(leftCols)}`); bad++; }
        if (nd.next !== e) { err(`row ${r} st ${e.k + 1}: needles().next is not the row map entry`); bad++; }
        takeTip(e.takes, `col ${e.col} '${e.stitch}'`);
        takeTip(e.boundOffAfter, `the bind-off after col ${e.col}`);
        taps++;
        // the wording strip can underline every stitch
        const w = stripWording(ch, r, e.k);
        const cur = wordingCursor(w, e.k); // token ranges are whole-row knitting-order indices, also for a part
        if (cur.token < 0) { err(`row ${r} st ${e.k + 1}: the wording strip has no token for it ("${w.text}")`); bad++; }
      }
      if (q.length) { err(`row ${r}: ${q.length} stitch(es) left on the needle`); bad++; }
      if (!ch.round && R.map.length !== R.cols.length) { err(`row ${r}: map has ${R.map.length} entries for ${R.cols.length} cells`); bad++; }
    }
    const end = ch.needles(ch.total);
    if (taps !== ch.total) err(`${taps} taps, total ${ch.total}`);
    if (!end.done || end.right.length !== ch.row(ch.height).cols.length) err('does not end with the last row on the needle');
    if (!bad) solved++;
  }
}

// ---------------------------------------------------------------- --text
if (has('--text')) {
  const out = [];
  out.push('KNIT KNACK — the 47 written patterns (generated by tools/check-patterns.mjs --text from game/src/patterns.js)');
  out.push('Every chart shows the right side. Flat pieces: rows are numbered from the cast-on; odd rows are RS rows, even rows WS rows.');
  out.push('Round pieces (Change 2): every round is worked from the RS, starting at the right of the beginning-of-round marker (the chart\'s right edge) and going right to left; rounds and rows are numbered from 1 in each section. Their charts are the tube cut open at the marker; "." is an empty column (a gusset, thumb or sleeve not yet there, or a column a decrease emptied). Step rows (join, hold, gather, graft, seam) show as blank chart rows.');
  let chap = 0;
  PATTERNS.forEach((p, i) => {
    const ch = charts.get(p.id);
    if (p.chapter !== chap) { chap = p.chapter; out.push('', '='.repeat(78), `CHAPTER ${chap}. ${CHAPTERS[chap - 1].toUpperCase()}`, '='.repeat(78)); }
    out.push('', '-'.repeat(78), `${i + 1}. ${p.name}  (${p.technique})`);
    if (!ch || ch.errors.length) { out.push('  (chart has errors)'); return; }
    const wp = writtenPattern(ch, { name: p.name, source: p.source, yarns: yarnsOf(p) });
    const rep = p.repeat;
    out.push(`Repeat: multiple of ${rep.width} sts + ${rep.edges}${rep.at ? ` (counted on row ${rep.at})` : ''}, over ${rep.rows} rows. ${p.wear ? `Wear: ${p.wear.slot} (${p.wear.fit}).` : 'A gallery piece.'} ${ch.total} stitches.`);
    for (const l of wp.lines) {
      if (l.kind === 'title') continue;
      const ind = l.kind === 'row' ? l.depth || 0 : l.kind === 'part' ? (l.depth || 1) - 1 : l.depth || 0;
      out.push('  '.repeat(ind) + (l.label ? `${l.label}: ` : '') + l.text);
    }
    out.push('Abbreviations: ' + wp.abbreviations.map((a) => `${a.abbr} = ${a.meaning}`).join('; ') + '.');
    out.push('', `Chart (top row first; k knit, p purl, o yo, < k2tog, > ssk, m make 1, + cast on, b bobble, x cable${ch.round ? ', s slip, - held (on waste yarn or a spare needle), _ bound off here, u picked up and knit, v sleeve st, q p2tog' : ''}; letters below are the color slots):`);
    for (let i2 = 0; i2 < ch.height; i2++) out.push(`  ${String(ch.height - i2).padStart(2)}  ${p.stitch[i2]}   ${p.color[i2]}`);
  });
  writeFileSync(join(here, 'patterns.txt'), out.join('\n') + '\n');
  console.log(`wrote tools/patterns.txt (${out.length} lines)`);
}

// ---------------------------------------------------------------- --show
const si = args.indexOf('--show');
if (si >= 0) {
  for (const id of (args[si + 1] || '').split(',')) {
    const p = PATTERNS.find((x) => x.id === id); if (!p) { console.log('no pattern ' + id); continue; }
    const ch = charts.get(id);
    console.log(`\n${p.name} ${ch.width}×${ch.height}, ${ch.total} sts`);
    for (let i = 0; i < p.stitch.length; i++) console.log(`${String(p.stitch.length - i).padStart(3)} ${p.stitch[i]}  ${p.color[i]}  ${ch.errors.length ? '' : rowWording(ch, p.stitch.length - i).text}`);
    console.log(ch.errors.slice(0, 10).join('\n'));
  }
}

// ---------------------------------------------------------------- report
if (!quiet) {
  console.log('\n #  pattern                        size    CO     sts  design   diff  repeat (row: sts)');
  PATTERNS.forEach((p, i) => {
    const ch = charts.get(p.id); const d = DESIGN[p.id] || [0, 0, 0];
    if (!ch || ch.errors.length) { console.log(`${String(i + 1).padStart(2)}  ${p.name.padEnd(30)} ERRORS`); return; }
    const first = ch.row(1); const co = first.runs.length > 1 ? first.runs.map((u) => u.b - u.a + 1).reverse().join('+') : String(first.cols.length);
    const at = p.repeat.at || 1;
    const diff = Math.round(((ch.total - d[2]) / d[2]) * 100);
    console.log(`${String(i + 1).padStart(2)}  ${p.name.padEnd(30)} ${`${ch.width}×${ch.height}`.padEnd(7)} ${co.padEnd(6)} ${String(ch.total).padStart(5)} ${String(d[2]).padStart(6)} ${(diff > 0 ? '+' : '') + diff + '%'}`.padEnd(70) + `${p.repeat.width}+${p.repeat.edges} (r${at}: ${ch.row(at).cols.length})`);
  });
  const total = PATTERNS.reduce((t, p) => t + (charts.get(p.id)?.total || 0), 0);
  console.log(`\nbook total: ${total} stitches (design: about 24,600, no more than 26,000)`);
  if (total > 26000) fail('book', `${total} stitches, more than 26,000`);
  if (knit.length) console.log('\nreal-knitting checks:\n  ' + knit.join('\n  '));
}
if (has('--solve')) console.log(`\n--solve: ${solved} of ${PATTERNS.length} patterns knit through their whole stitch order cleanly`);
console.log(`round trip: ${PATTERNS.filter((p) => charts.get(p.id) && !charts.get(p.id).errors.length && !problems.some((x) => x.startsWith(`FAIL ${p.id}: round trip`))).length} of ${PATTERNS.length} read back exactly`);
if (problems.length) console.log('\n' + problems.slice(0, 80).join('\n') + (problems.length > 80 ? `\n… ${problems.length - 80} more` : ''));
console.log(fails ? `\n${fails} FAILED` : '\nall pattern checks passed');
process.exit(fails ? 1 : 0);
