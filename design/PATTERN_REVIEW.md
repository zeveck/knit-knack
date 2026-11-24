# Knit Knack: pattern tech-edit review

Reviewer: knitting technical editor. Source: `tools/patterns.txt`, regenerated with `node tools/check-patterns.mjs --text` on 2026-11-24 ("47 of 47 read back exactly, all pattern checks passed"). I also checked the five pattern-sheet screenshots, `game/src/chart.js` and `game/src/patternKit.js`, and the design table in `GAME_DESIGN.md`. No files were changed apart from this one.

## Summary

The stitch patterns are real and nearly all are charted correctly. That covers garter, stockinette, seed, moss, 1×1 and 2×2 rib, broken rib, basketweave, the rope, Aran, plait and honeycomb cables, vine lace, Old Shale, lace rib, eyelets, chevron, OXO and the peerie bands. Repeats, row counts and RS/WS wording are correct, and decreases lean and mirror correctly at shaped edges: ssk or ssp at the right edge, k2tog or p2tog at the left. The pictures read as the objects, except the chevron blanket and Old Shale, which show no wave (known), and the argyle sock, whose diamonds look blobby.

The problems are in the generated wording, not the stitch patterns. A few `chart.js` habits break stitch counts in about 18 patterns, so a knitter following the text would get stuck:

1. **Mid-row and row-start bind-offs miscount** (new, the most widespread problem). "bind off 2 sts, p10" on 12 sts can't be worked: after a bind-off one stitch is already on the right needle. This affects 17 patterns.
2. **Row-start cast-ons** (known; confirmed, and it affects 1-stitch cast-ons too). "cast on 1 st, k1, M1R, k7" only adds up if the new stitch goes on the *right* needle by backward loop, and the pattern never says so. With the usual cable or knitted cast-on the count is off by one.
3. **A part bound off across a gap.** After "Continue across all sts", a thumb or tail is bound off straight into the hand or body across empty columns (13, 19, 39).
4. **The whale's tail (35), rows 12–16, can't be worked.** It has M1s after the last stitch, a row 14 that doesn't match the chart, and flukes that split without being worked separately.
5. **The finishing doesn't make the object** for the octopus (38): it gives 4 legs, not 8, and you can't stuff it through the leg tips. The cardigan (46) has a back with no instructions and buttons in a yarn B that isn't listed.
6. **Safety:** the bunny's (33) button eyes need a "not for under-3s" note.

After those come a set of should-fix items. The worst are lopsided crowns and star arms (one-sided bind-offs), "make a back in A" losing the brim, cuff and heel colours, labels saying the wrong part needs its yarn rejoined, a 36-stitch float in the afghan, undefined MB, no intarsia twist note, and repeat brackets that cut motifs apart.

**Known items, verdicts:**
- *M1R, k1, M1R at a chevron peak:* **Confirmed as a latent bug, not in the current text.** The chevron now uses yo, k1, yo. `chart.js` lines 403–407 choose M1L or M1R by which half of the *whole run* the M1 sits in. With two peaks in one 28-stitch run, both M1s at the right-hand peak fall in the right half and both come out M1R. Choose the lean from the neighbouring stitch (the peak), not from the run's half.
- *Multi-stitch cast-on at a row start:* **Confirmed, and it's wider than reported.** Even the 1-stitch cast-ons are worded with counts that assume a backward loop onto the right needle (finding F2). The `EDGE_CO_MAX` workaround in `patternKit.js:124-128` (cast on 1 stitch plus an M1 per row) is why every sleeve and head grows that way.
- *"(1 sts)" and "to last 1 st":* **Confirmed.** "(1 sts)" appears in 17, 34, 35 and 39; "to last 1 st" appears throughout. Use "(1 st)" and "to last st". A single remaining stitch also gets "p to end. Bind off all sts", where it should say "Fasten off".
- *Old Shale spelled out:* **Confirmed.** "yo, k1, yo, k1 … (6 times)" should read "[yo, k1] 6 times", matching the "[k2tog] 3 times" in the same row. It's wording only (nice).
- *Chevron and Old Shale show no wave in the flat rendering:* **Confirmed.** In the picture the chevron reads as stripes with eyelet columns. Since "it looks right" is the brief, I'd rate it should-fix.
- *No sk2p, so the doily uses single decreases:* **Disagree that this is a defect.** The doily's eyelet diamonds pair one yo with one single decrease on every row (stitch counts hold, and the leans are right: outward below the widest row, inward above). It's a legitimate small lace diamond. sk2p would only matter for a "yo, sk2p, yo" diamond top, which this chart doesn't use.

## Verdicts, all 47

| # | Pattern | Verdict | Main reasons |
|---|---|---|---|
| 1 | Garter Dishcloth | good | Correct garter |
| 2 | Stockinette Coaster | good | Correct garter border |
| 3 | Seed Stitch Bookmark | good | Correct odd-count seed |
| 4 | Ribbed Wristwarmer | minor | Bind off in rib (F14); colour-change blips in rib (note) |
| 5 | Striped Headband | minor | Bind off in rib |
| 6 | Basketweave Mug Cozy | good | 4×4 blocks correct |
| 7 | Rolled-Brim Beanie | must fix | Row 20 BO count (F1); one-sided crown bind-off (F7); back "in A" loses the B brim (F8) |
| 8 | Moss Stitch Ear Warmer | minor | M1LP/M1RP leans undefined, rows 2/4 vs 3 (F15) |
| 9 | Bobble Hat | minor | Pom-pom missing from finishing (F11); back "in A" (F8) |
| 10 | Broken Rib Cowl | minor | "Fold in half… seam the side edges" is ambiguous (F11) |
| 11 | Fingerless Mitts | must fix | Row 12 BO count (F1); thumb hole not mirrored for the pair (F11) |
| 12 | Cozy Sock | minor | Back "in A" loses the cuff, heel and toe colours (F8); intarsia note (F13); bind off in rib |
| 13 | Chunky Mitten | must fix | Thumb bound off into the hand across the gap (F3); rows 14/19 BO counts (F1) |
| 14 | Fair Isle Coaster | minor | Repeat brackets cut the O/X motif (F12); "12+1" vs design "6+1" |
| 15 | Checkerboard Washcloth | good | 4-stitch floats are fine (a stranded cotton cloth is snaggy; nice-level note) |
| 16 | Heart Pillow | minor | Needs a bobbin for each A side and each lobe (F13) |
| 17 | Star Ornament | must fix | Rows 12–14 BO counts (F1); arms asymmetric (F7); left point M1R should be M1L; "(1 sts)"/fasten off |
| 18 | Strawberry Pouch | minor | "Dot stitch" is really stranded dots (naming); drawstring has no eyelet row; repeat cuts the leaves (F12) |
| 19 | Snowflake Mitten | must fix | Thumb bound off across the gap (F3); BO counts (F1); motif is 7×9, not "7×7" |
| 20 | Argyle Sock | minor | Diamonds pinch at rows 16/21; half-diamonds merge into the heel and toe at row 7; needs a duplicate-stitch or bobbin note (F10); back "in A" (F8) |
| 21 | Cable Headband | good | C4F every 6th row correct |
| 22 | Aran Mug Cozy | good | Seed ground alternates correctly; cables framed by p1 |
| 23 | Honeycomb Cowl | minor | 1/1 crosses only every 4 rows give a faint honeycomb (nice) |
| 24 | Bobble Cushion | minor | MB undefined (F13); WS repeat brackets don't align with the 10-stitch motif (F12) |
| 25 | Fisherman Beanie | must fix | Row 22 BO count and lopsided top (F1, F7); "*k2, p3, k2" splits the cable (F12) |
| 26 | Braided Scarf Panel | good | C6F/C6B plait braids correctly |
| 27 | Eyelet Dishcloth | good | Row 9 eyelet hugs the 1-stitch border (nice) |
| 28 | Vine Lace Bookmark | good | Matches Walker's Vine Lace exactly |
| 29 | Lace Doily Square | minor | Finishing says to pin "points" a square doesn't have (F11) |
| 30 | Feather-and-Fan Shawlette | minor | "[yo, k1] 6 times" wording; no wave in the picture (F9) |
| 31 | Lace Sock | minor | Back "in A" (F8); row 11 k2tog lands in a purl column (use p2tog) |
| 32 | Chevron Baby Blanket | minor | No wave in the picture (F9); design table still says "M1s" |
| 33 | Little Bunny | must fix | Button-eye safety (F5); BO and CO counts (F1, F2); rejoin label on the wrong ear (F15) |
| 34 | Cat Toy | must fix | Row 15 BO count (F1); rejoin label (F15); "(1 sts)" |
| 35 | Whale | must fix | Tail rows 12–16 can't be worked (F4); CO/BO counts (F1, F2); rejoin label (F15) |
| 36 | Frog | must fix | Row 13 BO count (F1); rejoin label (F15) |
| 37 | Penguin | minor | Row 16 repeat bracket (F12); intarsia note |
| 38 | Octopus | must fix | Finishing gives 4 legs, not 8, and no stuffing opening (F6b) |
| 39 | Fox | must fix | Tail bound off across the gap (F3); BO/CO counts (F1, F2); rejoin label (F15) |
| 40 | Teddy Bear | must fix | Rows 12/13/20 BO counts (F1); BO 3 then M1 on the same side (F7) |
| 41 | Tea Cosy | must fix | Rows 23/24 BO counts (F1); otherwise a good pattern |
| 42 | Holiday Stocking | must fix | Row 12 BO count (F1); otherwise good (band floats ≤4, loop on the heel side) |
| 43 | Dog Sweater | must fix | Row 12 BO counts (F1); leg holes use 2 needless yarn joins (F11) |
| 44 | Patchwork Blanket | minor | Rib squares pull in against garter and basketweave in one piece (F10); intarsia note |
| 45 | Yoke Sweater | must fix | Rows 25–29 CO and 41–44 BO counts (F1, F2); shoulder rejoin label (F15); cuff columns 2 vs 3 sts |
| 46 | Cabled Cardigan | must fix | Back has no instructions; buttons "in B" but no B listed (F6c); BO/CO counts; "Right front" is the wearer's left |
| 47 | Heirloom Afghan | minor | 36-stitch A float across the Fair Isle and bobble bands (F10); MB undefined; lace diamonds have no top |

Totals: **good 11, minor 18, must fix 18.** Of the 18 must-fixes, 12 are must-fix only because of F1 and F2, which are one fix each in `chart.js`.

## Detailed findings, most severe first

There are more than the usual 10 findings because the brief asks for every pattern. "Who meets it" counts knitters following that pattern.

### F1. A bind-off within a row miscounts the stitches that follow
Severity: must-fix
Who meets it: most (17 patterns, including every crown and leg hole). How bad: breaks. Fix: small
What's wrong: Standard usage is that after "BO n sts" one stitch is already on the right needle. The generator counts it again:
- 7, row 20: "bind off 2 sts, p10 (10 sts)" on 12 sts leaves only 9 to purl.
- 11, row 12: "p8, bind off 3 sts, p2"
- 13, row 14: "p12, bind off 1 st, p2, M1RP, p1"
- 17, rows 12–14
- 19, rows 14 and 21
- 25, row 22
- 33, rows 7, 8 and 17
- 34, row 15: "k3, bind off 8 sts, k3"
- 35, rows 9, 12 and 14
- 36, row 13
- 39, rows 4, 7 and 17
- 40, rows 12, 13 and 20
- 41, rows 23–24
- 42, row 12
- 43, row 12: "p3, bind off 5 sts, p10, bind off 5 sts, p3"
- 45, rows 41–44
- 46, rows 43–46

The unit test codifies the miscount: `tools/check-chart.mjs:82` expects "bind off 2 sts, k4".
Why it matters: The knitter runs out of stitches on every one of these rows. This is the single biggest "not a real pattern" problem.
Suggestion: In `chart.js` (around `rowAtoms`, line 472), take 1 off the run that follows a BO group. Use "to end" when it runs to the row end:
- 7, row 20: "bind off 2 sts, p to end (10 sts)"
- 11, row 12: "p8, bind off 3 sts, p to end (10 sts)". Mid-row cases read like "p8, bind off 3 sts, p1 (2 sts after the gap)".
- 43, row 12: "p3, bind off 5 sts, p9 (10 sts after the first gap), bind off 5 sts, p2 (3 sts after the gap)"

The alternative is to keep the numbers and print this note in every abbreviation block that has a mid-row BO: "After a bind-off, the stitch left on the right needle counts as the first stitch of the next count." Then fix the test expectations to match.
Evidence: `tools/patterns.txt` lines 262, 421, 522, 723–725, 1141, 1556–1566, 1908, 1969–1977, 2036–2037, 2083, 2154, 2309–2318, 2406–2446. Count any of them by hand.

### F2. A row-start cast-on needs the backward-loop-on-the-right-needle method, but the pattern never says so
Severity: must-fix
Who meets it: some (33, 35, 39, 45, 46). How bad: breaks. Fix: small
What's wrong:
- 33, row 9: "cast on 1 st, k1, M1R, k7 (10 sts)" on 8 sts.
- 33, row 10: "cast on 1 st, k10 (11 sts)".
- 45, row 25: "cast on 1 st, k1, M1R, k22, M1L, k1 (27 sts)".

These counts hold only if the new stitch sits on the *right* needle and isn't worked. A knitter using the usual cable or knitted cast-on ("CO 1 st at the beg of the row") puts it on the left needle, knits it as the "k1", and ends one stitch short of the row. This is the known issue, and it also affects 1-stitch cast-ons. `patternKit.js:124-128` (EDGE_CO_MAX) shows why every outward step is "cast on 1 st, k1, M1".
Why it matters: Every sleeve (45, 46), the whale's tail and the fox's and bunny's heads miscount.
Suggestion: Pick one of these:
- (a) Word it as cast on to the left needle and work the new stitches: 33, row 9: "Cast on 1 st, k2, M1R, k to end (10 sts)"; 45, row 25: "Cast on 1 st, k2, M1R, k to last st, M1L, k1 (27 sts)".
- (b) Keep the counts and write "using the backward-loop method, cast on 1 st onto the right needle, then k1, M1R, …".

(a) is the standard wording, and it also lets `chart.js` say "cast on 4 sts" at a row start, so EDGE_CO_MAX can become Infinity.
Evidence: `patterns.txt` 1558–1561, 1668–1674, 1900–1901, 2293–2297, 2390–2432; `patternKit.js:124`.

### F3. Thumbs and the fox's tail are bound off across an empty gap into the hand or body
Severity: must-fix
Who meets it: some (13, 19, 39). How bad: breaks (the thumb top is joined to the hand). Fix: small
What's wrong: 13 ends the thumb with "Continue across all sts. Row 19 (RS): with A, bind off 2 sts, k12 (12 sts)". To bind off the second thumb stitch you pass it over the first *hand* stitch, two empty columns away, so a strand ties the thumb tip to the hand. 19, row 21, does the same. In 39, row 7, "bind off 2 sts, k6" pulls the tail tip across 3 empty columns into the body.
Why it matters: The mitten or fox comes out with a bridged thumb or tail, and the counts are wrong too (F1).
Suggestion: Finish the part inside its own section and drop "Continue across all sts" when nothing rejoins:
- 13: "Thumb: rows 15–18 as given. Row 19 (RS): bind off 2 sts; fasten off. Hand: … Row 19 (RS): k to end. Row 20: p2tog, p8, ssp (10 sts)."
- 19: the same.
- 39: "Tail: Row 7 (RS): bind off 2 sts, fasten off. Body: Row 7 (RS): k6."

`chart.js` should only print "Continue across all sts" when the parts are joined by a cast-on across the gap.
Evidence: `patterns.txt` 523–537, 824–839, 1890–1898; chart rows 18–19 of 13 show the 2-column gap.

### F4. The whale's tail (35), rows 10–16, can't be worked as written
Severity: must-fix
Who meets it: some (everyone who makes the whale). How bad: breaks. Fix: medium
What's wrong:
- Tail row 12: "p2tog, M1RP". After the p2tog there are no stitches left, so there's no bar to lift. Row 14 ends "p1, M1RP" in the same way.
- Row 14 (tail): "bind off 1 st, p1, M1RP" doesn't match the chart. The chart has "M1, p1, BO 1, p1, M1" and splits the tail into two 2-stitch flukes. Row 15 "k to end" then knits across the fluke gap, and row 16 "p2tog (1 sts)" leaves 2 stitches in the chart (one decrease per fluke), not 1.
- Body row 14: "bind off 10 sts, M1LP, p1 (2 sts)" binds off the whole body and then increases into stitches that belong to the tail.
Why it matters: The tail and flukes, the whale's defining shape, can't be made.
Suggestion: Rewrite these rows by hand (or change `chart.js` so an increase at a run end becomes "pfb"/"kfb" and a split inside a part opens a new part):
- Body: Rows 10–13 as given. Row 14 (WS): bind off all 10 sts.
- Tail: Row 10 (WS): p2tog, p1 (2 sts). Row 11: k2. Row 12: p2tog, pfb (2 sts). Row 13: k1, M1R, k1 (3 sts). Row 14 (WS): pfb, bind off 1 st, pfb (4 sts: 2 for each fluke).
- Each fluke separately: Row 15: k2. Row 16: p2tog; fasten off.
Evidence: `patterns.txt` 1678–1693 against chart lines 1699–1703.

### F5. Bunny button eyes have no safety note
Severity: must-fix (safety)
Who meets it: some. How bad: safety. Fix: small
What's wrong: 33's finishing says "Sew on two button eyes." It's a toy, and buttons are a choking hazard for small children.
Why it matters: Any real toy pattern carries this warning.
Suggestion: Add: "For a baby or a child under 3, embroider the eyes in black yarn instead of using buttons." Add the same line to any other toy that gains buttons or safety eyes.
Evidence: `patterns.txt` 1577.

### F6. Finishing that doesn't make the object (38 Octopus, 46 Cardigan)
Severity: must-fix
Who meets it: some. How bad: breaks. Fix: small
What's wrong:
- (b) The octopus says to "seam round, leaving the cast-on edge open… stuff… sew the opening closed". Seaming the front's 4 legs to the back's 4 legs makes 4 two-layer legs, not 8. You also can't stuff through four 3-stitch leg tips.
- (c) For the cardigan back, "plain stockinette in A, as wide as both fronts with their sleeves" gives no cast-on, sleeve shaping or shoulders. The yarn list has only "A Honey wool", but the finishing says "sew 4 buttons in B".
Suggestion:
- 38: "Place right sides together and seam round the head and down each side to row 8 only, leaving the legs free, so the front's 4 legs and the back's 4 make 8. Turn out through the gap between the middle legs, stuff the head and close the gap."
- 46: Write the back out. "Cast on 23 sts. Work 2 rows seed, then stockinette to row 26. Rows 27–32: cast on 1 st at the beg of each row and M1 at each end (as the fronts) to 41 sts. Work to row 42. Bind off 5 sts at the beg of the next 4 rows, then bind off the remaining 21 sts." Change "buttons in B" to "4 buttons".
Evidence: `patterns.txt` 1854, 2444, 2377.

### F7. One-sided bind-offs make crowns, star arms and the teddy's shoulders lopsided
Severity: should-fix
Who meets it: most (the beanie is the 7th pattern; the picture shows the step). How bad: looks broken. Fix: small
What's wrong:
- 7, row 20: "bind off 2 sts, p10" leaves a 2-stitch step on one side of the crown; see the pattern-sheet card.
- 25, row 22: the same.
- 17: the left arm binds off 3 then 2 (rows 12, 14) while the right arm binds off 5 at once (row 13), so the arms differ.
- 40, rows 12–13: bind off 3 on the left, then bind off 2 on the right *and* M1L on the left.
Suggestion:
- 7, row 20: "p2tog, p8, ssp (10 sts)".
- 25, row 22: "p2tog, k3, p4, k3, ssp (12 sts)".
- 17: "Row 12: BO 3 sts, p to end. Row 13: BO 3 sts, k to end. Row 14: BO 2 sts, p to end. Row 15: BO 2 sts, k to end (3 sts)."
- 40: "Rows 12–13: bind off 2 sts at the beg of each row (14 sts)".

Make the generator prefer paired edge decreases, or paired bind-offs on consecutive rows, over a single-sided bind-off.
Evidence: pattern-sheet.png (cards 7 and 17); `patterns.txt` 262, 723–725, 1141, 1969–1970.

### F8. "Make a back the same in A" drops the brim, cuff, heel and stripe colours
Severity: should-fix
Who meets it: some (7, 9, 12, 13, 19, 20, 31, plus 35's belly). How bad: looks broken (worn, the stripe or brim stops halfway round). Fix: small
What's wrong: 9: "make a back the same in A", so the hat's B rib brim and B stripe go only halfway round the head. Socks 12, 20 and 31 get an A cuff, heel and toe on the back. The mittens get an A cuff.
Suggestion: For colour that wraps round (brims, stripes, cuffs, heels, toes), say "make a back the same, in the same colours (the mirror image)". Keep "plain in A" only for faces and motifs (heart, snowflake, argyle, toy faces).
Evidence: `patterns.txt` 264, 343, 475, 539, 844, 905, 1447.

### F9. The chevron (32) and Old Shale (30) pictures show no wave (known)
Severity: should-fix
Who meets it: some. How bad: looks broken (the brief is "it looks right"). Fix: medium
What's wrong: The renderer keeps every row on a straight grid, so 32 reads as stripes with eyelet columns and 30 as plain stripes.
Suggestion: In `renderSwatch`, shift each stitch vertically by the running count of decreases and yos in its column, so stitches dip at valleys and rise at peaks. Scallop the cast-on edge to match.
Evidence: pattern-sheet-3.png (cards 30 and 32).

### F10. Colourwork floats and mixed gauges with no note (47, 20, 44)
Severity: should-fix
Who meets it: some. How bad: misleads, and the fabric comes out wrong. Fix: small
What's wrong:
- 47, rows 15–21 and 34–38: "k2 A, *…; rep from * to last 2 sts, k2 A" carries A across 36 stitches behind the C/B and D bands. That's far past the ~7-stitch limit.
- 20: the argyle overcheck lines (D) need 6–11 bobbins a row. The chart's diamonds also pinch at rows 16 and 21 (widths 2,6,4,6,8,8,6,4,6,2), and at row 7 the half-diamonds merge into the heel and toe blocks (blobby on the card).
- 44: 1×1 and 2×2 rib squares worked in one piece beside garter, seed and basketweave will draw in and pucker.
Suggestion:
- 47: "Use a separate small ball of A for each border and twist the yarns at the colour change; do not carry A across."
- 20: "Knit the diamonds in intarsia; add the D lines afterwards in duplicate stitch." Rechart the diamond as widths 2,4,4,6,6,8,8,6,6,4,4,2 with D crossing it, and start the argyle at row 13 (plain A foot).
- 44: Swap the rib squares for gauge-compatible stitches (for example double seed and garter-rib), or say "knit the squares separately and seam".
Evidence: `patterns.txt` 2511–2532, 880–924, 2213–2225.

### F11. Smaller finishing and construction errors
Severity: should-fix
Who meets it: some. How bad: misleads. Fix: small
What's wrong, and the fix for each:
- **9:** The finishing never mentions the pom-pom, though it's in the title and the picture. Add "Make a pom-pom in B and sew it to the top."
- **11:** The thumb hole sits 2 stitches from one edge, and "make a second one the same" gives two right mitts. Add "For the second mitt work row 12 as p2, BO 3, p to end and row 13 as k8, turn, CO 3, turn, k2."
- **10 and 23:** "Fold in half… seam the side edges" reads like a pocket. Say "Bring the two side edges together, right sides facing, and seam them to make a tube."
- **29:** "Pinning out the points of the diamonds" isn't possible for internal motifs. Say "pin the edges straight and the corners square".
- **43:** Rows 12–14 rejoin the yarn twice to work row 13 in three parts. Work it as a buttonhole instead: "Row 13 (RS): k3, turn, CO 5 sts, turn, k10, turn, CO 5 sts, turn, k3 (26 sts)", then row 14 purl.
- **46:**
  - "Right front" is charted on the viewer's right, which is the wearer's *left* front. Rename the fronts as worn, or note that the buttonholes are on the left (men's style).
  - Both fronts use C4B. Use C4F on one front so the cables mirror.
  - "Left front (rejoin yarn at the inner edge)" should be "Left front: cast on 11 sts".
  - Row 7's buttonhole "k2tog, yo, k1" breaks the seed band. Use "k2tog, yo, p1".
Evidence: `patterns.txt` 343, 413–428, 389, 1048, 1352, 2154–2163, 2379–2412.

### F12. Repeat brackets that cut motifs apart, and unbracketed repeats
Severity: should-fix
Who meets it: some. How bad: misleads (the knitter can't see the motif in the words). Fix: medium
What's wrong: The repeat-finder picks any period that fits, not the motif:
- 25, row 1: "k2, p2, *k2, p3, k2; rep from * to last 4 sts, p2, k2" hides the 4-stitch cable.
- 25, row 5: "*k2, p2; rep from * to last 14 sts, p1, C4F…" splits the p3.
- 14, row 4: "p2 A, p3 B, *p2 A, p1 B, p1 A; rep" cuts the X.
- 24: the WS rows don't follow the 10-stitch diamond repeat.
- 37, row 16; 46, row 4: "*p1, k1; rep from * to last 7 sts" runs from the band into the panel.
- 44, row 1 lists "p1 B, k1 B" 6 times longhand.
- 30: "yo, k1" is written out 6 times.
Suggestion: Only use "*…; rep" when the repeat matches the pattern's `repeat.width` and starts at a motif boundary. Otherwise write the row out ("k2, p2, k2, p3, C4F, p3, k2, p2, k2"). Use brackets for runs: "[yo, k1] 6 times", "[p1, k1] 6 times in B".
Evidence: `patterns.txt` 1129–1133, 580, 1077–1095, 1788, 2384, 2214, 1390.

### F13. Abbreviations and technique notes missing
Severity: should-fix
Who meets it: some (24, 47 for MB; every intarsia pattern). How bad: misleads. Fix: small
What's wrong and the fix:
- **MB** is defined only as "make bobble". Write it out: "MB: (k1, p1, k1, p1, k1) into the next st, turn, p5, turn, k5, pass the 2nd, 3rd, 4th and 5th sts over the first." For a contrast bobble (24) add "join B for the bobble only and cut it, leaving a tail to weave in".
- **Intarsia twist note:** only the heart has it. Add to 12, 20, 31, 33, 34, 36, 37, 39, 40, 42 and 44: "Use a separate bobbin for each colour area and twist the yarns at every colour change to avoid holes."
- **Purlwise M1s:** M1LP and M1RP don't say which way they lean (see F15).
Evidence: `chart.js:25-27`; `patterns.txt` 1098, 2536, 648.

### F14. Ribbed edges say "Bind off all sts" instead of binding off in rib
Severity: should-fix
Who meets it: some (4, 5, 11, 12, 20, 31, 43). How bad: a little off (a tight, flared cuff). Fix: small
Suggestion: When the last row is rib, print "Bind off loosely in rib." When one stitch is left, print "Cut the yarn and pull it through the last st" instead of "p to end. Bind off all sts" (17, 34, 39), and use "(1 st)".
Evidence: `patterns.txt` 115, 169, 427, 474, 904, 1446.

### F15. The "rejoin yarn" label is on the wrong part after a split on a RS row
Severity: should-fix
Who meets it: some (33, 34, 35, 36, 39 ears and parts; 45 shoulders). How bad: misleads. Fix: small
What's wrong: When the split row is a RS row, the yarn ends at the *left* part. The next (WS) row should start there, and the right part needs rejoining with the WS facing. The pattern always lists "Right …:" first and puts "(rejoin yarn at the inner edge)" on the left part. Splits on a WS row (13, 19, 40, 43) are worded correctly.
Suggestion: In `chart.js:680`, order the parts by the side the next row starts from. On a WS next row, list the left part first and print "Right ear (rejoin yarn at the inner edge, WS facing)".
Also, on M1 leans: `chart.js:407` names a WS M1 by its RS position ("M1LP" at the RS-left edge). Define it that way in the abbreviations: "M1LP: make 1 purlwise, leaning left as seen from the right side". Without that, 8, rows 2 and 4, read as the opposite lean to row 3.
Evidence: `patterns.txt` 1567–1575, 1628–1636, 1677–1686, 1735–1743, 2312–2317.

### Nice (below the bar, one line each)
- 17: the left point uses "M1R"; for the mirror it should be "k1, M1L, k2tog". "Cast on 2 sts for each point" should say "cast on 2 sts, cut yarn; on the same needle cast on 2 more".
- 18: "Dot stitch" is a texture-stitch name; call it "stranded polka dots". Add an eyelet row "(k2tog, yo) to end" for the drawstring.
- 19: the motif is 7 sts × 9 rows; the description says "7 × 7".
- 23: 1/1 crosses every 4th row give a faint honeycomb. Cross every 2nd row, or use C4B/C4F, for the classic look.
- 27: the row-9 eyelet sits next to the 1-stitch border; a 2-stitch garter border would be neater.
- 28 and 29: the stockinette edges will roll; work 2 garter stitches each side on WS rows.
- 31: row 11, "p1, p2tog" keeps the purl rib column.
- 35: "a purl ridge every 4th row" appears once only. Row 4 "k1, M1LP, k12" is a knit row, so use M1L knitwise.
- 36: the pupils sit in the bottom row of each eye, so the frog looks down. Move D to row 14.
- 38: both eyes are white on the left and pupil on the right; mirror one.
- 45: the cuff columns are 2 sts (left) vs 3 (right), and the yoke colours run into them.
- 47: the lace diamonds have no top row ("k2tog, yo" at the point). The row-37 bobbles crowd the right border (11 purls on the left, none on the right).
- Design table drift: 14 repeat 6+1 vs data 12+1; 32 says "M1s" but the data uses yo; several sizes differ from the generated ones (e.g. 41 is 22×24, not 24×18). Regenerate the table from the data.
- Stripes in rib (4, 5, 9, 11, 43): on the RS, knit the first row of each new colour to avoid purl blips. It's optional; many knitters accept the blips.
