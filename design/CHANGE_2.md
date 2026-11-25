# Change 2: knitting in the round

From request 5, quoted exactly: "knit hats, socks, mittens, mitts, cowls, headbands and the sweater's body in the round as real knitters do: show the work as a tube on circular needles (or double-pointed needles for socks and mittens), word their patterns by round ("Rnd", every round from the right side, garter as knit and purl rounds), and finish them without seams (crown gathered, heel turned, toe grafted), so they wear on the dolls as true tubes. Keep flat what's really knit flat (dishcloths, coasters, blankets, scarves, the toys' pieces). Fix anything else we knit flat that shouldn't be. Playability and a strong feel of really knitting matter more than proving every rule: loosen the pattern checks where they get in the way, but keep the written patterns honest. Also give the cables a more raised, rope-like look."

The priorities come in this order: first a strong feel of real knitting and playability, then honest written patterns, then strict proof. Where proof gets in the way, this spec loosens the checker (section D), never the written pattern.

This spec was revised after the Change 2 review (Player, Builder, knitting expert; design/REVIEW_LOG.md, "Change 2 (knitting in the round): review"). It is complete and buildable. GAME_DESIGN.md is updated to match, with each change marked "(Change 2)".

## A. Which patterns change, and how big they are

### Size and pacing

- **Yarn and needles keep honest counts modest.** Round pieces use **chunky** yarn (gauge 12 sts = 4" / 10 cm, 3 sts an inch), or **super bulky** (10 sts = 4", 2.5 sts an inch) where named. Socks, mittens and mitts use DPNs throughout. Hats, headbands, cowls and the sweaters' bodies use a **16" circular needle**. Hat crowns and the yoke's neck change to DPNs.
- **Every needle named fits its stated count.** A circular fits when the round's width (sts ÷ sts per inch) is at least the needle's length: 16" holds 48+ chunky sts or 40+ super bulky sts. DPNs hold from 3 to 14 sts each. When a decrease round takes the count below what fits on the circular, the pattern says "Change to DPNs" on that round. The checker enforces this (D.4).
- **Each written pattern says** "Yarn: …, chunky (12 sts = 4" in stockinette)", "Needles: 16" circular and a set of 5 DPNs", and the existing line "Size: 48 sts around × 16 rnds, scaled down for the game." The size line stays for every pattern. Round pieces say "sts around"; flat ones keep "sts × rows".
- **Pacing targets:** chapter 2's round pieces take about 450–750 taps, socks and mittens about 500–900, and the Holiday Stocking and Yoke Sweater no more than about 1,400. The book's total goes from 19,501 stitches to **about 24,600** (the target was no more than about 26,000). At about 3 taps a second that's **about 2¼ hours** for the whole book, and chapter 2 to 6 pieces still take 2½ to 5 minutes each.
- **The circumference is the chart's width.** The tube shows its front half, so a 48-st hat shows about 24 sts across: close to the old flat front widths of 18–22. The work never looks half-size.

### The table (final)

"Rnd", "rnds": rounds. CO: cast on. Counts are taps, worked out from the construction below. The checker prints the real ones, and its design table (D.4) holds these numbers with the ±30% tolerance.

| # | Pattern | Round or flat | Yarn, needles | Construction (taps) | Taps |
|---|---|---|---|---|---|
| 4 | Ribbed Wristwarmer | **Flat**, seamed once | chunky, straight needles | CO 24. 12 rows of *k1, p1 (an even count, so every row reads the same). Seam the side edges into a tube with mattress stitch, leaving a 2-row thumb gap 3 rows below the top. Make 2. Worn as a tube | 288 |
| 5 | Striped Headband | Round | super bulky, 16" circular | CO 40, join (1). Rnds 1–10 *k2, p2, stripes in 3 slots. Bind off loosely in rib | 401 |
| 7 | Rolled-Brim Beanie | Round | chunky, 16" circular, then DPNs | CO 48, join (1). Rnds 1–9 knit (the brim rolls by itself). Crown: change to 4 DPNs; `crownRounds(48, 8, {everyOther: 2})`: *k4, k2tog* (40), knit, *k3, k2tog* (32), knit, *k2, k2tog* (24), *k1, k2tog* (16), *k2tog* (8). Gather (8) | 633 |
| 8 | Moss Stitch Ear Warmer | Round | chunky, 16" circular | CO 56, join (1). Rnds 1–2 *k1, p1; rnds 3–4 *p1, k1; repeat to 8 rnds. Bind off in pattern. Cinched **at the front** by a short wrapped band (code-drawn touch) | 449 |
| 9 | Bobble Hat | Round | chunky, 16" circular, then DPNs | CO 48, join (1). Rnds 1–5 *k2, p2. Rnds 6–10 knit, stripes. Crown as 7 (192). Gather (8). Pom-pom | 681 |
| 10 | Broken Rib Cowl | Round | chunky, 16" circular | CO 60, join (1). Rnd 1 *k1, p1. Rnd 2 knit. 10 rnds. Bind off loosely | 601 |
| 11 | Fingerless Mitts | Round | chunky, 4 DPNs (8 sts on each of 3) | CO 24, join (1). Rnds 1–5 *k1, p1. Rnds 6–12 knit. Rnd 13: k10, BO 4, k to end (20). Rnd 14: k10, CO 4 over the gap, k to end (24). Rnds 15–16 knit. Rnds 17–19 *k1, p1. Bind off in rib. Make 2 the same (the hole sits at the side, so they fit either hand) | 453 |
| 12 | Cozy Sock | Round, flat heel | chunky, 4 DPNs | CO 24, join (1). Cuff 4 rnds *k2, p2 (96). Leg 6 rnds (144). Heel flap over 12 sts, 10 rows (120). Turn the heel (30, ending with 8 sts). k4 to the heel's centre (4). Gusset set-up rnd, picking up 5 + 5 (30). Gusset decreases to 24 (132). Foot 4 rnds (96). Wedge toe `toeRounds(24, {to: 8, everyOther: 2})`: 20, 20, 16, 16, 12, 8 (92). Graft (4). Make 2 | 749 |
| 13 | Chunky Mitten | Round | chunky, 4 DPNs | CO 20, join (1). Cuff 4 rnds *k1, p1 (80). Set-up rnd: k9, pm, k2, pm, k9. Thumb gusset: M1L after the first marker and M1R before the second, every 3rd rnd ×3 (184). Hold the 8 thumb sts on waste yarn (1). Next rnd: k9, CO 2 over the gap, k9 (20). Hand 6 rnds (120). Top: *k1, ssk, k to 3 sts before the half, k2tog, k1* twice, to 16, 12 and 8 (52). Gather (8). Thumb set-up rnd: k8 held sts, pick up and k 2 (10). 3 rnds (30). *k2tog* (5). Gather (5). Make 2 the same | 516 |
| 18 | Strawberry Pouch | **Round** (was flat) | chunky, 4 DPNs | CO 8 at the tip, join (1). Increase rnds *k1, M1*, *k2, M1*, *k3, M1* with a plain rnd after each, to 32. 6 rnds of dot stitch in B, 2 leaf rnds in C, an eyelet rnd *k2tog, yo*, 2 rnds. Bind off. Thread the cast-on tail through the tip and pull tight; an i-cord drawstring through the eyelets (code-drawn) | 473 |
| 19 | Snowflake Mitten | Round | chunky, 4 DPNs | As 13 at 24 sts: cuff 4 (96), gusset to 8 thumb sts (216), hold 8 (1), CO 2 (24), hand 8 rnds with the snowflake on the back of the hand (sts 1–12) and a lice check on the palm (192), top to 8 (56), gather (8), thumb as 13 with 4 rnds (60). Make the second with the snowflake on sts 13–24, so it sits on the back of the left hand | 654 |
| 20 | Argyle Sock | **Flat leg, then round** | chunky, 2 DPNs as straights for the leg, then 4 DPNs | CO 24. Leg **knit flat**: 4 rows of 2×2 rib, 12 rows of argyle intarsia, diamonds across the whole width (384). Seam the leg up the back with mattress stitch to the needle (8). Heel flap over the 6 sts each side of the seam, then everything else as 12, with a 3-rnd foot (484). Worn as a tube with a back-seam line | 876 |
| 21 | Cable Headband | Round | chunky, 16" circular | CO 48, join (1). *p2, k4* for 10 rnds, C4F on rnds 3 and 9. Bind off in pattern | 481 |
| 23 | Honeycomb Cowl | Round | chunky, 16" circular | CO 56, join (1). Rnd 1 purl, rnd 2 knit (a garter ridge). Rnds 3–10 honeycomb (*C2B, C2F* on rnd 3, *C2F, C2B* on rnd 7, the rest knit). Rnd 11 knit, rnd 12 purl. Bind off | 673 |
| 25 | Fisherman Beanie | Round | chunky, 16" circular, then DPNs | CO 48, join (1). Rnds 1–4 *k2, p2. Rnds 5–12 *p2, k4*, C4F on rnds 6 and 12. Crown (DPNs): *p2tog, k4* (40), plain, *p1, k2tog, ssk* (24), plain, *p1, k2tog* (16), *k2tog* (8). Gather (8) | 737 |
| 31 | Lace Sock | Round, flat heel | aran (18 sts = 4"), 4 DPNs | CO 30, join (1). Cuff 2 rnds *p2, k3* (60). Leg 8 rnds of lace rib *k1, yo, ssk, p2* / *k2tog, yo, k1, p2* (240). Heel flap over 15, 10 rows (150). Turn (about 53, ending with 9). k4 (4). Set-up rnd with 5 + 5 picked up (34). Gusset to 30 (94). Foot 3 rnds, lace on the 15 instep sts (90). Wedge toe to 10 (138). Graft (5). Make 2 | 869 |
| 41 | Tea Cosy | **Flat** | as now | Two panels with gaps for the spout and handle, as real cosies are. Unchanged | 462 |
| 42 | Holiday Stocking | Round, flat heel | chunky, 4 DPNs | CO 36, join (1). Garter cuff: purl, knit, purl, knit rnds (144). Stranded 6-st peerie band, 7 rnds (252). 1 plain rnd (36). Heel flap over 18, 12 rows (216). Turn (63, ending with 12). k6 (6). Set-up rnd, picking up 6 + 6 (42). Gusset to 36 (192). Foot 3 rnds (108). Wedge toe to 12 (192). Graft (6). Hanging loop (code-drawn touch) | 1,258 |
| 43 | Dog Sweater | Round, flat at the back | chunky, 16" circular | Neck down. CO 48, join (1). 4 rnds *k2, p2 (192). 3 rnds (144). Leg openings: k4, BO 5, k14, BO 5, k to end (38); next rnd CO 5 over each gap (48). 4 rnds (192). Belly: BO 12, k to end (36). Turn and work the last 3 rows flat on the circular (108), then 2 rows of garter (72). Bind off | 831 |
| 45 | Yoke Sweater | Round, **full join** | super bulky, 16" circular, then DPNs; sleeves on DPNs | Sleeves (make 2, written, not tapped, as the cardigan's back is): CO 16 on DPNs, rib, knit to the underarm, put 4 underarm sts on waste yarn, and leave 12 on a spare DPN. Body (tapped): CO 48, join (1). 3 rnds *k2, p2 (144). 5 rnds (240). Hold 4 sts at each underarm (2). Joining rnd: k the front, the 12 sleeve sts, the back and the other sleeve (64). 1 rnd (64). Stranded 8-st band, 7 rnds (448). *k2, k2tog* (48). 1 rnd (48). *k1, k2tog* (32), change to DPNs. Neck: 2 rnds *k2, p2 (64). Bind off loosely. Graft the underarms (8) | 1,163 |
| 46 | Cabled Cardigan | **Flat** | as now | Cardigans are knit flat ("or back and forth on a circular needle", added to its notes). Unchanged | 1,191 |

**The yoke decision.** We use the full join, simplified so it plays well: the sleeves are written and not tapped (as the cardigan's back already is), and the body and yoke are one tapped tube. The honest steps a bottom-up yoke needs are all there and tapped: the underarm holds, the joining round (the tube visibly widens from 40 to 64), the yoke decreases between bands, and the underarm graft. A sewn-in-sleeves version would read wrong: a yoke without joined sleeves isn't a yoke. The dolls draw the sleeves from a virtual plain sleeve chart in the sweater's A yarn (E.3).

**Everything else stays flat** and unchanged: the dishcloths, coasters, bookmarks, washcloth, Heart Pillow, Star Ornament (two stuffed pieces), the Basketweave and Aran Mug Cozies (flat, seamed above and below the handle as their finishing already says; no button tabs), Bobble Cushion, Braided Scarf Panel, Doily, Shawlette, Chevron and Patchwork Blankets, the toys, the Tea Cosy, the Cabled Cardigan, the Heirloom Afghan and the Infinite Scarf.

**Totals:** the 19 changed patterns come to about 12,790 taps, up from 7,690. The other 28 stay at 11,811. Book total: about 24,600.

## B. How a round piece is shown: the turning tube

### B.1 The projection: column strips from the flat fabric canvas

The knitting view does **not** redraw stitches each frame. Stamping, `band()` restamping on rip back, and the sprite cache all stay as they are: the fabric canvas is still the flat chart, now windowed over **all columns** for round pieces (W is at most 72, the Yoke Sweater, within the 4096 px cap through `_deviceCell`). The view draws that canvas as a tube:

- **Bands.** Rows are grouped into bands: consecutive rows with the same *ring* (the ordered list of live, non-held columns; see C.2). The leg, the hand, the foot and a hat's body are each one band. Crown, toe, gusset and thumb rows change their ring every round, so each is its own band.
- **Strips.** For each band, each ring column `c` at ring position `j` of `n` is one `drawImage` of that column's strip over the band's rows. θ = 2π(j − f)/n, where `f` is the band's front position (B.3). Each strip goes at x = cx + R_b·sin θ, with width cell·R_b/R·cos θ, shaded by cos θ (darker toward the sides). Strips with cos θ < 0 (the back) are skipped. The strip either side of the round's start is drawn twice (once each side) so no seam gap shows.
- **Radius.** R_b = R·n/n_max, where n_max is the widest ring in the piece's current section. So crowns and toes narrow, the gusset bulges and the yoke widens, as the real work does.
- **The helix and the jog.** In a round band each strip is lifted by dy = −H·k_j/n, where k_j is the column's place in knitting order (0 for the round's first stitch). A round is a spiral, so the round's last stitch sits one row above its first. That step is the **jog, shown at the marker at the back**: it appears whenever the tube turns its back into view. Flat bands (the heel flap, the Argyle leg, the Dog Sweater's last rows) have no lift.
- **Cost.** A body band is about 20–40 strips. Per-row bands (crowns, toes, gussets) add about 7 rows × 20. The budget is ≤ 400 `drawImage` a frame. Strips are drawn only while the view is moving, or when a stamp lands in them.
- **Wrap shading.** For round rows, `shadeRow` treats the ring as a loop: column 0's left neighbour is column W−1, and vice versa. There's no dark seam stripe at the round's start (today: work.js:254, `if (!nb) side(…)`).
- **Flat sections in a round piece** reuse the projection, frozen with the section centred at the front (f fixed), plus today's squash turn at each row end (work.js:646) and mirrored WS needle motion. So the heel flap is seen on the tube's back, turned to face you, and it reads as a flat piece on the tube.
- **Flat pieces** are unchanged.

### B.2 The tube turns the right way

Knitting goes right to left along the fabric (as seen from the right side): stitches come off the left needle and go onto the right. To keep the working point at the front, **the front surface moves left to right**: finished stitches leave on the right, and stitches still to knit arrive from the left. In the projection that's f increasing as the round goes on. Flat sections keep today's logic.

### B.3 The needle tip travels, the tube turns in steps

Turning the whole tube on every tap would judder at drumming speed (and at Hold to knit's 6 a second), and would hide where you are. So:

- **The needle tip travels** across the front stitches, as on flat work. The tip sits at the projected x of the next stitch.
- **On a circular, the tube turns in eased steps:** every s stitches, where s = clamp(round(n/10), 4, 6). f moves by s, eased (ease-in-out, 220 ms). The tip stays within about ±s/2 columns of the front.
- **On DPNs, the tube turns once per needle:** when a DPN empties, f moves to the centre of the next needle's stitches (eased, 320 ms). On a 24-st sock with 8 sts a needle, the tip travels ±4 columns (±60°), always in view.
- **Reduce motion:** no easing, so the tube snaps. On DPNs it turns only at needle changes; on a circular it turns every n/4 sts.
- **Rip back** turns the tube back by the same rules, in reverse.
- The wording strip says where you are in the round: "Rnd 5 · st 14 of 48", with today's repeat counter beside it ("rep 3 of 12 · st 2 of 4").

### B.4 The needles

Drawn in code in the equipped needles' material, as today:

- **Circular:** two tips meet at the front. 3–4 live loops each side of the tips are drawn through the same projection. The rest sit on a code-drawn nylon cable that curves round the top of the tube, mostly behind it.
- **DPNs:** the live stitches are split over 3 needles (4 for 40-st crowns) in a triangle (or square) round the top of the tube, and a working needle knits them. The split comes from the section's `dpn` counts (default: as even as possible, in ring order). When a needle empties it slides out and becomes the working needle, with a small swap animation. That's very recognisable.
- **Change of needles:** on the round where the pattern says "Change to DPNs", the circular's stitches are dealt onto the DPNs over the round's first taps (the cable shortens as each DPN fills).
- **Held stitches** (`-`, C.3) sit on a spare DPN (an instep, the heel's short-row sides) or on a bright **waste-yarn** strand (a thumb, the underarms), drawn as live loops at the row where they were last knit.

### B.5 The beginning-of-round marker and the end-of-round beat

- **The beginning-of-round marker** is a stitch-marker charm on the fabric's edge at the round's start (between columns W−1 and 0, at the piece's back). It uses the equipped marker style, drawn larger and in a contrast ring. Repeat markers keep today's rules.
- **End of round:** the marker passes from the left tip to the right with a small swing, the row counter ticks over, a **softer** swish plays (the `row` sound at 60% gain, a little lower), and the strip flips to the next "Rnd". There's no squash turn (work.js:646 is skipped on round rows) and no "The work turns" tip (knit.js:491 is skipped on round rows).
- **First round piece:** a one-time tip at the end of its first round (the `round` tip id): "Knitting in the round: no turning, just keep going round. Each round is one turn of the tube."

### B.6 The join, steps and the ghost

- **Join:** the cast-on edge curls into a ring, with a caution chip "careful not to twist" and the new `sfx-join` sound. Steps' animations are in C.4.
- **The ghost** (the faint stitches still to come) is drawn through the same projection, so you see the tube's finished shape ahead: the crown narrowing, the gusset bulge, the toe.

## C. The chart model for round pieces

### C.1 Per-row side model

- A pattern def gains `round: true` (a round piece) and `flat: [{from, to, first: 'RS' | 'WS', cut}]` (row ranges worked flat inside it; `first` defaults to RS).
- `chart.rsOf(r)` replaces `isRS` everywhere (chart.js:49, its users at 137, 172, 209–213, 565–569, 799 and 905; patternKit.js:22; check-patterns.mjs:88):
  - flat pieces: r % 2 === 1, as now;
  - round pieces, in a flat range: the range's first row is `first`, and sides alternate from there;
  - round pieces, any other row: true.
- `R.round` is true for round rows (in a round piece and not in a flat range). Step rows (C.4) have `R.step` and take their side from the range they're in.
- **Cells stay the front view.** Round rows are never inverted: `opOf(e, true)`. So round garter (alternating `k` and `p` rows of cells) and broken rib come from the same textures; only the wording changes.
- Cables, bobbles and yarn-overs are allowed on any row where rsOf is true (so on any round). The error at chart.js:137 and 172 and the checker's check at 88 use rsOf.
- **Knitting order:** round rows go in descending ring order (the round's first stitch is column W−1, at the right of the marker). Flat rows go RS from the section's right end and WS from its left, as today.
- **Wording:** round rows read "Rnd n: …" with no side, "rep from * around" (instead of "to end"), and no edge stitches. Flat rows read "Row n (RS|WS): …" as today. Numbering restarts in each section, as real sock patterns do. The section header lines ("Cuff:", "Leg:", "Heel flap (worked back and forth over 12 sts):", "Turn heel:", "Gusset:", "Foot:", "Toe:", "Thumb:") come from `def.sections: [{from, label}]`.
- **Parser** (`parseRowText`, chart.js:1078–1084): it reads "Rnd n: …" and "Rnds a–b: …" lines as well as "Row …". A section header line resets the numbering, and its key is `section|n`. Step lines (C.4) are skipped.
- **mergeRows** (chart.js:903): runs of rounds merge as "Rnds a–b: *k2, p2; rep from * around" with no side. A repeating group reads "Rnds a–b: rep rnds c–d". Flat runs keep "Rows a–b (RS)" as today.

### C.2 The round row map

For every row of a round piece (round rows and flat ranges alike):

- **The ring:** a row's live stitches are taken in **ring order**: columns from the row's cut, going up and wrapping (cut, cut+1, …, W−1, 0, …). Round rows always cut at column 0 (the beginning-of-round marker sits between W−1 and 0). A flat range's `cut` is its left edge, so the Argyle Sock's heel flap over columns W−6 … W−1, 0 … 5 is one contiguous run.
- **`.` is filler**, never a gap: it makes nothing and takes nothing. So crown, toe and gusset columns can sit apart in the chart without splitting the row into parts.
- **`-` held cells** (C.3) each claim the stitch at their own column first.
- **The other cells, in ring order, take the remaining live stitches of the row below in ring order,** each taking as many as it uses (USES). Every live stitch must be taken, held or bound off (`_`), or the checker reports the row.
- **Nothing is taken across the round's start:** a round row's first cell takes the first stitch after the cut, so no decrease pairs column W−1 with column 0.
- **Edges are 0:** round sections have `repeat.edges === 0`, and their count must be a whole multiple of `repeat.width` (rib *k2, p2 ×4; 1×1, moss and broken rib even; *p2, k4 and honeycomb as their width).
- **Skipped for round pieces:** the parts plan (chart.js:369–503; a round piece is always one part, except a held thumb, which is a section), the bind-off and cast-on position rules (215–240), the make-one-at-run-end check (174; in a round row an `m` needs a ring neighbour, which always exists), and the checker's edge-lean check (check-patterns.mjs:100–106).
- **Kept:** the 3-column limit (MAX_SHIFT, chart.js:20), as a sanity check that a cell's taken stitches are near it. `crownRounds` and `toeRounds` lay out their filler so it always holds.
- **`_` bound off here** (new, stitch layer, round pieces only): uses 1, makes nothing, and is not a tap. Its stitch goes into the previous entry's `boundOffAfter` in knitting order, or into `boundOffBefore` if it comes first, exactly as today's gap bind-offs do. It's drawn with today's bind-off chain. The shape layer shows `.` there. This is how the Mitts' thumb hole, the Dog Sweater's leg openings and its belly bind-off are charted, with `+` over the gap in the next round ("CO 4 over the gap").
- **Helpers** (patternKit.js):
  - `crownRounds(W, wedges, {everyOther, plain})` returns the crown's rows: each decrease round puts `k2tog` at the end of every wedge, with `.` filler in the column it emptied, and the plain rounds between them. `findRepeat` words it as "Rnd 10: *k4, k2tog; rep from * around (40 sts)".
  - `toeRounds(W, {to, everyOther})` returns a wedge toe: "*k1, ssk, k to 3 sts before the half, k2tog, k1* twice", with the filler at the ssk and k2tog columns.
  - `sockChart({co, cuff, leg, flap, foot, toe, legFlat})`, `mittenChart({co, cuff, gusset, hand, top, thumb})` and `hatChart({co, brim, body, crown})` build the whole construction, sections, steps and DPN counts.
  - **Sock column layout,** from the left: half the back (6, of which the outer 2 become filler at the turn), the left gusset's 5 (filler until the set-up round), the instep's 12, the right gusset's 5, and the other half of the back (6): W = 34 for a 24-st sock. The marker sits at the centre back (the centre of the sole after the heel), so the jog is at the back.

### C.3 Held `-` and slip `s`

- **`-` held** (stitch layer): no tap, not a map entry, not part of any run. It carries the stitch at its own column from the row below, which must be live there, into this row's live set unchanged. It's drawn as no fabric. The loops are drawn on a spare needle or a waste-yarn strand at the last row they were knit (B.4). Uses: the instep during the heel flap and turn, the unworked sides of the heel's short rows, a mitten's thumb (beside the hand's columns) until its pick-up, and the yoke's underarm stitches (beside the sleeve columns) until the graft. USES['-'] = 1, but it is resolved before the ring-order take.
- **`s` slip** (stitch layer): uses 1, makes 1, and is one tap. It's worded "sl1 wyib" on RS rows and "sl1 wyif" on WS rows (purlwise), and drawn as an elongated V spanning two rows' height, so a slipped heel flap shows its chain edge. Glossary: "sl1: slip 1 st purlwise (with yarn in back on RS rows, in front on WS rows)".
- **The heel turn is not a step.** It's ordinary flat rows in the heel's flat range, knit stitch by stitch in the flat view, with `-` for the unworked sides and the instep, `s` for the first stitch, and `>` or `<` across the gap. For a 12-st flap: "Row 1 (RS): sl1, k6, ssk, k1, turn (2 sts unworked)" (9 taps). "Row 2 (WS): sl1, p3, p2tog, p1, turn" (6). "Row 3: sl1, k to 1 st before the gap, ssk, k1, turn" (7). "Row 4: sl1, p to 1 st before the gap, p2tog, p1, turn" (8). That's 30 taps, ending with 8 sts. The general helper is "k to 2 past the centre, ssk, k1, turn" and then +1 a row until the sides are used up: about 53 taps for 15 sts and 63 for 18. Each row ends at the run's edge, where the work turns (today's squash turn).

### C.4 Steps as chart rows

A step is a **chart row** with `R.step = {kind, label, text}`. Its map has **one entry per tap**, each with a real column and slot, so `locate`, rip back (`yarns.length = index`), the one-Uint16-per-tap save, the strip, `--solve` and the round counts all work unchanged. A step row also has an **`outCols`** list: the live stitches after it, which the next row maps from (in `_buildRow`, `prev` = `this.rows[r−1].outCols || this.rows[r−1].cols`, chart.js:165). Steps are built by the helpers, never typed. Their entries are listed in their own order, not derived from columns.

**Row → y table.** `Fabric.xy` (work.js:107–109) uses `yOf(r)`, a table of each row's top, instead of `rTop − r`. Normal rows are one cell high. Zero-height steps take no height, and their effect is drawn as an overlay at that y. Pick-up and joining rounds are real rounds, one cell high.

| Step | Taps | Entries | outCols | Drawing | Wording |
|---|---|---|---|---|---|
| **join** | 1 | one entry at column W−1, slot of the cast-on, takes nothing | all live sts | zero height; the cast-on edge curls into a ring (400 ms), "careful not to twist" chip, `sfx-join` | "Join to work in the rnd, being careful not to twist sts; pm for beg of rnd." |
| **seam** (Argyle leg) | 1 per 2 rows of the flat section (8) | at the seam's edge columns, one per 2 rows going up | all live sts | zero height; a mattress-stitch ladder closes up the back, 2 rows a tap | "Fold the leg so its side edges meet at the back and seam with mattress stitch up to the needle." |
| **heel turn** | — | not a step: flat rows (C.3) | | | |
| **gusset set-up rnd** | every stitch of the round (30 on the Cozy Sock), including the 'u' pick-ups (5 + 5) | the round's cells in knitting order from the new marker; a new cell **`u` picked up and knit** (uses 0, makes 1, a tap) sits in the gusset columns | ring of 30 | one row high; each `u` is drawn as a loop pulled through the flap's slipped edge, at the flap's side | "Set-up rnd: k4, pick up and k 5 sts along the edge of the heel flap, k12, pick up and k 5 sts along the other edge, k4 (30 sts)." It follows a short flat row "k4 (to the centre of the heel); this is the new beg of rnd" (4 taps, the rest held) |
| **hold** (waste yarn) | 1 per group (a thumb: 1; the yoke's underarms: 2) | at the group's centre column, slot shown as the waste yarn | all live sts; the group's columns are `-` in the rows above | zero height; a bright scrap of yarn threads through the group, which lifts off the needles | "Place the next 8 sts on waste yarn for the thumb." / "Place 4 sts at each underarm on waste yarn." |
| **thumb set-up rnd** | every stitch of it (8 held + 2 picked up = 10) | the 8 held columns as `k` (taking their held stitches) and 2 `u` in the gap | ring of 10 | one row high; the waste yarn slides out; the thumb becomes a new section, a small tube (B.1, n_max = 10) | "Thumb: return the 8 held sts to DPNs; k8, then pick up and k 2 sts in the gap (10 sts)." |
| **joining rnd** (yoke) | every stitch of it (64) | body cells take from below; 2 × 12 sleeve cells are a new cell **`v` sleeve stitch** (uses 0, makes 1, a tap; it comes from the written sleeve) | ring of 64 | one row high; the sleeves' stitches slide onto the circular from each side, and the tube widens from 40 to 64 | "Joining rnd: k20 front sts, k12 sts of one sleeve, k20 back sts, k12 sts of the other sleeve (64 sts)." |
| **gather** | 1 per remaining stitch (8 on a hat) | one per live st, taking it | held sts only (usually none) | zero height; the yarn threads through each loop in turn; on the last tap the top cinches (300 ms) with `sfx-join`. **No bind-off chain** on the gathered row (`boVisible` is false for rows under a gather) | "Cut yarn, leaving a 6" tail; thread through rem 8 sts, pull tight and fasten off." |
| **graft** (Kitchener) | 1 per grafted stitch: half the remaining stitches (4 for 8) | one per front st, taking it and the matching back st | none | a half-row patch of grafted Vs drawn as it goes; the two needles' loops join; no bind-off chain | "Divide rem 8 sts onto 2 needles, 4 for the instep and 4 for the sole. Graft with Kitchener stitch (4 sts)." |
| **underarm graft** (yoke) | 4 per underarm (8) | at each held underarm column, taking the held body st (the sleeve's matching st is off-chart) | none | a short patch of grafted Vs under each arm | "Graft the 4 held sts at each underarm to the sleeve's 4 held sts with Kitchener stitch." |

- **Step counts:** the checker confirms that each step's taps equal the numbers in its wording, and that live count before + made − used = live count after (D.2).
- **The debug hook:** `__game.state()` adds `round` (bool), `section` (its label), `step` (kind or null), `stepTap` (k within the row), `needle` ('circular' | 'dpn' | 'straight'), `frontPos` (f) and `ring` (n) (main.js:189).
- **solutions.mjs:** for every round piece it adds a reload in the middle of a step (the hat's gather, the sock's set-up round, the mitten's hold), a rip back across a step boundary (un-gather, then knit it again; un-join), and a check that `state().step` matches the row.

### C.5 Needles and DPN data

`def.needles: [{from, kind: 'circular' | 'dpn' | 'straight', len, n, counts}]`: from which row, the kind, a circular's length in inches, the number of DPNs and their counts. The wording adds "Change to DPNs (10 sts on each of 4 needles)." on that row. The card says "knit in the round on a 16" circular needle, then DPNs", "on DPNs", or "flat, then in the round on DPNs" (Argyle). `def.gauge: {sts, per: 4, yarn}` feeds the Yarn line and the needle-fit check.

## D. Loosened proof (by request)

1. **Kept for every piece:** the layer widths, slot names, a row map that uses every stitch exactly, the 3-column limit, cable spans on `x` cells, `source`, `repeat` and `finishing` set, the cast-on line, the finishing text, `--solve` (every chart's whole tap order runs headlessly with zero errors and the right count) and the contact sheet.
2. **New for round pieces:** edges 0 and whole repeats on every round section's `repeat.at` row; each step's taps equal its wording's numbers; live counts add up across every step; every `-` sits over a live stitch; every `u` and `v` is in a step row.
3. **Skipped for round rows:** the parts plan, the bind-off and cast-on position rules, the make-one-at-run-end check, the edge-lean check, and "written pattern says Rnd" (check-patterns.mjs:122 now fails only for flat pieces). "obx on a WS row" uses rsOf.
4. **Needles fit:** every circular section's widest round is at least `len` inches at the stated gauge, and every DPN holds 3–14 sts. The design table (check-patterns.mjs:22–39) takes the counts in A's table, with the ±30% tolerance unchanged.
5. **Round trip** covers plain rounds and rows only. Step lines and section headers are skipped, and checked by D.2 instead.
6. **The knitting expert** reads all 19 changed written patterns in `tools/patterns.txt` again (D's honesty check) before the play-test.

## E. Worn, carded, hung and ghosted as true tubes

### E.1 Per-kind shape maps

One shared module, `tube.js`, maps each round piece's stitches to its 3D object. It's used by worn.js (dolls), cardRenderer.js (the preview card), the gallery peg and close-up, and the knitting view's ghost.

- Each `kind` is one of **dome** (hats; the pouch is a dome upside down, tip at the bottom), **ring** (headbands, ear warmer, cowls, the wristwarmer), **sock**, **mitten** (mitts too, open at the top) and **body** (the Yoke Sweater, the Dog Sweater). It's set on `wear.kind`, or `def.kind` for gallery-only pieces.
- `F(c, r) → {u, v, depth}`: u ∈ [0, 1) round the tube, from the ring position (u = 0 at the marker at the back, 0.5 at the front centre); v along the object's axis, from the row table; depth = cos 2π(u − 0.5).
- **Two halves:** the **back half** (u from ¾ round to ¼, through 0) is drawn **first**, darkened by 35%. Then the doll (or the prop). Then the **front half** (u from ¼ to ¾). Then the doll's "over" polygons. Each half is drawn as vertical u-slices of the baked flat canvas, reusing worn.js's u0/u1 strip slicing, with at most 40 strips a half.
- **dome:** the body rows are a cylinder from the band line up; the crown rows narrow by ring size to the gathered top. The back half shows as the brim's far edge above the ears, behind the head. Shaded as a curved surface.
- **ring:** a short cylinder round the head, neck or wrist, with the far side behind it. The ear warmer's cinch is drawn at the front.
- **sock:** the leg rows hang vertically from the cuff. The bend sits at the heel's flat range (from the heel flap to the set-up round). The foot rows run along the foot in the doll's toe direction (dolls.json), and the toe rows taper to the graft. The Argyle Sock shows a seam line at the back of the leg.
- **mitten:** the hand is a vertical cylinder over the hand box, tapering to the gathered top. The thumb section is a small tube drawn at the side, from the hold row's height.
- **body:** the torso is a cylinder. The yoke rows (from the joining round) curve over the shoulders, and the sleeve columns (`v`) map onto the upper arms. The Yoke Sweater's sleeves are drawn from a **virtual sleeve chart** (16 sts, plain stockinette, in the sweater's A yarn), baked once and strip-warped along the doll's 30° arms.
- **Pairs** (socks, mittens, mitts, the wristwarmer) are mirrored for the other side as today.
- `chartInfo` (worn.js:70–90) gets the kind's anchors (heel row, thumb section, joining round) from the chart's sections and steps, not from the flat profile. The sock's toe direction comes from the doll, and sleeves come from the `v` columns.
- **The preview card and the ghost** use the same map: wearables on Pip (or her silhouette), as today.
- **Gallery:** a hat hangs on its peg by its gathered top (the dome map, upside down). Socks and mittens hang by the cuff. Rings and cowls hang over the peg as a flattened loop. Bodies hang on a code-drawn hanger. The close-up shows the front half, turnable by drag or the arrow keys (f, as on the work).
- **Old flat pieces** (edition 1, F) keep today's planFit fits (worn.js:180–345) and flat bakes.

### E.2 Caching and cost

The maps are evaluated when a piece is baked or the outfit changes, never per frame, through today's bake LRU (24) and worn layers LRU (60). The flat bake (bakeChart) is unchanged. The maps only slice it.

## F. Raised, rope-like cables

- **A cable-column mask per chart:** each span's columns, from its first crossing round to its last, plus the rows between crossings.
- **`shadeRow` uses the mask:** a highlight across the rope's crown, a groove at both sides, and a **deeper sink on the purl stitch next to it** (0.75 instead of the rib's 0.55).
- **The plain Vs between two crossings lean** by their place between them (toward the next crossing's front strand), so a rope reads as a continuous S-chain from a distance.
- **The crossing sprites** (stitches.js:481–505) get a rounded, raised rope segment: a highlight on top, shadows at both sides, and the front strand clearly over the back one, with a contact shadow on it.
- `band()` (work.js:126–131) widens its restamp band by the mask, so rip back restamps the whole relief.
- Cables are allowed on any round in round charts (C.1).
- **Checked** in stitch-lab.html side by side with `design/mockups/knit-look.jpg` and `tools/ref/ref-cable.jpg` at 3 zooms, on wool and chunky, flat and projected.

## G. Old saves: editions and migration

Pieces and gallery records made before this change have no chart edition. Today, charts are cached by pattern id only (render.js:9–12), the save is one yarn per tap (state.js:114–129, 176–177), and bakeGallery lays `g.yarns` over today's chart, filling the rest with the last yarn (worn.js:109–113). So an old flat beanie would bake wrongly onto a tube. An in-progress piece would resume at `yarns.length` on the new chart (knit.js:668–690), and if the new total is at or below the saved count, knitOne returns null (knit.js:467) and the piece never finishes. So:

- **`tools/dump-flat-v1.mjs`** is run once, **before** any pattern data changes. It writes `game/src/patterns-flat-v1.json`: for each of the 19 changed ids, the pattern's v1 def as built today (the layers, cables, slots, parts, partLabels, source, repeat, wear, touch, finishing and notes). It is committed, and listed in sw.js's precache.
- Each pattern has an **`edition`** (default 1). The 19 changed patterns get `edition: 2`.
- **`ed` on records:** every piece and gallery record gets an `ed`. `migrate()` (state.js:161) stamps `ed: 1` on every existing record that has none. New pieces take their pattern's `edition`.
- **`chartOf(pattern, ed)`** caches by `${id}|${ed}`. For `ed: 1` of a changed id it builds the chart from patterns-flat-v1.json (a flat piece, as today). Every caller passes the record's `ed`: knit.js `enter`, worn.js `bakeGallery`, cardRenderer, previewCard, gallery, the book's progress bars, and "Read the pattern" for a started piece.
- **An in-progress edition-1 piece** finishes flat, with its v1 chart and v1 written pattern ("Read the pattern" adds the note "This piece was started before the pattern was rewritten for knitting in the round, so it finishes flat."). It goes to the gallery as `ed: 1`, and is worn with today's flat fits.
- **"Knit again"** and a new cast-on always start the current edition.
- **Loading:** patterns-flat-v1.json is fetched at boot only if the save has an `ed: 1` record of a changed id (through the same `json()` helper as scene.js:18). Until it arrives, those gallery pieces show their peg tag with a soft spinner. If it fails (offline before it was cached), they show a plain swatch in their yarns, and opening the in-progress piece shows a sheet: "This piece needs its old pattern. · Try again · Back". Nothing is deleted, and every other piece still works, so the game can always go on.
- **Fixtures:** `tools/fixtures/save-v1.json` is a save taken before the change, with a finished flat beanie, cozy sock and chunky mitten in the gallery (one worn by Pip) and a cozy sock in progress at 150 of 273. `tools/fixtures/save-v1-hashes.json` holds their `piece(id)` hashes and bake hashes, taken before the change.

## H. Glossary additions

Rnd(s): round(s). beg of rnd: beginning of the round. pm: place marker. sm: slip marker. circular needle: a pair of needle tips joined by a flexible cable, for knitting in the round. DPN(s): double-pointed needles; the stitches are divided over 3 or 4 and knit with one more. Join in the rnd: after casting on, knit the first st with the yarn from the last, closing the ring without twisting it. sl1 wyib / wyif: slip 1 st purlwise, with yarn in back / in front. Heel flap: a flat rectangle worked over the back of the leg's sts. Turn heel: short rows that shape the cup of the heel. turn: stop mid-row and turn the work, leaving the rest unworked. Pick up and k: draw a loop of new yarn through the edge and knit it. Gusset: the triangle of picked-up sts decreased back to the foot's count (and, on a mitten, the increases for the thumb). Waste yarn: a scrap of yarn that holds live sts for later. Kitchener stitch (graft): joins two sets of live sts invisibly with a needle, one grafted st per pair. Jog: the step at the beginning of a round where one round ends a row above where it began; on stripes, knitters hide it by slipping the first st of the 2nd rnd of each new color (a tip in the striped patterns' notes; the game knits it plain and shows the jog). BO here (`_`), held (`-`), u (pick up and k), v (sleeve st): chart keys in the Read the pattern key.

## I. Assets

None generated except one sound: **`sfx-join`** (audiogen, about 0.6 s, a soft wooden click and a short yarn pull, about $0.25, with the same onset trim as every sfx). It's used for the join, the seam's last tap, the gather's cinch and the graft's last tap. The needles, cable, DPNs, tube shading, waste yarn, marker charm, steps' animations, cinch band, hanging loop, i-cord and the raised cables are all drawn in code.

## J. Build order

1. Run `dump-flat-v1.mjs`, take `save-v1.json` and its hashes. This is first, before any data change.
2. chart.js: rsOf, R.round, sections, the round row map (C.2), `_` `-` `s` `u` `v`, step rows with outCols, the wording, parser and merge. check-patterns.mjs for section D. Then the helpers (crownRounds, toeRounds, sockChart, mittenChart, hatChart), and the 19 patterns rebuilt from table A. `--solve`, `--text`, and the knitting expert's read.
3. work.js: the row → y table, the projection (B.1–B.3), needles (B.4), marker and beat (B.5), step animations, and the cable relief (F) in the stitch lab.
4. state.js and render.js: editions and migration (G).
5. tube.js and the worn, card, gallery and ghost maps (E).
6. Glossary, tips, the debug hook, solutions.mjs.

## K. Definition of done for this change

- [ ] `check-patterns.mjs --solve` passes for all 47: the 19 changed ones as round (or flat-and-round) pieces with section D's checks, including needle fit, whole repeats with edges 0, step counts and live counts. The printed counts are within ±30% of table A, and the book total is about 24,600 (no more than 26,000).
- [ ] The knitting expert has read all 19 changed written patterns (`tools/patterns.txt`), and every error they found is fixed. Every round reads "Rnd n: … rep from * around", flat sections read "Row n (RS/WS)", garter in the round reads "Rnd 1: purl. Rnd 2: knit.", broken rib reads "Rnd 1: *k1, p1; rep from * around. Rnd 2: knit.", and the crowns read "*k4, k2tog; rep from * around (40 sts)". The heel turn, gusset, thumb, gather, graft and yoke join read as real patterns, and every pattern has its Yarn, Needles, Gauge and "scaled down for the game" Size lines.
- [ ] The round trip reads back every plain round and row of all 47.
- [ ] The tube: in screenshots at 390×844 and 1280×800, a hat, a sock and a mitten in progress read as tubes, with the needle tip at the next loop, finished stitches leaving to the right, the tube turning in steps (circular) or per needle (DPNs), and the marker charm with the jog visible when the back comes round. The heel flap shows flat with the squash turn. Frames stay near 60 a second while drumming, with ≤ 400 drawImage a frame (`state().drawCalls`).
- [ ] Every step taps, animates, saves, reloads mid-step and rips back across its boundary (solutions.mjs): the join, the Argyle seam, the set-up rounds, the hold, the thumb set-up, the yoke's joining round, the gather, the graft and the underarm graft.
- [ ] solutions.mjs plays all 47 from a fresh save, and the gallery copies match (hashes).
- [ ] **Migration:** with `save-v1.json` loaded, the three gallery pieces' `piece(id)` and bake hashes equal `save-v1-hashes.json`; Pip still wears the flat one with today's fit; the in-progress cozy sock resumes at 150 of 273 on its v1 chart, finishes after 123 taps, and lands in the gallery as `ed: 1`; "Knit again" on it starts the round edition with 749 taps; with the JSON blocked, the sheet offers Try again and Back, and nothing is lost.
- [ ] **On the dolls:** doll-sheet.html shows every wearable on every doll it fits. Screenshots of **a hat (Rolled-Brim Beanie), a sock (Cozy Sock) and a mitten (Chunky Mitten) on Pip and one other doll** show them as tubes: the hat's back brim behind the head above the ears, the sock bending at the heel along the turned-out foot, the mitten with its thumb at the side, and the knit Vs visible at 390×844. The Yoke Sweater shows its yoke over the shoulders with sleeves on the arms. The gallery shows a hat hanging by its gathered top.
- [ ] Raised cables: the stitch lab shows the Cable Headband and Fisherman Beanie ropes beside ref-cable.jpg, and they read as raised S-chains with sunken purls, flat and on the tube.
- [ ] The first round piece shows the "Knitting in the round" tip once, the end-of-round beat plays each round, the glossary has section H's entries, and `sfx-join` plays on the join, gather and graft.
- [ ] No soft-locks: every round piece can be ripped back to the cast-on and knit again, and every edition-1 record can always be opened, finished or left.
