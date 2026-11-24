// patterns-dev.js — a small stand-in book (5 charts) used only until src/patterns.js exists.
// Same shape as the real file: an array of pattern defs in book order.
import { fill } from './chart.js';

const garterBorder = (w, h) => fill(w, h, (r, c) => (r <= 2 || r > h - 2 || c < 2 || c >= w - 2 ? (r % 2 ? 'k' : 'p') : 'k'));

export const PATTERNS = [
  {
    id: 'garter-dishcloth', name: 'Garter Dishcloth', chapter: 1, technique: 'Garter stitch: knit every row',
    source: 'Garter stitch (k every row)', repeat: { width: 1, edges: 0, rows: 2 }, wear: null,
    finishing: 'Weave in ends and block.', slots: { A: { color: '#9e2a3a', type: 'wool' } },
    stitch: fill(12, 12, 'garter'),
  },
  {
    id: 'stockinette-coaster', name: 'Stockinette Coaster', chapter: 1, technique: 'Stockinette in a garter border',
    source: 'Stockinette in a garter border', repeat: { width: 1, edges: 4, rows: 2 }, wear: null,
    finishing: 'Weave in ends and block.', slots: { A: { color: '#8fa77f', type: 'cotton' } },
    stitch: garterBorder(10, 10),
  },
  {
    id: 'seed-bookmark', name: 'Seed Stitch Bookmark', chapter: 1, technique: 'Seed stitch over an odd count',
    source: 'Seed stitch over an odd count (k1, *p1, k1)', repeat: { width: 2, edges: 1, rows: 2 }, wear: null,
    finishing: 'Weave in ends and block. Add a tassel at the top.', slots: { A: { color: '#d9a441', type: 'wool' } },
    stitch: fill(7, 22, 'seed'),
  },
  {
    id: 'ribbed-wristwarmer', name: 'Ribbed Wristwarmer', chapter: 1, technique: '1×1 rib',
    source: '1×1 rib (k1, *p1, k1)', repeat: { width: 2, edges: 1, rows: 2 }, wear: { slot: 'hands', fit: 'pair' },
    finishing: 'Make a back the same. Seam both sides, leaving a thumb gap 3 rows below the top. Make 2.',
    slots: { A: { color: '#5b3a5e', type: 'wool' } },
    stitch: fill(13, 14, 'rib1'),
  },
  {
    id: 'striped-headband', name: 'Striped Headband', chapter: 1, technique: '2×2 rib in three-color stripes',
    source: '2×2 rib (k2, *p2, k2), stripes in 3 slots', repeat: { width: 4, edges: 2, rows: 2 }, wear: { slot: 'head', fit: 'band' },
    finishing: 'Sew the cast-on edge to the bind-off edge.',
    slots: { A: { color: '#efe4cf', type: 'wool' }, B: { color: '#9e2a3a', type: 'wool' }, C: { color: '#8fa77f', type: 'wool' } },
    stitch: fill(10, 24, 'rib2'),
    color: fill(10, 24, (r) => 'ABC'[Math.floor((r - 1) / 4) % 3]),
  },
];
export default PATTERNS;
