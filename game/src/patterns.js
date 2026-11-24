// patterns.js — the 47 patterns of the Knit Knack book, in book order (7 chapters).
// Each pattern: {id, name, chapter, technique, source, repeat, wear, finishing, slots, touch,
// shape, stitch, color, cables, parts}. The three layers are built with patternKit.js from a
// silhouette (ASCII art whose letters are the color slots), a texture and motifs, and every
// one is checked by tools/check-patterns.mjs with chart.js (the code the game runs).
import { knit, pic, rect, widths, symmetric, mirror, polygon, tile, framed, motif, TEX, rsCells } from './patternKit.js';

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
const TUBE = 'Finishing: fold in half with right sides together, seam the side edges to make a tube, turn out, weave in the ends and block.';
const backSeam = (open, mirrorIt) => `Finishing: make a back the same${mirrorIt ? ' (the mirror image)' : ''} in A. Place the two pieces right sides together and seam round, leaving ${open} open. Turn out, weave in the ends and block.`;
const pairOf = (s) => s + ' Make a second one the same for the pair.';
const TOY = 'Finishing: make a back the same in A (plain, without the face). Place the two pieces right sides together and seam round, leaving the cast-on edge open. Turn out, stuff lightly and sew the opening closed. Weave in the ends.';

// ---------------------------------------------------------------- small helpers
const at = (fn) => (r, c, i) => fn(i.r, i.c, i);           // texture from absolute row/col
const odd = (r) => r % 2 === 1;
const garterRows = (p, a, b) => p.texture('garter', { rows: [a, b] });
const ko = (s) => rsCells(s);                                  // an RS row written in knitting order -> chart cells

const P = [];
const add = (meta, piece) => {
  const d = piece.def();
  P.push({
    id: meta.id, name: meta.name, chapter: meta.chapter, technique: meta.technique, source: meta.source,
    repeat: meta.repeat, wear: meta.wear || null, finishing: meta.finishing, slots: meta.slots, touch: meta.touch || null,
    shape: d.shape, stitch: d.stitch, color: d.color, cables: d.cables, parts: meta.parts || null,
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

add({ id: 'rolled-brim-beanie', name: 'Rolled-Brim Beanie', chapter: 2, technique: 'Crown decreases',
  source: 'Stockinette with a rolled brim (4 rows of reverse stockinette that roll outward), crown decreases (ssk at the right edge, k2tog at the left)',
  repeat: { width: 1, edges: 0, rows: 2 }, wear: { slot: 'head', fit: 'dome' },
  finishing: backSeam('the brim (cast-on edge)'), slots: { A: Y('sage'), B: Y('cream', 'wool', 'Brim') } },
knit(dome(18, 11, [16, 16, 14, 14, 12, 10, 8, 6])).shape().texture('reverse', { rows: [1, 4] }).texture('stockinette', { rows: [5, 20] })
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
knit(dome(18, 13, [16, 16, 14, 14, 12, 10, 8, 6])).shape().texture('rib2', { rows: [1, 6] }).texture('stockinette', { rows: [7, 22] })
  .colors((r) => (r <= 6 || r === 11 || r === 12 ? 'B' : null)));

add({ id: 'broken-rib-cowl', name: 'Broken Rib Cowl', chapter: 2, technique: 'Broken rib',
  source: 'Broken rib (RS: k1, *p1, k1; WS: purl)', repeat: { width: 2, edges: 1, rows: 2 }, wear: { slot: 'neck', fit: 'band' },
  finishing: TUBE, slots: { A: Y('rust'), B: Y('cream', 'wool', 'Stripe') } },
knit(rect(25, 14)).texture('brokenRib').colors((r) => (r === 3 || r === 4 || r === 11 || r === 12 ? 'B' : null)));

add({ id: 'fingerless-mitts', name: 'Fingerless Mitts', chapter: 2, technique: 'A thumb hole',
  source: '1×1 rib cuffs, stockinette, a one-row thumb hole (BO 3 under a gap, CO 3 across it)', repeat: { width: 2, edges: 1, rows: 2 },
  wear: { slot: 'hands', fit: 'pair' },
  finishing: pairOf('Finishing: make a back the same, without the thumb hole. Place right sides together and seam both side edges, leaving the cuff and the top open. Turn out, weave in the ends.'),
  slots: { A: Y('mustard'), B: Y('charcoal', 'wool', 'Cuffs') } },
(() => {
  const a = rect(13, 18); a[18 - 12] = 'AAAAAAAA...AA'; // row 12: the thumb hole
  return knit(a).shape().texture('rib1', { rows: [1, 5] }).texture('stockinette', { rows: [6, 14] }).texture('rib1', { rows: [15, 18] })
    .colors((r) => (r <= 5 || r >= 15 ? 'B' : null));
})());

const SOCK = pic(`
....BBBBBBBBBB
....BBBBBBBBBB
....BBBBBBBBBB
....BBBBBBBBBB
....BBBBBBBBBB
....BBBBBBBBBB
....AAAAAAAAAA
....AAAAAAAAAA
....AAAAAAAAAA
....AAAAAAAAAA
....AAAAAAAAAA
....AAAAAAAAAA
....AAAAAAAAAA
....AAAAAAAAAA
....AAAAAAAAAA
....AAAAAAAAAA
..BBAAAAAAAAAA
.BBBAAAAAAAAAA
BBBBAAAAAAABBB
BBBBAAAAAAABBB
BBBBAAAAAAABBB
BBBBAAAAAAABBB
BBBBAAAAAAABBB
.BBBAAAAAAABB.`);
add({ id: 'cozy-sock', name: 'Cozy Sock', chapter: 2, technique: 'Heel and toe shaping',
  source: 'Stockinette sock in profile: rounded heel and toe shaped at the edges, the toe bound off at the ankle, 2×2 rib cuff',
  repeat: { width: 4, edges: 2, rows: 2, at: 19 }, wear: { slot: 'feet', fit: 'pair' },
  finishing: pairOf(backSeam('the cuff (bind-off edge)', true)),
  slots: { A: Y('sky'), B: Y('cream', 'wool', 'Heel, toe and cuff') } },
knit(SOCK).shape().texture('stockinette', { rows: [1, 18] }).texture('rib2', { rows: [19, 24] }));

// mitten: cuff, thumb gusset grown with M1s at the right edge, then thumb and hand separately
const MITTEN = pic(`
..AAAAAAAA......
.AAAAAAAAAA.....
AAAAAAAAAAAA.AA.
AAAAAAAAAAAA.AAA
AAAAAAAAAAAA.AAA
AAAAAAAAAAAA.AAA
AAAAAAAAAAAA.AAA
AAAAAAAAAAAA.AAA
AAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAA.
AAAAAAAAAAAAAA..
AAAAAAAAAAAAAA..
AAAAAAAAAAAAA...
AAAAAAAAAAAAA...
BBBBBBBBBBBBB...
BBBBBBBBBBBBB...
BBBBBBBBBBBBB...
BBBBBBBBBBBBB...`);
add({ id: 'chunky-mitten', name: 'Chunky Mitten', chapter: 2, technique: 'Thumb gusset',
  source: 'Stockinette, 1×1 rib cuff, thumb grown out with M1s, then thumb and hand worked separately',
  repeat: { width: 2, edges: 1, rows: 2 }, wear: { slot: 'hands', fit: 'pair' }, parts: 'part',
  finishing: pairOf(backSeam('the cuff (cast-on edge)', true)),
  slots: { A: Y('teal', 'chunky'), B: Y('cream', 'chunky', 'Cuff') } },
knit(MITTEN).shape().texture('rib1', { rows: [1, 4] }).texture('stockinette', { rows: [5, 18] }));

// =====================================================================================
// Chapter 3. Colorwork
// =====================================================================================

{
  const O = ['..B..', '.B.B.', 'B...B', '.B.B.', '..B..'];
  const X = ['B...B', '.B.B.', '..B..', '.B.B.', 'B...B'];
  const band = (m) => m.map((l) => ('.' + l).repeat(2) + '.');
  const art = [
    'A'.repeat(13), ...band(X), 'B.B.B.B.B.B.B', ...band(O), 'A'.repeat(13),
  ].map((l) => l.replace(/\./g, 'A'));
  add({ id: 'fair-isle-coaster', name: 'Fair Isle Coaster', chapter: 3, technique: 'Stranded colorwork',
    source: 'Fair Isle OXO peerie (stranded, 2 colors): a band of Os and a band of Xs, 6+1 sts, 7 rows each',
    repeat: { width: 6, edges: 1, rows: 7 }, finishing: FLAT,
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Contrast') } },
  knit(art));
}

add({ id: 'checkerboard-washcloth', name: 'Checkerboard Washcloth', chapter: 3, technique: 'Two-color checks',
  source: 'Two-color stranded checks (4-st blocks, 4 rows tall)', repeat: { width: 8, edges: 0, rows: 8 }, finishing: FLAT,
  slots: { A: Y('sage', 'cotton'), B: Y('cream', 'cotton', 'Checks') } },
knit(rect(16, 16)).colors((r, c) => ((Math.floor((r - 1) / 4) + Math.floor(c / 4)) % 2 ? 'B' : 'A')));

{
  const heart = symmetric(pic(`
  ...BBB....
  .BBBBBB...
  BBBBBBBB..
  BBBBBBBBB.
  BBBBBBBBBB
  BBBBBBBBBB
  BBBBBBBBBB
  .BBBBBBBBB
  ..BBBBBBBB
  ...BBBBBBB
  ....BBBBBB
  .....BBBBB
  ......BBBB
  .......BBB
  ........BB
  .........B`).map((l) => l.slice(1)));
  const art = rect(20, 20).map((l, i) => {
    const hi = i - 2; // heart rows 3..18 from the top
    if (hi < 0 || hi >= heart.length) return l;
    const h = heart[hi];
    return ('..' + h + '..').replace(/\./g, 'A');
  });
  add({ id: 'heart-pillow', name: 'Heart Pillow', chapter: 3, technique: 'Intarsia',
    source: 'Intarsia heart on stockinette (a separate length of B for the heart, twisted at each color change)',
    repeat: { width: 1, edges: 0, rows: 2 },
    finishing: 'Finishing: make a back in A. Place right sides together and seam round 3 sides, turn out, stuff and sew the last side closed.',
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Heart') } },
  knit(art));
}

{
  // a fat five-pointed star, 15 wide; rows are 0.72 of a stitch wide, so y is stretched
  const W = 15, H = 19, cx = 7.5, cy = 10.2, R = 7.6, ri = 3.5, sy = 1 / 0.72;
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? ri : R;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a) * sy]);
  }
  const star = polygon(W, H, pts);
  add({ id: 'star-ornament', name: 'Star Ornament', chapter: 3, technique: 'Shaped points',
    source: 'Shaped stockinette star: two lower points cast on and worked separately, joined across the gap, arms cast on at the row starts, then decreases to the top point',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: 'point',
    finishing: 'Finishing: make a back the same. Place right sides together and seam round, leaving a small gap. Turn out, stuff lightly, sew closed and add a hanging loop at the top point.',
    slots: { A: Y('gold', 'cotton') }, touch: { kind: 'loop', at: 'top' } },
  knit(star).shape());
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
  add({ id: 'strawberry-pouch', name: 'Strawberry Pouch', chapter: 3, technique: 'Dot stitch',
    source: 'Dot stitch (single seed dots in B on stockinette, every 4th st, offset every 2 rows), leafy top in C',
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
const MITTEN2 = pic(`
..AAAAAAAAAA......
.AAAAAAAAAAAA.....
AAAAAAAAAAAAAA.AA.
AAAAAAAAAAAAAA.AAA
AAAAAAAAAAAAAA.AAA
AAAAAAAAAAAAAA.AAA
AAAAAAAAAAAAAA.AAA
AAAAAAAAAAAAAA.AAA
AAAAAAAAAAAAAA.AAA
AAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAA.
AAAAAAAAAAAAAAAA..
AAAAAAAAAAAAAAAA..
AAAAAAAAAAAAAAA...
AAAAAAAAAAAAAAA...
AAAAAAAAAAAAAAA...
AAAAAAAAAAAAAAA...
AAAAAAAAAAAAAAA...
AAAAAAAAAAAAAAA...
AAAAAAAAAAAAAAA...`);
add({ id: 'snowflake-mitten', name: 'Snowflake Mitten', chapter: 3, technique: 'Stranded motif',
  source: 'Stranded snowflake motif (7 × 7) on a stockinette mitten, 1×1 rib cuff with a stripe, thumb gusset',
  repeat: { width: 2, edges: 1, rows: 2 }, wear: { slot: 'hands', fit: 'pair' }, parts: 'part',
  finishing: pairOf(backSeam('the cuff (cast-on edge)', true)),
  slots: { A: Y('navy'), B: Y('cream', 'wool', 'Snowflake') } },
knit(MITTEN2).shape().texture('rib1', { rows: [1, 5] }).texture('stockinette', { rows: [6, 20] })
  .colors((r) => (r === 3 ? 'B' : null))
  .paint(SNOW, 4, 9).paint(['B.B.B.B.B.B.B.B'], 0, 7));

{
  // argyle: 8-st × 12-row diamonds, alternating B and C, crossed by D overcheck lines
  const argyle = (r, c) => {
    const x = ((c % 8) + 8) % 8 + 0.5, y = ((r - 1) % 12 + 12) % 12 + 0.5;
    const cx = Math.floor(c / 8), cy = Math.floor((r - 1) / 12);
    // overcheck lines through the diamond centres, slope 12 rows per 8 sts
    const t = (y - 6) / 1.5; // sts from centre along the line
    const l1 = Math.abs(((x - 4 - t) % 8 + 12) % 8 - 4), l2 = Math.abs(((x - 4 + t) % 8 + 12) % 8 - 4);
    if (Math.abs(l1 - 4) < 0.5 || Math.abs(l2 - 4) < 0.5) return 'D';
    const inD = Math.abs(x - 4) / 4 + Math.abs(y - 6) / 6 <= 1.0001;
    if (!inD) return 'A';
    return (cx + cy) % 2 ? 'C' : 'B';
  };
  const ART = pic(`
  ....BBBBBBBBBBBBBBBB
  ....BBBBBBBBBBBBBBBB
  ....BBBBBBBBBBBBBBBB
  ....BBBBBBBBBBBBBBBB
  ....BBBBBBBBBBBBBBBB
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ....AAAAAAAAAAAAAAAA
  ..BBAAAAAAAAAAAAAAAA
  .BBBAAAAAAAAAAAAAAAA
  BBBBAAAAAAAAAAAABBBB
  BBBBAAAAAAAAAAAABBBB
  BBBBAAAAAAAAAAAABBBB
  BBBBAAAAAAAAAAAABBBB
  BBBBAAAAAAAAAAAABBBB
  BBBBAAAAAAAAAAAABBBB
  BBBBAAAAAAAAAAAABBBB
  .BBBAAAAAAAAAAAABBB.`);
  const H = ART.length; // 28
  const p = knit(ART).shape();
  p.texture('stockinette', { rows: [1, 23] }).texture('rib2', { rows: [24, H] });
  p.colors((r, c) => argyle(r, c), { rows: [10, 22], cols: [4, 19], origin: [10, 4] });
  add({ id: 'argyle-sock', name: 'Argyle Sock', chapter: 3, technique: 'Argyle',
    source: 'Argyle (8-st × 12-row diamonds in two colors with diagonal overcheck lines), worked as intarsia on the leg of a profile sock',
    repeat: { width: 8, edges: 0, rows: 12, at: 12 }, wear: { slot: 'feet', fit: 'pair' },
    finishing: pairOf(backSeam('the cuff (bind-off edge)', true)),
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
  const hc = tile(['kkkk', 'kkkk', 'kkkk', 'RRFF', 'kkkk', 'kkkk', 'kkkk', 'FFRR']);
  return p.texture(framed(hc, { left: 2, edge: 'garter' }), { rows: [3, 14] });
})());

add({ id: 'bobble-cushion', name: 'Bobble Cushion', chapter: 4, technique: 'Bobbles',
  source: 'Bobble diamonds: purl-stitch diamond outlines on stockinette with a bobble (MB) at each centre', repeat: { width: 10, edges: 1, rows: 10 },
  finishing: 'Finishing: make a back in A. Place right sides together and seam round 3 sides, turn out, stuff and sew the last side closed.',
  slots: { A: Y('cream'), B: Y('honey', 'wool', 'Bobbles') } },
knit(rect(21, 20)).texture((r, c) => {
  const x = c % 10, dy = ((r - 1) % 10) - 4;
  const d = Math.abs(x - 5) + Math.abs(dy);
  return d === 0 ? 'b' : d === 5 ? 'p' : 'k';
}).colors((r, c) => (c % 10 === 5 && (r - 1) % 10 === 4 ? 'B' : null)));

add({ id: 'fisherman-beanie', name: 'Fisherman Beanie', chapter: 4, technique: 'Cable in rib',
  source: '2×2 rib with a centre rope cable (C4F every 6th row, between p3), crown decreases', repeat: { width: 4, edges: 2, rows: 2 },
  wear: { slot: 'head', fit: 'dome' }, finishing: backSeam('the brim (cast-on edge)'), slots: { A: Y('oatmeal') } },
knit(dome(22, 14, [20, 20, 18, 16, 14, 12, 10, 8])).shape().texture(at((r, c) => {
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
    finishing: 'Finishing: weave in the ends. Wet-block, pinning out the points of the diamonds and the corners.',
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
  const SOCK3 = pic(`
  .....BBBBBBBBBBBB
  .....BBBBBBBBBBBB
  .....BBBBBBBBBBBB
  .....BBBBBBBBBBBB
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  .....AAAAAAAAAAAA
  ..BBBAAAAAAAAAAAA
  .BBBBAAAAAAAAAAAA
  BBBBBAAAAAAAABBBB
  BBBBBAAAAAAAABBBB
  BBBBBAAAAAAAABBBB
  BBBBBAAAAAAAABBBB
  BBBBBAAAAAAAABBBB
  BBBBBAAAAAAAABBBB
  .BBBBAAAAAAAABBB.`);
  const H = SOCK3.length;
  const A = ko('pp' + 'ko>pp'.repeat(2)), B = ko('pp' + '<okpp'.repeat(2)), WS = 'ppkkkppkkkpp';
  const p = knit(SOCK3).shape();
  const top = H - 3; // cuff rows
  p.texture('stockinette', { rows: [1, 9] });
  p.texture(at((r, c) => {
    const lc = c - 5;
    if (r >= top || r % 2 === 0 || r < 11) return WS[lc];
    return r % 4 === 1 ? A[lc] : B[lc];
  }), { rows: [10, H], cols: [5, 16] });
  add({ id: 'lace-sock', name: 'Lace Sock', chapter: 5, technique: 'Lace rib',
    source: 'Lace rib on the leg (RS rows: p2, *k1, yo, ssk, p2; then p2, *k2tog, yo, k1, p2), k3/p2 rib cuff, profile sock with shaped heel and toe',
    repeat: { width: 5, edges: 2, rows: 4, at: 12 }, wear: { slot: 'feet', fit: 'pair' },
    finishing: pairOf(backSeam('the cuff (bind-off edge)', true)),
    slots: { A: Y('rose'), B: Y('plum', 'wool', 'Heel, toe and cuff') } },
  p);
}

{
  const chev = ko('k' + '>kkkkmkmkkkk<'.repeat(2) + 'k');
  add({ id: 'chevron-baby-blanket', name: 'Chevron Baby Blanket', chapter: 5, technique: 'Chevrons',
    source: 'Chevron (13 sts: ssk and k2tog paired at each valley, M1 either side of each peak; 2-row repeat), 4-row stripes, garter edges',
    repeat: { width: 13, edges: 2, rows: 2 }, finishing: FLAT,
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
// =====================================================================================

{
  const BUNNY = symmetric(pic(`
  ...AA...
  ...AA...
  ..ABBA..
  ..ABBA..
  ..ABBA..
  ..ABBA..
  ..AAAA..
  ..AAAAAA
  .AAAAAAA
  .AAAAAAA
  ..AAAAAA
  ..AAAAAA
  .AAAAAAA
  .AAAAAAA
  AAAAAAAA
  AAAAAAAA
  AAAAAAAA
  AAAAAAAA
  .AAAAAAA
  .AAAAAAA
  ..AAAAAA
  ..AAAAAA`));
  add({ id: 'little-bunny', name: 'Little Bunny', chapter: 6, technique: 'Ears worked separately',
    source: 'Garter-stitch toy; ears worked separately with pink intarsia linings; button eyes', repeat: { width: 1, edges: 0, rows: 2 },
    parts: 'ear', finishing: TOY.replace('Weave in the ends.', 'Sew on two button eyes. Weave in the ends.'),
    slots: { A: Y('cream'), B: Y('pink', 'wool', 'Ears and nose') }, touch: { kind: 'button-eyes', cells: [[14, 4], [14, 11]], color: 'black' } },
  knit(BUNNY).shape({ singles: 'rs' }).texture('garter').paint(['BB'], 7, 13));
}

{
  const CAT = symmetric(pic(`
  .A......
  .AA.....
  .AAA....
  .AAAA...
  .AAAAAAA
  AAAAAAAA
  AAAAAAAA
  AAAAAAAA
  AAAAAAAA
  .AAAAAAA
  ..AAAAAA
  ..AAAAAA
  .AAAAAAA
  .AAAAAAA
  .AAAAAAA
  .AAAAAAA
  ..AAAAAA
  ..AAAAAA`));
  const FACE = pic(`
  ..DD......DD..
  ..DD......DD..
  ......CC......
  BB...BBBB...BB
  ....BBBBBB....`);
  const p = knit(CAT).shape();
  p.texture('stockinette');
  p.paint(FACE, 1, 9);
  p.paint(pic(`
  ...BBBBBB...
  ..BBBBBBBB..
  ..BBBBBBBB..
  ..BBBBBBBB..
  ...BBBBBB...`), 2, 2);
  // purl-stitch whiskers either side of the muzzle
  p.stitches(['pp..........pp', '..............', 'pp..........pp'], 1, 10);
  add({ id: 'cat-toy', name: 'Cat Toy', chapter: 6, technique: 'Intarsia face',
    source: 'Stockinette toy with an intarsia face and chest, purl-stitch whiskers; ears worked separately', repeat: { width: 1, edges: 0, rows: 2 },
    parts: 'ear', finishing: TOY,
    slots: { A: Y('grey'), B: Y('white', 'wool', 'Muzzle and chest'), C: Y('pink', 'wool', 'Nose'), D: Y('leaf', 'wool', 'Eyes') } },
  p);
}

{
  const WHALE = pic(`
  ..................A..A
  ..................AAAA
  ...AAAAAAAA........AA.
  .AAAAAAAAAAAA......AA.
  AAAAAAAAAAAAAAA...AA..
  AAADAAAAAAAAAAAAAAAA..
  AAAAAAAAAAAAAAAAAAA...
  AAAAAAAAAAAAAAAAAA....
  BBBBBBBBBBBBBBBBB.....
  BBBBBBBBBBBBBBBB......
  .BBBBBBBBBBBBBB.......
  ..BBBBBBBBBBBB........
  ...BBBBBBBBBB.........
  ....BBBBBBBBBB........`);
  const p = knit(WHALE).shape();
  p.texture(at((r, c) => (p.col[r][c] === 'B' && !odd(r) && r % 4 === 0 ? 'p' : 'k')));
  add({ id: 'whale', name: 'Whale', chapter: 6, technique: 'Cast on at the row starts',
    source: 'Stockinette whale with garter-ridge belly stripes (a purl ridge every 4th row); the tail cast on at the starts of rows and its flukes worked separately',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: 'part', finishing: TOY,
    slots: { A: Y('denim'), B: Y('sky', 'wool', 'Belly'), D: Y('black', 'wool', 'Eye') } },
  p);
}

{
  const FROG = symmetric(pic(`
  ..AAAA...
  ..AAAA...
  .AACCAA..
  .ACDDCA..
  AAAAAAAAA
  AAAAAAAAA
  AAAAAAAAA
  AAAAAAAAA
  ABAAAAAAA
  AABBBBBBB
  AAAAAAAAA
  .AAAAAAAA
  .AAAAAAAA
  .AAAAAAAA
  .AAAAAAAA
  ..AAAAAAA
  ..AAAAAAA`).map((l) => l.slice(0, 9)), true).map((l) => l);
  const p = knit(FROG).shape().texture('seed');
  add({ id: 'frog', name: 'Frog', chapter: 6, technique: 'Seed-stitch toy',
    source: 'Seed-stitch body with an intarsia grin; eyes worked separately', repeat: { width: 2, edges: 1, rows: 2 },
    parts: 'eye', finishing: TOY,
    slots: { A: Y('leaf'), B: Y('cranberry', 'wool', 'Grin'), C: Y('white', 'wool', 'Eyes'), D: Y('black', 'wool', 'Pupils') } },
  p);
}

{
  const PENG = symmetric(pic(`
  ....AAA
  ..AAAAA
  .AAAAAA
  .AABBBB
  .ABABBB
  .ABABBB
  .ABBBBC
  .AABBBB
  AAABBBB
  AAABBBB
  AAABBBB
  AAABBBB
  AAABBBB
  AAABBBB
  .AABBBB
  .AABBBB
  .AABBBB
  .AAABBB
  ..AABBB
  ..AABBB
  ..CCCAA
  ..CCCAA`));
  add({ id: 'penguin', name: 'Penguin', chapter: 6, technique: 'Three-color intarsia',
    source: 'Stockinette toy with three-color intarsia (black back, white front and face, orange beak and feet)', repeat: { width: 1, edges: 0, rows: 2 },
    finishing: TOY,
    slots: { A: Y('charcoal'), B: Y('white', 'wool', 'Front'), C: Y('orange', 'wool', 'Beak and feet') } },
  knit(PENG).shape().texture('stockinette'));
}

{
  const OCTO = pic(`
  .....AAAAAAAA.....
  ...AAAAAAAAAAAA...
  ..AAAAAAAAAAAAAA..
  .AAAAAAAAAAAAAAAA.
  .AAAAAAAAAAAAAAAA.
  AAAAAAAAAAAAAAAAAA
  AAAABBAAAAAABBAAAA
  AAAABDAAAAAABDAAAA
  AAAAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAAAA
  .AAAAAAAAAAAAAAAA.
  AAAAAAAAAAAAAAAAAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA
  AAA..AAA..AAA..AAA`);
  const p = knit(OCTO).shape({ singles: (r) => (r <= 8 ? 'rs' : 'any') });
  p.texture('garter', { rows: [1, 8] }).texture('stockinette', { rows: [9, 20] });
  add({ id: 'octopus', name: 'Octopus', chapter: 6, technique: 'Legs joined',
    source: 'Four garter-stitch legs cast on and worked separately, then joined (cast on across each gap); stockinette head. The front has 4 legs, the back the other 4',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: 'leg', finishing: TOY.replace('(plain, without the face)', '(plain, with its own 4 legs)'),
    slots: { A: Y('coral'), B: Y('white', 'wool', 'Eyes'), D: Y('black', 'wool', 'Pupils') } },
  p);
}

{
  const FOX = pic(`
  ..C..........C....
  ..CC........CC....
  ..AAA......AAA....
  ..AAAA....AAAA....
  ..AAAAAAAAAAAA....
  .AAAAAAAAAAAAAA...
  .AADAAAAAAAADAA...
  .BBAAAAAAAAAABB...
  ..BBBAAAAAABBB....
  ...BBBBBBBBBB.....
  .....BBCCBB.......
  ....AABBBBAA......
  ...AAABBBBAAA.....
  ...AAABBBBAAA..AA.
  ..AAAABBBBAAAAAAAA
  ..AAAABBBBAAAAAAAA
  ..AAAABBBBAAAAAABB
  ..AAAABBBBAAAAABBB
  ..AAAAAAAAAAAAABB.
  ...AAAAAAAAAAA....`);
  add({ id: 'fox', name: 'Fox', chapter: 6, technique: 'Intarsia chest and tail',
    source: 'Stockinette toy: intarsia white chest and muzzle, black ear tips and nose, ears worked separately, the tail cast on at the row starts with a white tip',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: 'ear', finishing: TOY,
    slots: { A: Y('rust'), B: Y('white', 'wool', 'Chest and tail tip'), C: Y('black', 'wool', 'Ear tips and nose'), D: Y('black', 'wool', 'Eyes') } },
  knit(FOX).shape().texture('stockinette'));
}

{
  const BEAR = symmetric(pic(`
  ..AAA....
  .AAAAA...
  .ABBAA...
  .AAAAAAAA
  ..AAAAAAA
  .AAAAAAAA
  .AAACAAAA
  .AAAAAAAA
  .AAAAABBB
  ..AAABBBB
  ...AAAABC
  ...AAAAAA
  AAAAAAAAA
  AAAAAAABB
  .AAAAABBB
  ..AAABBBB
  ..AAABBBB
  ..AAABBBB
  ..AAAABBB
  ..AAAAAAA
  ..AAA.AAA
  ..AAA.AAA`).map((l) => l.slice(0, 9)), true);
  add({ id: 'teddy-bear', name: 'Teddy Bear', chapter: 6, technique: 'Round ears',
    source: 'Stockinette bear: legs cast on separately and joined, round ears worked separately, intarsia tummy patch, muzzle and ear linings',
    repeat: { width: 1, edges: 0, rows: 2 }, parts: 'part', finishing: TOY,
    slots: { A: Y('brown'), B: Y('tan', 'wool', 'Tummy and muzzle'), C: Y('black', 'wool', 'Eyes and nose') } },
  knit(BEAR).shape().texture('stockinette'));
}

// =====================================================================================
// Chapter 7. Big Projects
// =====================================================================================

add({ id: 'tea-cosy', name: 'Tea Cosy', chapter: 7, technique: 'Garter stripes and a dome',
  source: 'Garter stitch in 2-row stripes (one ridge each), dome decreases on RS rows and bind-offs at the row starts',
  repeat: { width: 1, edges: 0, rows: 2 }, touch: { kind: 'pompom', at: 'top', slot: 'B' },
  finishing: 'Finishing: make a back the same. Place right sides together and seam the top and the sides, leaving a gap in each side for the spout and the handle and the cast-on edge open. Turn out, make a pom-pom in B and sew it to the top. Weave in the ends.',
  slots: { A: Y('cranberry'), B: Y('cream', 'wool', 'Stripes') } },
knit(dome(24, 10, [22, 22, 20, 20, 18, 18, 16, 12])).shape({ singles: 'rs' }).texture('garter').colors((r) => (Math.floor((r - 1) / 2) % 2 ? 'B' : 'A')));

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
    finishing: 'Finishing: make a back the same (the mirror image). Place right sides together and seam round, leaving the top open. Turn out, add a hanging loop of B at the heel side of the cuff and weave in the ends.',
    slots: { A: Y('red'), B: Y('white', 'wool', 'Cuff, heel, toe, motif'), C: Y('forest', 'wool', 'Band') } },
  p);
}

{
  const a = rect(26, 26);
  a[26 - 17] = 'AAA.....AAAAAAAAAA.....AAA';
  add({ id: 'dog-sweater', name: 'Dog Sweater', chapter: 7, technique: 'Leg holes',
    source: '2×2 rib edges, stockinette with two stripes, two leg holes (BO 5 under a gap, then CO 5 across it on the next row)',
    repeat: { width: 4, edges: 2, rows: 2 },
    finishing: 'Finishing: weave in the ends and block. Wrap round the dog with the rib at the neck and seam the side edges together under the belly, leaving the leg holes open. It\'s for a dog, so no doll can wear it.',
    slots: { A: Y('denim'), B: Y('honey', 'wool', 'Rib and stripes') } },
  knit(a).shape().texture('rib2', { rows: [1, 4] }).texture('stockinette', { rows: [5, 22] }).texture('rib2', { rows: [23, 26] })
    .colors((r) => (r <= 4 || r >= 23 || r === 9 || r === 10 || r === 13 || r === 14 ? 'B' : null)));
}

{
  const SQ = [
    ['garter', 'seed', 'moss'],
    ['rib1', 'rib2', 'basket3'],
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
    const tex = t === 'eyelets' ? at((r, c) => eye(r - 24, c - 24)) : t;
    p.texture(tex, { rows: [i * 12 + 1, i * 12 + 12], cols: [j * 12, j * 12 + 11] });
  }
  p.colors((r, c) => { const i = Math.floor((r - 1) / 12), j = Math.floor(c / 12); return i === 1 && j === 1 ? 'C' : (i + j) % 2 ? 'B' : 'A'; });
  add({ id: 'patchwork-blanket', name: 'Patchwork Blanket', chapter: 7, technique: 'Sampler',
    source: 'Sampler: 9 squares of 12 × 12 (garter, seed, moss, 1×1 rib, 2×2 rib, k3/p3 basketweave, broken rib, stockinette, eyelets), knit in one piece',
    repeat: { width: 12, edges: 0, rows: 12 }, finishing: FLAT,
    slots: { A: Y('cream'), B: Y('sage', 'wool', 'Squares 2'), C: Y('honey', 'wool', 'Centre square') } },
  p);
}

{
  // dolman front: body 24 sts, sleeves cast on 4 sts at a time at the row starts (an underarm at
  // about 30 degrees), yoke band across body and sleeves, neck worked as two shoulders
  const W = 40;
  const rows = []; // bottom first, as [from, to] runs
  for (let r = 1; r <= 20; r++) rows.push([[8, 31]]);
  rows.push([[8, 35]], [[4, 35]], [[4, 39]], [[0, 39]]); // rows 21-24
  for (let r = 25; r <= 34; r++) rows.push([[0, 39]]);
  rows.push([[0, 34]], [[5, 34]], [[5, 15], [24, 30]], [[9, 15], [24, 30]], [[9, 14], [25, 30]], [[10, 14], [25, 29]]); // rows 35-40
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
  p.texture(at((r, c) => ((c % 2) === 0 ? 'k' : 'p')), { rows: [21, 36], where: (r, c) => c <= 2 || c >= 37 });
  p.colors(motif(YOKE), { rows: [25, 33], origin: [25, 0] });
  add({ id: 'yoke-sweater', name: 'Yoke Sweater', chapter: 7, technique: 'Dolman sleeves and a yoke',
    source: 'Stranded yoke band (8-st, 9-row star band) on a dolman front: 2×2 rib hem, sleeves cast on 4 sts at a time at the row starts, 1×1 rib cuff columns, shoulders worked separately round the neck',
    repeat: { width: 8, edges: 0, rows: 9, at: 25 }, wear: { slot: 'body', fit: 'body' }, parts: 'shoulder',
    finishing: 'Finishing: make a back the same (or plain in A). Place right sides together and seam the shoulders and the tops of the sleeves, leaving the neck open, then seam the underarms and the sides, leaving the hem and the cuffs open. Turn out, weave in the ends and block.',
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Yoke'), C: Y('sage', 'wool', 'Yoke dots') } },
  p);
}

{
  // two fronts from the cast-on (11 sts each), dolman sleeves, V-neck along the button bands
  const W = 41;
  const rows = [];
  const L = (r) => [9, 19], R = (r) => [21, 31];
  for (let r = 1; r <= 40; r++) {
    let [la, lb] = L(r), [ra, rb] = R(r);
    if (r >= 21) { la = r >= 22 ? 4 : 9; rb = r >= 21 ? 36 : 31; }
    if (r >= 23) rb = 40;
    if (r >= 24) la = 0;
    if (r >= 27) { const k = Math.floor((r - 25) / 2); lb = 19 - k; ra = 21 + k; } // the V-neck: 1 st every other row
    if (r >= 35) rb = 35;
    if (r >= 36) la = 5;
    if (r >= 37) rb = 30;
    if (r >= 38) la = 10;
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
      if (q >= 2 && q <= 5) return r % 6 === 5 ? 'R' : 'k';
      return 'k';
    }
    if (c <= 2 || c >= 38) return c % 2 === 0 ? 'k' : 'p'; // cuff columns
    return 'k';
  }));
  // buttonholes on the right front band (k2tog, yo), buttons on the left front band
  const holes = [7, 13, 19, 25];
  for (const r of holes) { p.set(r, 21, 'k'); p.set(r, 22, 'o'); p.set(r, 23, '<'); }
  add({ id: 'cabled-cardigan', name: 'Cabled Cardigan', chapter: 7, technique: 'Two fronts at once',
    source: 'Two fronts worked separately from the cast-on: rope cables (C4B every 6th row) in p2 panels, seed-stitch button bands with yo buttonholes, V-neck, dolman sleeves cast on at the row starts',
    repeat: { width: 8, edges: 3, rows: 6 }, wear: { slot: 'body', fit: 'body' }, parts: 'front',
    touch: { kind: 'buttons', cells: holes.map((r) => [r, 18]), slot: 'B' },
    finishing: 'Finishing: make a back in one piece (plain stockinette in A, as wide as both fronts with their sleeves). Place right sides together and seam the shoulders and the tops of the sleeves, then the underarms and the sides. Turn out, sew 4 buttons in B to the left front band opposite the buttonholes, weave in the ends and block.',
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
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Fair Isle motif'), C: Y('sage', 'wool', 'Fair Isle ground'), D: Y('honey', 'wool', 'Bobble band') } },
  p);
}

export const PATTERNS = P;
export const CHAPTERS = ['First Stitches', 'Warm Things', 'Colorwork', 'Cables and Texture', 'Lace', 'Knitted Friends', 'Big Projects'];
export const patternById = (id) => P.find((p) => p.id === id) || null;
export default P;
