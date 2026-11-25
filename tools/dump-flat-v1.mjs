// node tools/dump-flat-v1.mjs — run ONCE, before Change 2's round editions land (CHANGE_2.md G).
// Writes game/src/patterns-flat-v1.json: for each of the 19 patterns Change 2 rewrites for knitting in
// the round, its edition-1 def exactly as the game built it (layers, cables, slots, parts, partLabels,
// source, repeat, wear, touch, finishing, notes…), so pieces and gallery records saved before the
// change keep baking, wearing and finishing flat as they were knit. Refuses to overwrite the file once
// the patterns carry editions (the flat layers would be gone by then).
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PATTERNS } from '../game/src/patterns.js';
import { parseChart } from '../game/src/chart.js';

export const CHANGED = ['ribbed-wristwarmer', 'striped-headband', 'rolled-brim-beanie', 'moss-ear-warmer', 'bobble-hat',
  'broken-rib-cowl', 'fingerless-mitts', 'cozy-sock', 'chunky-mitten', 'strawberry-pouch', 'snowflake-mitten', 'argyle-sock',
  'cable-headband', 'honeycomb-cowl', 'fisherman-beanie', 'lace-sock', 'holiday-stocking', 'dog-sweater', 'yoke-sweater'];

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'game', 'src', 'patterns-flat-v1.json');
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (PATTERNS.some((p) => (p.edition || 1) > 1) && existsSync(out) && !process.argv.includes('--force')) {
    console.log('patterns already carry editions: patterns-flat-v1.json stays as it was dumped');
    process.exit(0);
  }
  const res = { note: 'Edition 1 (flat) of the patterns Change 2 knits in the round. Generated once by tools/dump-flat-v1.mjs; do not edit.', patterns: {} };
  for (const id of CHANGED) {
    const p = PATTERNS.find((x) => x.id === id);
    if (!p) throw new Error(`no pattern ${id}`);
    const def = JSON.parse(JSON.stringify(p));
    def.edition = 1;
    const ch = parseChart(def);
    if (ch.errors.length) throw new Error(`${id}: ${ch.errors[0]}`);
    res.patterns[id] = def;
    console.log(`${id.padEnd(22)} ${ch.width}×${ch.height} ${ch.total} sts`);
  }
  writeFileSync(out, JSON.stringify(res) + '\n');
  console.log(`wrote ${out}`);
}
