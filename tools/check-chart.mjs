// node tools/check-chart.mjs — checks chart.js on a few test charts (row map, wording, round trip).
import { parseChart, fill, rowWording, stripWording, writtenPattern, roundTrip as fullRoundTrip, wordingCursor, u16ToBase64, base64ToU16, parseRowText, parseWrittenPattern } from '../game/src/chart.js';
import { Round, crownRounds, hatChart, sockChart, mittenChart, ribOps } from '../game/src/patternKit.js';

let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) fails++; };
const roundTrip = (ch, name) => {
  const errs = fullRoundTrip(ch);
  ok(!errs.length, `${name}: the written pattern reads back (ranges -> rows -> tokens) to the row map${errs.length ? '\n     ' + errs.join('\n     ') : ''}`);
};

// 1. garter
{
  const ch = parseChart({ stitch: fill(12, 12, 'garter') });
  ok(!ch.errors.length, `garter parses (${ch.errors.join('; ')})`);
  ok(rowWording(ch, 1).text === 'k to end', `garter row 1 (RS): "${rowWording(ch, 1).text}"`);
  ok(rowWording(ch, 2).text === 'k to end', `garter row 2 (WS): "${rowWording(ch, 2).text}"`);
  ok(ch.total === 144, `garter has 144 sts (${ch.total})`);
  const wp = writtenPattern(ch);
  ok(/Rows 1–12: k to end/.test(wp.text), 'garter written pattern merges rows: ' + wp.text.split('\n').find((l) => /^Rows/.test(l)));
  roundTrip(ch, 'garter');
}

// 2. 2x2 rib, 14 wide (multiple of 4 + 2)
{
  const ch = parseChart({ stitch: fill(14, 6, 'rib2'), repeat: { width: 4, edges: 2, rows: 1 } });
  ok(!ch.errors.length, `2x2 rib parses (${ch.errors.join('; ')})`);
  const w1 = rowWording(ch, 1).text, w2 = rowWording(ch, 2).text;
  ok(w1 === 'k2, *p2, k2; rep from * to end', `2x2 rib row 1 (RS): "${w1}"`);
  ok(w2 === 'p2, *k2, p2; rep from * to end', `2x2 rib row 2 (WS): "${w2}"`);
  const w = rowWording(ch, 1);
  const cur = wordingCursor(w, 7);
  ok(cur.rep === 2 && cur.reps === 3 && cur.st === 2 && cur.of === 4, `cursor at st 8: rep ${cur.rep} of ${cur.reps} · st ${cur.st} of ${cur.of}`);
  ok(JSON.stringify(ch.markers(1)) === '[1,5,9,13]', `markers at repeat boundaries: ${JSON.stringify(ch.markers(1))}`);
  roundTrip(ch, '2x2 rib');
  console.log('     ' + writtenPattern(ch).text.split('\n').join('\n     '));
}

// 3. seed, 1x1 rib odd width, Fair Isle
{
  const seed = parseChart({ stitch: fill(11, 4, 'seed') });
  ok(!seed.errors.length, 'seed parses');
  console.log('     seed: ' + rowWording(seed, 1).text + ' | ' + rowWording(seed, 2).text);
  roundTrip(seed, 'seed');
  const fi = parseChart({ stitch: fill(12, 3, 'stockinette'), color: ['ABABABABABAB', 'AAABBBAAABBB', 'BBBBBBBBBBBB'], slots: { A: 1, B: 1 } });
  ok(!fi.errors.length, 'Fair Isle parses');
  console.log('     fair isle: ' + [1, 2, 3].map((r) => rowWording(fi, r).text).join(' | '));
  ok(rowWording(fi, 3).text === '*k1 B, k1 A; rep from * to end' || rowWording(fi, 3).text === '*k1 A, k1 B; rep from * to end', 'Fair Isle row 3 repeats colors');
  roundTrip(fi, 'fair isle');
}

// 4. cable panel
{
  const st = ['ppkkkkpp', 'ppxxxxpp', 'ppkkkkpp', 'ppkkkkpp']; // top first: row 3 holds the cable
  const ch = parseChart({ stitch: st, cables: [{ row: 3, col: 2, type: 'C4F' }] });
  ok(!ch.errors.length, `C4F panel parses (${ch.errors.join('; ')})`);
  ok(rowWording(ch, 3).text === 'p2, C4F, p2', `cable row 3: "${rowWording(ch, 3).text}"`);
  ok(rowWording(ch, 2).text === 'k2, p4, k2', `cable row 2 (WS): "${rowWording(ch, 2).text}"`);
  const bad = parseChart({ stitch: ['ppxxxxpp', 'ppkkkkpp'], cables: [{ row: 2, col: 2, type: 'C4F' }] });
  ok(bad.errors.some((e) => /RS/.test(e)), 'cable on a WS row is rejected');
  roundTrip(ch, 'cable');
}

// 5. decreasing hat crown: edge decreases, then 2-st steps bound off at the start of rows
{
  const st = [
    '....kk....', // 10 (WS) BO 2 at beg (left)
    '..kkkk....', // 9  (RS) BO 2 at beg (right)
    '..kkkkkk..', // 8
    '..<kkkk>..', // 7  (RS) ssk ... k2tog
    '.kkkkkkkk.', // 6
    '.kkkkkkkk.', // 5
    '.kkkkkkkk.', // 4
    '.<kkkkkk>.', // 3
    'kkkkkkkkkk', // 2
    'kkkkkkkkkk', // 1
  ];
  const ch = parseChart({ stitch: st });
  ok(!ch.errors.length, `hat crown passes the row map (${ch.errors.join('; ')})`);
  const w3 = rowWording(ch, 3).text, w9 = rowWording(ch, 9).text, w10 = rowWording(ch, 10).text;
  console.log(`     row 3: ${w3} | row 9: ${w9} | row 10: ${w10}`);
  ok(w3 === 'ssk, k6, k2tog', 'crown row 3 reads "ssk, k6, k2tog"');
  ok(w9 === 'bind off 2 sts, k to end', 'crown row 9 binds off at the start (the st left on the right needle starts the count)');
  ok(w10 === 'bind off 2 sts, p to end', 'crown row 10 (WS) binds off at the start');
  const R7 = ch.row(7).map;
  ok(R7[0].stitch === '>' && R7[0].takes.length === 2, 'ssk takes 2 sts');
  roundTrip(ch, 'hat crown');
  // bind-off at a row's END is rejected
  const bad = parseChart({ stitch: ['..kkkk..', 'kkkkkkkk'].reverse().reverse() });
  ok(bad.errors.some((e) => /end of the row/.test(e)), 'bind-off at the end of a row is rejected: ' + bad.errors[0]);
  console.log('     ' + writtenPattern(ch).text.split('\n').join('\n     '));
}

// 6. thumb hole: bind off under a gap, then '+' over '.' to close it
{
  const st = ['kkkkkkkk', 'kkk++kkk', 'kkk..kkk', 'kkkkkkkk', 'kkkkkkkk'];
  const ch = parseChart({ stitch: st });
  ok(!ch.errors.length, `thumb hole passes the row map (${ch.errors.join('; ')})`);
  const w3 = rowWording(ch, 3).text, w4 = rowWording(ch, 4).text;
  console.log(`     row 3: ${w3} | row 4: ${w4}`);
  ok(w3 === 'k3, bind off 2 sts, k to end', 'thumb row 3: bind off under the gap, 1 st already on the right needle');
  ok(w4 === 'p3, turn, cast on 2 sts, turn, p3', 'thumb row 4: cast on across the gap');
  const n = ch.needles(ch.rowStart(3) + 3);
  ok(JSON.stringify(n.left) === '[0,1,2]', `needles after the bind-off: left ${JSON.stringify(n.left)}, right ${JSON.stringify(n.right)}`);
  const plusBad = parseChart({ stitch: ['kk+kk', 'kkkkk'] });
  ok(plusBad.errors.some((e) => /'\+' must sit over/.test(e)), "'+' over a stitch is rejected");
  roundTrip(ch, 'thumb hole');
}

// 7. ears: islands, edge cast-on at the start of a row, lace
{
  const st = ['kk..kk', 'kkkkkk', 'kokkok', 'kkkkkk'];
  const ch = parseChart({ stitch: st, islands: 'ear' });
  // row 2: 'kokkok' — yo without decreases grows; this chart is deliberately bad
  ok(ch.errors.length > 0, 'unbalanced yarn-overs are reported: ' + ch.errors[0]);
  const lace2 = parseChart({ stitch: ['kkkkkk', 'k<oo>k', 'kkkkkk', 'kkkkkk'] });
  ok(!lace2.errors.length, `eyelet (k1, ssk, yo, yo, k2tog, k1) balances (${lace2.errors.join('; ')})`);
  console.log('     eyelet row 3: ' + rowWording(lace2, 3).text );
  roundTrip(lace2, 'eyelet');
  const ears = parseChart({ name: 'Ear test', source: 'Garter-stitch toy body', stitch: [
    '.kk..kk.', // 8 (WS)
    'kkk..kkk', // 7
    'kkk..kkk', // 6
    'kkk..kkk', // 5  split: bind off 2 under the gap
    'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk'], parts: 'ear', finishing: 'Seam the sides. Stuff lightly.' });
  ok(ears.errors.length && ears.errors.every((e) => /end of the row/.test(e)), 'ear tops: a decrease-less 1-st step at a part end is an error: ' + ears.errors[0]);
  const ears2 = parseChart({ name: 'Bunny ears', source: 'Garter-stitch toy body', stitch: [
    '..k<.>k..'.slice(0, 8), 'kkk..kkk', 'kkk..kkk', 'kkk..kkk', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk'].map((l, i) => (i === 0 ? '.<k..k>.' : l)), parts: 'ear', finishing: 'Seam the sides. Stuff lightly.' });
  ok(!ears2.errors.length, `two ears with part-start decreases parse (${ears2.errors.join('; ')})`);
  const wp = writtenPattern(ears2);
  ok(/Work each ear separately\.\nLeft ear:/.test(wp.text) && /Right ear \(rejoin yarn at the inner edge, WS facing\):/.test(wp.text), 'islands: after an RS split row the yarn is at the left ear; the right ear is rejoined with the WS facing');
  ok(/^Right ear · Row 7/.test(stripWording(ears2, 7, 0).label), 'strip names the part: ' + stripWording(ears2, 7, 0).label + ': ' + stripWording(ears2, 7, 0).text);
  roundTrip(ears2, 'ears');
  console.log('     ' + wp.text.split('\n').join('\n     '));
  const legs = parseChart({ stitch: ['kkkkkkk', 'kk+++kk', 'kk...kk', 'kk...kk'], parts: 'leg' });
  ok(!legs.errors.length, `legs cast on separately, then joined across the gap (${legs.errors.join('; ')})`);
  ok(/Cast on 2 sts for each leg \(2 legs\)/.test(writtenPattern(legs).text), 'legs from row 1: "Cast on 2 sts for each leg"');
  roundTrip(legs, 'legs');
}

// 8. repeat data check and saving helpers
{
  const bad = parseChart({ stitch: fill(13, 2, 'rib2'), repeat: { width: 4, edges: 2 } });
  ok(bad.errors.some((e) => /repeat/.test(e)), 'repeat width check: ' + bad.errors.find((e) => /repeat/.test(e)));
  const at = parseChart({ stitch: ['kkkkkkkkkk', 'kkkkkkkkkk', '.m......m.'.replace(/\./g, '.'), '.kkkkkkkk.'].map((l, i) => (i === 2 ? 'mkkkkkkkkm' : l)), repeat: { width: 4, edges: 2, at: 3 } });
  ok(!at.errors.some((e) => /repeat/.test(e)), `repeat.at checks the patterned row (${at.errors.join('; ')})`);
  const a = new Uint16Array([0, 1, 65535, 300, 7]);
  const b = base64ToU16(u16ToBase64(a));
  ok(Array.from(b).join() === Array.from(a).join(), 'Uint16 save round trip');
}

// 9. the review's wording rules: row-start cast-ons, M1 leans, a part bound off on its own, fasten off
{
  // a 4-st cast-on at a row start (WS: left edge) is worded as one cast-on, then worked
  const co3 = parseChart({ stitch: ['kkkkkkkkkk', '++++kkkkkk', 'kkkkkkkkkk'.replace(/^..../, '....')].map((l, i) => l) });
  const w2 = rowWording(co3, 2).text;
  ok(w2 === 'cast on 4 sts, p to end', `WS row-start cast-on of 4: "${w2}"`);
  roundTrip(co3, 'row-start cast-on');
  const inc = parseChart({ stitch: ['kkkkkkkkkkk', '.kkkkkkkkkm', '.kkkkkkkkk.'] });
  ok(rowWording(inc, 2).text === 'p1, M1RP, p to end' || /M1RP/.test(rowWording(inc, 2).text), `WS edge M1 at the right edge leans right: "${rowWording(inc, 2).text}"`);
  // chevron peaks: m k m pairs lean away from the peak, in either half of the run
  const chev = parseChart({ stitch: ['kkkkkkkkkkkkkkk', 'k>kmkmk<k>kmkmk<k'.slice(0, 15), 'kkkkkkkkkkkkkkk'] });
  const cw = rowWording(chev, 2).text;
  ok(!/M1R, k1, M1R|M1L, k1, M1L/.test(cw) || chev.errors.length > 0, `peaks pair M1L and M1R: "${cw}" ${chev.errors[0] || ''}`);
  const peak = parseChart({ stitch: ['kkkkkkkkkkkkk', '>kkkmkmkkk<kk', 'kkkkkkkkkkkkk', 'kkkkkkkkkkkkk'] });
  ok(!peak.errors.length && /M1L, k1, M1R|M1R, k1, M1L/.test(rowWording(peak, 3).text), `a peak right of centre still pairs M1L/M1R: "${rowWording(peak, 3).text}" ${peak.errors[0] || ''}`);
  // a thumb bound off inside its own part, the hand continuing alone
  const mit = parseChart({ parts: 'part', partLabels: ['Thumb', 'Hand'], stitch: [
    'kkkkkk....', // 6
    'kkkkkk....', // 5 (RS): the thumb bound off at the row start
    'kkkkkk.kkk', // 4
    'kkkkkk.kkk', // 3
    'kkkkkk.kkk', // 2 (WS): split, 1 st bound off under the gap
    'kkkkkkkkkk'] });
  ok(!mit.errors.length, `thumb chart parses (${mit.errors.join('; ')})`);
  const mt = writtenPattern(mit).text;
  ok(/Thumb:[\s\S]*Row 5 \(RS\): bind off rem 3 sts\n[\s\S]*Hand \(rejoin yarn at the inner edge, RS facing\):/.test(mt) && !/Continue across/.test(mt), 'the thumb is bound off inside its own part; no "Continue across all sts"');
  roundTrip(mit, 'thumb part');
  console.log('     ' + mt.split('\n').join('\n     '));
  // a single last stitch is fastened off; counts say "(1 st)"
  const pt = parseChart({ stitch: ['..k..', '..>..', '..kk.', '..kk.'] });
  const pw = writtenPattern(pt).text;
  ok(/\(1 st\)/.test(pw) && /Fasten off\./.test(pw) && !/1 sts/.test(pw), 'one st left: "(1 st)" and "Fasten off."');
}


// ================================================================ (Change 2) knitting in the round
const seq = (n) => Array.from({ length: n }, (_, i) => i);
const rdef = (b, extra = {}) => ({ ...(typeof b.def === 'function' ? b.def() : b), repeat: { width: 4, edges: 0, rows: 1, at: 2 }, gauge: { sts: 12, per: 4, yarn: 'chunky' }, finishing: 'Finishing: done.', ...extra });

// 10. rounds: every round from the RS, never inverted, "rep from * around", garter as purl and knit rounds
{
  const b = new Round(12).castOn(seq(12)).needle({ kind: 'circular', len: 4 }).join('A');
  b.rounds(2, ribOps('kkpp')).work('p'.repeat(12)).work('k'.repeat(12));
  const ch = parseChart(rdef(b));
  ok(!ch.errors.length, `a round chart parses (${ch.errors.join('; ')})`);
  ok(ch.round && [1, 2, 3, 4, 5].every((r) => ch.rsOf(r)) && ch.row(2).round, 'rsOf is true on every round; R.round is set');
  ok(rowWording(ch, 2).text === '*k2, p2; rep from * around', `2×2 rib in the round: "${rowWording(ch, 2).text}"`);
  ok(rowWording(ch, 3).text === '*k2, p2; rep from * around', 'the next round reads the same (no WS inversion)');
  ok(rowWording(ch, 4).text === 'purl' && rowWording(ch, 5).text === 'knit', `garter in the round: "${rowWording(ch, 4).text}" / "${rowWording(ch, 5).text}"`);
  ok(rowWording(ch, 2).label === 'Rnd 1', `labelled "${rowWording(ch, 2).label}"`);
  const R = ch.row(2);
  ok(R.map[0].col === 11 && R.map[11].col === 0, 'a round is knit from col W−1 (right of the marker) down to col 0');
  ok(ch.row(1).step.kind === 'join' && ch.row(1).map.length === 1 && ch.row(1).map[0].takes.length === 0 && ch.row(1).outCols.length === 12, 'the join is one tap that takes nothing; all 12 sts stay live (outCols)');
  ok(ch.yOf(1) === 0 && ch.yOf(2) === 1 && ch.yOf(5) === 4 && ch.rowHeight(1) === 0, `the row→y table: the join has no height (yOf: ${[1, 2, 5].map((r) => ch.yOf(r))})`);
  ok(ch.firstRow === 2 && ch.castOnCols.length === 12, 'the cast-on is the first worked round');
  const wp = writtenPattern(ch).text;
  ok(/Cast on 12 sts\.\nJoin to work in the rnd, being careful not to twist sts; pm for beg of rnd\.\nRnds 1–2: \*k2, p2; rep from \* around\nRnd 3: purl\nRnd 4: knit/.test(wp), 'written: the join, "Rnds 1–2", "Rnd 3: purl", "Rnd 4: knit"');
  ok(/^Yarn: chunky weight \(12 sts = 4" in stockinette\)\.$/m.test(wp) && /^Gauge: 12 sts = 4" \(10 cm\) in stockinette\.$/m.test(wp) && /^Needles: 6 mm \(US 10\): 4" circular needle\.$/m.test(wp) && /^Size: 12 sts around × 4 rnds, scaled down for the game\.$/m.test(wp), 'Yarn, Needles, Gauge and Size lines');
  roundTrip(ch, 'rounds');
  ok(JSON.stringify(parseRowText('knit', 3, true, true).map((o) => o.op)) === '["k","k","k"]' && parseRowText('*k2, p2; rep from * around', 8, true, true).length === 8, 'the parser reads "knit" and "rep from * around"');
  ok(parseWrittenPattern('Brim:\nRnds 1–2: knit\nRnd 3: purl').get('2|1') === 'knit', 'the parser keys rounds by section: section|n');
  // nothing is taken across the round's start: a k2tog in col 0 takes cols 0 and 1, never W−1
  const c2 = parseChart({ round: true, stitch: ['kkkkkkkkkk.<', 'kkkkkkkkkkkk'], repeat: { width: 1, edges: 0, rows: 1 } });
  ok(!c2.errors.length && c2.row(2).map.find((e) => e.stitch === '<').takes.map((t) => c2.row(2).prevCols[t]).join() === '10,11', 'a decrease takes the sts beside it in ring order');
  const c3 = parseChart({ round: true, stitch: ['<.kkkkkkkkkk', 'kkkkkkkkkkkk'], repeat: { width: 1, edges: 0, rows: 1 } });
  ok(!c3.errors.length && c3.row(2).map.find((e) => e.stitch === '<').takes.map((t) => c3.row(2).prevCols[t]).join() === '0,1', 'the round\'s first cell takes the first sts after the cut (cols 0, 1), not W−1');
  // rounds have no edge stitches
  ok(parseChart({ round: true, stitch: fill(12, 2, 'stockinette'), repeat: { width: 4, edges: 2, rows: 1 } }).errors.some((e) => /edges 0/.test(e)), 'a round repeat with edges is rejected');
}

// 11. a crown: wedges with filler, gathered
{
  const ch = parseChart(rdef({ def: () => hatChart({ co: 48, brim: [9, () => 'k'], crown: { wedges: 8, everyOther: 2 } }) }.def(), { repeat: { width: 1, edges: 0, rows: 1 } }));
  ok(!ch.errors.length && ch.total === 633, `hatChart: the beanie's 48-st crown (${ch.total} taps, ${ch.errors[0] || 'ok'})`);
  const wp = writtenPattern(ch).text;
  ok(/Change to DPNs \(12 sts on each of 4 needles\)\.\nRnd 1: \*k4, k2tog; rep from \* around \(40 sts\)\nRnd 2: knit\nRnd 3: \*k3, k2tog; rep from \* around \(32 sts\)/.test(wp), 'crown: "Change to DPNs", "*k4, k2tog; rep from * around (40 sts)", a plain round, "*k3, k2tog"');
  ok(/Rnd 7: k2tog around \(8 sts\)\nCut yarn, leaving a 6" tail; thread it through the rem 8 sts, pull tight and fasten off\./.test(wp), 'crown: "k2tog around (8 sts)", then the gather');
  const H = ch.height, G = ch.row(H);
  ok(G.step.kind === 'gather' && G.map.length === 8 && G.outCols.length === 0 && G.map.every((e) => e.takes.length === 1), 'the gather: one tap per st, each taking it; nothing left after');
  ok(ch.rowHeight(H) === 0 && ch.yOf(H) === ch.yOf(H - 1), 'the gather takes no height');
  const n = ch.needles(ch.rowStart(H) + 3);
  ok(n.step === 'gather' && n.next === G.map[3] && n.left.length === 5, `needles() mid-gather: step ${n.step}, ${n.left.length} sts still on the needles`);
  const w = stripWording(ch, H, 3);
  ok(wordingCursor(w, 3).token === 0 && /thread it through the rem 8 sts/.test(w.text), 'the strip shows the gather line for every tap');
  ok(ch.needles(ch.total).done && ch.needles(ch.total).right.length === 0, 'the hat ends with no sts on the needles');
  const L = ch.locate(ch.rowStart(H) + 5);
  ok(L.r === H && L.k === 5, 'locate() finds taps inside a step');
  roundTrip(ch, 'crown');
}

// 12. a heel: flat range inside a round piece, held instep, short rows, set-up round with picked-up sts, graft
{
  const d = sockChart({ co: 24, gusset: 5, cuff: 2, cuffOp: ribOps('kkpp'), leg: 2, flapRows: 9, heelTo: 8, foot: 1, toeTo: 8 });
  const ch = parseChart(rdef({ def: () => d }.def()));
  ok(!ch.errors.length, `sockChart parses (${ch.errors.slice(0, 2).join('; ')})`);
  const f = ch.flatRanges[0];
  ok(f && f.cut === 28 && f.span === 12 && ch.rsOf(f.from) === true && ch.rsOf(f.from + 1) === false && ch.rsOf(f.from + 2) === true, `the heel flap is a flat range cut at col 28 over 12 sts, sides alternating from RS (${JSON.stringify(f)})`);
  const r1 = f.from + 1, R1 = ch.row(r1);
  ok(R1.held.length === 12 && !R1.round && rowWording(ch, r1).text === 'sl1 wyif, p to end' && rowWording(ch, r1 + 1).text === 'sl1 wyib, k to end', `flap rows: "${rowWording(ch, r1).text}" / "${rowWording(ch, r1 + 1).text}", the instep held`);
  const nd = ch.needles(ch.rowStart(r1) + 2);
  ok(nd.left.every((c) => !R1.held.includes(c)) && nd.held.length === 12, 'needles(): the held instep is not on the left needle');
  ok(rowWording(ch, f.from).text === 'k6, turn', `the flap's set-up row: "${rowWording(ch, f.from).text}"`);
  const wp = writtenPattern(ch).text;
  ok(/Turn heel:\nRow 1 \(RS\): sl1 wyib, k6, ssk, k1, turn\nRow 2 \(WS\): sl1 wyif, p3, p2tog, p1, turn\nRow 3 \(RS\): sl1 wyib, k4, ssk, k1, turn\nRow 4 \(WS\): sl1 wyif, p5, p2tog, p1 \(8 sts\)\nWith A and the RS facing, k4 to the centre of the heel; this is the new beg of rnd \(pm\)\./.test(wp), 'the heel turn reads as short rows (30 taps, 8 sts), then k4 to the centre');
  let su = 0; for (let r = 1; r <= ch.height; r++) if (ch.row(r).step && ch.row(r).step.kind === 'setup') su = r;
  const S = ch.row(su);
  ok(S.map.length === 30 && S.map.filter((e) => e.stitch === 'u').length === 10 && S.map.filter((e) => e.stitch === 'u').every((e) => !e.takes.length) && S.ring.length === 30, 'the gusset set-up round: 30 taps, 5 + 5 picked up (u) taking nothing');
  ok(rowWording(ch, su).text.startsWith('Set-up rnd: with A, k4, pick up and k 5 sts evenly along the edge of the heel flap, k12'), 'its line: ' + rowWording(ch, su).text);
  const H = ch.height, G = ch.row(H);
  ok(G.step.kind === 'graft' && G.map.length === 4 && G.map.every((e) => e.takes.length === 2) && G.outCols.length === 0, 'the graft: half the remaining sts as taps, each taking a front and a back st');
  ok(/K2 to the side of the toe\. Cut the yarn, leaving a 12" tail\. Divide the rem 8 sts onto 2 needles, 4 for the instep and 4 for the sole, and graft them with Kitchener stitch \(4 sts\)\./.test(wp), 'the graft line');
  const bad = parseChart({ round: true, stitch: ['kkuk', 'kkkk'], repeat: { width: 1, edges: 0, rows: 1 } });
  ok(bad.errors.some((e) => /only in a step row/.test(e)), "'u' outside a step row is rejected");
  roundTrip(ch, 'sock');
}

// 13. a one-round gap (BO here, then CO over the gap), held sts and a mitten's thumb
{
  const b = new Round(24).castOn(seq(24)).needle({ kind: 'dpn', n: 3, counts: [8, 8, 8] }).join('A');
  b.rounds(1, () => 'k').work('k'.repeat(10) + '_'.repeat(4) + 'k'.repeat(10)).work('k'.repeat(10) + '+'.repeat(4) + 'k'.repeat(10));
  const ch = parseChart(rdef(b, { repeat: { width: 1, edges: 0, rows: 1 } }));
  ok(!ch.errors.length, `the thumb hole parses (${ch.errors.join('; ')})`);
  ok(rowWording(ch, 3).text === 'k10, bind off 4 sts, k to end' && ch.row(3).map.length === 20 && ch.row(3).ring.length === 20, `BO here: "${rowWording(ch, 3).text}" (20 taps; '_' is not a tap)`);
  ok(rowWording(ch, 4).text === 'k10, cast on 4 sts over the gap, k to end', `CO over the gap: "${rowWording(ch, 4).text}"`);
  ok(ch.row(3).map[9].boundOffAfter.length === 4, 'the bound-off sts go into the previous entry\'s boundOffAfter');
  roundTrip(ch, 'thumb hole');
  const m = parseChart(rdef({ def: () => mittenChart({ hA: 9, hB: 9, cuff: [2, ribOps('kp')], hand: [2, () => 'k'], top: { to: 8 }, thumb: 1 }) }.def(), { repeat: { width: 2, edges: 0, rows: 1, at: 2 } }));
  ok(!m.errors.length, `mittenChart parses (${m.errors.slice(0, 2).join('; ')})`);
  let hold = 0, thumb = 0, g1 = 0; for (let r = 1; r <= m.height; r++) { const st = m.row(r).step; if (st && st.kind === 'hold') hold = r; if (st && st.kind === 'thumb') thumb = r; if (st && st.kind === 'gather' && !g1) g1 = r; }
  ok(m.row(hold).map.length === 1 && m.row(hold + 1).held.length === 8, 'the hold: one tap, then 8 held sts in the rows above');
  ok(m.row(g1).outCols.length === 8 && m.row(g1).outCols.every((c) => m.row(hold + 1).held.includes(c)), 'the hand\'s gather leaves the held thumb sts live');
  ok(m.row(thumb).map.length === 10 && m.row(thumb).map.filter((e) => e.stitch === 'u').length === 2, 'the thumb set-up round: k8 held sts and pick up 2 (10 taps)');
  const badHeld = parseChart({ round: true, stitch: ['kk-k', 'kk.k'], repeat: { width: 1, edges: 0, rows: 1 } });
  ok(badHeld.errors.some((e) => /isn't live/.test(e)), "'-' over a st that isn't live is rejected");
  ok(parseChart({ stitch: ['kk_k', 'kkkk'] }).errors.some((e) => /only for round pieces/.test(e)), "'_' in a flat piece is rejected");
  ok(parseChart({ round: true, stitch: ['kkk.', 'kkkk'], repeat: { width: 1, edges: 0, rows: 1 } }).errors.some((e) => /left unworked/.test(e)), 'a live st that is not taken, held or bound off is reported');
}

console.log(fails ? `\n${fails} FAILED` : '\nall checks passed');
process.exit(fails ? 1 : 0);
