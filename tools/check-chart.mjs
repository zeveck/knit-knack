// node tools/check-chart.mjs — checks chart.js on a few test charts (row map, wording, round trip).
import { parseChart, fill, rowWording, stripWording, writtenPattern, roundTrip as fullRoundTrip, wordingCursor, u16ToBase64, base64ToU16 } from '../game/src/chart.js';

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

console.log(fails ? `\n${fails} FAILED` : '\nall checks passed');
process.exit(fails ? 1 : 0);
