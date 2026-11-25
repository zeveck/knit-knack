// patterns.js — the 47 patterns of the Knit Knack book, in book order (7 chapters).
// Each pattern: {id, name, chapter, technique, source, repeat, wear, finishing, slots, touch,
// shape, stitch, color, cables, parts}. The three layers are built with patternKit.js from a
// silhouette (ASCII art whose letters are the color slots), a texture and motifs, and every
// one is checked by tools/check-patterns.mjs with chart.js (the code the game runs).
import { knit, pic, rect, widths, symmetric, mirror, polygon, stretch, tile, framed, motif, TEX, rsCells, Round, ribOps, hatChart, sockChart, mittenChart } from './patternKit.js';
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
// the back keeps the brim, cuff, heel, toe and stripe colors (they go all the way round)
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

// ---------------------------------------------------------------- (Change 2) knitting in the round
// Yarn weights and gauges (CHANGE_2.md A): chunky for most round pieces, super bulky for the headband
// and the yoke sweater, aran for the lace sock.
const CHUNKY = { sts: 12, per: 4, yarn: 'chunky' }, SUPER = { sts: 10, per: 4, yarn: 'super bulky' }, ARAN = { sts: 18, per: 4, yarn: 'aran' };
const JOG = 'Stripes knit in the round show a small step (the jog) where each round begins. To hide it, slip the first st of the 2nd rnd of each new color purlwise; the game knits it plain and shows the jog.';
const ED2 = { edition: 2 };
// a chart built by patternKit's round helpers, as the piece add() takes
const roundPiece = (d) => ({ ragged: [], def: () => d });
const seq = (n) => Array.from({ length: n }, (_, i) => i);

// one friendly line per pattern (the book card and Cast On); the technical detail is in Read the pattern
const BLURB = {
"garter-dishcloth": "A squishy cranberry dishcloth, all bumpy garter ridges.",
"stockinette-coaster": "A smooth sage coaster with a neat little border.",
"seed-bookmark": "A pebbly honey bookmark with a tassel to mark your page.",
"ribbed-wristwarmer": "Stretchy plum wristwarmers with two cream stripes.",
"striped-headband": "A ribbed headband in cheerful cranberry, cream and honey stripes.",
"basketweave-mug-cozy": "A woven-looking oatmeal cozy to keep your tea warm.",
"rolled-brim-beanie": "A soft sage beanie with a cream brim that rolls up.",
"moss-ear-warmer": "A textured plum band to keep your ears toasty.",
"bobble-hat": "A cranberry hat with a cream stripe and a fluffy pom-pom.",
"broken-rib-cowl": "A rusty-orange cowl with soft ridges and cream stripes.",
"fingerless-mitts": "Mustard mitts with charcoal cuffs that leave your fingers free.",
"cozy-sock": "A sky-blue sock with a cream heel, toe and cuff.",
"chunky-mitten": "A thick teal mitten with a cream cuff and a cozy thumb.",
"fair-isle-coaster": "A cream coaster with a little cranberry Fair Isle pattern.",
"checkerboard-washcloth": "A sage and cream checkerboard washcloth.",
"heart-pillow": "A cream pillow with a big cranberry heart.",
"star-ornament": "A golden star to hang on the tree.",
"strawberry-pouch": "A strawberry-red pouch with honey seeds and a leafy drawstring.",
"snowflake-mitten": "A navy mitten with a cream snowflake on the back.",
"argyle-sock": "A navy sock with honey and cranberry argyle diamonds.",
"cable-headband": "A cream headband with a twisting rope cable.",
"aran-mug-cozy": "An oatmeal mug cozy with cables on a pebbly background.",
"honeycomb-cowl": "A mint cowl covered in a honeycomb of little cables.",
"bobble-cushion": "A cream cushion dotted with honey bobbles.",
"fisherman-beanie": "A classic oatmeal fisherman beanie with a cable up the front.",
"braided-scarf-panel": "A cranberry scarf panel with a three-strand braid.",
"eyelet-dishcloth": "A mint dishcloth sprinkled with tiny eyelet holes.",
"vine-lace-bookmark": "A lilac lace bookmark with a winding vine and a tassel.",
"lace-doily": "A white lace doily with openwork diamonds.",
"feather-fan-shawlette": "A wavy plum shawlette with a rose stripe.",
"lace-sock": "A rose sock with a lacy rib and plum heel and toe.",
"chevron-baby-blanket": "A zig-zag baby blanket in mint, cream and sky.",
"little-bunny": "A cream bunny with pink ears and a little pink nose.",
"cat-toy": "A grey kitty with green eyes and a white chest.",
"whale": "A denim-blue whale with a sky-blue belly.",
"frog": "A bumpy green frog with a big cranberry grin.",
"penguin": "A charcoal penguin with a white front and orange feet.",
"octopus": "A coral octopus with eight wiggly legs.",
"fox": "A rust-red fox with a white chest and a bushy tail.",
"teddy-bear": "A brown teddy with a tan tummy and round ears.",
"tea-cosy": "A striped cranberry and cream tea cosy with a pom-pom.",
"holiday-stocking": "A red holiday stocking with a green and white band.",
"dog-sweater": "A denim-blue sweater with honey stripes for a small dog.",
"patchwork-blanket": "A patchwork blanket of textured cream, sage and honey squares.",
"yoke-sweater": "A cozy cream sweater with a cranberry diamond yoke.",
"cabled-cardigan": "A honey cardigan with cables up the front and brown buttons.",
"heirloom-afghan": "A big cream afghan with Fair Isle, bobbles and cables: everything you know."
};

const P = [];
const add = (meta, piece) => {
  if (piece.ragged && piece.ragged.length) throw new Error(`${meta.id}: art rows ${piece.ragged.map(([r, n]) => `${r} (${n} wide)`).join(', ')} are not ${piece.W} wide`);
  const d = piece.def();
  P.push({
    id: meta.id, name: meta.name, chapter: meta.chapter, technique: meta.technique, source: meta.source, blurb: BLURB[meta.id] || meta.technique,
    repeat: meta.repeat, wear: meta.wear || null, finishing: meta.finishing, slots: meta.slots, touch: meta.touch || null,
    shape: d.shape, stitch: d.stitch, color: d.color, cables: d.cables, parts: meta.parts || null,
    partLabels: meta.partLabels || null, notes: meta.notes || null, drape: meta.drape || null,
    // (Change 2) the chart edition (2 for the patterns rewritten for knitting in the round), and for
    // those: yarn weight and gauge, needles, the object's shape kind, the round chart's sections and steps
    edition: meta.edition || 1, gauge: meta.gauge || null, needlesText: meta.needlesText || null, kind: meta.kind || null, bindOff: meta.bindOff || null,
    preamble: meta.preamble || null,
    ...(d.round ? { round: true, flat: d.flat, sections: d.sections, steps: d.steps, needles: d.needles, segments: d.segments || null, segmentRows: d.segmentRows || null } : {}),
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

add({ id: 'ribbed-wristwarmer', name: 'Ribbed Wristwarmer', chapter: 1, technique: '1×1 rib, seamed into a tube', ...ED2,
  source: '1×1 rib over an even count (*k1, p1 on every row), knit flat and seamed once into a tube', repeat: { width: 2, edges: 0, rows: 1 },
  wear: { slot: 'hands', fit: 'pair' }, kind: 'ring', gauge: CHUNKY, needlesText: 'a pair of straight needles',
  finishing: 'Finishing: fold the piece with the right side out so the two side edges meet, and seam them with mattress stitch to make a tube: seam rows 1–7, leave rows 8–9 open for the thumb, and seam rows 10–12. Weave in the ends. Make a second one the same for the pair.',
  slots: { A: Y('plum', 'wool'), B: Y('cream', 'wool', 'Stripe') } },
knit(rect(24, 12)).texture((r, c) => (c % 2 ? 'k' : 'p')).colors((r) => (r === 3 || r === 4 || r === 9 || r === 10 ? 'B' : null)));

{
  const b = new Round(40).castOn(seq(40)).needle({ kind: 'circular', len: 16 }).join('A');
  const SL = 'AABBCCBBAA';
  b.rounds(10, ribOps('kkpp'), { slot: (j, s, i) => SL[i] });
  add({ id: 'striped-headband', name: 'Striped Headband', chapter: 1, technique: 'Stripes in 2×2 rib, in the round', ...ED2,
    source: '2×2 rib in the round (*k2, p2), 2-rnd stripes in 3 colors', repeat: { width: 4, edges: 0, rows: 2, at: 2 },
    wear: { slot: 'head', fit: 'band' }, kind: 'ring', gauge: SUPER, notes: [JOG],
    finishing: 'Finishing: weave in the ends and block lightly.',
    slots: { A: Y('cranberry'), B: Y('cream', 'wool', 'Stripe 2'), C: Y('honey', 'wool', 'Stripe 3') } },
  roundPiece(b.def()));
}

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

add({ id: 'rolled-brim-beanie', name: 'Rolled-Brim Beanie', chapter: 2, technique: 'In the round, with crown decreases', ...ED2,
  source: 'Stockinette in the round (the cast-on edge rolls outward by itself), the crown decreased in 8 wedges (*k4, k2tog, one st fewer each time) and gathered',
  repeat: { width: 1, edges: 0, rows: 1 }, wear: { slot: 'head', fit: 'dome' }, kind: 'dome', gauge: CHUNKY, notes: [JOG],
  finishing: 'Finishing: weave in the ends. The brim rolls up by itself.', slots: { A: Y('sage'), B: Y('cream', 'wool', 'Brim') } },
roundPiece(hatChart({ co: 48, brim: [9, () => 'k'], labels: { brim: 'Brim and body' }, crown: { wedges: 8, everyOther: 2 },
  slot: (j, s, i, part) => (part === 'brim' && i < 4 ? 'B' : 'A') })));

{
  const b = new Round(56).castOn(seq(56)).needle({ kind: 'circular', len: 16 }).join('A');
  b.rounds(8, (j, i) => ((j + Math.floor(i / 2)) % 2 ? 'p' : 'k'), { slot: 'A' });
  add({ id: 'moss-ear-warmer', name: 'Moss Stitch Ear Warmer', chapter: 2, technique: 'Moss stitch in the round', ...ED2,
    source: 'Moss stitch in the round (2 rnds *k1, p1, then 2 rnds *p1, k1; 4-rnd repeat), cinched at the front',
    repeat: { width: 2, edges: 0, rows: 4, at: 2 }, wear: { slot: 'head', fit: 'band' }, kind: 'ring', gauge: CHUNKY, bindOff: 'Bind off in pattern.',
    touch: { kind: 'cinch', at: 'front', slot: 'A' },
    finishing: 'Finishing: wrap a short length of the yarn tightly round the front of the band 8 times to cinch it, sew the ends in on the inside, and weave in the ends.',
    slots: { A: Y('plum') } },
  roundPiece(b.def()));
}

add({ id: 'bobble-hat', name: 'Bobble Hat', chapter: 2, technique: 'Ribbed brim and pom-pom, in the round', ...ED2,
  source: '2×2 rib brim, stockinette body with a stripe, crown decreased in 8 wedges and gathered, all in the round', repeat: { width: 4, edges: 0, rows: 1, at: 2 },
  wear: { slot: 'head', fit: 'dome' }, kind: 'dome', gauge: CHUNKY, touch: { kind: 'pompom', at: 'top', slot: 'B' }, notes: [JOG],
  finishing: 'Finishing: make a pom-pom in B and sew it to the gathered top. Weave in the ends.',
  slots: { A: Y('cranberry'), B: Y('cream', 'wool', 'Brim and stripe') } },
roundPiece(hatChart({ co: 48, brim: [5, ribOps('kkpp')], body: [5, () => 'k'], crown: { wedges: 8, everyOther: 2 },
  slot: (j, s, i, part) => (part === 'brim' || (part === 'body' && (i === 2 || i === 3)) ? 'B' : 'A') })));

{
  const b = new Round(60).castOn(seq(60)).needle({ kind: 'circular', len: 16 }).join('A');
  b.rounds(10, (j, i) => (i % 2 ? 'k' : 'kp'[j % 2]), { slot: (j, s, i) => (i === 2 || i === 3 || i === 6 || i === 7 ? 'B' : 'A') });
  add({ id: 'broken-rib-cowl', name: 'Broken Rib Cowl', chapter: 2, technique: 'Broken rib in the round', ...ED2,
    source: 'Broken rib in the round (Rnd 1: *k1, p1; Rnd 2: knit)', repeat: { width: 2, edges: 0, rows: 2, at: 2 },
    wear: { slot: 'neck', fit: 'band' }, kind: 'ring', gauge: CHUNKY, notes: [JOG], bindOff: 'Bind off loosely.',
    finishing: 'Finishing: weave in the ends and block lightly.', slots: { A: Y('rust'), B: Y('cream', 'wool', 'Stripe') } },
  roundPiece(b.def()));
}

{
  const b = new Round(24).castOn(seq(24)).needle({ kind: 'dpn', n: 3, counts: [8, 8, 8] }).join('B');
  b.section('Cuff').rounds(5, ribOps('kp'), { slot: 'B' });
  b.section('Hand and thumb hole').rounds(7, () => 'k', { slot: 'A' });
  b.work('k'.repeat(10) + '_'.repeat(4) + 'k'.repeat(10), { slot: 'A' }); // the thumb hole: BO 4
  b.work('k'.repeat(10) + '+'.repeat(4) + 'k'.repeat(10), { slot: 'A' }); // CO 4 over the gap
  b.rounds(2, () => 'k', { slot: 'A' });
  b.section('Top edge').rounds(3, ribOps('kp'), { slot: 'B' });
  add({ id: 'fingerless-mitts', name: 'Fingerless Mitts', chapter: 2, technique: 'A thumb hole, in the round', ...ED2,
    source: '1×1 rib cuffs, stockinette in the round on DPNs, a one-round thumb hole (BO 4, then CO 4 over the gap on the next round)', repeat: { width: 2, edges: 0, rows: 1, at: 2 },
    wear: { slot: 'hands', fit: 'pair' }, kind: 'mitten', gauge: CHUNKY,
    finishing: 'Finishing: weave in the ends, tidying the corners of the thumb hole. Make a second mitt the same: the thumb hole sits at the side, so the pair fits either hand.',
    slots: { A: Y('mustard'), B: Y('charcoal', 'wool', 'Cuffs') } },
  roundPiece(b.def()));
}

add({ id: 'cozy-sock', name: 'Cozy Sock', chapter: 2, technique: 'Heel flap, gusset and toe', ...ED2,
  source: 'Cuff-down sock in the round: 2×2 rib cuff, stockinette leg, slipped heel flap, heel turned with short rows, gusset picked up and decreased, wedge toe grafted with Kitchener stitch',
  repeat: { width: 4, edges: 0, rows: 1, at: 2 }, wear: { slot: 'feet', fit: 'pair' }, kind: 'sock', gauge: CHUNKY,
  finishing: 'Finishing: weave in the ends. Make a second sock the same for the pair.',
  slots: { A: Y('sky'), B: Y('cream', 'wool', 'Heel, toe and cuff') } },
roundPiece(sockChart({ co: 24, gusset: 5, cuff: 4, cuffOp: ribOps('kkpp'), leg: 6, flapRows: 9, heelTo: 8, foot: 4, toeTo: 8,
  slots: { main: 'A', cuff: 'B', heel: 'B', toe: 'B' } })));

add({ id: 'chunky-mitten', name: 'Chunky Mitten', chapter: 2, technique: 'Thumb gusset, in the round', ...ED2,
  source: 'Mitten in the round on DPNs: 1×1 rib cuff, a thumb gusset increased between markers, the thumb sts held on waste yarn, the hand decreased at both sides and gathered, then the thumb picked up and knit',
  repeat: { width: 2, edges: 0, rows: 1, at: 2 }, wear: { slot: 'hands', fit: 'pair' }, kind: 'mitten', gauge: CHUNKY,
  finishing: 'Finishing: weave in the ends, closing any little gap at the base of the thumb. Make a second mitten the same: the thumb sits at the side, so it fits either hand.',
  slots: { A: Y('teal', 'chunky'), B: Y('cream', 'chunky', 'Cuff') } },
roundPiece(mittenChart({ hA: 9, hB: 9, cuff: [4, ribOps('kp')], hand: [6, () => 'k'], top: { to: 8, plain: 1 }, thumb: 3, slots: { main: 'A', cuff: 'B' } })));

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
  // knit from the tip: 8 sts every 4th column, increased to 32 (each M1 in the free column after its sts)
  const b = new Round(32).castOn(seq(8).map((i) => 4 * i + 3)).needle({ kind: 'dpn', n: 3, counts: [3, 3, 2] }).join('A');
  b.section('Tip');
  b.work('k'.repeat(8), { slot: 'A' });
  for (const k of [1, 2, 3]) { b.work(('k'.repeat(k) + 'm').repeat(8), { slot: 'A' }); b.work('k'.repeat(8 * (k + 1)), { slot: 'A' }); }
  const seeds = b.r + 1;
  b.section('Seeds');
  b.rounds(6, () => 'k', { slot: (j, s, i) => (i % 2 === 0 && (j + (i % 4 === 2 ? 2 : 0)) % 4 === 1 ? 'B' : 'A') });
  b.section('Leaves and eyelets');
  b.rounds(2, () => 'k', { slot: 'C' });
  b.work('<o'.repeat(16), { slot: 'C' });
  b.rounds(2, () => 'k', { slot: 'C' });
  add({ id: 'strawberry-pouch', name: 'Strawberry Pouch', chapter: 3, technique: 'Stranded dots, in the round', ...ED2,
    source: 'Knit in the round from the tip: 8 sts increased to 32 (*k1, M1L; then *k2, M1L; then *k3, M1L), stranded seed dots in B (every 4th st, offset), leafy rounds in C with an eyelet round (*k2tog, yo) for the drawstring',
    repeat: { width: 4, edges: 0, rows: 4, at: seeds }, kind: 'dome', gauge: CHUNKY,
    notes: ['Strand the seeds: carry B loosely behind the work between the dots.'],
    finishing: 'Finishing: thread the cast-on tail through the 8 cast-on sts at the tip, pull tight and fasten off on the inside. Make a twisted cord of C about 12" long and thread it in and out of the eyelets for the drawstring. Weave in the ends.',
    slots: { A: Y('red', 'cotton'), B: Y('honey', 'cotton', 'Seeds'), C: Y('leaf', 'cotton', 'Leaves') }, touch: { kind: 'drawstring', at: 'top', slot: 'C' } },
  roundPiece(b.def()));
}

{
  const SNOW = pic(`
  B..B..B
  .B.B.B.
  ..BBB..
  BBB.BBB
  ..BBB..
  .B.B.B.
  B..B..B`);
  const snow = motif(SNOW, { tileX: false, tileY: false });
  // the hand: the snowflake on the back of the hand (sts 1–12 of the round), a lice check on the palm
  const hand = (j, i) => ({ s: 'k', slot: j < 12 ? (snow(i, j - 2) ? 'B' : 'A') : (i % 2 === 1 && (j - 12) % 4 === 1 ? 'B' : 'A') });
  add({ id: 'snowflake-mitten', name: 'Snowflake Mitten', chapter: 3, technique: 'Stranded motif, in the round', ...ED2,
    source: 'Stranded snowflake (7 sts × 7 rnds) on the back of the hand and a lice check on the palm, on a mitten in the round: 1×1 rib cuff with a stripe, thumb gusset between markers, thumb picked up and knit',
    repeat: { width: 2, edges: 0, rows: 1, at: 2 }, wear: { slot: 'hands', fit: 'pair' }, kind: 'mitten', gauge: CHUNKY,
    notes: ['Strand the snowflake and the lice, carrying the yarn not in use loosely behind and catching any float longer than 5 sts.'],
    finishing: 'Finishing: weave in the ends, closing any little gap at the base of the thumb. This is the right mitten: sts 1–12 of each hand rnd are the back of the hand. Left mitten: work it the same, but work each hand rnd as sts 13–24 of the right mitten\'s rnd, then its sts 1–12, so the snowflake sits on the back of the left hand.',
    slots: { A: Y('navy'), B: Y('cream', 'wool', 'Snowflake') } },
  roundPiece(mittenChart({ hA: 11, hB: 11, cuff: [4, ribOps('kp'), (j, s, i) => (i === 2 ? 'B' : 'A')], hand: [8, hand], top: { to: 8, plain: 0 }, thumb: 4, slots: { main: 'A', cuff: 'A' } })));
}

{
  // argyle: 8-st × 12-row diamonds (rows 2, 4, 4, 6, 6, 8, 8, 6, 6, 4, 4, 2 sts wide, so they
  // never pinch), alternating B and C, crossed by D overcheck lines, across the whole flat leg
  const DW = [2, 4, 4, 6, 6, 8, 8, 6, 6, 4, 4, 2];
  const argyle = (r, c) => {
    const yi = ((r - 1) % 12 + 12) % 12, x = ((c % 8) + 8) % 8 + 0.5, y = yi + 0.5;
    const cx = Math.floor(c / 8), cy = Math.floor((r - 1) / 12);
    const d1 = Math.abs(x - y * (8 / 12)), d2 = Math.abs(8 - x - y * (8 / 12));
    if (d1 < 0.5 || d2 < 0.5) return 'D';
    if (Math.abs(x - 4) >= DW[yi] / 2) return 'A';
    return (cx + cy) % 2 ? 'C' : 'B';
  };
  const LEG = [...seq(6), ...seq(12).map((i) => 11 + i), ...seq(6).map((i) => 28 + i)]; // the leg's columns, left to right
  const leg = (j, i, N, rs, c) => {
    const p = LEG.indexOf(c);
    if (i < 4) return { s: (23 - p) % 4 < 2 ? 'k' : 'p', slot: 'B' }; // 2×2 rib, seen from the front
    return { s: 'k', slot: argyle(i - 3, p) };
  };
  add({ id: 'argyle-sock', name: 'Argyle Sock', chapter: 3, technique: 'Argyle, then in the round', ...ED2,
    source: 'Argyle (8-st × 12-row diamonds in two colors with diagonal overcheck lines) in intarsia on a leg knit flat, as argyle socks are, seamed up the back; then heel flap, turn, gusset, foot and wedge toe in the round',
    repeat: { width: 8, edges: 0, rows: 12, at: 5 }, wear: { slot: 'feet', fit: 'pair' }, kind: 'sock', gauge: CHUNKY,
    needlesText: 'straight needles for the flat leg (or the sts divided over 2–3 DPNs and worked back and forth), then a set of 4 DPNs',
    notes: ['Knit the diamonds and the D overcheck lines in intarsia as written, with a bobbin for each diamond, each line and each area of A between them; twist the yarns at every color change to avoid holes. (Many knitters work the D lines afterwards in duplicate stitch over A instead: knit those sts in A and stitch D over them.)'],
    finishing: 'Finishing: weave in the ends. Make a second sock the same for the pair.',
    slots: { A: Y('navy'), B: Y('honey', 'wool', 'Diamonds, heel, toe, cuff'), C: Y('cranberry', 'wool', 'Diamonds 2'), D: Y('cream', 'wool', 'Lines') } },
  roundPiece(sockChart({ co: 24, gusset: 5, flapRows: 9, heelTo: 8, foot: 3, toeTo: 8, slots: { main: 'A', heel: 'B', toe: 'B' },
    legFlat: { rows: 16, op: leg, seamText: 'Fold the leg so its side edges meet at the back, and seam them with mattress stitch from the cuff down to the needle.' } })));
}

// =====================================================================================
// Chapter 4. Cables and Texture
// =====================================================================================

{
  const b = new Round(48).castOn(seq(48)).needle({ kind: 'circular', len: 16 }).join('A');
  for (let i = 0; i < 10; i++) {
    const cab = i === 2 || i === 8; // rnds 3 and 9: every 6th rnd
    b.work(seq(8).flatMap(() => ['p', 'p', cab ? { s: 'x', cable: 'C4F' } : 'k', cab ? 'x' : 'k', cab ? 'x' : 'k', cab ? 'x' : 'k']), { slot: 'A' });
  }
  add({ id: 'cable-headband', name: 'Cable Headband', chapter: 4, technique: 'Rope cables, in the round', ...ED2,
    source: 'Rope cables in the round: *p2, k4, with C4F every 6th rnd', repeat: { width: 6, edges: 0, rows: 6, at: 2 },
    wear: { slot: 'head', fit: 'band' }, kind: 'ring', gauge: CHUNKY, bindOff: 'Bind off in pattern.',
    finishing: 'Finishing: weave in the ends and block lightly.', slots: { A: Y('cream') } },
  roundPiece(b.def()));
}

add({ id: 'aran-mug-cozy', name: 'Aran Mug Cozy', chapter: 4, technique: 'Cables on seed stitch',
  source: 'Aran rope cables (C4B every 4th row) framed by p1, on a seed-stitch ground', repeat: { width: 8, edges: 4, rows: 4 },
  finishing: 'Finishing: weave in the ends and block. Wrap round a mug and seam the side edges above and below the handle.',
  slots: { A: Y('oatmeal') } },
knit(rect(20, 12)).texture(at((r, c) => {
  if (c === 3 || c === 8 || c === 11 || c === 16) return 'p';
  if ((c >= 4 && c <= 7) || (c >= 12 && c <= 15)) return r % 4 === 3 ? 'R' : 'k';
  return (r + c) % 2 === 1 ? 'k' : 'p';
})));

{
  const b = new Round(56).castOn(seq(56)).needle({ kind: 'circular', len: 16 }).join('A');
  const k = 'k'.repeat(56), p = 'p'.repeat(56);
  b.section('Garter ridge').work(p, { slot: 'A' }).work(k, { slot: 'A' });
  b.section('Honeycomb');
  const cross = (t1, t2) => seq(14).flatMap(() => [{ s: 'x', cable: t1 }, 'x', { s: 'x', cable: t2 }, 'x']);
  for (let i = 0; i < 8; i++) b.work(i === 0 ? cross('C2B', 'C2F') : i === 4 ? cross('C2F', 'C2B') : k, { slot: 'A' });
  b.section('Garter ridge').work(k, { slot: 'A' }).work(p, { slot: 'A' });
  add({ id: 'honeycomb-cowl', name: 'Honeycomb Cowl', chapter: 4, technique: 'Two-stitch cables, in the round', ...ED2,
    source: 'Honeycomb in the round (*C2B, C2F, then *C2F, C2B 4 rnds later; 8-rnd repeat) between garter ridges (a purl and a knit round)',
    repeat: { width: 4, edges: 0, rows: 8, at: 4 }, wear: { slot: 'neck', fit: 'band' }, kind: 'ring', gauge: CHUNKY, bindOff: 'Bind off loosely.',
    finishing: 'Finishing: weave in the ends and block lightly.', slots: { A: Y('mint') } },
  roundPiece(b.def()));
}

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

add({ id: 'fisherman-beanie', name: 'Fisherman Beanie', chapter: 4, technique: 'Cables in rib, in the round', ...ED2,
  source: '2×2 rib brim, then *p2, k4 rope cables (C4F every 6th rnd) in the round, the crown decreased in the purls and then across the cables, and gathered',
  repeat: { width: 6, edges: 0, rows: 6, at: 6 }, wear: { slot: 'head', fit: 'dome' }, kind: 'dome', gauge: CHUNKY,
  finishing: 'Finishing: weave in the ends.', slots: { A: Y('oatmeal') } },
roundPiece(hatChart({ co: 48, brim: [4, ribOps('kkpp')],
  body: [8, (j, i) => { const u = j % 6; if (u < 2) return 'p'; if (i === 1 || i === 7) return u === 2 ? { s: 'x', cable: 'C4F' } : 'x'; return 'k'; }],
  crown: (b) => {
    b.work('qkkkk'.repeat(8)); // *p2tog, k4 (40)
    b.work('pkkkk'.repeat(8));
    b.work('p<>'.repeat(8)); // *p1, k2tog, ssk (24)
    b.work('pkk'.repeat(8));
    b.work('p<'.repeat(8)); // *p1, k2tog (16)
    b.work('<'.repeat(8)); // k2tog around (8)
  } })));

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

add({ id: 'lace-sock', name: 'Lace Sock', chapter: 5, technique: 'Lace rib, in the round', ...ED2,
  source: 'Lace rib in the round on the leg and the instep (*p2, k1, yo, ssk; then *p2, k2tog, yo, k1), *p2, k3 rib cuff, heel flap and turn, gusset, wedge toe grafted',
  repeat: { width: 5, edges: 0, rows: 2, at: 4 }, wear: { slot: 'feet', fit: 'pair' }, kind: 'sock', gauge: ARAN,
  finishing: 'Finishing: weave in the ends and block lightly to open the lace. Make a second sock the same for the pair.',
  slots: { A: Y('rose'), B: Y('plum', 'wool', 'Heel, toe and cuff') } },
roundPiece(sockChart({ co: 30, gusset: 5, backSplit: [8, 7], cuff: 2, cuffOp: ribOps('ppkkk'), leg: 8, legOps: (i) => (i % 2 ? 'pp<ok' : 'ppko>').repeat(6),
  flapRows: 9, heelTo: 9, foot: 3, toeTo: 10, instepOps: (i) => (i % 2 ? '<okpp' : 'ko>pp').repeat(3),
  slots: { main: 'A', cuff: 'B', heel: 'B', toe: 'B' } })));

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
  const peerie = motif(PEERIE);
  add({ id: 'holiday-stocking', name: 'Holiday Stocking', chapter: 7, technique: 'A stranded band on a stocking, in the round', ...ED2,
    source: 'Cuff-down stocking in the round: garter cuff (purl and knit rounds), stranded peerie band (6 sts × 7 rnds), heel flap and turn, gusset, foot, wedge toe grafted',
    repeat: { width: 6, edges: 0, rows: 7, at: 6 }, touch: { kind: 'loop', at: 'top-right' }, kind: 'sock', gauge: CHUNKY,
    notes: ['Strand the peerie band, carrying the yarn not in use loosely behind.'],
    finishing: 'Finishing: make a hanging loop: a 3" twisted cord of B, sewn inside the back of the cuff. Weave in the ends.',
    slots: { A: Y('red'), B: Y('white', 'wool', 'Cuff, heel, toe, motif'), C: Y('forest', 'wool', 'Band') } },
  roundPiece(sockChart({ co: 36, gusset: 6, flapRows: 11, heelTo: 12, foot: 3, toeTo: 12, slots: { main: 'A', cuff: 'B', heel: 'B', toe: 'B' },
    legParts: [
      { label: 'Cuff', rnds: 4, op: (j, i) => (i % 2 ? 'k' : 'p'), slot: 'B' },
      { label: 'Band', rnds: 7, op: (j, i) => ({ s: 'k', slot: peerie(i + 1, j) ? 'B' : 'C' }) },
      { label: 'Leg', rnds: 1, op: () => 'k', slot: 'A' },
    ] })));
}

{
  const b = new Round(48).castOn(seq(48)).needle({ kind: 'circular', len: 16 }).join('B');
  const k = (n) => 'k'.repeat(n);
  b.section('Neck').rounds(4, ribOps('kkpp'), { slot: 'B' });
  b.section('Chest and leg openings').rounds(3, () => 'k', { slot: (j, s, i) => (i === 1 ? 'B' : 'A') });
  b.work(k(4) + '_'.repeat(5) + k(14) + '_'.repeat(5) + k(20), { slot: 'A' });
  b.work(k(4) + '+'.repeat(5) + k(14) + '+'.repeat(5) + k(20), { slot: 'A' });
  b.section('Body').rounds(4, () => 'k', { slot: (j, s, i) => (i === 2 ? 'B' : 'A') });
  // the belly opening: 10 sts bound off at the middle of the 14 sts between the leg openings
  b.section('Belly').work(k(11) + '_'.repeat(10) + k(27), { slot: 'A' });
  // then back and forth on the circular over the other 38: first k11 to the opening, then turn
  b.section('Back (worked back and forth on the circular)').flatStart({ first: 'RS', cut: 37, span: 38 });
  b.work(k(11), { slot: 'A', hold: [...seq(27)] });
  b.rounds(3, () => 'k', { slot: 'A' });
  b.rounds(2, (j, i) => (i === 0 ? 'k' : 'p'), { slot: 'B' }); // garter: knit both rows (RS, then WS)
  b.flatEnd();
  add({ id: 'dog-sweater', name: 'Dog Sweater', chapter: 7, technique: 'Leg openings, in the round', ...ED2,
    source: 'Neck-down tube in the round: 2×2 rib neck, stockinette with honey stripes, two one-round leg openings (BO 5, then CO 5 over each gap), the belly bound off and the back finished flat with a garter edge',
    repeat: { width: 4, edges: 0, rows: 1, at: 2 }, kind: 'body', gauge: CHUNKY, bindOff: 'Bind off all sts knitwise.', notes: [JOG],
    finishing: 'Finishing: weave in the ends and block. The flat part covers the dog\'s back and leaves the belly free. It\'s for a dog, so no doll can wear it.',
    slots: { A: Y('denim'), B: Y('honey', 'wool', 'Rib and stripes') } },
  roundPiece(b.def()));
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
  // the body tube (48 sts) and the two sleeves' 12 sts each, joined into one yoke of 64. Columns from
  // the left: 2 underarm sts, sleeve A, the back, sleeve B, 4 underarm sts, the front, 2 underarm sts
  const W = 72;
  const uA = [70, 71, 0, 1], uB = [46, 47, 48, 49];
  const span = (a, n) => seq(n).map((i) => a + i);
  const body = [0, 1, ...span(14, 20), ...uB, ...span(50, 20), 70, 71];
  const YOKE = pic(`
  ...B....
  ..BBB...
  .BB.BB..
  BB...BB.
  .BB.BB..
  ..BBB...
  ...B....`);
  const yoke = motif(YOKE);
  const b = new Round(W).castOn(body).needle({ kind: 'circular', len: 16 }).join('A');
  b.section('Body').rounds(3, ribOps('kkpp'), { slot: 'A' }).rounds(5, () => 'k', { slot: 'A' });
  b.hold([uA, uB], 'Place 4 sts at each underarm on waste yarn: the last 2 and the first 2 sts of the rnd (removing the marker), and the 4 sts at the middle of the rnd. Join the yarn at the first front st and pm there: this is the new beg of rnd.');
  b.section('Yoke');
  const kk = (n) => 'k'.repeat(n).split('');
  b.work([...kk(20), ...seq(12).map((i) => ({ s: 'v', col: 45 - i })), ...kk(20), ...seq(12).map((i) => ({ s: 'v', col: 13 - i }))],
    { slot: 'A', step: { kind: 'joining', label: 'Joining rnd', text: 'Joining rnd: k20 front sts, k12 sts of one sleeve, k20 back sts, k12 sts of the other sleeve (64 sts).' } });
  b.rounds(1, () => 'k', { slot: (j) => (j % 4 === 1 ? 'C' : 'A') });
  const band = b.r + 1;
  b.rounds(7, (j, i) => ({ s: 'k', slot: yoke(i + 1, j) ? 'B' : 'A' }));
  b.work('kk<'.repeat(16), { slot: 'A' });
  b.rounds(1, () => 'k', { slot: 'A' });
  b.needle({ kind: 'dpn', n: 4, counts: [12, 12, 12, 12] });
  b.work('k<'.repeat(16), { slot: 'A' });
  b.section('Neck').rounds(2, ribOps('kkpp'), { slot: 'A' });
  b.graft([...uA, ...uB].map((c) => [c]), 'Graft the 4 held sts at each underarm to the 4 held sts of its sleeve with Kitchener stitch (8 sts).', 'A', 'graftUnderarm');
  add({ id: 'yoke-sweater', name: 'Yoke Sweater', chapter: 7, technique: 'A yoke, joined in the round', ...ED2,
    source: 'Bottom-up yoke sweater in the round: 2×2 rib hem, the body to the underarms, the sleeves joined on one circular needle, a stranded diamond band (8 sts × 7 rnds) between yoke decreases, 2×2 rib neck',
    repeat: { width: 8, edges: 0, rows: 7, at: band }, wear: { slot: 'body', fit: 'body' }, kind: 'body', gauge: SUPER,
    needlesText: '16" circular needle and a set of 5 DPNs (also for the sleeves)',
    preamble: ['Sleeves (make 2, before the body, on DPNs): cast on 16 sts in A and join to work in the rnd. Work 3 rnds of *k2, p2 rib, then knit 12 rnds (or until the sleeve reaches the underarm). Place the last 2 and the first 2 sts of the rnd (4 sts) on waste yarn for the underarm, leave the other 12 sts on a spare DPN and cut the yarn.'],
    notes: ['Strand the yoke band and the dots, carrying the yarn not in use loosely behind and catching any float longer than 5 sts.'],
    finishing: 'Finishing: weave in the ends, closing any little gaps at the underarms, and block.',
    slots: { A: Y('cream'), B: Y('cranberry', 'wool', 'Yoke'), C: Y('sage', 'wool', 'Yoke dots') } },
  roundPiece(b.def()));
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
