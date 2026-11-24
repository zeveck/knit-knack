// patterns.js — the 47 patterns of the Knit Knack book, in book order (7 chapters).
// Each pattern: {id, name, chapter, technique, source, repeat, wear, finishing, slots, touch,
// shape, stitch, color, cables, parts}. The three layers are built with patternKit.js from a
// silhouette (ASCII art whose letters are the color slots), a texture and motifs, and every
// one is checked by tools/check-patterns.mjs with chart.js (the code the game runs).
import { knit, pic, rect, widths, symmetric, mirror, polygon, stretch, tile, framed, motif, TEX, rsCells } from './patternKit.js';
import { parseChart, rowWording } from './chart.js';

// ---------------------------------------------------------------- suggested yarn colors
// The game's palette names (cream, cranberry, sage, honey, plum + naturals and brights).
export const PALETTE = {
  cream: '#efe4cf', cranberry: '#9e2a3a', sage: '#8fa77f', honey: '#d9a441', plum: '#5b3a5e',
  white: '#f7f4ee', oatmeal: '#d6c6a5', grey: '#9c9a9e', charcoal: '#3a3a3e', black: '#232226',
  brown: '#7a5232', tan: '#c49a6c', rust: '#b5532b', orange: '#e07a2e', coral: '#e2735e',
  red: '#c42a36', rose: '#e8a0a8', pink: '#f2b8c6', lilac: '#b9a3d0', navy: '#1f2a4d',
  denim: '#4f6d9a', sky: '#8db8d8', teal: '#3f8a8a', mint: '#b8dcc4', forest: '#3f6b45',
  leaf: '#6fa04a', mustard: '#c9a227', gold: '#d4a83a', slate: '#5d6b7a',
};
const Y = (color, type = 'wool', label = 'Main') => ({ color, type, label });

// ---------------------------------------------------------------- finishing texts
const FLAT = 'Finishing: weave in the ends and block flat.';
const RING = 'Finishing: sew the cast-on edge to the bind-off edge to make a ring, weave in the ends and block.';
const TUBE = 'Finishing: bring the two side edges together, right sides facing, and seam them to make a tube. Turn out, weave in the ends and block.';
// the back keeps the brim, cuff, heel, toe and stripe colors (they go all the way round)
const backSeam = (open, mirrorIt) => `Finishing: work a back as the front${mirrorIt ? ' (the mirror image)' : ''}, in the same colors. Place the two pieces right sides together and seam round, leaving ${open} open. Turn out, weave in the ends and block.`;
const pairOf = (s) => s + ' Make a second one the same for the pair.';
// toys: the back is plain (no face) but keeps any color that goes round the body
const TOY = 'Finishing: work a back as the front, but plain in A where the front has the face. Place the two pieces right sides together and seam round, leaving the cast-on edge open. Turn out, stuff lightly and sew the opening closed. Weave in the ends.';
const SAFE = ' For a baby or a child under 3, embroider the eyes in black yarn instead of using buttons.';
const INTARSIA = 'Use a separate bobbin for each color area and twist the yarns at every color change to avoid holes.';
// a chart drawn as runs: rows bottom first, each a list of [from, to] columns -> art (top row first)
const runsArt = (W, rows, ch = 'A') => rows.map((runs) => { let s = ''; for (let c = 0; c < W; c++) s += runs.some(([a, b]) => c >= a && c <= b) ? ch : '.'; return s; }).reverse();

// ---------------------------------------------------------------- small helpers
const at = (fn) => (r, c, i) => fn(i.r, i.c, i);           // texture from absolute row/col
const odd = (r) => r % 2 === 1;
const garterRows = (p, a, b) => p.texture('garter', { rows: [a, b] });
const ko = (s) => rsCells(s);                                  // an RS row written in knitting order -> chart cells

const P = [];
const add = (meta, piece) => {
  if (piece.ragged && piece.ragged.length) throw new Error(`${meta.id}: art rows ${piece.ragged.map(([r, n]) => `${r} (${n} wide)`).join(', ')} are not ${piece.W} wide`);
  const d = piece.def();
  P.push({
    id: meta.id, name: meta.name, chapter: meta.chapter, technique: meta.technique, source: meta.source,
    repeat: meta.repeat, wear: meta.wear || null, finishing: meta.finishing, slots: meta.slots, touch: meta.touch || null,
    shape: d.shape, stitch: d.stitch, color: d.color, cables: d.cables, parts: meta.parts || null,
    partLabels: meta.partLabels || null, notes: meta.notes || null, drape: meta.drape || null,
  });
};

// =====================================================================================
// Chapter 1. First Stitches
// =====================================================================================

add({ id: 'garter-dishcloth', name: 'Garter Dishcloth', chapter: 1, technique: 'Knit every row',
  source: 'Garter stitch (k every row)', repeat: { width: 1, edges: 0, rows: 2 },
  finishing: FLAT, slots: { A: Y('cranberry', 'wool') } },
knit(rect(12, 12)).texture('garter'));

add({ id: 'stockinette-coaster', name: 'Stockinette Coaster', chapter: 1, technique: 'Knit and purl rows',
  source: 'Stockinette in a garter border (2 sts and 2 rows)', repeat: { width: 1, edges: 4, rows: 2 },
  finishing: FLAT, slots: { A: Y('sage', 'cotton') } },
(() => { const p = knit(rect(10, 10)); garterRows(p, 1, 2); garterRows(p, 9, 10);
  return p.texture(framed('stockinette', { left: 2, edge: 'garter' }), { rows: [3, 8] }); })());

add({ id: 'seed-bookmark', name: 'Seed Stitch Bookmark', chapter: 1, technique: 'Alternate knit and purl',
  source: 'Seed stitch over an odd count (k1, *p1, k1)', repeat: { width: 2, edges: 1, rows: 2 },
  finishing: 'Finishing: weave in the ends and block flat. Make a tassel and sew it to the middle of the bind-off edge.',
  slots: { A: Y('honey', 'cotton') }, touch: { kind: 'tassel', at: 'top' } },
knit(rect(7, 22)).texture('seed'));

add({ id: 'ribbed-wristwarmer', name: 'Ribbed Wristwarmer', chapter: 1, technique: '1×1 rib',
  source: '1×1 rib (k1, *p1, k1)', repeat: { width: 2, edges: 1, rows: 2 }, wear: { slot: 'hands', fit: 'pair' },
  finishing: pairOf('Finishing: make a back the same. Place right sides together and seam both side edges, leaving a thumb gap on one side 3 rows below the top (3 rows long). Turn out, weave in the ends.'),
  slots: { A: Y('plum', 'wool'), B: Y('cream', 'wool', 'Stripe') } },
knit(rect(13, 14)).texture('rib1').colors((r) => (r === 3 || r === 4 || r === 11 || r === 12 ? 'B' : null)));

add({ id: 'striped-headband', name: 'Striped Headband', chapter: 1, technique: 'Stripes in 2×2 rib',
  source: '2×2 rib (k2, *p2, k2), 4-row stripes in 3 slots', repeat: { width: 4, edges: 2, rows: 2 }, wear: { slot: 'head', fit: 'band' },
  finishing: RING, slots: { A: Y('cranberry'), B: Y('cream', 'wool', 'Stripe 2'), C: Y('honey', 'wool', 'Stripe 3') } },
knit(rect(10, 36)).texture('rib2').colors((r) => 'ABC'[Math.floor((r - 1) / 4) % 3]));

add({ id: 'basketweave-mug-cozy', name: 'Basketweave Mug Cozy', chapter: 1, technique: 'Knit and purl blocks',
  source: 'Basketweave (k4/p4 blocks, offset every 4 rows) between garter rows', repeat: { width: 8, edges: 4, rows: 8 },
  finishing: 'Finishing: weave in the ends and block. Wrap round a mug and seam the side edges above and below the handle.',
  slots: { A: Y('oatmeal', 'cotton') } },
(() => { const p = knit(rect(20, 12)); garterRows(p, 1, 2); garterRows(p, 11, 12);
  return p.texture(framed('basketweave', { left: 2, edge: 'garter' }), { rows: [3, 10] }); })());

// =====================================================================================
// Chapter 2. Warm Things
// =====================================================================================

// hat front: straight sides, then a domed crown (decreases each side, faster near the top)
const dome = (W, straight, steps) => widths(W, [...Array(straight).fill(W), ...steps]);
// an elliptical crown of n rows over a straight body (widths kept even, so both edges step alike)
const crown = (W, straight, n) => {
  const steps = [];
  for (let k = 1; k <= n; k++) { let w = 2 * Math.round((W * Math.sqrt(1 - (k / (n + 1)) ** 2)) / 2); steps.push(Math.min(W, Math.max(4, w))); }
  // a 2-st step on each side is bound off on two rows (one per edge); on the top row there is no
  // next row, so the top step is kept to 1 st a side (decreases on both edges)
  if (n >= 2) steps[n - 1] = Math.max(steps[n - 1], steps[n - 2] - 2);
  return dome(W, straight, steps);
};
// a sock in profile, drawn with square cells (toe at the left, heel at the right), then stretched
const sockArt = (W, legW, toeW, heelW, footRows, legRows, cuffRows, rows) => {
  const out = [];
  const row = (a, b, f) => { let l = ''; for (let c = 0; c < W; c++) l += c < a || c > b ? '.' : f(c); return l; };
  for (let i = 0; i < cuffRows; i++) out.push(row(W - legW, W - 1, () => 'B'));
  for (let i = 0; i < legRows; i++) out.push(row(W - legW, W - 1, () => 'A'));
  for (let k = W - legW - 1; k >= 1; k--) out.push(row(k, W - 1, () => 'A')); // the instep
  for (let i = 0; i < footRows; i++) out.push(row(0, W - 1, (c) => (c < toeW || c >= W - heelW ? 'B' : 'A')));
  out.push(row(1, W - 2, (c) => (c < toeW || c >= W - heelW ? 'B' : 'A')));
  return stretch(out, rows);
};
const sockRows = (p, legL) => {
  let leg = 1; while (p.span(leg).L !== legL) leg++;
  let cuff = p.H; while (p.col[cuff - 1][p.W - 1] === 'B') cuff--;
  return { leg, cuff };
};

add({ id: 'rolled-brim-beanie', name: 'Rolled-Brim Beanie', chapter: 2, technique: 'Crown decreases',
  source: 'Stockinette with a rolled brim (4 rows of reverse stockinette that roll outward), crown decreases (ssk at the right edge, k2tog at the left)',
  repeat: { width: 1, edges: 0, rows: 2 }, wear: { slot: 'head', fit: 'dome' },
  finishing: backSeam('the brim (cast-on edge)'), slots: { A: Y('sage'), B: Y('cream', 'wool', 'Brim') } },
knit(crown(18, 12, 8)).shape().texture('reverse', { rows: [1, 4] }).texture('stockinette', { rows: [5, 20] })
  .colors((r) => (r <= 4 ? 'B' : null)));

add({ id: 'moss-ear-warmer', name: 'Moss Stitch Ear Warmer', chapter: 2, technique: 'Edge increases and decreases',
  source: 'Moss stitch (2-row blocks, 4-row repeat), ends tapered with M1 increases and k2tog/ssk decreases',
  repeat: { width: 2, edges: 0, rows: 4 }, wear: { slot: 'head', fit: 'band' },
  finishing: 'Finishing: weave in the ends and block. Sew the tapered ends together to make a ring.',
  slots: { A: Y('plum') } },
knit(widths(26, [20, 22, 24, 26, 26, 24, 22, 20])).shape().texture('moss', { origin: [1, 0] }));

add({ id: 'bobble-hat', name: 'Bobble Hat', chapter: 2, technique: 'Ribbed brim and pom-pom',
  source: '2×2 rib brim, stockinette body with a stripe, crown decreases', repeat: { width: 4, edges: 2, rows: 2 },
  wear: { slot: 'head', fit: 'dome' }, touch: { kind: 'pompom', at: 'top', slot: 'B' },
  finishing: backSeam('the brim (cast-on edge)').replace('Weave in', 'Make a pom-pom in B and sew it to the top. Weave in'),
  slots: { A: Y('cranberry'), B: Y('cream', 'wool', 'Brim and stripe') } },
knit(crown(18, 13, 9)).shape().texture('rib2', { rows: [1, 6] }).texture('stockinette', { rows: [7, 22] })
  .colors((r) => (r <= 6 || r === 11 || r === 12 ? 'B' : null)));

add({ id: 'broken-rib-cowl', name: 'Broken Rib Cowl', chapter: 2, technique: 'Broken rib',
  source: 'Broken rib (RS: k1, *p1, k1; WS: purl)', repeat: { width: 2, edges: 1, rows: 2 }, wear: { slot: 'neck', fit: 'band' },
  finishing: TUBE, slots: { A: Y('rust'), B: Y('cream', 'wool', 'Stripe') } },
knit(rect(25, 14)).texture('brokenRib').colors((r) => (r === 3 || r === 4 || r === 11 || r === 12 ? 'B' : null)));

{
  const mitt = (hole) => {
    const a = rect(13, 18); a[18 - 12] = hole; // row 12: the thumb hole
    return knit(a).shape().texture('rib1', { rows: [1, 5] }).texture('stockinette', { rows: [6, 14] }).texture('rib1', { rows: [15, 18] })
      .colors((r) => (r <= 5 || r >= 15 ? 'B' : null));
  };
  const p = mitt('AAAAAAAA...AA');
  // the second mitt has its thumb hole 2 sts from the other edge: its rows 12 and 13, worded by chart.js
  const left = parseChart({ ...mitt('AA...AAAAAAAA').def(), slots: { A: 1, B: 1 } });
  const lw = (r) => rowWording(left, r).text.replace(/^with \w, /, '');
  add({ id: 'fingerless-mitts', name: 'Fingerless Mitts', chapter: 2, technique: 'A thumb hole',
    source: '1×1 rib cuffs, stockinette, a one-row thumb hole (BO 3 under a gap, CO 3 across it)', repeat: { width: 2, edges: 1, rows: 2 },
    wear: { slot: 'hands', fit: 'pair' },
    finishing: `Finishing: work a back as the front, in the same colors, without the thumb hole. Place right sides together and seam both side edges, leaving the cuff and the top open. Turn out, weave in the ends. Make a second mitt the mirror image for the other hand: work its row 12 as "${lw(12)}" and its row 13 as "${lw(13)}".`,
    slots: { A: Y('mustard'), B: Y('charcoal', 'wool', 'Cuffs') } },
  p);
}

{
  const p = knit(sockArt(14, 10, 3, 3, 4, 7, 3, 24)).shape();
  const { cuff } = sockRows(p, 4);
  p.texture('stockinette').texture('rib2', { rows: [cuff, p.H] });
  add({ id: 'cozy-sock', name: 'Cozy Sock', chapter: 2, technique: 'Heel and toe shaping',
    source: 'Stockinette sock in profile: rounded heel and toe shaped at the edges, the instep decreased to the ankle, 2×2 rib cuff',
    repeat: { width: 4, edges: 2, rows: 2, at: cuff }, wear: { slot: 'feet', fit: 'pair' },
    finishing: pairOf(backSeam('the cuff (bind-off edge)', true)), notes: [INTARSIA],
    slots: { A: Y('sky'), B: Y('cream', 'wool', 'Heel, toe and cuff') } },
  p);
}

// mitten: cuff, thumb gusset grown with M1s at the right edge, then thumb and hand separately
const MITTEN = stretch(`
..AAAAAAAA.......
.AAAAAAAAAA......
AAAAAAAAAAAA.....
AAAAAAAAAAAA..AA.
AAAAAAAAAAAA.AAAA
AAAAAAAAAAAA.AAAA
AAAAAAAAAAAAAAAA.
AAAAAAAAAAAAAAA..
AAAAAAAAAAAAAA...
AAAAAAAAAAAAA....
AAAAAAAAAAAAA....
BBBBBBBBBBBBB....
BBBBBBBBBBBBB....
BBBBBBBBBBBBB....`, 22);
add({ id: 'chunky-mitten', name: 'Chunky Mitten', chapter: 2, technique: 'Thumb gusset',
  source: 'Stockinette, 1×1 rib cuff, thumb grown out with M1s, then thumb and hand worked separately',
  repeat: { width: 2, edges: 1, rows: 2 }, wear: { slot: 'hands', fit: 'pair' }, parts: 'part', partLabels: ['Thumb', 'Hand'],
  finishing: pairOf(backSeam('the cuff (cast-on edge)', true)),
  slots: { A: Y('teal', 'chunky'), B: Y('cream', 'chunky', 'Cuff') } },
knit(MITTEN).shape().texture('rib1', { rows: [1, 5] }).texture('stockinette', { rows: [6, 22] }).colors((r) => (r <= 5 ? 'B' : 'A')));

// =====================================================================================
// Chapter 3. Colorwork
// =====================================================================================

{
  const O = ['.BBB.', 'B...B', 'B...B', 'B...B', 'B...B', 'B...B', '.BBB.'];
  const X = ['B...B', 'B...B', '.B.B.', '..B..', '.B.B.', 'B...B', 'B...B'];
  const band = O.map((o, i) => '.' + o + '.' + X[i] + '.');
  const dots = 'B.B.B.B.B.B.B', plain = '.'.repeat(13);
  const art = [plain, dots, plain, ...band, plain, dots, plain].map((l) => l.replace(/\./g, 'A'));
  add({ id: 'fair-isle-coaster', name: 'Fair Isle Coaster', chapter: 3, technique: 'Stranded colorwork',
    source: 'Fair Isle OXO peerie (stranded, 2 colors): an O and an X, 6 sts each, alternating along a 7-row band, between dotted rows',
    repeat: { width: 12, edges: 1, rows: 7, at: 4 }, finishing: FLAT,
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Contrast') } },
  knit(art));
}

add({ id: 'checkerboard-washcloth', name: 'Checkerboard Washcloth', chapter: 3, technique: 'Two-color checks',
  source: 'Two-color stranded checks (4-st blocks, 4 rows tall)', repeat: { width: 8, edges: 0, rows: 8 }, finishing: FLAT,
  slots: { A: Y('sage', 'cotton'), B: Y('cream', 'cotton', 'Checks') } },
knit(rect(16, 16)).colors((r, c) => ((Math.floor((r - 1) / 4) + Math.floor(c / 4)) % 2 ? 'B' : 'A')));

{
  const art = stretch(`
  AAAAAAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAAAAAA
  AAAABBBAAAAAABBBAAAA
  AAABBBBBAAAABBBBBAAA
  AABBBBBBBAABBBBBBBAA
  AABBBBBBBBBBBBBBBBAA
  AABBBBBBBBBBBBBBBBAA
  AAABBBBBBBBBBBBBBAAA
  AAAABBBBBBBBBBBBAAAA
  AAAAABBBBBBBBBBAAAAA
  AAAAAABBBBBBBBAAAAAA
  AAAAAAABBBBBBAAAAAAA
  AAAAAAAABBBBAAAAAAAA
  AAAAAAAAABBAAAAAAAAA
  AAAAAAAAAAAAAAAAAAAA`, 20);
  add({ id: 'heart-pillow', name: 'Heart Pillow', chapter: 3, technique: 'Intarsia',
    source: 'Intarsia heart on stockinette (a separate length of B for the heart, twisted at each color change)',
    repeat: { width: 1, edges: 0, rows: 2 },
    finishing: 'Finishing: make a back in A. Place right sides together and seam round 3 sides, turn out, stuff and sew the last side closed.',
    notes: ['Use a bobbin of A for each side of the heart (and one between the two lobes at the top) and a bobbin of B for each lobe; twist the yarns at every color change to avoid holes.'],
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Heart') } },
  knit(art));
}

{
  // a five-pointed star, 15 wide and symmetric about col 7: two lower points cast on separately
  // and joined, the arms cast on at the row starts and bound off on paired rows (3, 3, 2, 2),
  // then decreases to the top point
  const rows = [
    [[3, 4], [10, 11]], [[3, 5], [9, 11]], [[4, 6], [8, 10]],            // rows 1-3: the two lower points
    [[4, 10]], [[4, 10]], [[4, 10]],                                     // 4: joined across the gap
    [[3, 11]], [[2, 12]],                                                // 7-8: widening
    [[2, 14]], [[0, 14]], [[0, 14]],                                     // 9-11: the arms, cast on at the row starts
    [[3, 14]], [[3, 11]], [[5, 11]], [[5, 9]],                           // 12-15: arms bound off, 3, 3, 2, 2
    [[6, 8]], [[6, 8]],                                                  // 16-17: the top point
  ];
  add({ id: 'star-ornament', name: 'Star Ornament', chapter: 3, technique: 'Shaped points',
    source: 'Shaped stockinette star: two lower points cast on and worked separately, joined by casting on across the gap, the arms cast on at the row starts and bound off on paired rows, then decreases to the top point',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: 'point',
    finishing: 'Finishing: make a back the same. Place right sides together and seam round, leaving a small gap. Turn out, stuff lightly, sew closed and add a hanging loop at the top point.',
    slots: { A: Y('gold', 'cotton') }, touch: { kind: 'loop', at: 'top' } },
  knit(runsArt(15, rows)).shape());
}

{
  const BERRY = pic(`
  CCCCCCCCCCCCCCCC
  CCCCCCCCCCCCCCCC
  CCCCCCCCCCCCCCCC
  ACCCACCCCCCACCCA
  AACAAACCCCAAACAA
  AAAAAAACCAAAAAAA
  AAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAA
  .AAAAAAAAAAAAAA.
  .AAAAAAAAAAAAAA.
  ..AAAAAAAAAAAA..
  ..AAAAAAAAAAAA..
  ...AAAAAAAAAA...
  ....AAAAAAAA....`);
  add({ id: 'strawberry-pouch', name: 'Strawberry Pouch', chapter: 3, technique: 'Stranded polka dots',
    source: 'Stranded polka dots (single seed dots in B on stockinette, every 4th st, offset every 2 rows; carry B loosely behind), leafy top in C',
    repeat: { width: 4, edges: 0, rows: 4, at: 1 },
    finishing: 'Finishing: make a back the same. Place right sides together and seam the sides and the base, leaving the top open. Turn out. Thread a drawstring of C through the top rows.',
    slots: { A: Y('red', 'cotton'), B: Y('honey', 'cotton', 'Seeds'), C: Y('leaf', 'cotton', 'Leaves') }, touch: { kind: 'drawstring', at: 'top', slot: 'C' } },
  knit(BERRY).shape().colors((r, c, i) => {
    const R = i.r, C = i.c;
    if (R < 2 || R > 12) return null;
    return ((R % 4 === 2 && C % 4 === 1) || (R % 4 === 0 && C % 4 === 3)) ? 'B' : null;
  }, { where: (r, c) => true }));
}

const SNOW = pic(`
B..B..B
.B.B.B.
..BBB..
BBB.BBB
..BBB..
.B.B.B.
B..B..B`);
const MITTEN2 = stretch(`
..AAAAAAAAAA.......
.AAAAAAAAAAAA......
AAAAAAAAAAAAAA.....
AAAAAAAAAAAAAA..AA.
AAAAAAAAAAAAAA.AAAA
AAAAAAAAAAAAAA.AAAA
AAAAAAAAAAAAAA.AAAA
AAAAAAAAAAAAAAAAAA.
AAAAAAAAAAAAAAAAA..
AAAAAAAAAAAAAAAA...
AAAAAAAAAAAAAAA....
AAAAAAAAAAAAAAA....
AAAAAAAAAAAAAAA....
AAAAAAAAAAAAAAA....
AAAAAAAAAAAAAAA....`, 24);
add({ id: 'snowflake-mitten', name: 'Snowflake Mitten', chapter: 3, technique: 'Stranded motif',
  source: 'Stranded snowflake motif (7 sts × 9 rows) on a stockinette mitten, 1×1 rib cuff with a stripe, thumb gusset',
  repeat: { width: 2, edges: 1, rows: 2 }, wear: { slot: 'hands', fit: 'pair' }, parts: 'part', partLabels: ['Thumb', 'Hand'],
  finishing: pairOf(backSeam('the cuff (cast-on edge)', true)),
  slots: { A: Y('navy'), B: Y('cream', 'wool', 'Snowflake') } },
knit(MITTEN2).shape().texture('rib1', { rows: [1, 5] }).texture('stockinette', { rows: [6, 24] })
  .colors((r) => (r === 3 ? 'B' : null))
  .paint(stretch(SNOW, 9), 4, 10).paint(['B.B.B.B.B.B.B.B'], 0, 7));

{
  // argyle: 8-st × 12-row diamonds (rows 2, 4, 4, 6, 6, 8, 8, 6, 6, 4, 4, 2 sts wide, so they
  // never pinch), alternating B and C, crossed by D overcheck lines
  const DW = [2, 4, 4, 6, 6, 8, 8, 6, 6, 4, 4, 2];
  const argyle = (r, c) => {
    const yi = ((r - 1) % 12 + 12) % 12, x = ((c % 8) + 8) % 8 + 0.5, y = yi + 0.5;
    const cx = Math.floor(c / 8), cy = Math.floor((r - 1) / 12);
    // overcheck lines: each tile's diagonals, through the diamond centres and the corners
    const d1 = Math.abs(x - y * (8 / 12)), d2 = Math.abs(8 - x - y * (8 / 12));
    if (d1 < 0.5 || d2 < 0.5) return 'D';
    if (Math.abs(x - 4) >= DW[yi] / 2) return 'A';
    return (cx + cy) % 2 ? 'C' : 'B';
  };
  const p = knit(sockArt(20, 16, 4, 4, 4, 10, 3, 28)).shape();
  const { leg, cuff } = sockRows(p, 4);
  p.texture('stockinette').texture('rib2', { rows: [cuff, p.H] });
  // one band of diamonds on the leg, above a plain A foot and instep
  p.colors((r, c) => argyle(r, c), { rows: [cuff - 12, cuff - 1], cols: [4, 19], origin: [cuff - 12, 4] });
  add({ id: 'argyle-sock', name: 'Argyle Sock', chapter: 3, technique: 'Argyle',
    source: 'Argyle (8-st × 12-row diamonds in two colors with diagonal overcheck lines), worked as intarsia on the leg of a profile sock',
    repeat: { width: 8, edges: 0, rows: 12, at: cuff - 12 }, wear: { slot: 'feet', fit: 'pair' },
    finishing: pairOf(backSeam('the cuff (bind-off edge)', true).replace('in the same colors', 'in the same colors (the argyle may be left off the back)')),
    notes: ['Knit the diamonds in intarsia, with a bobbin for each diamond and each area of A between them; twist the yarns at every color change to avoid holes. Work the D overcheck lines afterwards in duplicate stitch, following the chart.'],
    slots: { A: Y('navy'), B: Y('honey', 'wool', 'Diamonds, heel, toe, cuff'), C: Y('cranberry', 'wool', 'Diamonds 2'), D: Y('cream', 'wool', 'Lines') } },
  p);
}

// =====================================================================================
// Chapter 4. Cables and Texture
// =====================================================================================

add({ id: 'cable-headband', name: 'Cable Headband', chapter: 4, technique: 'Rope cable',
  source: 'Rope cable: C4F every 6th row, between p2 and edge stitches', repeat: { width: 4, edges: 6, rows: 6 },
  wear: { slot: 'head', fit: 'band' }, finishing: RING, slots: { A: Y('cream') } },
knit(rect(10, 36)).texture(at((r, c) => {
  if (c === 0 || c === 9) return 'k';
  if (c <= 2 || c >= 7) return 'p';
  return r % 6 === 5 ? 'F' : 'k';
})));

add({ id: 'aran-mug-cozy', name: 'Aran Mug Cozy', chapter: 4, technique: 'Cables on seed stitch',
  source: 'Aran rope cables (C4B every 4th row) framed by p1, on a seed-stitch ground', repeat: { width: 8, edges: 4, rows: 4 },
  finishing: 'Finishing: weave in the ends and block. Wrap round a mug and seam the side edges above and below the handle.',
  slots: { A: Y('oatmeal') } },
knit(rect(20, 12)).texture(at((r, c) => {
  if (c === 3 || c === 8 || c === 11 || c === 16) return 'p';
  if ((c >= 4 && c <= 7) || (c >= 12 && c <= 15)) return r % 4 === 3 ? 'R' : 'k';
  return (r + c) % 2 === 1 ? 'k' : 'p';
})));

add({ id: 'honeycomb-cowl', name: 'Honeycomb Cowl', chapter: 4, technique: 'Two-stitch cables',
  source: 'Honeycomb (C2B, C2F, then C2F, C2B 4 rows later; 8-row repeat) in a garter edge', repeat: { width: 4, edges: 4, rows: 8 },
  wear: { slot: 'neck', fit: 'band' }, finishing: TUBE, slots: { A: Y('mint') } },
(() => {
  const p = knit(rect(24, 16)); garterRows(p, 1, 2); garterRows(p, 15, 16);
  const hc = tile(['kkkk', 'RRFF', 'kkkk', 'kkkk', 'kkkk', 'FFRR', 'kkkk', 'kkkk']); // cables on rows 3 and 7 of 8
  return p.texture(framed(hc, { left: 2, edge: 'garter' }), { rows: [3, 14] });
})());

add({ id: 'bobble-cushion', name: 'Bobble Cushion', chapter: 4, technique: 'Bobbles',
  source: 'Bobble diamonds: purl-stitch diamond outlines on stockinette with a bobble (MB) at each centre', repeat: { width: 10, edges: 1, rows: 10 },
  finishing: 'Finishing: make a back in A. Place right sides together and seam round 3 sides, turn out, stuff and sew the last side closed.',
  notes: ['Work each bobble (MB) in B: join B for the bobble only and cut it after, leaving a tail to weave in.'],
  slots: { A: Y('cream'), B: Y('honey', 'wool', 'Bobbles') } },
knit(rect(21, 20)).texture((r, c) => {
  const x = c % 10, dy = ((r - 1) % 10) - 4;
  const d = Math.abs(x - 5) + Math.abs(dy);
  return d === 0 ? 'b' : d === 5 ? 'p' : 'k';
}).colors((r, c) => (c % 10 === 5 && (r - 1) % 10 === 4 ? 'B' : null)));

add({ id: 'fisherman-beanie', name: 'Fisherman Beanie', chapter: 4, technique: 'Cable in rib',
  source: '2×2 rib with a centre rope cable (C4F every 6th row, between p3), crown decreases', repeat: { width: 4, edges: 2, rows: 2 },
  wear: { slot: 'head', fit: 'dome' }, finishing: backSeam('the brim (cast-on edge)'), slots: { A: Y('oatmeal') } },
knit(crown(22, 13, 9)).shape().texture(at((r, c) => {
  if (c === 7 || c === 8 || c === 13 || c === 14) return 'p';
  if (c >= 9 && c <= 12) return r % 6 === 5 ? 'F' : 'k';
  return c % 4 < 2 ? 'k' : 'p';
})));

add({ id: 'braided-scarf-panel', name: 'Braided Scarf Panel', chapter: 4, technique: 'Plait cable',
  source: '9-st plait (braid) cable: C6F, k3, then 4 rows later k3, C6B (8-row repeat), between p2', repeat: { width: 9, edges: 4, rows: 8 },
  wear: { slot: 'neck', fit: 'hang' }, finishing: FLAT, slots: { A: Y('cranberry') } },
knit(rect(13, 40)).texture(at((r, c) => {
  if (c <= 1 || c >= 11) return 'p';
  if (r % 8 === 3 && c >= 5) return 'F';
  if (r % 8 === 7 && c <= 7) return 'R';
  return 'k';
})));

// =====================================================================================
// Chapter 5. Lace
// =====================================================================================

{
  const eye1 = ko('k' + '<okk'.repeat(3) + 'k'), eye2 = ko('k' + 'kk<o'.repeat(3) + 'k');
  add({ id: 'eyelet-dishcloth', name: 'Eyelet Dishcloth', chapter: 5, technique: 'Eyelets',
    source: 'Allover eyelets (k2tog, yo; offset by 2 sts every 4 rows) in a garter border', repeat: { width: 4, edges: 2, rows: 8 },
    finishing: FLAT, slots: { A: Y('mint', 'cotton') } },
  (() => {
    const p = knit(rect(14, 14)); garterRows(p, 1, 2); garterRows(p, 13, 14);
    return p.texture(at((r, c) => {
      if (c === 0 || c === 13) return odd(r) ? 'k' : 'p';
      if (r === 5) return eye1[c];
      if (r === 9) return eye2[c];
      return 'k';
    }), { rows: [3, 12] });
  })());
}

{
  const v1 = ko('kkk' + 'okk><kkok' + 'k'), v3 = ko('kk' + 'okk><kkok' + 'kk');
  add({ id: 'vine-lace-bookmark', name: 'Vine Lace Bookmark', chapter: 5, technique: 'Lace that travels',
    source: 'Vine lace (RS: yo, k2, ssk, k2tog, k2, yo, k1; shifting one st every other RS row), 9+4 sts, 4 rows', repeat: { width: 9, edges: 4, rows: 4 },
    finishing: 'Finishing: weave in the ends and block, pinning the edges straight. Make a tassel and sew it to the middle of the bind-off edge.',
    slots: { A: Y('lilac', 'cotton') }, touch: { kind: 'tassel', at: 'top' } },
  (() => {
    const p = knit(rect(13, 28)); garterRows(p, 1, 2); garterRows(p, 27, 28);
    return p.texture(at((r, c) => (r % 4 === 3 ? v1[c] : r % 4 === 1 ? v3[c] : 'k')), { rows: [3, 26] });
  })());
}

{
  // 10-row lace diamond, 10+1: yo with ssk below the widest row, k2tog above (each leans with its line)
  const T = { 1: 'kkkk>okkkk', 3: 'kkk>oko<kk', 5: 'kkko>k<okk', 7: 'kkk<oko>kk', 9: 'kkkk<okkkk' };
  add({ id: 'lace-doily', name: 'Lace Doily Square', chapter: 5, technique: 'Lace diamonds',
    source: 'Lace diamonds (yarn-overs outlined with ssk and k2tog), 10+1 sts, 10 rows, in a garter edge', repeat: { width: 10, edges: 1, rows: 10 },
    finishing: 'Finishing: weave in the ends. Wet-block, pinning the edges straight and the corners square.',
    slots: { A: Y('white', 'cotton') } },
  (() => {
    const p = knit(rect(21, 24)); garterRows(p, 1, 2); garterRows(p, 23, 24);
    return p.texture(at((r, c) => {
      if (c === 0 || c === 20) return odd(r) ? 'k' : 'p';
      const lr = ((r - 3) % 10) + 1;
      return T[lr] ? T[lr][c % 10] : 'k';
    }), { rows: [3, 22] });
  })());
}

{
  // Old Shale: row 3 of the repeat (RS) k1, *[k2tog] 3 times, [yo, k1] 6 times, [k2tog] 3 times; rep from *, k1
  const shale = ko('k' + ('<<<' + 'ok'.repeat(6) + '<<<').repeat(2) + 'k');
  add({ id: 'feather-fan-shawlette', name: 'Feather-and-Fan Shawlette', chapter: 5, technique: 'Old Shale',
    source: 'Old Shale (feather and fan), 18-st 4-row repeat: knit, purl, [k2tog] 3 times, [yo, k1] 6 times, [k2tog] 3 times, knit; 4-row stripes',
    repeat: { width: 18, edges: 2, rows: 4 }, wear: { slot: 'shoulders', fit: 'drape' },
    drape: { type: 'auto', amplitude: 1.1, shape: 'cos' }, // the scallops: up over the yarn-overs, down at the decreases
    finishing: 'Finishing: weave in the ends. Wet-block, pinning out each scallop along the cast-on edge.',
    slots: { A: Y('plum'), B: Y('rose', 'wool', 'Stripe') } },
  (() => {
    const p = knit(rect(38, 18)); garterRows(p, 1, 2);
    return p.texture(at((r, c) => {
      const lr = (r - 3) % 4; // 0 knit (RS), 1 purl (WS), 2 lace (RS), 3 knit (WS)
      if (lr === 2) return shale[c];
      if (lr === 3) return 'p';
      return 'k';
    }), { rows: [3, 18] }).colors((r) => (r >= 7 && Math.floor((r - 3) / 4) % 2 === 1 ? 'B' : null));
  })());
}

{
  const p = knit(sockArt(17, 12, 4, 4, 4, 11, 3, 26)).shape();
  const { leg, cuff } = sockRows(p, 5);
  const A = ko('pp' + 'ko>pp'.repeat(2)), B = ko('pp' + '<okpp'.repeat(2)), WS = 'ppkkkppkkkpp';
  p.texture('stockinette');
  p.texture(at((r, c) => {
    const lc = c - 5;
    if (r >= cuff || r % 2 === 0 || r <= leg) return WS[lc];
    return r % 4 === 1 ? A[lc] : B[lc];
  }), { rows: [leg, p.H], cols: [5, 16] });
  add({ id: 'lace-sock', name: 'Lace Sock', chapter: 5, technique: 'Lace rib',
    source: 'Lace rib on the leg (RS rows: p2, *k1, yo, ssk, p2; then p2, *k2tog, yo, k1, p2), k3/p2 rib cuff, profile sock with shaped heel and toe',
    repeat: { width: 5, edges: 2, rows: 4, at: leg }, wear: { slot: 'feet', fit: 'pair' },
    finishing: pairOf(backSeam('the cuff (bind-off edge)', true)), notes: [INTARSIA],
    slots: { A: Y('rose'), B: Y('plum', 'wool', 'Heel, toe and cuff') } },
  p);
}

{
  const chev = ko('k' + '>kkkkokokkkk<'.repeat(2) + 'k');
  add({ id: 'chevron-baby-blanket', name: 'Chevron Baby Blanket', chapter: 5, technique: 'Chevrons',
    source: 'Chevron (13 sts: ssk and k2tog paired at each valley, a yarn-over either side of each peak; 2-row repeat), 4-row stripes, garter edges',
    repeat: { width: 13, edges: 2, rows: 2 }, finishing: FLAT,
    drape: { type: 'auto', amplitude: 1.5, shape: 'linear' }, // the zigzag: peaks at the yarn-overs, valleys at the decreases
    slots: { A: Y('mint', 'cotton'), B: Y('cream', 'cotton', 'Stripe 2'), C: Y('sky', 'cotton', 'Stripe 3') } },
  (() => {
    const p = knit(rect(28, 28)); garterRows(p, 1, 2); garterRows(p, 27, 28);
    return p.texture(at((r, c) => {
      if (c === 0 || c === 27) return odd(r) ? 'k' : 'p';
      return odd(r) ? chev[c] : 'k';
    }), { rows: [3, 26] }).colors((r) => 'ABC'[Math.floor((r - 1) / 4) % 3]);
  })());
}

// =====================================================================================
// Chapter 6. Knitted Friends (toy fronts; the back is plain)
// The pictures are drawn with square cells and stretched to knitted rows (see stretch()).
// Art letters: A-D a stitch in that slot, a-d a PURL stitch in that slot, E a button-eye spot.
// =====================================================================================

// one button eye per column: the top cell of each marked spot
const eyesOf = (p) => { const by = new Map(); for (const [r, c] of p.spots.E || []) if (!by.has(c) || by.get(c) < r) by.set(c, r); return [...by].map(([c, r]) => [r, c]); };

{
  const p = knit(stretch(`
  ...AA......AA...
  ..ABBA....ABBA..
  ..ABBA....ABBA..
  ..ABBA....ABBA..
  ..AAAAAAAAAAAA..
  .AAAEAAAAAAEAAA.
  .AAAAAABBAAAAAA.
  ..AAAAAAAAAAAA..
  ....AAAAAAAA....
  ..AAAAAAAAAAAA..
  .AAAAAAAAAAAAAA.
  ..AAAAAAAAAAAA..`, 24)).shape({ singles: 'rs' }).texture('garter');
  add({ id: 'little-bunny', name: 'Little Bunny', chapter: 6, technique: 'Ears worked separately',
    source: 'Garter-stitch toy; ears worked separately with pink intarsia linings; button eyes', repeat: { width: 1, edges: 0, rows: 2 },
    parts: 'ear', notes: [INTARSIA], finishing: TOY.replace('Weave in the ends.', 'Sew on two button eyes.' + SAFE + ' Weave in the ends.'),
    slots: { A: Y('cream'), B: Y('pink', 'wool', 'Ears and nose') }, touch: { kind: 'button-eyes', cells: eyesOf(p) } },
  p);
}

{
  const p = knit(stretch(`
  .A............A.
  .AA..........AA.
  .AAA........AAA.
  .AAAAAAAAAAAAAA.
  AAAAAAAAAAAAAAAA
  AAADDAAAAAADDAAA
  AAAAAAACCAAAAAAA
  bbbAAABBBBAAAbbb
  .AAAABBBBBBAAAA.
  ..AAAAAAAAAAAA..
  ...AAABBBBAAA...
  ..AAABBBBBBAAA..
  ..AAABBBBBBAAA..
  ..AAAAAAAAAAAA..`, 18)).shape().texture('stockinette');
  add({ id: 'cat-toy', name: 'Cat Toy', chapter: 6, technique: 'Intarsia face',
    source: 'Stockinette toy with an intarsia face and chest, purl-stitch whiskers in B; ears worked separately', repeat: { width: 1, edges: 0, rows: 2 },
    parts: 'ear', finishing: TOY, notes: [INTARSIA],
    slots: { A: Y('grey'), B: Y('white', 'wool', 'Muzzle, chest, whiskers'), C: Y('pink', 'wool', 'Nose'), D: Y('leaf', 'wool', 'Eyes') } },
  p);
}

{
  // drawn as runs (bottom first). The body grows by casting on at the row starts; at row 9 the
  // tail splits off (1 st bound off under the gap) and climbs as a 2-3 st column (M1 between two
  // sts, then a decrease); the body is bound off at row 14 while the tail widens to 5 sts; at
  // row 15 the middle st is bound off, leaving two flukes of 2 sts, each decreased to 1.
  const rows = [
    [[4, 12]], [[2, 12]], [[2, 14]], [[1, 14]], [[0, 16]], [[0, 16]], [[0, 18]], [[0, 18]], // rows 1-8: the body
    [[1, 14], [16, 18]],  //  9 (RS): the split
    [[2, 13], [17, 18]],  // 10
    [[2, 13], [17, 19]],  // 11 tail: k1, M1, k1
    [[4, 13], [18, 19]],  // 12 body: BO 2 (WS start); tail: p2tog, p1
    [[4, 13], [18, 20]],  // 13
    [[17, 21]],           // 14 body bound off; tail 3 -> 5 (an M1 each side of the middle st)
    [[17, 18], [20, 21]], // 15 (RS): the middle st bound off: two flukes of 2 sts
    [[17, 17], [21, 21]], // 16 each fluke decreased to 1, leaning out to its tip
  ];
  const art = runsArt(23, rows).map((l, i) => {
    const r = rows.length - i;
    return r <= 5 ? l.replace(/A/g, 'B') : r === 8 ? l.slice(0, 3) + 'D' + l.slice(4) : l;
  });
  const p = knit(art).shape();
  p.texture(at((r, c) => (r === 4 ? 'p' : 'k'))); // a purl ridge across the belly
  add({ id: 'whale', name: 'Whale', chapter: 6, technique: 'Cast on at the row starts',
    source: 'Stockinette whale with a purl ridge across the belly; the body grown by casting on at the starts of rows, then the body and the tail worked separately; the tail climbs and splits into two flukes',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: ['part', 'fluke'], partLabels: ['Tail', 'Body'],
    finishing: TOY.replace('plain in A where the front has the face', 'with the belly in B as the front and no eye'),
    slots: { A: Y('denim'), B: Y('sky', 'wool', 'Belly'), D: Y('black', 'wool', 'Eye') } },
  p);
}

{
  const p = knit(stretch(`
  ..AAAA......AAAA..
  .AACCAA....AACCAA.
  .ACDDCA....ACDDCA.
  AAAAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAAAA
  ABAAAAAAAAAAAAAABA
  AABBBBBBBBBBBBBBAA
  AAAAAAAAAAAAAAAAAA
  .AAAAAAAAAAAAAAAA.
  .AAAAAAAAAAAAAAAA.
  ..AAAAAAAAAAAAAA..`, 16)).shape().texture('seed');
  add({ id: 'frog', name: 'Frog', chapter: 6, technique: 'Seed-stitch toy',
    source: 'Seed-stitch body with an intarsia grin; eyes worked separately', repeat: { width: 2, edges: 0, rows: 2 },
    parts: 'eye', finishing: TOY, notes: [INTARSIA],
    slots: { A: Y('leaf'), B: Y('cranberry', 'wool', 'Grin'), C: Y('white', 'wool', 'Eyes'), D: Y('black', 'wool', 'Pupils') } },
  p);
}

{
  const p = knit(stretch(`
  ....AAAAAA....
  ...AAAAAAAA...
  ..AAAAAAAAAA..
  ..AABBBBBBAA..
  ..ABBABBABBA..
  ..ABBBCCBBBA..
  ..AABBBBBBAA..
  .AAABBBBBBAAA.
  AAAABBBBBBAAAA
  AAAABBBBBBAAAA
  .AAABBBBBBAAA.
  ..AABBBBBBAA..
  ..AABBBBBBAA..
  ..AAABBBBAAA..
  ..CCCAAAACCC..`, 22)).shape().texture('stockinette');
  add({ id: 'penguin', name: 'Penguin', chapter: 6, technique: 'Three-color intarsia',
    source: 'Stockinette toy with three-color intarsia (black back and flippers, white front and face, orange beak and feet)', repeat: { width: 1, edges: 0, rows: 2 },
    finishing: TOY.replace('plain in A where the front has the face', 'plain in A (the black back)'), notes: [INTARSIA],
    slots: { A: Y('charcoal'), B: Y('white', 'wool', 'Front'), C: Y('orange', 'wool', 'Beak and feet') } },
  p);
}

{
  const p = knit(stretch(`
  ....AAAAAAAAAA....
  ...AAAAAAAAAAAA...
  ..AAAAAAAAAAAAAA..
  .AAAAAAAAAAAAAAAA.
  .AAAABDAAAAABDAAA.
  .AAAAAAAAAAAAAAAA.
  ..AAAAAAAAAAAAAA..
  .AAAAAAAAAAAAAAAA.
  AAAAAAAAAAAAAAAAAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA`, 20)).shape({ singles: (r) => (r <= 8 ? 'rs' : 'any') });
  const legTop = (() => { let r = 1; while (p.runs(r + 1).length > 1) r++; return r; })();
  p.texture('garter', { rows: [1, legTop] }).texture('stockinette', { rows: [legTop + 1, p.H] });
  add({ id: 'octopus', name: 'Octopus', chapter: 6, technique: 'Legs joined',
    source: 'Four garter-stitch legs cast on and worked separately, then joined (cast on across each gap); stockinette head. The front has 4 legs, the back the other 4',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: 'leg',
    finishing: `Finishing: work a back as the front, with its own 4 legs, but plain in A (no eyes). Place the two pieces right sides together and seam round the head and down each side to the top of the legs (row ${legTop}), leaving the legs free: the front's 4 legs and the back's 4 make 8. Seam across the tops of the legs, front to back, between the legs, leaving the gap between the two middle legs open. Turn out through that gap, stuff the head and sew the gap closed. Weave in the ends.`,
    slots: { A: Y('coral'), B: Y('white', 'wool', 'Eyes'), D: Y('black', 'wool', 'Pupils') } },
  p);
}

{
  const p = knit(stretch(`
  .C............C...
  .CA..........AC...
  .AAA........AAA...
  .AAAAAAAAAAAAAA...
  AAAAAAAAAAAAAAAA..
  AAADAAAAAAAADAAA..
  ABBAAAAAAAAAABBA..
  .BBBBAAAAAABBBB...
  ..BBBBBBBBBBBB....
  ....BBBCCBBB......
  .....AAAAAA.......
  ....AAABBAAA...AB.
  ...AAABBBBAAA.AABB
  ...AAABBBBAAAAAAB.
  ...AAAAAAAAAAAAA..`, 20)).shape().texture('stockinette');
  add({ id: 'fox', name: 'Fox', chapter: 6, technique: 'Intarsia chest and tail',
    source: 'Stockinette toy: intarsia white chest and muzzle, black ear tips and nose, ears worked separately, the tail grown at the row starts with a white tip',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: ['part', 'ear'], partLabels: ['Tail', 'Body'], finishing: TOY, notes: [INTARSIA],
    slots: { A: Y('rust'), B: Y('white', 'wool', 'Chest and tail tip'), C: Y('black', 'wool', 'Ear tips and nose'), D: Y('charcoal', 'wool', 'Eyes') } },
  p);
}

{
  // drawn row by row (bottom first) so both sides step alike: legs cast on separately and joined,
  // paws cast on at the row starts, the neck bound off 2 sts at the start of 2 rows, round ears
  const art = [
    '.AAA..........AAA.', // 22 the ears, decreased
    'ABBAA........AABBA', // 21
    'ABBAA........AABBA', // 20 the ears worked separately (BO 8 under the gap)
    'ABBAAAAAAAAAAAABBA', // 19
    '.AAAAAAAAAAAAAAAA.', // 18
    '.AACAAAAAAAAAACAA.', // 17 eyes
    '.AACAAAAAAAAAACAA.', // 16
    '.AAAAABBBBBBAAAAA.', // 15 muzzle
    '..AAABBBCCBBBAAA..', // 14 nose
    '..AAABBBCCBBBAAA..', // 13 neck: BO 2 (RS)
    '..AAAAAAAAAAAAAAAA', // 12 neck: BO 2 (WS)
    'AAAAAABBBBBBAAAAAA', // 11 paws
    'AAAAAABBBBBBAAAAAA', // 10 paws cast on (WS)
    '..AAAABBBBBBAAAAAA', //  9 paws cast on (RS)
    '..AAAABBBBBBAAAA..', //  8 tummy
    '..AAABBBBBBBBAAA..', //  7
    '..AAAABBBBBBAAAA..', //  6
    '..AAAABBBBBBAAAA..', //  5
    '..AAAAAAAAAAAAAA..', //  4 legs joined
    '..AAAAAA..AAAAAA..', //  3
    '..AAAAAA..AAAAAA..', //  2
    '..AAAAAA..AAAAAA..', //  1 legs cast on separately
  ];
  const p = knit(art).shape().texture('stockinette');
  add({ id: 'teddy-bear', name: 'Teddy Bear', chapter: 6, technique: 'Round ears',
    source: 'Stockinette bear: legs cast on separately and joined, paws cast on at the row starts, the neck bound off at the starts of two rows, round ears worked separately, intarsia tummy patch, muzzle and ear linings',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: ['leg', 'ear'], finishing: TOY, notes: [INTARSIA],
    slots: { A: Y('brown'), B: Y('tan', 'wool', 'Tummy, muzzle, ears'), C: Y('black', 'wool', 'Eyes and nose') } },
  p);
}
// =====================================================================================
// Chapter 7. Big Projects
// =====================================================================================

add({ id: 'tea-cosy', name: 'Tea Cosy', chapter: 7, technique: 'Garter stripes and a dome',
  source: 'Garter stitch in 2-row stripes (one ridge each), dome decreases on RS rows and bind-offs at the row starts',
  repeat: { width: 1, edges: 0, rows: 2 }, touch: { kind: 'pompom', at: 'top', slot: 'B' },
  finishing: 'Finishing: make a back the same. Place right sides together and seam the top and the sides, leaving a gap in each side for the spout and the handle and the cast-on edge open. Turn out, make a pom-pom in B and sew it to the top. Weave in the ends.',
  slots: { A: Y('cranberry'), B: Y('cream', 'wool', 'Stripes') } },
knit(dome(22, 10, [22, 22, 20, 20, 20, 20, 18, 18, 16, 16, 14, 14, 10, 10])).shape({ singles: 'rs' }).texture('garter').colors((r) => (Math.floor((r - 1) / 2) % 2 ? 'B' : 'A')));

{
  const PEERIE = pic(`
  .B..B.
  ..BB..
  .BBBB.
  BB..BB
  .BBBB.
  ..BB..
  .B..B.`);
  const W = 20;
  const rows = [];
  // top first: cuff (garter, B), leg (14 sts, cols 6-19) with the band, foot (20 sts), sole CO 18
  for (let i = 0; i < 7; i++) rows.push('......' + 'B'.repeat(14));
  for (let i = 0; i < 15; i++) rows.push('......' + 'A'.repeat(14));
  rows.push('...BB' + 'A'.repeat(15), '..BBB' + 'A'.repeat(15), '.BBBB' + 'A'.repeat(15));
  for (let i = 0; i < 7; i++) rows.push('BBBBB' + 'A'.repeat(11) + 'BBBB');
  rows.push('.BBBB' + 'A'.repeat(11) + 'BBB.');
  const p = knit(rows).shape({ singles: (r) => (r >= 28 ? 'rs' : 'any') });
  const H = rows.length; // 33
  p.texture('stockinette', { rows: [1, H - 7] }).texture('garter', { rows: [H - 6, H] });
  p.colors(motif(PEERIE), { rows: [17, 23], cols: [7, 18], origin: [17, 7] });
  p.colors((lr, lc, i) => (p.col[i.r][i.c] === 'A' ? 'C' : null), { rows: [17, 23], cols: [6, 19] });
  add({ id: 'holiday-stocking', name: 'Holiday Stocking', chapter: 7, technique: 'Stranded band on a stocking',
    source: 'Stranded peerie band (6-st, 7-row diamond band) on stockinette, garter cuff; heel and toe shaped at the edges, the toe bound off at the ankle',
    repeat: { width: 6, edges: 2, rows: 7, at: 17 }, touch: { kind: 'loop', at: 'top-right' },
    notes: ['Work the heel and toe blocks in intarsia, with a separate bobbin of B for each; twist the yarns at every color change. Strand the peerie band, carrying the yarn not in use loosely behind.'],
    finishing: 'Finishing: make a back the same (the mirror image). Place right sides together and seam round, leaving the top open. Turn out, add a hanging loop of B at the heel side of the cuff and weave in the ends.',
    slots: { A: Y('red'), B: Y('white', 'wool', 'Cuff, heel, toe, motif'), C: Y('forest', 'wool', 'Band') } },
  p);
}

{
  // tail end at the cast-on, tapering to a ribbed neck; each leg hole is 2 rows tall
  const a = widths(26, [...Array(18).fill(26), 24, 24, 22, 22, 22, 22, 22, 22]);
  a[26 - 12] = 'AAA.....AAAAAAAAAA.....AAA'; // row 12: each leg hole bound off, then cast on across it in row 13
add({ id: 'dog-sweater', name: 'Dog Sweater', chapter: 7, technique: 'Leg holes',
    source: '2×2 rib edges, stockinette with two stripes, tapered to the neck, two leg holes worked like buttonholes (BO 5 sts for each, then CO 5 sts across each gap on the next row)',
    repeat: { width: 4, edges: 2, rows: 2 },
    finishing: 'Finishing: weave in the ends and block. Wrap round the dog with the rib at the neck and seam the side edges together under the belly, leaving the leg holes open. It\'s for a dog, so no doll can wear it.',
    slots: { A: Y('denim'), B: Y('honey', 'wool', 'Rib and stripes') } },
  knit(a).shape().texture('rib2', { rows: [1, 4] }).texture('stockinette', { rows: [5, 22] }).texture('rib2', { rows: [23, 26] })
    .colors((r) => (r <= 4 || r >= 23 || r === 7 || r === 8 || r === 16 || r === 17 ? 'B' : null)));
}

{
  const SQ = [
    ['garter', 'seed', 'moss'],
    ['doubleSeed', 'garterRib', 'basket3'],
    ['brokenRib', 'stockinette', 'eyelets'],
  ]; // bottom row of squares first
  const eye = (lr, lc) => { // eyelets on local rows 3, 7 and 11 of the square (all RS), offset by 2 sts
    if (lr === 3 || lr === 11) return ko('k<okkk<okkkk')[lc];
    if (lr === 7) return ko('kkk<okkk<okk')[lc];
    return 'k';
  };
  const p = knit(rect(36, 36));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const t = SQ[i][j];
    const tex = t === 'eyelets' ? at((r, c) => eye(r - 24, c - 24))
      : t === 'doubleSeed' ? (r, c) => ((Math.floor((r - 1) / 2) + Math.floor(c / 2)) % 2 === 0 ? 'k' : 'p') // 2×2 checks
      : t === 'garterRib' ? (r, c, i) => (odd(i.r) ? (c % 4 < 2 ? 'k' : 'p') : 'p') // RS k2, p2; WS knit
      : t;
    p.texture(tex, { rows: [i * 12 + 1, i * 12 + 12], cols: [j * 12, j * 12 + 11] });
  }
  p.colors((r, c) => { const i = Math.floor((r - 1) / 12), j = Math.floor(c / 12); return i === 1 && j === 1 ? 'C' : (i + j) % 2 ? 'B' : 'A'; });
  add({ id: 'patchwork-blanket', name: 'Patchwork Blanket', chapter: 7, technique: 'Sampler',
    source: 'Sampler: 9 squares of 12 × 12 (garter, seed, moss, double seed, garter rib, k3/p3 basketweave, broken rib, stockinette, eyelets), knit in one piece; textures picked to knit to about the same gauge, so the squares lie flat together', notes: [INTARSIA],
    repeat: { width: 12, edges: 0, rows: 12 }, finishing: FLAT,
    slots: { A: Y('cream'), B: Y('sage', 'wool', 'Squares 2'), C: Y('honey', 'wool', 'Centre square') } },
  p);
}

{
  // dolman front: body 24 sts, sleeves grown at the row starts and ends (an underarm at
  // about 30 degrees), yoke band across body and sleeves, neck worked as two shoulders
  const W = 40;
  const rows = []; // bottom first, as [from, to] runs
  for (let r = 1; r <= 24; r++) rows.push([[8, 31]]);
  rows.push([[7, 33]], [[5, 34]], [[4, 36]], [[2, 37]], [[1, 39]], [[0, 39]]); // rows 25-30: the sleeves
  for (let r = 31; r <= 40; r++) rows.push([[0, 39]]);
  rows.push([[0, 34]], [[5, 34]], [[5, 15], [24, 30]], [[9, 15], [24, 30]], [[9, 14], [25, 30]], [[10, 14], [25, 29]]); // rows 41-46
  const lines = rows.map((runs) => { let s = ''; for (let c = 0; c < W; c++) s += runs.some(([a, b]) => c >= a && c <= b) ? 'A' : '.'; return s; }).reverse();
  const YOKE = pic(`
  C.C.C.C.
  ........
  ...B....
  ..BBB...
  .BB.BB..
  BB...BB.
  .BB.BB..
  ..BBB...
  ...B....`);
  const p = knit(lines).shape();
  const rib = (r, c) => ((c + 1) % 4 < 2 ? 'k' : 'p');
  p.texture('stockinette');
  p.texture(rib, { rows: [1, 4] });
  p.texture(at((r, c) => (c === 1 || c === 38 ? 'k' : 'p')), { rows: [27, 42], where: (r, c) => c <= 2 || c >= 37 }); // cuffs: p1, k1, p1
  p.colors(motif(YOKE), { rows: [31, 39], origin: [31, 0], where: (r, c) => c > 2 && c < 37 });
  add({ id: 'yoke-sweater', name: 'Yoke Sweater', chapter: 7, technique: 'Dolman sleeves and a yoke',
    source: 'Stranded yoke band (8-st, 9-row star band) on a dolman front: 2×2 rib hem, sleeves grown over 6 rows (cast on at the row starts and M1 at the row ends, an underarm at about 30 degrees), 1×1 rib cuff columns, shoulders worked separately round the neck',
    repeat: { width: 8, edges: 0, rows: 9, at: 31 }, wear: { slot: 'body', fit: 'body' }, parts: 'shoulder', partLabels: ['Left shoulder', 'Right shoulder'],
    notes: ['Left and right are as worn: the left shoulder is on the right of the chart.', 'Strand the yoke band, carrying the yarn not in use loosely behind; on the cuff columns work in A only.'],
    finishing: 'Finishing: make a back the same (or plain in A). Place right sides together and seam the shoulders and the tops of the sleeves, leaving the neck open, then seam the underarms and the sides, leaving the hem and the cuffs open. Turn out, weave in the ends and block.',
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Yoke'), C: Y('sage', 'wool', 'Yoke dots') } },
  p);
}

{
  // two fronts from the cast-on (11 sts each), dolman sleeves, V-neck along the button bands
  const W = 41;
  const rows = [];
  const L = (r) => [9, 19], R = (r) => [21, 31];
  for (let r = 1; r <= 48; r++) {
    let [la, lb] = L(r), [ra, rb] = R(r);
    // the sleeves: 9 sts each, grown over rows 21-26 (cast on at the row starts, M1 at the ends)
    if (r >= 27) { la = [8, 6, 5, 3, 2, 0][Math.min(r - 27, 5)]; rb = [33, 34, 36, 37, 39, 40][Math.min(r - 27, 5)]; }
    if (r >= 31) { const k = Math.floor((r - 31) / 3) + 1; lb = 19 - k; ra = 21 + k; } // the V-neck: 1 st every 3rd row
    if (r >= 43) rb = 35;
    if (r >= 44) la = 5;
    if (r >= 45) rb = 30;
    if (r >= 46) la = 10;
    rows.push([[la, lb], [ra, rb]]);
  }
  const lines = rows.map((runs) => { let s = ''; for (let c = 0; c < W; c++) s += runs.some(([a, b]) => c >= a && c <= b) ? 'A' : '.'; return s; }).reverse();
  const p = knit(lines).shape();
  const seed = (r, c) => ((r + c) % 2 === 1 ? 'k' : 'p');
  p.texture(at((r, c, i) => {
    const left = c <= 20;
    // the button band: 3 seed sts along each front's inner edge
    if (left ? i.R - c < 3 : c - i.L < 3) return seed(r, c);
    if (r <= 2) return seed(r, c);
    if (c >= 9 && c <= 31) {
      const q = left ? c - 9 : 31 - c; // 0.. from the outer edge of the front
      if (q <= 1 || (q >= 6 && q <= 7)) return 'p';
      // a cable crosses only where all 4 of its sts are clear of the band and the neck
      const clear = left ? i.R >= 17 && i.L <= 11 : i.L <= 23 && i.R >= 29;
      if (q >= 2 && q <= 5) return r % 6 === 5 && clear ? (left ? 'F' : 'R') : 'k'; // C4F on one front, C4B on the other: they mirror
      return 'k';
    }
    if (c <= 2 || c >= 38) return c % 2 === 0 ? 'k' : 'p'; // cuff columns
    return 'k';
  }));
  // buttonholes on the left front band (as worn; the right part of the chart): k2tog, yo, then the
  // seed band carries on; the buttons go on the right front band
  const holes = [7, 13, 19, 25];
  for (const r of holes) { p.set(r, 21, seed(r, 21)); p.set(r, 22, 'o'); p.set(r, 23, '<'); }
  add({ id: 'cabled-cardigan', name: 'Cabled Cardigan', chapter: 7, technique: 'Two fronts at once',
    source: 'Two fronts worked separately from the cast-on: mirrored rope cables (C4F on one front, C4B on the other, every 6th row) in p2 panels, seed-stitch button bands with yo buttonholes, V-neck, dolman sleeves cast on at the row starts',
    repeat: { width: 8, edges: 6, rows: 6 }, wear: { slot: 'body', fit: 'body' }, parts: 'front', partLabels: ['Left front', 'Right front'],
    notes: ['The fronts are named as worn: the left front, with the buttonholes (as on a man\'s cardigan), is on the right of the chart.', 'Notions: 4 buttons.'],
    touch: { kind: 'buttons', cells: holes.map((r) => [r, 18]), slot: 'B' },
    finishing: 'Finishing: work the back in one piece. Cast on 23 sts in A. Rows 1–2: [p1, k1] 11 times, p1. Rows 3–26: stockinette (k on RS rows, p on WS rows). Rows 27–32: shape the sleeves as on the fronts, casting on 2 sts at the start of every row and working an M1 one st in from the end of every row (41 sts); from row 27 work the first and last 3 sts of every row in 1×1 rib as the cuffs. Rows 33–42: work even. Rows 43–46: bind off 5 sts at the start of each row (21 sts). Rows 47–48: work even. Bind off the remaining 21 sts. Place the back and the fronts right sides together and seam the shoulders and the tops of the sleeves, then the underarms and the sides. Turn out, sew the 4 buttons to the right front band opposite the buttonholes, weave in the ends and block.',
    slots: { A: Y('honey'), B: Y('brown', 'wool', 'Buttons') } },
  p);
}

{
  const W = 40, H = 40;
  const p = knit(rect(W, H));
  const PEERIE = pic(`
  ..B...
  .BBB..
  BB.BB.
  B...B.
  BB.BB.
  .BBB..
  ..B...`);
  const lace = { 1: 'kkkkk>okkkkk', 3: 'kkk>okko<kkk', 5: 'k>okkkkkko<k', 7: 'kkk<okko>kkk' };
  p.texture(at((r, c) => {
    if (c <= 1 || c >= 38 || r <= 2 || r >= 39) return odd(r) ? 'k' : 'p'; // garter border
    const lc = (c - 2) % 12;
    if (r <= 12) { // cable panels: p1, C4B, p2, C4F, p1 (in knitting order the right cable comes first)
      if (lc === 0 || lc === 5 || lc === 6 || lc === 11) return 'p';
      const cab = r === 5 || r === 9;
      if (lc >= 1 && lc <= 4) return cab ? 'F' : 'k';
      return cab ? 'R' : 'k';
    }
    if (r <= 14 || (r >= 22 && r <= 23) || (r >= 32 && r <= 33)) return odd(r) ? 'k' : 'p'; // garter ridges
    if (r <= 21) return 'k'; // Fair Isle band
    if (r <= 31) { const lr = r - 24; return lace[lr] ? lace[lr][lc] : 'k'; }
    // bobbles on reverse stockinette
    if (r === 35 && lc === 5) return 'b';
    if (r === 37 && lc === 11) return 'b';
    return 'p';
  }));
  p.colors((r, c) => {
    if (c <= 1 || c >= 38 || r <= 2 || r >= 39) return 'A';
    if (r >= 15 && r <= 21) { const m = motif(PEERIE)(r - 14, c - 2 + 0); return m || 'C'; }
    if (r >= 34 && r <= 38) return 'D';
    return null;
  });
  add({ id: 'heirloom-afghan', name: 'Heirloom Afghan', chapter: 7, technique: 'Everything together',
    source: 'Sampler afghan: garter border, cable panels (C4F and C4B), a Fair Isle diamond band, lace diamonds (yo with ssk and k2tog) and a bobble band, separated by garter ridges',
    repeat: { width: 12, edges: 4, rows: 8 }, finishing: 'Finishing: weave in the ends and block, pinning the garter border straight.',
    notes: ['On the Fair Isle and bobble bands use a separate small ball of A for each side border and twist the yarns at the color change; do not carry A across the band. Strand only B and C inside the Fair Isle band.'],
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Fair Isle motif'), C: Y('sage', 'wool', 'Fair Isle ground'), D: Y('honey', 'wool', 'Bobble band') } },
  p);
}

export const PATTERNS = P;
export const CHAPTERS = ['First Stitches', 'Warm Things', 'Colorwork', 'Cables and Texture', 'Lace', 'Knitted Friends', 'Big Projects'];
export const patternById = (id) => P.find((p) => p.id === id) || null;
export default P;
