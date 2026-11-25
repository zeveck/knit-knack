# Knit Knack

*Tap, tap, tap: knit anything, one real stitch at a time.*

## Pitch

Every tap knits exactly one stitch. You watch a real-looking hat, mitten, cable cowl or little knitted whale grow on the needles, stitch by stitch, in the colors and yarns you pick. Work through a book of 47 real patterns (ribbing, cables, lace, Fair Isle, toys) and hang each finished piece in your own gallery. Every pattern is a real one you could knit from its written page. As you go you unlock new needles, stitch markers and cozy things for the nook, and a shelf of little dolls to dress in the hats, socks and sweaters you made. Keep coming back to the Infinite Scarf. It never ends: within a few minutes it's taller than a guitar, within the hour it's taller than a giraffe, and someday, maybe, it reaches the Moon.

## Settings

- Platform: both (phones in portrait or landscape, desktop in a wide layout)
- Target: web (plain HTML, CSS and JavaScript ES modules, no build step)
- Scope: medium, judged from the request: 47 patterns plus an endless scarf mode, built on one mechanic (tapping). About 2¼ hours of tapping finishes the whole book (about 24,600 stitches at about 3 taps a second) (Change 2). The scarf never ends. Around it: 12 needles, 5 kinds of accessories and 7 dolls to unlock.
- Kinds: clicker / incremental, creative toy (no genre guide applies)
- Budget: $50 for generated art and audio (raised from $20 by request 4; about $0.51 already spent on the shared design's mock pictures)
- Tools available: nanogen, imagegen2, anim8gen (OpenAI + Gemini keys ok), audiogen (ElevenLabs creator plan), playwright-cli, node, python3 + Pillow. **No ffmpeg** (checked: `which ffmpeg` finds nothing), so audio trimming and slicing happen in the browser at load time.
- Credit: Rich Conlan
- Feedback: on ("Report a bug" in the menu, Ctrl+Shift+F)
- Decisions made on the player's behalf:
  - "infinite scart" is the **Infinite Scarf**.
  - **One tap = one stitch, always.** No auto-knitters, no multipliers: "the key is tap → knit knit knit". (A "Hold to knit" setting, off by default, is there for accessibility. It knits at a steady 6 stitches a second while held.)
  - Patterns are real constructions (real stitches, real shaping, real pattern wording), scaled down to tap-friendly sizes: 100 to 1,600 stitches each. **Each is based on a named, real stitch pattern** (its `source`, such as "2×2 rib" or "Old Shale, 18-st 4-row repeat"). Its width holds whole repeats, and it has a full written pattern a knitter could follow, finishing included.
  - **(Change 2) Pieces are knit the way real knitters make them.** Hats, headbands, the ear warmer, cowls, mitts, socks, mittens, the Strawberry Pouch, the Holiday Stocking, the Dog Sweater and the Yoke Sweater's body and yoke are **knit in the round**: the work is a turning tube on a circular needle or DPNs, worded by "Rnd", and finished without seams (crown gathered, heel turned with short rows, gusset picked up, toe grafted). Inside them, the heel flap, the Argyle Sock's intarsia leg and the Dog Sweater's last rows are worked flat, as real patterns do. Everything that's really knit flat stays flat, bottom up, showing its front: dishcloths, coasters, bookmarks, the wristwarmer (one ribbed rectangle seamed once), the cozies, pillows, blankets, the scarf panel, doily, shawlette, the toys' pieces (a front and a back, seamed and stuffed), the Tea Cosy, the Cabled Cardigan and the afghan. The full spec is design/CHANGE_2.md.
  - **No shop and no currency.** Needles, accessories and dolls unlock from lifetime stitches, pieces finished and chapters (see "Needles, accessories and dolls"). They change looks and sounds only: nothing knits for you.
  - "Like 47 maybe": exactly **47 patterns** in 7 chapters.
  - "Fun graphics/facts" for the scarf: the scarf stands up beside illustrated things of known height, with a fact each, and knitting facts in between.
  - A sleepy cat, **Purl**, lives in the yarn basket and cheers when you finish. Added for warmth. She never gets in the way.

## The player's fantasy

You're a calm, clever knitter in a cozy lamplit nook. You turn balls of yarn into lovely things with your own hands, and your gallery wall fills up with things you made, in colors nobody else picked.

## Core loop

- **10 seconds:** tap, tap, tap. On each tap the right needle dips into a loop on the left needle, wraps the yarn and pulls a new stitch through. The stitch drops into the fabric in the current yarn, with a soft wooden *tick*. When a row finishes, the work turns and the next row starts. Now and then you tap a yarn to change color.
- **1 to 10 minutes:** pick a pattern from the book, choose its yarns, cast on and knit it to the end. Watch it bind off and get blocked, then hang it in the gallery. Finishing unlocks the next pattern (and sometimes a new kind of yarn).
- **Session loop:** the book (47 patterns, each with a new technique or object), the gallery filling up, unfinished pieces waiting where you left them, the Infinite Scarf's next milestone ("12 cm to go until it's taller than a front door"), the next needles or doll ("1,240 more stitches to Cherry needles"), and dressing the dolls in what you made.
- **The mechanic the game lives or dies by:** *the tap has to feel good and look like real knitting.* The stitch rendering and the needle animation are the most important work in the build, so they're built and checked first in a stitch lab (see Tech plan).

## First launch

1. Title: "Tap to start" (this tap also starts the audio).
2. Straight into the **Garter Dishcloth**, already cast on in cranberry wool, with a pulsing hint: "Tap anywhere to knit". The hint fades after 3 taps.
3. Contextual tips appear once each, as small cards that never block tapping:
   - End of row 1: "The work turns. Now you knit back the other way."
   - Row 3: "Tap a yarn below to change color, any time, on any stitch."
   - First finish: "Display it hangs it in your gallery."
   - Back in the book: "Pick your next pattern" points at the new card.
   - First pattern with 2 or more color slots: "Follow chart switches yarns for you. Pick any yarn to knit your own way."
   - First unlock: "New things go in your Knitting Bag. Use it tries it now."
   - First wearable finished: "Put it on a doll: meet Pip!" points at the button.
4. After the first finish, the book and the Cast On screen work as normal.

"How to play" in the menu shows the same tips as three code-drawn cards.

## Controls

**Desktop** (wide layout: the work in the middle, the pattern and yarn panel on the right)

| Action | Keyboard | Mouse |
|---|---|---|
| Knit one stitch | Space, Enter or K (one per press; holding does nothing unless "Hold to knit" is on). On the knitting screen these always knit, even right after clicking a button (see Input) | Click anywhere on the knitting screen that isn't a button |
| Rip back one stitch | Backspace or U | Click "Rip back" (hold to keep ripping, 5 a second) |
| Change a chart slot's yarn | 1 to 4 (opens that slot's picker) | Click the slot's skein |
| Knit with a recent yarn (Freestyle) | 5 to 9 (the 5 recent yarns, newest first) | Click it in the recent-yarns row |
| Pick any yarn (Freestyle) | Y | Click the basket |
| Back to following the chart | C | Click "Follow chart" |
| Zoom the work | + and − (0 fits it again) | Scroll wheel or trackpad pinch; − / + buttons |
| Enlarge the preview card | V (V or Escape closes it) | Click the card |
| Pattern glossary | G | The "?" button at the end of the wording strip; hovering an abbreviation shows its meaning |
| Menu (pauses nothing: there's no timer) | Escape or P (Escape closes an open sheet first) | Menu button, top left |
| Mute | M | Speaker button |
| Report a bug | Ctrl+Shift+F | "Report a bug" in the menu |

**Touch**

| Action | Touch |
|---|---|
| Knit one stitch | Tap anywhere on the knitting screen that isn't a button: the work, the wording strip, the gaps between bars. Every finger counts, so two-thumb drumming works. While a sheet (picker, glossary) is open, taps don't knit: a tap outside the sheet just closes it. |
| Rip back | "Rip back" (56 px) at the right end of the **top bar**, away from where thumbs drum. Tap for one stitch; hold to keep ripping. |
| Change yarn | The yarn bar along the bottom, above the home bar (see "Yarn and color"). The basket opens the full picker as a bottom sheet. Yarn buttons act on release, only if the finger moved less than 10 px, and a press that starts within 250 ms of a knit tap is ignored, so drumming thumbs that slide onto the bar don't switch yarn. |
| Preview card, unlock toasts | The preview card (in its own slot, see Layouts) enlarges as a sheet when tapped. An unlock toast's "Use it" equips the new thing. Both act on release, like the yarn buttons: only if the finger moved under 10 px, and not for a press within 250 ms of a knit tap. |
| Glossary | The "?" button (44 px) at the strip's far end |
| Zoom | − and + buttons (44 px) in the top bar. There's no pinch: every touch knits. The view always follows the needle. |
| Menu | Button top left, inside the safe area |

**Layouts**

- **Phone portrait (390×844):** top bar (menu, progress line, − +, mute, Rip back). Yarn chips and unlock toasts show over the progress line. The work fills the middle, above a 96 px **bottom band**: the **basket slot** (Purl's basket and the yarn holder, 176×96 px) at its left and the **preview card** (88×88) at its right. Then the wording strip (with its "?"), then the yarn bar (two rows of 56 px buttons).
- **Phone landscape (any height under 500 px, e.g. 844×390):** its own layout. The work fills the left two-thirds, with a 130 px **side band** at its left: the preview card (88×88) at the band's top and the basket slot (basket and holder, 126×80) at its bottom. The right panel (about 280 px) has a one-line wording strip with its "?", then the yarn buttons in a **grid of 3 columns × 4 rows of 56 px** (up to 4 skeins, Follow chart, the basket and 5 recent yarns = 11), which fits in the panel's ~300 px height without scrolling. Progress, chips and toasts sit in the top bar. The biggest pieces (40 stitches) get about 430 px of width, so cells stay at 8 px or more (about 10.7 px).
- **Desktop and tablets:** the wide layout. The right panel holds the wording strip, the yarn bar, then the preview card (160×160) and the basket slot at the bottom. Chips and toasts show in the top bar.
- **The bands are kept out of the box the work is fitted into**, so at fit zoom the basket, Purl, the holder, the ball and the preview card never cover the work or the needle row. When zoomed in, the fabric can pass under them.

The knitting screen uses `touch-action: none`, so fast taps never zoom the browser.

## Structure and difficulty

There's no losing. "Difficulty" is how long and how intricate a piece is, and each new pattern shows something new: a stitch, a construction or a shape.

### How a pattern works

- A **chart** is a grid of cells. Each cell shows **how that stitch looks from the front (the right side, RS)**: a knit V, a purl bump, an eyelet, a decrease, a cable crossing. Each cell also has a color **slot** (A, B, C, D), or it's empty (outside the shape: crowns, thumbs, heels, ears).
- (Change 2) **Round pieces** are knit round by round, every round from the right side, on a tube that turns as you knit (see CHANGE_2.md B). Their flat sections (a heel flap) work as below. **Flat pieces:** you knit **row by row from the bottom up, the way real flat knitting goes**. Odd rows are RS rows, knit right to left. Then the work turns and the even rows (wrong side, WS) go left to right, as seen from the front. The live stitches sit on the needles along the top edge of the fabric.
- **The screen always shows the front.** At the end of a row the work does a quick squash-and-return "turn", and on WS rows the needle animation runs mirrored, left to right.
- **Pattern wording:** a strip shows the current row in real pattern language, generated from the chart. On WS rows the generator says what the knitter actually does: a cell that looks like a purl bump from the front is a *knit* on the WS (k↔p, k2tog↔p2tog, ssk↔ssp). So garter reads `Row 2 (WS): k to end`, and 2×2 rib reads `Row 2 (WS): p2, *k2, p2; rep from * to end`. Examples: `Row 7 (RS): k2, *p2, k2; rep from * to end`, `Row 11 (RS): k3, C4F, k3`, `Row 5 (RS): *k1 A, k1 B; rep from * to end`. Flat pieces always say "Row". (Change 2) Round pieces say "Rnd n: *k2, p2; rep from * around" with no side and no inversion, garter in the round as "Rnd 1: purl. Rnd 2: knit.", and "Row n (RS/WS)" only in their flat sections, under section headers ("Heel flap:", "Turn heel:").
- The current stitch is underlined. Inside a repeat, the whole repeat is highlighted and a counter shows where you are: "rep 3 of 5 · st 2 of 4". The whole strip knits when tapped, like the rest of the screen. The glossary (k = knit, p = purl, C4F = cable 4 front…) opens only from the small "?" button at the strip's end (or G), as a sheet.
- **Cables, bobbles and lace (yarn-overs and their decreases) only happen on RS rows.** WS rows work them plain, as most real patterns do. The pattern checker enforces this. (Change 2) In the round every round is an RS round, so they may happen on any round.
- **Shaping, as real flat knitting does it:** one-stitch steps are increases (`m`, make one: M1L or M1R leaning outward) and decreases (k2tog, ssk) at either edge. Steps of 2 or more bind off or cast on **at the start of a row** ("BO 3 sts at beg of next 2 rows", "CO 4 sts, k to end"). Binding off elsewhere happens only under a gap (a thumb hole, between ears), and casting on elsewhere only across a gap (closing a thumb hole, joining legs). Parts that grow apart (two ears, legs, a cardigan's fronts) are worded "work each ear separately". See "The row map". (Change 2) Round pieces decrease evenly round ("*k4, k2tog; rep from * around"), open holes with one-round gaps ("BO 4", then "CO 4 over the gap" next round), hold stitches on waste yarn, and use the round row map in CHANGE_2.md C.2 instead.
- **Read the pattern:** every pattern card and the Cast On screen have it: the full written pattern, a real knittable one generated from the chart (see "The written pattern"). The strip's wording comes from the same generator.
- **A ghost of the finished shape** is drawn faintly behind the work, so you can see what you're making and how far there is to go.
- **Colors:** see "Yarn and color" below.

### The 47 patterns

Unlocking: you start with **3** patterns. **Every piece you finish (a "Knit again" too) unlocks the next locked pattern in the book**, so there are always 2 or 3 to choose from and you can never get stuck. Finishing a chapter's last pattern earns its ribbon (shown on the book's cover). Stitch counts, and cast-ons of shaped pieces, are approximate. The build's pattern checker prints the real ones, keeping the repeat rule.

How to read the columns:

- **Source:** the real stitch pattern or technique the piece is based on, as stored in its data.
- **Repeat:** "w+e, r" means a multiple of w stitches plus e edge stitches, over an r-row repeat (`repeat: {width, edges, rows}`). The count is checked on the cast-on row, or on the row named in brackets (a sock's leg, a sweater's yoke). Placed motifs and toys use the background stitch's repeat.
- **Size:** the widest × tallest extent in stitches and rows, then the cast-on.
- **Wear:** the doll slot and how it fits (see "Needles, accessories and dolls"). "—" means a gallery piece.
- **Finishing**, shortened here (the data holds the full text): *Flat* = weave in ends and block. *Ring* = sew the cast-on edge to the bind-off edge. *Tube* = seam the side edges. *Back + seam* = make a back the same in A (the mirror image for socks and mittens), place right sides together, seam round leaving the named edge open, and turn out. *Toy* = back + seam, leaving the base open; turn out, stuff lightly and close. *Pair* = make 2. (Change 2) Round pieces need no seams: *Gathered top* = cut the yarn and thread it through the rem sts; *grafted toe* = Kitchener stitch. Round sizes read "48 around × 16 rnds" (the circumference, which is the chart's width; the tube shows its front half). Round repeats have no edge stitches ("w+0").

| # | Pattern | Source | Repeat | Size, cast on | Stitches | Wear | Finishing |
|---|---|---|---|---|---|---|---|
| | **1. First Stitches** | | | | | | |
| 1 | Garter Dishcloth *(start; first launch)* | Garter stitch (k every row) | 1+0, 2 | 12×12, CO 12 | 144 | — | Flat |
| 2 | Stockinette Coaster *(start)* | Stockinette in a garter border | 1+4, 2 | 10×10, CO 10 | 100 | — | Flat |
| 3 | Seed Stitch Bookmark *(start)* | Seed stitch over an odd count (k1, *p1, k1) | 2+1, 2 | 7×22, CO 7 | 154 | — | Flat; tassel at the top |
| 4 | Ribbed Wristwarmer (Change 2) | 1×1 rib on an even count (*k1, p1 every row), flat | 2+0, 2 | 24×12, CO 24 | 288 | hands·pair (a tube) | Seam the side edges once into a tube, leaving a thumb gap 3 rows below the top; pair |
| 5 | Striped Headband (Change 2) | 2×2 rib in the round (*k2, p2), stripes in 3 slots; super bulky, 16" circular | 4+0, 2 | 40 around × 10 rnds, CO 40 | 401 | head·band (ring) | Bind off in rib; weave in ends |
| 6 | Basketweave Mug Cozy | Basketweave (k4/p4 blocks, offset every 4 rows) between garter rows | 8+4, 8 | 20×12, CO 20 | 240 | — | Wrap round a mug; seam the side edges above and below the handle |
| | **2. Warm Things** | | | | | | |
| 7 | Rolled-Brim Beanie (Change 2) | Stockinette in the round (the brim rolls by itself), crown *k4, k2tog decreases on DPNs, gathered; chunky | 1+0, 2 | 48 around × 16 rnds, CO 48 | ~633 | head·dome | Gathered top |
| 8 | Moss Stitch Ear Warmer (Change 2) | Moss stitch in the round (2 rnds *k1, p1, 2 rnds *p1, k1), cinched at the front | 2+0, 4 | 56 around × 8 rnds, CO 56 | 449 | head·band (ring) | Bind off in pattern; wrapped cinch band at the front |
| 9 | Bobble Hat (Change 2) | 2×2 rib brim, striped stockinette, crown decreases, all in the round | 4+0, 2 | 48 around × 17 rnds, CO 48 | ~681 | head·dome | Gathered top; pom-pom |
| 10 | Broken Rib Cowl (Change 2) | Broken rib in the round (Rnd 1 *k1, p1; Rnd 2 knit) | 2+0, 2 | 60 around × 10 rnds, CO 60 | 601 | neck·band (ring) | Bind off loosely |
| 11 | Fingerless Mitts (Change 2) | 1×1 rib cuffs, stockinette on DPNs, a one-round thumb hole (BO 4, CO 4 over the gap next round) | 2+0, 2 | 24 around × 19 rnds, CO 24 | ~453 | hands·pair | Bind off in rib; make 2 the same |
| 12 | Cozy Sock (Change 2) | Cuff-down sock on DPNs: 2×2 rib cuff, leg, slipped heel flap, heel turned with short rows, gusset picked up and decreased, foot, wedge toe | 4+0, 2 (cuff) | 24 around (34 cols), CO 24 | ~749 | feet·pair | Kitchener-grafted toe; make 2 |
| 13 | Chunky Mitten (Change 2) | 1×1 rib cuff, thumb gusset increases, thumb sts on waste yarn, hand, top decreases, gathered; thumb picked up and knit; DPNs | 2+0, 2 | 20 around, CO 20 | ~516 | hands·pair | Gathered top and thumb; make 2 the same |
| | **3. Colorwork** | | | | | | |
| 14 | Fair Isle Coaster | Fair Isle OXO peerie (stranded, 2 colors) | 6+1, 7 | 13×13, CO 13 | 169 | — | Flat |
| 15 | Checkerboard Washcloth | Two-color stranded checks (4-st blocks) | 8+0, 8 | 16×16, CO 16 | 256 | — | Flat |
| 16 | Heart Pillow | Intarsia heart on stockinette | 1+0, 2 | 20×20, CO 20 | 400 | — | Back in A + seam 3 sides, stuff, close |
| 17 | Star Ornament | Shaped stockinette star: two lower points worked separately and joined, arms cast on, then decreases | 1+0, 2 | 15×15, CO 3 + 3 | ~120 | — | Back + seam, stuff lightly, add a hanging loop |
| 18 | Strawberry Pouch (Change 2) | In the round from an 8-st tip, increased to 32; dot stitch in B, leafy rounds in C, an eyelet round | 4+0, 4 | 32 around × 17 rnds, CO 8 | ~473 | — | Tip gathered; i-cord drawstring through the eyelets |
| 19 | Snowflake Mitten (Change 2) | As 13 at 24 sts: stranded snowflake on the back of the hand, lice check on the palm | 2+0, 2 | 24 around, CO 24 | ~654 | hands·pair | As 13; the second has the motif on the other half |
| 20 | Argyle Sock (Change 2) | Argyle intarsia leg knit flat (as real argyle socks are) and seamed up the back, then heel, gusset, foot and toe in the round as 12 | 8+0, 12 (leg) | 24 around (34 cols), CO 24 | ~876 | feet·pair | Leg seamed; grafted toe; make 2 |
| | **4. Cables and Texture** | | | | | | |
| 21 | Cable Headband (Change 2) | Rope cables in the round: *p2, k4, C4F every 6th rnd | 6+0, 6 | 48 around × 10 rnds, CO 48 | 481 | head·band (ring) | Bind off in pattern |
| 22 | Aran Mug Cozy | Aran rope cables (C4B every 4th row) on a seed-stitch ground | 8+4, 4 | 20×12, CO 20 | 240 | — | As 6 |
| 23 | Honeycomb Cowl (Change 2) | Honeycomb (C2B, C2F; 8-rnd) between garter ridges (purl and knit rounds), in the round | 4+0, 8 | 56 around × 12 rnds, CO 56 | 673 | neck·band (ring) | Bind off |
| 24 | Bobble Cushion | Bobble diamonds (purl-stitch diamonds with a bobble at the centre) | 10+1, 10 | 21×20, CO 21 | 420 | — | Back + seam 3 sides, stuff, close |
| 25 | Fisherman Beanie (Change 2) | 2×2 rib brim, *p2, k4 rope cables (C4F, 6-rnd), crown decreased in the purls then across the cables, in the round | 6+0, 6 | 48 around × 18 rnds, CO 48 | ~737 | head·dome | Gathered top |
| 26 | Braided Scarf Panel | 9-st plait cable (C6F, C6B; 8-row) between p2 | 9+4, 8 | 13×40, CO 13 | 520 | neck·hang | Flat |
| | **5. Lace** | | | | | | |
| 27 | Eyelet Dishcloth | Allover eyelets (k2tog, yo; offset every 4 rows) in a garter border | 4+2, 8 | 14×14, CO 14 | 196 | — | Flat |
| 28 | Vine Lace Bookmark | Vine lace (RS: yo, k2, ssk, k2tog, k2, yo, k1; shifting one st every other RS row) | 9+4, 4 | 13×28, CO 13 | 364 | — | Flat |
| 29 | Lace Doily Square | Lace diamonds (yarn-overs with k2tog and ssk outlines) | 10+1, 10 | 21×22, CO 21 | 462 | — | Flat; block, pinning out the points |
| 30 | Feather-and-Fan Shawlette | Old Shale (feather and fan), 18-st 4-row repeat | 18+2, 4 | 38×18, CO 38 | 684 | shoulders·drape | Flat; block, pinning out the scallops |
| 31 | Lace Sock (Change 2) | Lace rib leg and instep (*k1, yo, ssk, p2 / *k2tog, yo, k1, p2), then as 12; aran weight | 5+0, 4 (leg) | 30 around, CO 30 | ~869 | feet·pair | As 12 |
| 32 | Chevron Baby Blanket | Chevron (13-st: paired decreases at the valleys, M1s either side of the peak; 2-row), stripes every 4 rows | 13+2, 2 | 28×28, CO 28 | 784 | — | Flat |
| | **6. Knitted Friends** (toy fronts: shaped, intarsia faces) | | | | | | |
| 33 | Little Bunny | Garter-stitch toy; ears worked separately; button eyes | 1+0, 2 | 16×22, CO 12 | ~220 | — | Toy |
| 34 | Cat Toy | Stockinette toy, intarsia face, purl-stitch whiskers; ears worked separately | 1+0, 2 | 16×18, CO 12 | ~240 | — | Toy |
| 35 | Whale | Stockinette with garter-ridge belly stripes; tail cast on at the row starts | 1+0, 2 | 22×14, CO 14 | ~260 | — | Toy |
| 36 | Frog | Seed-stitch body, intarsia grin | 2+0, 2 | 18×16, CO 14 | ~240 | — | Toy |
| 37 | Penguin | Stockinette, three-color intarsia body | 1+0, 2 | 14×22, CO 10 | ~260 | — | Toy |
| 38 | Octopus | Garter legs worked separately, then joined; stockinette head. The front has 4 legs, the back the other 4 | 1+0, 2 | 18×20, CO 3 × 4 | ~280 | — | Toy (the back's legs too) |
| 39 | Fox | Stockinette, intarsia chest, ears worked separately, white tail tip | 1+0, 2 | 18×20, CO 12 | ~280 | — | Toy |
| 40 | Teddy Bear | Stockinette, round ears worked separately, intarsia tummy patch | 1+0, 2 | 18×22, CO 12 | ~300 | — | Toy |
| | **7. Big Projects** | | | | | | |
| 41 | Tea Cosy | Garter stitch in 2-row stripes, dome decreases | 1+0, 2 | 24×18, CO 24 | ~380 | — | Back + seam the top and sides, leaving gaps for spout and handle |
| 42 | Holiday Stocking (Change 2) | Cuff-down in the round: garter cuff (purl and knit rounds), stranded 6-st peerie band, heel flap and turn, gusset, foot, wedge toe | 6+0, 7 (band) | 36 around, CO 36 | ~1,258 | — | Grafted toe; hanging loop |
| 43 | Dog Sweater (Change 2) | Neck-down tube: 2×2 rib, two one-round leg openings (BO 5, CO 5 over the gap), belly bound off, the last rows flat | 4+0, 2 | 48 around, CO 48 | ~831 | — (for a dog) | Bind off; weave in ends |
| 44 | Patchwork Blanket | Sampler: 9 squares of 12×12 (garter, seed, moss, 1×1 rib, 2×2 rib, k3/p3 basketweave, broken rib, stockinette, eyelets) | 12+0, 12 (a square) | 36×36, CO 36 | 1,296 | — | Flat |
| 45 | Yoke Sweater (Change 2) | Bottom-up in the round: body, underarm sts on waste yarn, sleeves (written, make 2) joined on one circular, stranded 8-st yoke band with decrease rounds, neck rib | 8+0, 7 (yoke) | 64 around at the yoke, CO 48 | ~1,163 | body | Graft the underarms |
| 46 | Cabled Cardigan | Two fronts worked separately: rope cables (C4B, 6-row) in p2 panels, seed-stitch button bands; dolman sleeves | 8+3, 6 (each front) | 41×40, CO 11 + 11 | ~1,200 | body | Back in one piece (plain) + seam as 45; sew on buttons |
| 47 | Heirloom Afghan | Sampler afghan: garter border, Fair Isle band, cable panels, lace and bobbles | 12+4, 8 | 40×40, CO 40 | 1,600 | — | Flat |

(Change 2) About 24,600 stitches for the whole book (it was 19,501), about 2¼ hours at 3 taps a second. Round pieces use chunky or super bulky yarn so honest counts stay modest, and every needle named fits its count. The curve: the first three take under a minute each, so the first unlock comes fast. Chapter 1's other pieces take 1½ to 2½ minutes. Chapter 2's round pieces take about 450–750 taps (2½ to 4 minutes), socks and mittens about 500–900. Chapters 3 to 6 take 2 to 5 minutes a piece. Chapter 7 pieces are long projects you come back to, the Holiday Stocking and Yoke Sweater at no more than about 1,400.

**Many pieces at once:** every pattern keeps its own work in progress, so you can put a big sweater down, make a quick coaster, and go back. The book shows a progress bar on each started pattern. "Knit again" restarts a finished pattern in new colors (the finished one stays in the gallery).

### The Infinite Scarf

It has its own button on the book's front page, open from the start.

- 12 stitches wide, super-chunky: **every row adds 1 cm**, so 1 m is 1,200 taps (about 7 minutes). Like every piece, it grows **upward** from its cast-on edge, with the needles at the top. The view follows the needles.
- The stitch pattern can be changed at the start of any row. Picked mid-row, it's queued and the picker says "from the next row". Garter, 2×2 rib and seed are there from the start. A center cable and a lace column unlock with chapters 4 and 5. Yarn and color change any time, just like in the patterns.
- **"How long is it?"** shows the scarf **standing upright** on a ground line, cast-on edge at the bottom, like a beanstalk growing out of Purl's basket. Behind it, a code-drawn sky gets darker with height: lamplit room, then sky, then clouds, then stars. A ruler runs up the side.
  - Beside the scarf stand **the last thing it passed and the next one**, on the same ground line and **at the same scale**. The scale is the smaller of two fits: the taller of the scarf and the next goal into 80% of the view's height, and the scarf plus both pictures side by side (real widths, from each picture's trimmed aspect and real height, with 4% gaps) into 92% of its width. Wide subjects are drawn in narrow views (see Art direction), so on a phone the pair stays readable. When a milestone is passed, the view rescales smoothly (about 0.6 s) to frame the new pair.
  - Every comparison is a height (or, for fun, something "stood on its end"), so the comparison is always the scarf's length against its height.
  - Each comparison has a fact card. The facts are checked against a source during the build and worded with "about".
- Times below assume about 3 taps a second.

| Length | Taller than… | About when | Unlocks |
|---|---|---|---|
| 10 cm | a mug | 40 s | |
| 20 cm | a pencil, stood up | 1.5 min | |
| 30 cm | a school ruler, stood up | 2 min | |
| 38 cm | a bowling pin | 2.5 min | |
| 75 cm | a kitchen table | 5 min | |
| 1 m | a guitar, stood up | 7 min | Sparkle yarn |
| 1.1 m | an emperor penguin | 7.5 min | |
| 1.8 m | a grown-up | 12 min | |
| 2 m | a front door | 13 min | |
| 3 m | a basketball hoop | 20 min | Glow yarn (or finish chapter 6, whichever comes first) |
| 4.4 m | a double-decker bus | 30 min | |
| 5.5 m | a giraffe | 37 min | |
| 7.5 m | a two-storey house | 50 min | |
| 10 m | an Olympic diving tower | 67 min | |
| 13 m | a Brachiosaurus | 1.5 h | |
| 20 m | a big oak tree | 2.2 h | |
| 30 m | a blue whale, stood on its tail | 3.3 h | |
| 46 m | the Statue of Liberty (heel to torch) | 5 h | |
| 56 m | the Leaning Tower of Pisa | 6 h | |
| 116 m | the tallest tree, a coast redwood | 13 h | |

- **"Someday…"** goals come after that. They're shown in a list in "How long is it?" with a simple code-drawn silhouette on each card instead of a painting: the Eiffel Tower (330 m), the Burj Khalifa (828 m), Mount Everest (8.85 km), the edge of space (100 km), up to the space station (400 km), long enough to wrap once around the Earth (40,075 km) and to the Moon (384,400 km, "Purl is very impressed"). The counter always shows the next goal, near or far.
- **Knitting facts in between:** a small card (with the `sfx-card` sound) every 25 cm up to 2 m, every 50 cm up to 10 m, every 1 m up to 50 m, then every 5 m. A fact is skipped when it would land within 10 cm of a comparison. That's about 40 checked facts ("The oldest knitted socks we know of are about 1,000 years old, from Egypt"). After the last fact, the cards become **scarf stats** worked out from the save ("You've used 23 colors", "That's 41,000 stitches", "Your longest stripe is 3.2 m"), so a card never stops coming. A counter always shows the next goal: "12 cm to go: taller than a front door".
- The scarf can be worn by a doll (neck·hang): it wraps round once and hangs to the shelf, with "+ 4.2 m more" for the rest.
- The scarf is saved forever (see Tech plan). Its length and total stitches are shown on the gallery's plaque.

## Yarn and color

- **Color:** 30 swatches (warm and cool, brights, naturals and greys) plus "Mix your own" (hue, saturation and lightness sliders, with your last 8 custom colors saved).
- **Yarn types:** each draws differently, at the same stitch size:
  - **Wool** *(start)*: soft, matte, a little fuzz.
  - **Cotton** *(start)*: crisp, smooth, a faint sheen.
  - **Chunky** *(finish 3 pieces)*: plump, rounded stitches with deep shadows.
  - **Mohair** *(finish chapter 2)*: a soft fuzzy halo over the stitches.
  - **Sparkle** *(scarf reaches 1 m)*: tiny glints that twinkle now and then.
  - **Self-striping** *(finish 10 pieces)*: the color drifts slowly through 16 shades of the chosen color along the yarn, like real self-striping yarn.
  - **Velvet** *(finish chapter 4)*: deep, rich and shiny.
  - **Glow** *(scarf reaches 3 m, or finish chapter 6)*: glows softly in the gallery's "Lights out" view.
- **Cast on:** before a pattern starts, the Cast On screen lists its color slots (A main, B, C, D) with suggested yarns. Pick any color and type for each. The preview recolors live.
- **The yarn bar** (bottom on phones, right panel on desktop) has three parts:
  - **Chart skeins A–D** (only the slots this pattern uses). **Tapping a skein opens that slot's picker**, and the new yarn is used for that slot from the next stitch on (a stripe, a color shift halfway up). The skein of the slot the next stitch uses is raised.
  - **Follow chart** (a toggle, on by default): each stitch uses its slot's yarn, so colorwork appears by itself.
  - **The basket and the recent yarns** (the last 5 yarns used, newest first). **One tap on a recent yarn knits with it from the next stitch on, whatever the chart says** (Freestyle). The basket opens the full picker for any yarn, which then joins the recent row. Freestyle lasts until you tap "Follow chart". This is how you color things exactly how you want, stitch by stitch: tap a yarn, knit, tap another, knit.
  - A small preview stitch always shows the yarn the next stitch will use.
  - **How the buttons look:** each skein and recent yarn is a ~44 px yarn ball from `yarn-set` (the ball of its yarn type, tinted to its color, with the type's code effect: sparkle glints, glow, self-striping bands). The basket button is a small copy of the basket (back + front layers). Nothing in the bar is a plain swatch circle.
  - **A switch you can see and undo:** every yarn change shows a chip in the top bar for 4 s, e.g. "Freestyle: Sage wool · Undo". Undo puts back the yarn (and Follow chart or Freestyle) used before; stitches already knit stay as they are (Rip back undoes those).
- Changing yarn never changes stitches already knit (just like real knitting). "Rip back" lets you undo stitches and knit them again in another yarn.

## Win, lose and progress

- **Finishing a piece:** after the last stitch the needles slide out, it binds off with a flourish, a puff of steam "blocks" it flat, and its finishing touch appears (tassel, pom-pom, button eyes). Purl wakes up and paws at it (her sprite is mirrored per layout so the paw reaches toward the work), mews, and purrs as she settles. Then:
  - **"Display it"** (the big button) goes to the gallery. The piece floats onto the next free peg with a wooden *clunk*, and "Knit another" and "Back to the book" appear.
  - **"Put it on a doll"** (wearables only, beside Display it) hangs it too, then opens the dressing view with the piece already on: on the last-dressed doll that has its slot, else Pip.
  - **"Not now"** puts it in the gallery's **Basket** tab, where unhung pieces wait. Hang them from there any time.
- **There's no losing**, and nothing can get stuck. The next stitch is always a tap away, rip back works to the first stitch, a piece in progress is never lost, and finished pieces are never deleted (taking one down moves it to the Basket).
- **Saved:** see Tech plan. Pieces are saved at most every 2 seconds while knitting, at every row's end, on leaving a screen and when the page is hidden. If a save ever fails, a gentle notice says so ("Couldn't save just now. Your knitting is still here.") and the next save tries again.

## Needles, accessories and dolls

There's no shop and no currency. Everything unlocks from counts the save keeps: **lifetime stitches** (every knit tap, in patterns and the scarf; ripping back never subtracts), **pieces finished** (Knit again counts), **chapter ribbons** (finishing a chapter's last pattern) and a few named goals. All of it lives in one `unlockRules` table (see Tech plan). Each unlock shows a toast once, over the progress line ("New needles: Rosewood! · Use it"), with `sfx-unlock`. "Use it" equips it at once, without leaving the screen. Every unlock is visible in play, never just a list entry, and none of them knits for you.

### Needles (12, drawn in code)

They match the stitch size and the lamp lighting, and each plays its own family of ticks (see Audio direction).

| Needles | Unlock | Look | Ticks |
|---|---|---|---|
| Bamboo | start | pale bamboo with faint nodes | wood |
| Birch | 500 stitches | blond wood | wood |
| Rosewood | finish chapter 1 | deep red-brown, fine grain | wood |
| Cherry with brass tips | 2,000 stitches | warm cherry, brass tips | wood |
| Ebony with silver ends | 4,000 stitches | near-black, silver end caps | wood |
| Nickel-plated | finish chapter 2 | bright steel, sharp highlight | metal |
| Rainbow aluminium | 7,500 stitches | anodized color gradient along the length | metal |
| Candy-cane stripe | finish chapter 3 | red and white spiral, glossy acrylic | glass |
| Clear glass | 12,000 stitches | see-through with edge highlights; the loops show faintly through | glass |
| Gold-tipped | finish chapter 5 | dark wood, gold tips | metal |
| Glow-tipped | scarf reaches 10 m | dark wood, tips that glow softly (effects layer) | wood |
| Heirloom carved oak | finish all 47 | carved oak with a carved end knob | wood |

### Accessories

| Kind | What it does, where you see it | Items (unlock) |
|---|---|---|
| Stitch markers | Little charms on the needle at the pattern's repeat boundaries (after the edge stitches and between repeats, read from `repeat`; only when the repeat is 4 sts or wider; at most 12). They pass from the left needle to the right as you knit past them. Drawn in code; below 14 px cells every charm is drawn as a plain ring | plain rings (start), hearts (1,000 stitches), stars (finish 5 pieces), acorns (chapter 4), tiny cats (finish 25 pieces) |
| Row counter | A little clicker on the end of the needle in the left hand. Its number (drawn in code) ticks over at each row end | brass barrel (start), wooden dial (3,000 stitches), enamel flower (chapter 6) |
| Yarn holder | What the current ball sits in, **beside** Purl's basket. The wicker basket is always Purl's bed | on the floor (start), ceramic yarn bowl (finish 8 pieces), canvas project bag (chapter 3), teacup bowl (20,000 stitches) |
| Nook decor | Small things in fixed spots of the nook painting, on the title and the knitting screen. Each one toggles on or off | potted fern (1,500 stitches), string lights (finish 12 pieces), braided rug (chapter 2), framed photo of your newest gallery piece (finish 15 pieces), little bookshelf (chapter 7) |
| Purl's things | Purl wears or uses them in every picture of her (asleep, cheering, on the Doll Shelf, on the title). Each one toggles | cranberry collar (finish 2 pieces), bell (6,000 stitches; it jingles with her cheer), cushion in her basket (chapter 1) |

### Dolls

A **Doll Shelf** tab in the gallery holds small dolls you dress in your finished wearables (see Screens).

| Doll | Unlock | Notes |
|---|---|---|
| Pip, a small jointed wooden doll (round peg-doll head, simple wooden arms and feet) | finish your first wearable (in book order, the Ribbed Wristwarmer or the Striped Headband) | painted first, as the anchor for the rest |
| Clementine, a rag doll with yarn hair | finish chapter 2 | her hair shows under hats |
| Bramble, a plush bear | finish chapter 3 | round ears over hats |
| Juniper, a felt bunny | 10,000 stitches | ears poke through hats |
| Basil, a felt fox | finish chapter 4 | pointed ears over hats |
| Mabel, a tiny wooden artist's mannequin | finish chapter 7 | |
| Purl herself | finish the Bobble Hat | head and neck slots only; ears over hats |

- **Wear slots:** each pattern has `wear: {slot, fit}` or none (the table above lists all 47). **head** (*dome*: hats; *band*: headbands and the ear warmer), **neck** (*band*: cowls; *hang*: the scarf panel and the Infinite Scarf), **body** (sweaters: the body on the torso, the sleeves along the arms), **hands** (*pair*: mittens, mitts and wristwarmers, mirrored for the other hand), **feet** (*pair*: socks, mirrored) and **shoulders** (*drape*: the shawlette). That's 19 patterns plus the scarf. The Dog Sweater fits no doll ("It's for a dog") and is a gallery piece.
- **Every doll has all six slots** except Purl (head and neck). A doll wears one piece per slot. One gallery piece can be worn by any number of dolls at once. Taking a piece down to the Basket leaves it on its dolls: only "Take off" removes it. Worn pieces keep a small doll icon on their gallery tag.
- **Worn pieces look exactly as knit**: the same stitches, colors and yarns, bent gently to the slot, with code shading and the doll's ears or hands drawn over them where they should be (see "Dolls and the preview card" in the Tech plan).
- **Socks fit front-facing dolls** because every doll's feet are painted turned out to the sides (toes pointing left and right), so a profile sock sits on each foot, mirrored for the left one.
- **The Infinite Scarf** wraps once round the neck and hangs to the shelf edge, labelled with the rest ("+ 4.2 m more").

### The "what you're making" preview card

A small live picture of the finished object, in its own slot in every layout (see Layouts), outside the work. It fills in stitch by stitch in your actual stitches, colors and yarns. Stitches still to come show as the faint ghost shape, as on the work. Every 10% of the piece it glows once (silently). Tapping it opens it enlarged as a sheet, and the next tap anywhere closes it without knitting, like every sheet. The scarf screen has no card: its length counter is there instead.

- **Wearables** show on the last-dressed unlocked doll that has the slot, else on Pip. Before Pip is unlocked, a soft dark silhouette of Pip wears the piece in full color, so finishing your first wearable is a reveal, not a spoiler.
- **Everything else** sits in a small scene built from a few shared props:

| Pieces | Scene |
|---|---|
| coasters, mug cozies | under or round the mug (the `cmp-01` mug) |
| bookmarks | on an open book (`props` sheet) |
| pillow, cushion, blankets, afghan | on the armchair (cropped from the nook painting) |
| dishcloths, washcloth, doily | laid flat on a wooden table (`tex-wood` with a code shadow) |
| tea cosy | over a teapot (`props` sheet) |
| stocking, ornament, pouch, Dog Sweater | hanging from a gallery peg on the wooden wall |
| the 8 toys | sitting on the doll shelf |

## Screens

- **Title:** the knitting nook, built from the same layers as the game (nook background with any decor that's on, the basket with Purl asleep, the yarn holder and a ball beside it) with the basket and holder on the nook's painted floor spot, dimmed to night with a code vignette. The logo is drawn in code. "Tap to start".
- **Pattern Book:** the cover is a code-drawn cloth panel (a plum gradient with `tex-fibre` laid over it, a stitched dashed border and the chapter ribbons). The front page has big buttons: "Continue" (your last piece), "Infinite Scarf", "Gallery" and, beside it, "Knitting Bag" (with a "new" badge while something new is unseen). Then come 7 chapter tabs. Each pattern is a card with a preview drawn from its chart in its suggested colors, its name, its technique, its size in stitches, a progress bar if started, and "Read the pattern". That opens the written pattern as a scrolling sheet (Fredoka, abbreviations in bold, the key at the end; once started, the current row is highlighted). Locked cards show a soft silhouette and their real count: the first locked card says "Finish 1 more piece to unlock", the next "Finish 2 more pieces", and so on (every finished piece counts, "Knit again" included). Once every one of the 47 patterns has been finished at least once, the book shows a **"Book complete"** page once: the cover gets a gold ribbon, with the finish chime and Purl's cheer.
- **Cast On:** the pattern's preview, its slots and yarn pickers, "Read the pattern" and the "Cast on" button.
- **Knitting (HUD):** the nook as a soft backdrop (cover-fit, blurred and dimmed in code, so its floor needn't line up); the basket (Purl, her things) and the yarn holder with the ball in the basket slot, on a code-drawn floor shadow; the work and the equipped needles, with the stitch markers and the row counter; the preview card in its slot; unlock toasts and yarn chips over the progress line; the progress ("Row 12 of 20 · 214 / 300 stitches") with a thin progress bar; the pattern-wording strip; the yarn bar; Rip back; − +; menu; mute. The layouts are in Controls.
- **Finished:** the celebration (above), with the piece's name, total stitches and yarns used, and "Put it on a doll" for wearables. Unlock toasts wait until the celebration ends.
- **Gallery:** a wooden wall (a tiling texture) with pegs, shelves and a little lamp placed by the layout code, so the pegs always line up with the pieces. On phones it's 2 columns × 3 rows of pegs, and on desktop 4 × 3, newest first. Swipe or use the arrows for more walls. Tap a piece to see it up close (rendered large), rename it, "Knit again" or "Take down" (to the Basket). The tabs are **Wall**, **Basket** and **Doll Shelf**. A piece worn by a doll has a small doll icon on its tag. A plaque shows the totals: pieces, stitches, scarf length. The "Lights out" toggle (once Glow yarn is unlocked) dims the wall to moonlight in code, and Glow yarn glows.
- **Doll Shelf** (a gallery tab, with the gallery music): wooden shelves (the `gallery-props` shelf over `tex-wood`) with the dolls standing in their outfits. Phone portrait shows 3 dolls per page, phone landscape 4 and desktop all 7; swipe or use the arrows. Locked dolls are soft silhouettes saying how to meet them ("Finish chapter 3 to meet Bramble"). Before Pip arrives, the shelf shows Pip's silhouette and "Finish your first wearable (a wristwarmer or a headband) to meet Pip". Tap a doll to dress it.
- **Dressing view:** the doll fills most of the screen (about 560 px tall at 390×844, so a worn stitch is 3 to 6 px and its Vs show). The slots (Head, Neck, Body, Hands, Feet, Shoulders; Purl shows only her two) are labelled buttons below the doll on phones in portrait, and beside it in landscape and on desktop. Each shows a thumbnail of what's worn, or is empty. Tapping a slot opens a bottom sheet of your finished pieces for it (wall and Basket, newest first) and "Take off". Tap a piece to put it on. Arrows switch dolls; Back returns to the shelf (or to the Finished screen's buttons when you came from there).
- **Knitting Bag** (nook music): tabs **Needles, Markers, Counter, Holder, Decor, Purl**. Each tab has a code-drawn preview of the equipped choice as it looks in play: the needles with a few stitches on them, the holder with your current ball beside the basket, a nook thumbnail with its decor, Purl with her things. Below it is a grid of cards. Tap an owned needle, marker, counter or holder to equip it (a tick shows which). Decor and Purl's things toggle one by one. Locked cards show a silhouette and exactly what's left: "1,240 more stitches", "Finish 3 more pieces", "Finish chapter 3 (its last pattern is the Argyle Sock)". Cards unlocked since you last looked carry a "new" badge. The Bag opens from the Menu, the book's front page and a toast's "Use it" (which equips without opening it).
- **Infinite Scarf:** the knitting HUD, plus the length (big, rolling digits), the next goal, the stitch-pattern picker, and "How long is it?" (the comparison view with the fact cards and the "Someday…" list).
- **Menu:** Resume, Book, Gallery, Knitting Bag, Infinite Scarf, Settings, How to play, Report a bug, Credits.
- **Settings:** music volume, sound volume, vibrate on each stitch (on phones that support it), Hold to knit, big buttons, Report a bug, reset progress (with "type RESET to confirm").
- **How to play:** the contextual tips as three code-drawn cards: "Tap to knit", "Change yarn any time", "Finish, display, unlock".
- **Credits:** the game, the idea credited to Rich Conlan, the font licenses.

## Juice

- **[must]** The stitch, in 3 keyframes over about 120 ms: the right needle's tip enters the next loop on the left needle, the strand wraps around it, and the loop moves onto the right needle while the new stitch drops into the fabric. The next tap cuts it short cleanly, so fast drumming never lags behind.
- **[must]** The right needle's tip always rests at the exact next loop before the tap, and the view follows smoothly (eased, about 150 ms), so the stitch you just made is never off-screen at any zoom.
- **[must]** The new stitch pops in (scale 1.25 → 1) and settles. Its color matches the yarn exactly.
- **[must]** The yarn strand runs from the ball in its holder to the needle and twitches with each stitch. The ball wobbles a little (±3°, under fixed lighting) and shrinks slightly as you go.
- **[must]** A needle *tick* on every stitch, in the equipped needles' family (wood, metal or glass; 6 variants with slight random pitch, at most 3 playing at once, so it never drones or clips). Purl stitches use the same ticks a little lower. A soft swish when a row finishes and the work turns. (Change 2) In the round, a softer swish at each round's end as the marker passes, with no turn.
- **[must]** End of a row: the work turns (a quick squash on the x axis and back), the needles swap hands during the squash, and the row counter pops.
- **[must]** Finishing: bind-off flourish, a puff of steam, yarn-fluff confetti, a warm chime, and Purl's cheer (mew, then a purr as she settles).
- **[should]** Purl breathes while asleep, in code: a 1.5% vertical scale anchored at her base, on a 3 s sine.
- **[must]** Unlock: the new card flips over in the book with a chime and a sparkle.
- **[must]** Unlock toast: slides in over the progress line with `sfx-unlock` and stays 4 s. Several queue one at a time.
- **[should]** Row counter: its digit flips at each row end with `sfx-counter`, a quiet clack under the row swish.
- **[should]** Stitch markers swing a little as they pass from the left needle to the right.
- **[should]** Preview card: each stitch appears on it as you knit; it glows once at every 10%.
- **[should]** Dressing: the piece drops onto the doll with a small squash (1.08 → 1) and `sfx-dress`. With the bell on, Purl's cheer adds `sfx-bell`.
- **[must]** Cast on: a quick run of loops appears along the needle with the cast-on sound.
- **[must]** Rip back: one press, one short zip and the stitch's loop pops back onto the needle. While held, a soft unravelling loop plays instead of repeated zips.
- **[should]** A tiny loop flies from the tap point to the needle tip (shows where your tap went).
- **[should]** Every 10th row: a small sparkle along the row (drawn on the effects layer) and a tick pitched a little higher.
- **[should]** Scarf milestones: the length digits roll, a ribbon unfurls with the comparison, a ding.
- **[should]** Vibrate 5 ms per stitch, on phones that support it (setting).
- **[nice]** Glow-tipped needles glow at the tips; the string lights twinkle; the photo frame shows your newest piece.
- **[nice]** Snow falls past the nook window (the window's box is stored with each background), and the lamp glow flickers gently.

## Art direction

- **Style line (paste into every image prompt):** "cozy hand-painted storybook illustration, soft gouache texture, warm lamplight glow, palette of cream, cranberry red, sage green, honey gold and deep plum night blue, gentle soft outlines, rounded friendly shapes, no text"
- **Style anchor (made first):** the **knitting nook background**, a corner with an armchair, a lamp and a window with snow. It has **an empty patch of floor in the lower part of the picture where the basket will go, and no yarn or basket painted anywhere**. It sets the palette and brushwork, and every later image is made with it as a reference.
- **Look target for the code-drawn knitting (made second, not shipped):** 3 nanogen close-ups of knitted swatches (stockinette, 2×2 rib, a C4F cable) in the style line, with the nook as reference. The stitch lab shows its code swatches beside them, and the sprites' shading, outline softness and fibre strength are tuned until the two sit together. The needles' wood colors are sampled from the nook's wooden armchair with Pillow and stored as constants.
- **One basket, one cat, one holder, one ball, layered in code.** The basket is always Purl's bed. The basket and Purl are painted once each, as separate transparent sprites. The basket's front wall is cut from the same basket image in Pillow (everything above the front rim line, traced once as a polygon in `tools/basket-mask.json`, is made transparent), so the two layers line up to the pixel. The code stacks them: basket back, the cushion (if on), Purl (with her collar and bell, if on), then the basket's front wall. **Beside the basket**, on the same ground line, stands the yarn holder: one single-layer sprite, with the tinted ball drawn on top and clipped to what's above the holder's front-rim ellipse (stored with its ball centre and scale in `tools/holders.json`), so the ball sits inside it. "On the floor" is the ball alone with a code contact shadow. The yarn you see is always the yarn you're knitting with. On the title (and any full-picture screen) the stack stands on the nook's painted floor spot; on the knitting screen it stands, at a fixed size, in the layout's basket slot (see Controls), outside the work.
- **The knitting itself is drawn in code**, so it shows exactly the colors and yarns chosen. Each stitch type gets a carefully drawn look:
  - **knit:** a V made of two leaning loops, shaded from the top-left, with a darker gap between them;
  - **purl:** a horizontal bump, rounded;
  - **yarn-over:** an open eyelet hole with the background showing through;
  - **k2tog and ssk:** right- and left-leaning stitches;
  - **increases:** a small lifted loop leaning out;
  - **cables:** drawn as one piece per cable (see Tech plan), loops crossing over, with a shadow under the front strand;
  - **bobble:** a raised round knot;
  - **edges:** the selvage, the cast-on edge and the bind-off chain.
- **Making it look like real fabric, not vector art:**
  - Each stitch sprite is about **1.4 cells tall** and rows are drawn bottom to top, so each row's loops tuck under the row above, as in real fabric. A cell is wider than tall (1 : 0.72).
  - A seamless grey **yarn-fibre texture** (and a fuzzier one for wool and mohair) is laid into every stitch sprite with a color-preserving blend, so light yarns stay light.
  - Code lighting over the work: a warm radial lamp gradient, a soft drop shadow under the fabric, and a slightly darker rim.
  - Small random variations (loop lean, tension) are seeded from the stitch's index, so a piece looks the same every time it's drawn.
- **Needles are drawn in code:** tapered cylinders in the equipped needles' material (see the needles table): wood with a gradient (the wooden ones start from the nook's sampled tones) and a grain stroke, bamboo nodes, metal with a sharp highlight, an anodized gradient, an acrylic stripe, or see-through glass, plus tips and end caps. They scale with the cell size (8 to 84 CSS px, zoom included) and carry the live loops in their yarn colors. The left needle holds the stitches of the row below still to be worked or bound off, and the right needle holds the ones just made, both read from the row map (see Charts as data). They span only the live row (skipping gaps, such as between ears).
- **Yarn balls** are painted **near-white** (highlights white, shadows mid-grey) so they tint cleanly. Tint: fill with the yarn color, multiply the ball over it, then add the ball's own highlight back with a light screen pass. That keeps cream and pastels clean and navy deep. Sparkle, glow and self-striping are effects added in code.
- **Purl's things are drawn in code**, so they never need repainting: the collar is a tinted band stroked along a short neck arc, the bell a small gold disc with a highlight and a slit, and the cushion a cranberry rounded ellipse with a soft gradient. Collar and bell sit at a neck anchor `{x, y, angle, scale}` stored for every Purl image (`purl-cat`, each `purl-cheer` frame, `purl-sit`; mirrored with the sprite) in `tools/purl-anchors.json`, and are checked side by side on the doll sheet.
- **Markers, counters and the preview card's frame** are code too: charm shapes (ring, heart, star, acorn, cat), counter bodies (brass barrel, wooden dial, enamel flower) with code digits.
- **Dolls: one anchor, one template.** Pip is made first (imagegen2, 1024×1536, nook as reference), then the other five with Pip and the nook as references, using the same template, canvas, ground line and head-height band: "<doll>, a small toy doll standing on a flat ground line, front view, plain undyed body with no clothing, arms held out from the body at about 30 degrees, feet turned out to the sides with the toes pointing left and right, the whole doll in frame, centered, plain transparent background" plus the style line. Pip's line: "a small jointed wooden doll with a round peg-doll head and a simple painted face, simple wooden arms and small wooden feet". Purl's shelf pose (`purl-sit`) is a front-facing, sitting, head-up Purl made from `purl-cat`. Each doll's slot anchors (head dome box and band line, neck arc, body box with shoulder points and the arm angle, hand and foot boxes with toe direction, shoulder box) and its "over" polygons (ears, hands over sleeve ends) are placed by hand once in `tools/doll-fit.html` and stored in `tools/dolls.json`. Sweater charts leave the body at the dolls' 30° arm angle (their sleeve cast-on steps are set to it), checked on the doll sheet.
- **Nook decor has fixed spots.** The decor boxes are chosen in `bg-nook-land` before `bg-nook-port` is made, and the portrait edit prompt keeps the same spaces: the little bookshelf under the window, the photo frame on the wall between the lamp and the window, the string lights along the curtain rod, the fern beside the side table, and the rug on the floor round the basket spot, never reaching the chair. The boxes are stored in each nook's JSON with the window box. The decor is one imagegen2 sheet at room perspective (nook as reference). It's composited in code onto the nook before the knitting screen's blur and dim. The frame is painted empty; your newest gallery piece is drawn into its inner box in code.
- **Preview props are mostly reused:** the mug is `cmp-01`, the armchair a Pillow crop of `bg-nook-land`, the table `tex-wood`, the peg and shelf come from `gallery-props`. Only an open book and a teapot are new (one `props` sheet). Each scene's placement (box, and whether the piece goes under, round, over, flat, hanging or sitting) is in `tools/props.json`.
- **Comparison pictures (scarf):** all made with one prompt template: "<view>, standing upright on a flat ground line at the bottom edge, the whole subject in frame, centered, plain transparent background". The first one (the mug) is made first and passed as a reference to the rest. The code trims each to its bounding box and stands it on the ground line, scaled to its real height. **Views are picked to keep subjects narrow:** the double-decker bus front-on (about 2.5 m wide), the kitchen table end-on in three-quarter view, the Brachiosaurus three-quarter from the front with its neck up, the house gable-end-on; the rest side view. Each is generated in the canvas closest to its trimmed shape: 1024×1536 for tall ones, 1024×1024 for the oak and the house, 1536×1024 for the table. Shipped as trimmed webp with alpha, the long side up to 1024 px, so they stay sharp at 80% of a desktop or phone view. Only the two on screen and the next one are loaded.
- **Camera:** front-on to the work, which is lit by the lamp. The work fits its area, minus the basket slot, automatically (stitch cells from 8 to 28 CSS px). − and + zoom in steps (fit, 1.5×, 2×, 3×), always following the needle.
- **Resolution:** the layout is responsive HTML (menus, panels, buttons). The work area is drawn with two canvases (see Tech plan), sized to their box at `devicePixelRatio`. The nook is painted at 1536×1024 (landscape) and 1024×1536 (portrait) and cover-fit, with the basket spot stored per picture. Walls and the book page are tiling textures, so they fit any shape.
- **Fonts:** Fredoka (rounded, for UI) and Caveat (handwritten, for pattern wording and gallery tags), both under the SIL Open Font License, bundled.

## Audio direction

- **Music** (looping, instrumental, quiet under the ticks; loops and track changes crossfade over 3 to 4 s; streamed, not decoded whole, see Tech plan):
  - **Nook** (three tracks, 3 min each, same instrumentation, shuffled): warm fingerpicked acoustic guitar and soft felt piano, slow and cozy (book, cast on, knitting, Knitting Bag).
  - **Gallery** (2 min): a gentle music-box and celesta waltz. The Doll Shelf and dressing view share it (they're gallery tabs), so switching tabs never restarts the music.
  - **Scarf** (2.5 min): an easy-going folk walk, light brushed percussion, soft whistle melody.
- **Sound effects** (short, soft, never harsh; every clip has its leading silence trimmed in the browser at load):
  - stitch ticks: **one 2–3 s clip of about 6 separate soft wooden needle clicks**, sliced at load in `audio.js` by onset detection into 60–120 ms buffers with 5 ms fades (audiogen's shortest sound is 0.5 s, and there's no ffmpeg).
    - **Acceptance check** (when it's generated): `tools/tick-check.html`, opened with playwright-cli, runs the same slicer from `audio.js` on the clip and prints the onsets. Accept only with **6 or more clicks at least 150 ms apart, each falling below −40 dB within 120 ms**. Otherwise regenerate (up to 2 more tries), then merge the good clicks from 2–3 clips (the slicer takes several files).
    - **Fallback, written into `audio.js` from the start:** a synthesized wooden click (a 3 ms noise burst through a 2 kHz band-pass plus a sine at a random 1.8–2.5 kHz decaying over 40 ms). It's used whenever fewer than 4 slices load.
    - **Three families**, one per needle material: **wood** (`sfx-ticks`, above: all wooden needles, bamboo included), **metal** (`sfx-ticks-metal`) and **glass** (`sfx-ticks-glass`: glass and the acrylic candy-cane). Metal and glass ring longer, so their slices run up to 220 ms with a 30 ms fade, and the acceptance check for them is "below −40 dB within 200 ms" (`tick-check.html?family=metal`). Each family has its own code fallback, used when it has fewer than 4 slices: metal, a 4–6 kHz sine decaying over 120 ms with a 2 ms noise click; glass, two sines at 3–4.5 kHz (ratio 1.5) decaying over 150 ms. A family never falls back to another family's clip.
  - row turn: a soft fabric swish
  - yarn change: a gentle yarn pluck
  - cast on: a quick run of soft loops
  - rip back: a short unravelling zip (one press), and a seamless 2 s unravelling loop (`--loop`) while held
  - finish: a warm 2-second chime flourish
  - steam puff (blocking)
  - unlock: a sparkly chime (also every unlock toast)
  - row counter: a small, quiet brass clack, under the row swish
  - dressing a doll: a soft cloth rustle with a little pop
  - Purl's bell: a tiny cat-bell jingle, with her cheer when she wears it
  - the preview card's 10% glow is silent
  - display: a soft wooden peg *clunk*
  - card: a soft paper flip (fact cards, tips, take down, Basket)
  - scarf milestone: a bright ding with a soft whoosh
  - page turn (book chapters)
  - UI tap: a soft felt click
  - Purl: a short happy mew (with her cheer) and a soft purr as she settles after it
  - ambience: fireplace crackle loop, very quiet (nook screens)

## Asset list

Size notes: imagegen2 only accepts sizes of 655,360 to 8,294,400 pixels with a ratio of 3:1 or less, so every imagegen2 sprite is made at 1024×1024, 1536×1024 or 1024×1536 and downscaled or split with Pillow. nanogen uses its own ratios (1:1, 2:3, 3:2, 9:16…) at 1K or 2K.

| ID | What it is | Tool | Generated at → shipped | Transparent | Animation | Priority |
|---|---|---|---|---|---|---|
| bg-nook-land | Knitting nook (style anchor), landscape; empty floor patch for the basket, no yarn or basket | nanogen pro, 3:2, 2K | → 1536×1024 webp | no | code (snow, lamp flicker) | must |
| bg-nook-port | Same nook, portrait, from the anchor; same empty floor patch | nanogen (edit), 2:3, 2K | → 1024×1536 webp | no | — | must |
| ref-swatches | Look target, not shipped: close-ups of a stockinette, a 2×2 rib and a C4F cable swatch, in the style line | nanogen, 1:1, 1K, ×3 (ref: nook) | → kept in `tools/` for the stitch lab | no | — | must |
| tex-wood | Gallery wall: warm wood paneling, seamless tile, no pegs or objects | nanogen, 1:1, 1K (ref: nook) | → 512×512 webp, tiling | no | — | must |
| tex-paper | Pattern book page: cream paper, faint grid, seamless tile | nanogen, 1:1, 1K | → 512×512 webp, tiling | no | — | must |
| tex-fibre | Grey yarn-fibre texture, seamless tile (smooth) | nanogen, 1:1, 1K (ref: nook) | → 256×256 png | no | code (in stitch sprites) | must |
| tex-fibre-fuzzy | Fuzzier fibre tile for wool and mohair | nanogen, 1:1, 1K | → 256×256 png | no | code | should |
| yarn-set | 8 near-white yarn balls, one per yarn type, in a 4×2 grid. Also used, tinted, for every skein and recent-yarn button (~44 px) | imagegen2, 1536×1024 (ref: nook) | → 8 × 256×256 png | yes | code (tint, wobble, shrink, type effects) | must |
| basket | Empty wicker basket (Purl's bed), front three-quarter view, fitting the nook's floor. Also the basket button (both layers, small) | imagegen2, 1024×1024 (ref: nook) | → basket-back 512×512 png | yes | — | must |
| basket-front | The front wall and rim only, **cut from `basket` in Pillow** with `tools/basket-mask.json` (no generation) | code (Pillow) | → 512×512 png | yes | — | must |
| purl-cat | Purl: a small round cream cat with a cranberry ear tip, in a loaf pose (paws tucked), eyes closed, sized to sit in the basket | imagegen2, 1024×1024 (ref: nook, basket) | → 512×512 png | yes | — | must |
| purl-cheer | Keeps the loaf body; only head and paw move: head up with eyes open, paw raised, paw bat, settle. Frame 1 doubles as "waking up" and must match `purl-cat` (same baseline row, mean brightness within 3%, checked in Pillow) so the swap doesn't jump. Asleep she's the still `purl-cat`, breathing in code (no idle animation) | anim8gen (ref: purl-cat) | 4 frames → 512×512, same as purl-cat | yes | once 8 fps; mirrored in code per layout | must (code hop if it fails) |
| gallery-props | Sheet: a wooden peg, a short shelf, a small brass wall lamp | imagegen2, 1536×1024 (ref: tex-wood, nook) | → 3 png, split | yes | code (placed by layout) | must |
| cmp-01…20 | Comparison pictures, one template: mug, pencil, ruler, bowling pin, kitchen table (end-on, three-quarter), guitar, emperor penguin, grown-up, front door, basketball hoop, double-decker bus (front-on), giraffe, two-storey house (gable end), diving tower, Brachiosaurus (three-quarter front, neck up), oak tree, blue whale on its tail, Statue of Liberty, Leaning Tower of Pisa, coast redwood | imagegen2 medium, 1024×1536 (tall), 1024×1024 (oak, house) or 1536×1024 (table) (ref: cmp-01 and nook) | → trimmed webp with alpha, long side up to 1024 | yes | — | must (1–12), should (13–20) |
| fin-touches | Sheet: a pom-pom, a tassel and two buttons, near-white (tinted in code) | imagegen2, 1024×1024 | → 3 × 256×256 png | yes | code | should |
| doll-pip | Pip, the doll anchor: a small jointed wooden doll (round peg-doll head, simple painted face, simple wooden arms and feet), the doll template (front view, plain undyed body, arms out at 30°, feet turned out to the sides) | imagegen2, 1024×1536 (ref: nook) | → 512×768 webp + anchors in `dolls.json` | yes | code (worn pieces warped on) | must |
| doll-clementine, -bramble, -juniper, -basil, -mabel | Rag doll with yarn hair, plush bear, felt bunny, felt fox, wooden artist's mannequin; same template, ground line and head-height band | imagegen2, 1024×1536 (ref: doll-pip, nook) | → 512×768 webp + anchors | yes | — | must (Basil, Mabel: should) |
| purl-sit | Purl sitting up, facing front, head up, eyes open (her Doll Shelf pose, for hats and scarves) | imagegen2, 1024×1024 (ref: purl-cat) | → 512×512 png + neck anchor | yes | — | should |
| holders | Sheet: an empty ceramic yarn bowl, a canvas project bag and a teacup yarn bowl, in the basket's view and on its floor | imagegen2, 1536×1024 (ref: basket, nook) | → 3 × 256×256 png, split; rim ellipses in `holders.json` | yes | code (ball clipped by the rim) | must |
| decor | Sheet: a potted fern, a string of fairy lights, a braided oval rug, an empty picture frame, a little bookshelf with books, at room perspective | imagegen2, 1536×1024 (ref: nook) | → 5 png, split; boxes in each nook's JSON | yes | code (twinkle, photo in the frame) | must |
| props | Sheet: an open book, a plain teapot (preview scenes) | imagegen2, 1536×1024 (ref: nook, cmp-01) | → 2 png, split | yes | — | should |
| prop-armchair | The armchair, cropped from `bg-nook-land` (no generation) | code (Pillow) | → webp | no | — | should |
| app-icon | A cranberry yarn ball with crossed needles, square, safe margin | imagegen2, 1024×1024 (ref: a yarn-set ball tinted cranberry in code first) | → 1024×1024 png | no | — | must |
| favicon & icons | 32, 180, 192, 512, maskable 512 | code (Pillow, from app-icon) | png | — | — | must |
| social-card | 1200×630 from the title screen and a finished piece, screenshotted | code | jpg | no | — | must |
| title, needles, sky, gallery night, Someday silhouettes, book cover, ui | The title (built from the layers above), the 12 needles, stitch markers, row counters and their digits, Purl's collar, bell and cushion, scarf sky and ruler, moonlight overlay, simple silhouettes, locked silhouettes (dolls, Bag cards, Pip's preview silhouette), the doll icon, the doll shelf layout, worn-piece warp and shading, the preview card's frame and glow, the Knitting Bag's previews and thumbnails, the book's cloth cover, Purl's breathing, the fallback ticks, buttons, panels, ribbons, tips, toasts | code (CSS + canvas) | — | — | — | must |
| mus-nook-1, mus-nook-2, mus-nook-3 | Nook music | audiogen music | 180 s mp3 each | — | loop + shuffle | must, should, should |
| mus-gallery, mus-scarf | Gallery and scarf music | audiogen music | 120 s, 150 s mp3 | — | loop | should |
| sfx-ticks | About 6 separate soft wooden clicks with gaps, sliced at load; passes `tools/tick-check.html` (up to 3 tries, then merged clips, then the code click) | audiogen sfx | 2.5 s mp3 | — | — | must |
| sfx-row, sfx-yarn, sfx-caston, sfx-rip, sfx-finish, sfx-unlock, sfx-ui | As in Audio direction | audiogen sfx | 0.5 to 2 s mp3 | — | — | must |
| sfx-join (Change 2) | A soft wooden click and a short yarn pull: join in the round, the gather's cinch, the graft | audiogen sfx | about 0.6 s mp3 | — | — | should |
| sfx-ticks-metal, sfx-ticks-glass | About 6 separate metal / glass needle clicks with gaps, sliced at load; pass `tick-check.html` with the family limits (up to 3 tries each, then that family's code click) | audiogen sfx | 2.5 s mp3 | — | — | should |
| sfx-counter, sfx-dress, sfx-bell | As in Audio direction | audiogen sfx | 0.5 to 1 s mp3 | — | — | should |
| sfx-rip-loop | Unravelling, seamless | audiogen sfx `--loop` | 2 s mp3 | — | loop while held | must |
| sfx-steam, sfx-peg, sfx-card, sfx-milestone, sfx-page, sfx-mew | As in Audio direction | audiogen sfx | 0.5 to 2 s mp3 | — | — | should |
| sfx-purr | Purl's purr, as she settles after the cheer | audiogen sfx | 1.5 s mp3 | — | — | nice |
| amb-fire | Fireplace crackle | audiogen sfx `--loop` | 10 s mp3 | — | loop | nice |

## Tech plan

```
game/
  index.html  styles.css  manifest.webmanifest  sw.js  icons, social-card.jpg
  fonts/      Fredoka, Caveat + OFL.txt
  vendor/     gh-feedback.js, report.js
  src/
    main.js        boot, screen router, the debug hook
    state.js       the save (localStorage, throttled, try/catch), the unlockRules table, migrations
    scarfStore.js  the scarf's stitches in IndexedDB, in chunks
    patterns.js    the 47 patterns (source, repeat, wear, finishing, and the chart's three text layers)
    chart.js       chart parsing and helpers, stitch order, the row maps (the one stitch mapping), counts, the written-pattern generator and its parser
    stitches.js    stitch sprite cache (LRU) and cable span sprites
    work.js        the fabric window canvas, the view canvas, needles, strand, effects, the basket slot
    knit.js        the knitting screen: taps → stitches, rip back, yarn bar, tips
    yarn.js        palette, custom colors, recent yarns, yarn types, self-striping shades
    book.js  castOn.js  gallery.js  scarf.js  menu.js  bag.js (the Knitting Bag)
    dolls.js       Doll Shelf, dressing view, worn-piece baking and strip-warp, the preview card
    tube.js        (Change 2) the per-kind shape maps (dome, ring, sock, mitten, body) for worn, card, gallery and ghost
    patterns-flat-v1.json  (Change 2) the flat edition of the 19 patterns now knit in the round, for old saves
    audio.js       Web Audio: load, onset trim and tick slicing, voices, music shuffle and crossfade, mute
    input.js       pointer/keyboard/wheel → actions
tools/
  check-patterns.mjs   validates every chart, prints counts, --solve, contact sheet of previews
  stitch-lab.html      every stitch × yarn type × 3 zooms, plus swatches beside ref-swatches (built first)
  tick-check.html      runs audio.js's slicer on a tick clip (?family=wood|metal|glass) and prints the onsets (acceptance check)
  basket-mask.json     the front-rim polygon that cuts basket-front from basket
  holders.json         each holder's front-rim ellipse, ball centre and scale, ground line
  dolls.json           each doll's slot anchors and "over" polygons
  purl-anchors.json    the neck anchor for every Purl image and frame
  props.json           each preview scene's placement
  doll-fit.html        places dolls.json and purl-anchors.json by hand, over the sprites
  doll-sheet.html      every wearable on every doll it fits (one screenshot per doll), and every Purl image with collar and bell
  patterns.txt         all 47 written patterns, from check-patterns.mjs --text, for the knitting expert
  dump-flat-v1.mjs     (Change 2) writes patterns-flat-v1.json once, before the round editions land
  fixtures/            (Change 2) save-v1.json and save-v1-hashes.json, the migration replay's old save
```

**Build order:** the stitch lab and needle animation come first and must look like real knitting before any chart work starts. Then the charts and the checker, with the written patterns and their round trip. Then the **knitting-expert check**: a helper who knows knitting reads every chart's preview on the contact sheet, its `source` and `repeat`, and its written pattern and finishing in `tools/patterns.txt`. They check whole stitch repeats, RS and WS wording, decreases leaning the right way (k2tog right, ssk left), real shaping and finishing, and colorwork that reads as the object, and they fix every error before the play-test. Then the screens, then the Knitting Bag, the dolls and the preview card.

### Charts as data

Each pattern is `{id, name, chapter, technique, source, repeat, wear, parts, touch, finishing, slots: {A,B,…}, shape, stitch, color, cables}`.

- **source:** the named real stitch pattern or technique ("Old Shale (feather and fan), 18-st 4-row repeat").
- **repeat:** `{width, edges, rows, at}`. On row `at` (default 1, the cast-on), the stitch count minus `edges` must be a whole number of `width`-stitch repeats. `rows` is the repeat's height. The fill helpers lay the repeat whole and centred on that row. Shaped rows elsewhere keep the pattern aligned to it ("keeping pattern correct"), as real patterns do. Placed motifs and toys use the background stitch's repeat.
- **wear:** `{slot, fit}` (see "Needles, accessories and dolls"), or `null`.
- **parts:** the noun used for islands ("ear", "leg", "front", "point"; default "side").
- **touch:** the finishing touch drawn at bind-off (tassel, pom-pom, button eyes, buttons).
- **finishing:** the real finishing text (make a back, seam, stuff, pom-pom), printed at the end of the written pattern.
- (Change 2) **Round pieces** add `round: true`, `flat: [{from, to, first, cut}]` (flat ranges), `sections: [{from, label}]`, `needles: [{from, kind, len, n, counts}]`, `gauge`, `kind` (dome, ring, sock, mitten, body) and `edition` (2 for the 19 changed patterns). `chart.rsOf(r)` gives each row's side, and step rows carry `R.step` and `outCols`. See CHANGE_2.md C.

The chart: `shape`, `stitch` and `color` are **three fixed-width ASCII text layers, one character per cell, written top row first** (as a chart is read). They're reversed on load, so row 1 is the bottom.

- **shape:** `#` a stitch, `.` no stitch.
- **stitch** (how the cell looks from the front): `k` knit, `p` purl, `o` yarn-over, `<` k2tog, `>` ssk, `m` make one, `+` cast on (at the row's start, or across a gap to join), `b` bobble, `x` part of a cable. (Change 2) Also `s` slip (uses 1, makes 1, a tap) and `-` held (no tap; the stitch is carried up), and in round pieces only: `_` bound off here (not a tap), `u` picked up and knit, `v` a sleeve stitch joined from a written sleeve.
- **color:** `A`–`D`.
- **cables:** span records `{row, col, type}`, with type one of C2F, C2B, C4F, C4B, C6F, C6B. Every `x` cell must belong to exactly one span, on an RS row.

Helpers write most of the layers, so few cells are hand-typed: `fill(mask, texture)` (garter, stockinette, 1×1 and 2×2 rib, seed, moss, basketweave, broken rib), `motif(art, slot)` for colorwork from ASCII art, `shapeEdges(mask)` (places `<`, `>` and `m` where the outline steps by one; where it steps by 2 or more, it puts the bind-off or cast-on at the start of a row, so a step on both sides at once becomes two rows: the right edge on the RS row, the left edge on the next WS row, as in "BO 3 sts at beg of next 2 rows"), `repeat` and `mirror`.

**The row map: the one stitch mapping.** `chart.js` builds it once per pattern, and the checker, the renderer, the needle animation, rip back and saving all read it; nothing else works out which stitch comes from which. The rules below are for flat pieces. (Change 2) Round pieces use the round row map (CHANGE_2.md C.2): `.` is filler, cells take the row below's live stitches in ring order from the row's cut, nothing is taken across the round's start, and edges are 0. Steps (join, seam, set-up rounds, hold, joining round, gather, graft) are chart rows with one tap per entry and an `outCols` list (C.4).

- Every cell that isn't `.` makes **exactly one new live stitch**, at its own column. So the live stitches after row r are row r's cells, left to right.
- Each cell **uses** 0, 1 or 2 live stitches of row r−1: `<` and `>` use 2; `o`, `m` and `+` use 0 (they are new stitches); `k`, `p`, `b` and `x` use 1.
- **Row 1** works the cast-on: it may hold only `k` and `p`, and the cast-on makes one stitch per row-1 cell.
- A **run** is a maximal stretch of non-`.` cells in a row, columns a to b. For each run, left to right, its **block** is the not-yet-claimed live stitches of row r−1 whose columns lie in a to b, plus the one at column a−1 if the run's leftmost cell is `<` or `>`, plus the one at b+1 if its rightmost cell is `<` or `>`. A stitch belongs to at most one block. (`shapeEdges` always puts an edge decrease in the run's end cell, so this holds for every stepped outline.)
- The run's cells, **in column order (left to right)**, take the block's stitches in order, each taking as many as it uses. The block must be used up exactly; otherwise the checker reports the row and run.
- **Bound off:** every live stitch of row r−1 in no block. These are only ever beyond the ends of a run or under a `.` gap, because a stitch under a run's columns is always in its block. They take no tap. The chain is drawn at the top of row r−1.
- **Where bind-offs may be (real flat knitting):** beyond a run's end only at the **start of the row**: the right end on RS rows, the left end on WS rows ("BO 3 sts, k to end"). Elsewhere only **under a gap**, that is under `.` cells with run cells on both sides in row r ("k5, BO 3, k to end"). Anything else is a checker error (`shapeEdges` never makes one). In an island section each part is worked on its own, so each part's own start (its right end on RS, its left end on WS) counts as a row start. In knitting order, start-of-row bind-offs are chained off before the row's first tap (animated with it), and gap bind-offs right after the tap of the cell before the gap.
- **`+`** (cast on) is allowed only where the cell below is `.`, and only in two places: at the **start of the row** (the right end of a run on RS rows, the left end on WS rows: "CO 4 sts, k to end", for fins, tails and dolman sleeves), or **across a gap** between runs ("k4, turn, CO 2 sts, turn, k4": closing a thumb hole or a leg hole, joining the Octopus's legs). One-stitch growth at the other edge is an `m`.
- **Islands:** an island section is 2 or more consecutive rows with several runs that stay apart (two ears, four legs, a cardigan's two fronts). Each run has its own block. The written pattern words it as real patterns do: "Work each ear separately.", then each part's rows, the right part first (an RS row starts at the right): "Right ear: …", then "Left ear: rejoin yarn at the inner edge and …", or "work as right ear, reversing shapings" when the generator finds it's the mirror image. Islands that start at row 1 are cast on separately ("Cast on 3 sts for each leg"). The game still taps the rows straight across in one pass, row by row, drawing no strand across the gap, and the wording strip names the part being worked ("Left ear · Row 17 (RS): ssk, k2"). A one-row hole (a gap bind-off, then `+` across it on the next row) isn't an island: it's worded inline.
- A cell's taken stitches may sit at most 3 columns from it (old shale shifts up to 3); farther is a checker error, which catches a mis-drawn chart.
- `rowMap[r]` is a list in **knitting order** (RS right to left, WS left to right) of `{col, stitch, takes: [indices into row r−1's live stitches], boundOffAfter: [indices]}`. Knitting order reverses the walk; the mapping itself doesn't change. The needle animation slides each cell's `takes` off the left needle's tip (none for `o`, `m` and `+`, which wrap, lift or loop new yarn instead), and the left needle holds exactly the row r−1 stitches not yet taken or bound off.

`tools/check-patterns.mjs` builds every row map with `chart.js` (the same code the game runs) and checks (for round pieces with the loosened checks of CHANGE_2.md D (Change 2): no parts plan, bind-off and cast-on position or edge-lean checks on round rows; plus edges 0, step counts, live counts and needle fit) the layer widths, row 1, every block used up exactly, bind-offs only at the row's start (each part's own start in an island section) or under a gap, `+` only over `.` and only at the row's start or across a gap, the 3-column limit, RS-only cables, bobbles and yarn-overs, cable spans, slot names and counts, the repeat rule ((stitches on row `repeat.at` − `edges`) % `width` == 0), that `source`, `repeat` and `finishing` are set, and the written pattern's round trip. It prints every pattern's stitch count and renders **one contact sheet of all 47 previews**, which the build looks at to check each pattern looks like its object. `--solve` runs every chart's whole stitch order headlessly in node and checks it ends with zero errors and the right count. `--text` writes all 47 written patterns to `tools/patterns.txt`.

### The written pattern

The generator in `chart.js` turns a row map into a real written pattern in passes. Each pass can be tested on its own.

1. **Tokens per row:** each cell, in knitting order, becomes a token with its slot: `k`, `p`, `yo`, `k2tog`, `ssk`, `M1L`/`M1R` (by which side of the piece it leans to), `MB` (bobble), the cable's name on its first cell (`C4F`), `CO n` for a run of `+`, `BO n` for a group of bound-off stitches. On WS rows the knitter's action is used: k↔p, k2tog↔p2tog, ssk↔ssp, M1L/M1R purlwise.
2. **Periods with edges:** each row becomes edge stitches, the shortest repeating period, and edge stitches: "k2, *p2, k2; rep from * to end", "*k1, p1; rep from * to last st, k1". Colorwork tokens group into runs with their slot: "k3 A, k2 B" (slot letters only when the pattern has 2 or more slots). Rows that change the count end with it: "(14 sts)".
3. **Row ranges:** identical consecutive rows, and repeating blocks of rows, merge: "Rows 3–10: rep rows 1–2 four times", "Rep last 4 rows 5 times more". Island sections become "Work each ear separately:" blocks. The text starts with the name, the source, the yarns (the player's own once started, else the suggested ones), "Size: 24 sts × 30 rows, scaled down for the game" and "Cast on 24 sts in A". It ends with "Bind off all sts.", the finishing text and a key of only the abbreviations used.
4. **Round trip:** a parser in `chart.js` reads the text back (ranges → rows → periods → tokens), and the checker requires the rebuilt per-row tokens to equal pass 1's exactly, for all 47, or it fails and names the row.
5. **Tech-edit conventions** (after the pattern review, design/PATTERN_REVIEW.md): "bind off n sts" leaves one stitch on the right needle, which is the first stitch of the count that follows ("bind off 2 sts, p to end"; "p8, bind off 3 sts, p1"); a part's last stitches are "bind off rem n sts" or "fasten off". A cast-on at a row start goes onto the left needle and is then worked ("cast on 1 st, k2, M1R, k to end"); across a gap it is "turn, cast on n sts, turn". M1L/M1R lean outward: away from the stitch a pair of M1s surrounds (a peak), else toward the nearer edge; M1LP/M1RP lean the same way as seen from the RS. Parts are followed up the rows as a tree: a part that ends (a thumb, a tail) is bound off inside its own listing and the rest carries on without "Continue across all sts."; parts that split again (the whale's flukes) nest. After a split the part the yarn is at is listed first and the others say "(rejoin yarn at the inner edge, RS/WS facing)". "*…; rep" repeats only use the pattern's motif width (or a divisor of it for plain textures) starting on a motif boundary; other runs use brackets ("[yo, k1] 6 times"). Ribbed tops end "Bind off loosely in rib.", one last stitch "Fasten off.", counts say "(1 st)", repeat tails "to last st". Patterns can add `notes` (intarsia bobbins, MB in a contrast, duplicate stitch), `parts`/`partLabels` names and a `drape` (see below).
6. **Drape:** a chevron or Old Shale pattern sets `drape: {type: 'auto', amplitude, shape}` (or `{type: 'wave', period, amplitude, phase}`); `chart.js` `drapeOf()` turns it into a per-column vertical offset (peaks at the yarn-over groups, valleys at the decreases) and `work.js` draws every stitch, the cast-on edge and the bind-off with it, so stripes zigzag and edges scallop. On the needles the offset is 0 and it reaches full depth 3 rows below; finished pieces, previews and worn pieces get the full wave, as does the ghost outline.

The "Read the pattern" sheet shows pass 3's text. The wording strip shows pass 2's line for the current row (with the part's name in an island section). Flat pieces say "Row n (RS)" or "(WS)", never "Rnd". (Change 2) Round pieces say "Rnd n" for rounds (merged as "Rnds a–b"), "Row n (RS/WS)" in their flat sections, and their step lines, under section headers; every pattern adds Yarn (weight), Needles and Gauge lines, and keeps "Size: …, scaled down for the game."

### Stitch order and drawing

- Row r (counted from 1 at the bottom) goes right to left when r is odd (RS) and left to right when even (WS), skipping `.` cells: the order of `rowMap[r]`. (Change 2) In round pieces, rounds always go right to left (from column W−1, just after the marker), and `Fabric.xy` uses a row → y table so zero-height steps take no height. The "next stitch" is one index into the whole piece's order, so taps, rip back and saving are all simple counters.
- **Two canvases:** an offscreen **fabric canvas** and the visible **view canvas**. The view canvas is redrawn on each animated frame as background + fabric (with the turn's squash transform) + needles, live loops, strand, basket slot and effects. When nothing is animating, this heavy loop sleeps.
- **The fabric canvas is a window, never the whole piece** (patterns and scarf alike). It covers the part of the work the view shows, plus a margin of 8 rows below and 4 columns each side (clamped to the piece), anchored so the needle row is at its top. When the view's box leaves the window (the needle moves on at zoom, a new row starts on the scarf, zoom or resize), the window moves to the new spot and is **re-stamped from the stitch data**: only the rows and columns inside it, about 200 to 1,600 sprites, a few milliseconds. Its backing size is the window in CSS px × `devicePixelRatio`, **capped at 4096 device px per side and 8 MP in area**; past the cap, the backing scale drops (the view draws it scaled up slightly) instead of the canvas growing. Example: the scarf at 3× zoom (84 px cells) on a 390×844 phone at dpr 3 is a window of 12 columns × 16 rows, about 3,000×2,900 device px: just over 8 MP, so it's drawn at a backing scale of about 2.9 instead of 3, whatever the scarf's length. `state().fabricCanvas` reports its size.
- **Draw order:** rows bottom to top, so each sprite (about 1.4 cells tall) tucks its loops under the row above. Yarn-over holes are cut last with `destination-out`.
- **Stamping and ripping redraw a small band, not one sprite.** For any stitch knit or ripped at (row r, column c): clip to the cells of columns c−2 to c+2 (widened to a whole cable span if c is in one) and rows r−1 to r+1, clear the clip, redraw every knit stitch that overlaps it from the data, rows r−2 to r+1 bottom to top, then re-cut the yarn-over holes inside it. That's at most about 20 sprites, so a ripped stitch leaves no trace and a hole stays open under a row stamped later.
- **Cables are drawn per stitch:** each `x` cell gets a cable-piece sprite keyed by (cable type, its position in the span, front or back strand, yarn type, color, cell px), reaching about half a row down. A span draws its back-strand pieces first, then its front pieces with a shadow under them. So a cable shows every stitch's own yarn, even with a color change mid-cable, and appears stitch by stitch as its cells are knit.
- **Sprite cache:** the key is (stitch type or cable piece, yarn type, color quantized to 16 shades for self-striping, integer cell device px), in an LRU of about 600 canvases. Sparkle twinkles, the glow and the mohair halo are drawn on the effects layer, not baked into sprites, so the cache stays bounded (iOS limits total canvas memory).
- **WS rows:** the wording generator flips k↔p, k2tog↔p2tog and ssk↔ssp. The needle animation is mirrored. The cells look the same, because they always show the front.
- (Change 2) **The turning tube:** round pieces are drawn by projecting the flat fabric canvas (windowed over all columns) as column strips per band of rows, with the front moving left to right, the needle tip travelling over the front and the tube turning in eased steps every 4–6 sts on a circular or once per DPN, a beginning-of-round marker charm, the jog at the back, and an end-of-round beat instead of the turn. Cables get a raised relief pass from a cable-column mask. See CHANGE_2.md B and F.

### Saving

- **Main save:** `localStorage` key `knitknack`. It holds settings, unlocks, the gallery, the Basket, recent and custom colors, and every piece in progress. Per stitch: **two bytes** (a Uint16), an index into the piece's yarn table (color + type, deduplicated, up to 65,535 yarns), saved as base64, so even 1,600 stitches is about 4.3 KB. (One byte would cap a piece at 256 yarns: 30 swatches × 8 types is already 240, before custom colors.)
- (Change 2) **Editions:** every piece and gallery record has an `ed` (its pattern's edition). `migrate()` stamps `ed: 1` on records saved before Change 2, and `chartOf(pattern, ed)` builds edition 1 of the 19 changed patterns from `patterns-flat-v1.json`, so old pieces bake, wear and finish flat exactly as knit, and "Knit again" starts the round edition. See CHANGE_2.md G.
- **Unlock counters and choices** (in the main save): `lifetimeStitches` (knit taps only, never decremented: rip back doesn't subtract, and a re-knit stitch counts again), `piecesFinished` (Knit again included), `seenUnlocks: []` (ids whose toast has shown), `bagSeen: []` (ids seen in the Bag, for its "new" badge), `equipped: {needles, marker, counter, holder, decor: [], purl: []}`, `outfits: {dollId: {slot: galleryId}}` and `lastDoll`. Unlocks themselves aren't stored: they're worked out from the counts. A save from before these fields gets `lifetimeStitches` = every stitch in its gallery, pieces and scarf, and `piecesFinished` = its gallery count.
- **The scarf:** IndexedDB database `knitknack-scarf`. Its stitches are stored in chunks of 1,200 (1 m), two bytes per stitch (a Uint16 index into the scarf's own yarn table, stored alongside), plus a run list of stitch-pattern changes by row. Only the current chunk is rewritten on save, so the scarf can grow without limit (100 m is about 240 KB).
- **When:** at most every 2 s while knitting, at the end of each row, on leaving a screen and on `visibilitychange`/`pagehide`. Every save is in try/catch, with the gentle notice on failure.
- **Ids:** a piece in progress is `w-<patternId>` (one per pattern). Finishing copies it to the gallery under its own id `g<serial>` (`g1`, `g2`…), so "Knit again" starts a fresh `w-` piece and never makes an id ambiguous.
- **Zoomed out:** the "How long is it?" view draws the scarf as a strip with one averaged color per row (a 1-px-wide image, built once from the chunks and extended as rows are added). Full-detail strips of 50 rows are drawn only near the needles, with at most about 20 cached.

### Unlocks

- **`unlockRules`** in `state.js` is one table of `{id, kind, rule}` for yarns, scarf stitch patterns, needles, accessories and dolls. A rule is one of `{stitches: n}`, `{pieces: n}`, `{chapter: n}` (that chapter's ribbon), `{pattern: id}`, `{scarfCm: n}`, `{firstWearable: true}`, `{allPatterns: true}` or `{any: [rules]}` (Glow yarn). Patterns keep their own rule (pieces finished, in book order).
- `isUnlocked(id)` checks the rule against the counts, the gallery and the ribbons. The table is checked after every finish, at every row end (patterns and scarf) and after `addStitches`. Any id that is now unlocked and not in `seenUnlocks` queues its toast, and joins `seenUnlocks` when the toast shows. So each toast shows exactly once, even across a reload.
- Every rule is reachable by ordinary play: stitches and pieces always grow, every chapter can be finished, and the scarf never ends.

### Dolls and the preview card

- **Worn pieces are baked, then strip-warped.** Canvas 2D has only affine transforms (no mesh warp), and every piece is already a front-view silhouette, so a gentle bend is enough:
  1. **Bake** the piece once from its stitch data to a flat offscreen canvas, keeping its silhouette, at one cell size per view: 6 device px on the shelf, and on the dressing view the shown cell size × dpr, rounded up and capped at 12. Baking uses its own throwaway sprite map, so it never evicts the knitting screen's sprite cache.
  2. **Warp by slicing:** for head, neck and shoulders, one `drawImage` per row strip, with a per-row width scale and x/y offset from the slot's curve (*dome* bows the brim round the head, *band* curves round it, *drape* bends the shawl down like a smile, *hang* bends the top rows along the neck arc and lets the rest hang). For hands, feet and body, vertical column slices give a slight barrel. Pairs are mirrored for the other side.
  3. **Shade:** a code gradient (curvature plus a contact shadow) multiplied over it.
  4. **Over:** the doll's "over" polygons (ears, hands) are redrawn from the doll sprite on top.
  The result is cached per (gallery id, doll, slot, cell size) in its own LRU of about 60 canvases, separate from the stitch sprite cache, and rebuilt when the outfit changes. The Infinite Scarf on a doll reads only its first 2 chunks (2 m).
- (Change 2) **Round pieces** (edition 2) are not strip-warped from a front view. tube.js maps each stitch through its kind's shape map (dome, ring, sock, mitten, body) to a back half, drawn first and darkened, behind the doll, and a front half over it, both sliced from the same flat bake. The sock bends at the heel, the mitten's thumb sits at the side, and the Yoke Sweater's sleeves come from a virtual sleeve chart. The preview card, the ghost and the gallery peg (a hat hangs by its gathered top) use the same maps. Edition-1 pieces keep the fits above. See CHANGE_2.md E.
- **The preview card** keeps its own small flat canvas (about 3 device px cells), built from the data on entering a piece. Each tap stamps only the new stitch, and rip back clears and restamps its small band, as on the work. The warped card (at most 40 strip `drawImage`s, plus the doll or prop and the shading) is redrawn at most once per animation frame, and only while the heavy loop is awake. The tap path itself only stamps.

### Input, audio and the rest

- **Input:** every `pointerdown` on the knitting screen that isn't on a button knits, right away (never waiting for a frame). Every pointer counts. Exceptions, all in `input.js`:
  - **Sheets:** while a picker or the glossary is open, a `pointerdown` outside it closes it and is consumed (no stitch). Knit keys do nothing until it closes (Escape or the sheet's own button).
  - **Yarn-bar buttons, the preview card and toasts** act on `pointerup`, only if the pointer moved under 10 px, and ignore a press that started within 250 ms of a knit `pointerdown`. The enlarged preview card is a sheet.
  - **Keys:** on the knitting screen a document-level `keydown` listener (capture phase) takes Space, Enter and K: `preventDefault`, then knit, so a focused button never fires from them. Buttons are blurred after every pointer click, and the focus ring shows only for keyboard focus (`:focus-visible`); keyboard players reach every button through its shortcut. Text fields (rename, RESET) and other screens get Space and Enter as normal. There's no pinch: on touch, zoom is the − and + buttons. On desktop the wheel and trackpad pinch (Ctrl+wheel, with `preventDefault`) zoom too. Keys are as in Controls, and `keydown` with `repeat` is ignored unless Hold to knit is on. Rip back holds start after 400 ms and run at 5 a second.
- **Audio:** Web Audio, started on the title's first tap. Sound effects are decoded at boot (all short, about 2 MB decoded); every clip has its leading silence trimmed by onset detection, and each tick clip (`sfx-ticks`, `-metal`, `-glass`) is sliced into its clicks (or that family's code click is used, see Audio direction). The equipped needles pick the family. At most 3 tick voices play at once, through a gentle limiter. The rip loop plays only while Rip back is held. **Music is never decoded whole** (five tracks would be about 270 MB of PCM on a phone): each track plays from an `<audio>` element through a `MediaElementAudioSourceNode` and its own gain node. Two elements alternate, so a loop or a track change starts the next one 3.5 s early and crossfades the gains over 3 to 4 s. Music starts after the first tap. The nook tracks shuffle. Mute is remembered.
- **Feedback:** gh-feedback and report.js as feedback.md says, `visibility: 'on'`, key `knitknack`. The state it sends is the screen, the pattern id, the row and stitch and the current yarn. "Report a bug" sits in the menu and settings. Shown once the game is published to a public repo.
- **Install and offline:** a manifest and a service worker that caches every file, versioned per build. It answers `Range` requests for the music from the cached file with a 206 slice, because Safari's `<audio>` needs them.
- **Debug hook (`window.__game`)**, shaped as web-target.md specifies:
  - `state()`: screen, open sheet, pattern, piece id, row, stitch index, yarn, Follow chart or Freestyle, recent yarns, unlocked patterns and yarns, the pieces in progress and the gallery ids, scarf length, zoom, `cellPx` (CSS px), `fabricCanvas: {w, h}` (device px), `lifetimeStitches`, `piecesFinished`, `unlocked: {needles, accessories, dolls}`, `equipped`, `outfits`, the toast queue and `previewCard: {doll, visible, rect}` (its rect, to check it stays outside the fit box).
  - `frames()`: the frame log, `[screen, frames]` pairs, one per change, at most 200, from `logFrame()` exactly as in web-target.md. A tiny **always-on** `requestAnimationFrame` callback calls `logFrame()` every frame with the visible screens (the ids of `[data-screen]:not([hidden])` plus any open sheet, joined with `>`), so HTML screens are logged and the count stays near 60 a second while the heavy redraw sleeps. It does nothing else.
  - `audioState()`: `{context: audioCtx?.state, musicMuted, sfxMuted}`, exactly as web-target.md specifies.
  - `knit(n, {fast})`: n taps through the real tap path. With `fast: true` there's no animation or sound and one save at the end.
  - `addStitches(n)`: adds n to `lifetimeStitches` through the same counter path as a tap and runs the unlock rules (no fabric changes).
  - `dress(dollId, galleryId)`, `equip(kind, id)` and `writtenPattern(id)` (pass 3's text).
  - `rip(n)`, `finish()` (knits to the end and returns the new gallery id), `unlockAll()` (patterns, yarns, needles, accessories and dolls), `setYarn(slot, color, type)`, `freestyle(color, type)`, `go(screen, arg)` (including `bag`, `dolls` and `dress`), `resetSave()`.
  - `failSaves(on)`: while on, every save throws as if storage were full, so the gentle notice and the retry can be checked.
  - `piece(id)`: the stitch → yarn array and a hash, for a `w-` piece in progress or a `g` gallery copy, so "exactly as knit" is checked by comparing hashes.
  - `scarfAddRows(n, yarn, pattern)`: adds scarf rows through the same data path without animation, and fires milestones, facts and unlocks.
- **Play-test "solutions":** for each pattern, cast on and knit every stitch with `knit(n, {fast: true})` in a few chunks, with yarn changes (slot, recent and basket) and rip backs in between. Then finish, display, and check that `piece(<the id finish() returned>)`'s hash matches the `w-` piece's hash taken before finishing. One run also freestyles 300 distinct yarns (custom colors × types) into the scarf and a pattern, reloads, and checks every stitch's yarn survived. Another run walks the unlocks in order with `addStitches` and `finish()`, checks each toast appears exactly once (also after a reload) and that each equipped thing shows in play, then dresses every wearable on every doll it fits with `dress()`. Run `check-patterns.mjs --solve` first.

## Cut list

In this order, only if the budget or a problem demands it. Never cut: the tapping, the 47 patterns with their written patterns, the yarn and color choices, the gallery, the scarf, the 12 needles, the accessories, the Knitting Bag, the preview card, and the Doll Shelf with at least Pip, Clementine, Bramble, Juniper and Purl.

1. Purl's sounds, then the fireplace ambience, then `sfx-bell` (the bell stays silent)
2. The third, then the second nook track (one loops, with crossfades)
3. The scarf's comparison pictures from 13 onward (drawn as code silhouettes, like the "Someday…" ones)
4. tex-fibre-fuzzy (wool and mohair use tex-fibre with more code fuzz)
5. The `props` sheet (bookmarks and the tea cosy show on the wooden table)
6. Purl's cheer animation (a code hop with a head tilt instead; she already breathes in code)
7. Basil and Mabel (their unlocks are dropped; the shelf keeps five)
8. The metal and glass tick clips (their code clicks play)
9. The gallery and scarf music (the nook tracks play everywhere)

## Effort and cost estimate

A forecast, not a promise.

- **Effort:** the stitch renderer and needle animation (the riskiest piece: it has to look like real knitting, in 8 yarn types, at many sizes, and be fast; built first in the stitch lab); 47 charts written with the helpers and checked through their row maps (the biggest piece of work: each must read as its object and use its real technique); the written-pattern generator with its round trip, and the knitting-expert pass over all 47; 14 screens in three layouts (with the Knitting Bag, the Doll Shelf and the dressing view); the worn-piece bake and warp, the preview card and the unlock rules; about 49 generated pictures (2 nook backgrounds, 3 look-target swatches, 4 textures, the yarn-ball sheet, the basket (its front wall is cut in Pillow), Purl and 4 cheer frames, `purl-sit`, 6 dolls, the gallery props, holders, decor and props sheets, 20 comparison pictures, the finishing-touch sheet and the app icon); 5 songs and 22 sounds (each tick clip with up to 2 retries); about 60 checked facts (20 comparisons and about 40 knitting facts).
- **Cost** (nanogen about 2–24¢ an image, imagegen2 about 5–20¢ depending on quality, music about $0.30 a minute, sounds about $0.12 each). The real imagegen2 price is set from the first image's token usage, and the estimate is updated then.

| Item | Estimate |
|---|---|
| Mock pictures for the shared design (already spent; the nook anchor and some sprites become real assets) | $0.51 |
| Nook backgrounds and 4 textures | $1.00 |
| 3 look-target swatches (nanogen) | $0.30 |
| Yarn balls, basket, Purl, gallery props, finishing touches, app icon | $1.35 |
| Purl's cheer (4 frames at 512, about 2 retries each) | $1.50 |
| 20 comparison pictures at medium quality, with retries | $2.50 |
| 6 dolls at 1024×1536 (Pip with up to 3 tries, the rest with 1 retry each) and `purl-sit` | $2.50 |
| Holders, decor and props sheets, with a retry each | $1.00 |
| Music: 3 × 3 min + 2 min + 2.5 min | $4.05 |
| 22 sounds, with a few retries (2 more for each tick clip) | $3.60 |
| sfx-join (Change 2) | $0.25 |
| **Total** | **about $18 of the $50** (the $0.51 already spent included), leaving about $32 for retries and anything the play-test finds missing |

## Definition of done

- [ ] The stitch lab shows every stitch × yarn type × 3 zooms and the stockinette, rib, seed, cable and lace swatches looking like real knitted fabric, side by side with the look-target swatches and sitting with them, before chart work starts. Ripping a stitch next to a yarn-over and a cable leaves no trace, and a cable with a color change mid-span shows each stitch's yarn.
- [ ] (Change 2) Change 2's own definition of done (CHANGE_2.md K) is met: the round pieces, steps, tube, migration replay, and screenshots of a hat, a sock and a mitten on the dolls.
- [ ] `check-patterns.mjs --solve` passes for all 47 patterns (flat pieces: every row map's blocks used up exactly, bind-offs only at the row's start or under a gap, `+` only over `.` at the row's start or across a gap, RS-only cables, bobbles and lace, whole repeats on the `repeat.at` row, `source` and `finishing` set, and the written pattern's round trip), including the Octopus's legs and the Cardigan's two fronts; round pieces (Change 2): CHANGE_2.md D's checks, including the Fingerless Mitts' thumb hole, the Dog Sweater's leg openings, every step and needle fit. The contact sheet shows each one as its object.
- [ ] The knitting expert has read all 47 previews, sources and written patterns (`tools/patterns.txt`) with their finishing, and every error they found is fixed, before the play-test.
- [ ] "Read the pattern" opens on every card and on Cast On. Its text is the generator's: cast on, every row in standard abbreviations, WS rows worded for the WS, edge bind-offs and cast-ons at row starts, "work each ___ separately" for islands, "Bind off all sts", the finishing and the key. The wording strip matches it row by row.
- [ ] Starts with no errors at desktop (1280×800, 1920×1080) and phone sizes (390×844 portrait, 844×390 landscape). Screenshots at 844×390 of a chapter 7 piece and of the scarf show the landscape layout with cells of 8 px or more.
- [ ] First launch goes title → Garter Dishcloth, already cast on, in one tap. Each contextual tip appears once.
- [ ] Every one of the 47 patterns can be cast on, knit to the last stitch, finished and displayed. The gallery shows each exactly as knit (the `piece(id)` hashes match).
- [ ] Before each tap the needle tip rests at the next loop, and the view follows so the stitch just made is always on screen (checked at 3× zoom on a WS row and across an island gap).
- [ ] One tap = one stitch, by mouse, touch (several fingers at once) and keyboard. Every non-button part of the knitting screen knits, the wording strip included. Holding a key does nothing unless Hold to knit is on. The browser never zooms on fast taps. After clicking Rip back, mute or a skein, Space and Enter still knit. With a sheet open, a tap outside closes it and knits nothing. Drumming that slides onto the yarn bar doesn't switch yarn, and a yarn change shows its Undo chip. In landscape (844×390) every yarn button is visible without scrolling. Tapping the preview card or a toast never knits, and drumming that slides onto them does nothing.
- [ ] The stitches look like real knitting: knit, purl, rib, seed, cables, eyelets, bobbles, increases, decreases and colorwork are recognizable in screenshots. Each of the 8 yarn types looks different, and colors match what was picked (cream stays cream, navy stays navy), on the fabric and on the ball.
- [ ] Pattern wording is right on both sides: garter's WS rows read "k to end", rib's WS rows swap k and p, and no flat piece says "Rnd". (Change 2) Round pieces say "Rnd", never invert, and read garter in the round as purl and knit rounds.
- [ ] Yarn and color can be changed on any stitch, in Follow chart (slot skeins) and in Freestyle (recent yarns, basket), and the finished piece shows every change.
- [ ] Rip back works down to the first stitch (one zip per press, the loop sound while held), and a piece in progress resumes exactly where it was after a reload.
- [ ] Unlocks: 3 to start, one per piece finished (Knit again counts), all 47 reachable, and each locked card shows its real count. "Book complete" shows once, when the last of the 47 patterns is first finished. Yarn unlocks happen when the design says (Glow by either path).
- [ ] Needles, accessories and dolls: the Knitting Bag shows all 12 needles and every accessory with the exact amount left. Each unlock toasts exactly once (also after a reload), and "Use it" equips it. Every unlock is reachable in play. Each equipped thing shows in play: the needles' look and tick family, markers at the repeats, the counter ticking each row, the ball in its holder beside Purl's basket, the decor in its spots in both nook orientations, and Purl's collar, bell and cushion in every Purl image.
- [ ] The preview card sits in its slot in all three layouts, outside the fit box (`state().previewCard.rect`), fills in as you knit, shows wearables on a doll (Pip's silhouette before Pip) and everything else in its scene, and enlarges on tap.
- [ ] Dolls: `tools/doll-sheet.html` shows every wearable on every doll it fits, and each looks worn (socks on turned-out feet, sleeves along the arms, ears and hands over the pieces). At 390×844 a dressed doll in the dressing view shows recognizable knit Vs. The shelf pages 3 dolls at a time on a phone. "Put it on a doll" works from the Finished screen. A piece taken down stays on its doll, and the scarf on a doll shows "+ … m more".
- [ ] "Display it" hangs the piece on a peg. "Not now" and "Take down" put it in the Basket, and it can be hung from there.
- [ ] The Infinite Scarf grows 1 cm a row. Its comparisons, facts, stat cards and "Someday…" goals appear at the right lengths (checked with `scarfAddRows`). "How long is it?" shows the scarf upright beside the last and next comparison at one scale and rescales smoothly. A scarf of 100,000 stitches still saves, loads and zooms out smoothly, and knits and draws at 3× zoom at 390×844 with dpr 3, with `state().fabricCanvas` never over 4096 px a side or 8 MP (patterns too, the Heirloom Afghan at 3× included). On a phone, the bus, table and Brachiosaurus fit beside the scarf, sharp.
- [ ] The game can always go on, even when played wrong ("No soft-locks" in review-roles.md).
- [ ] Every control works on every targeted platform.
- [ ] Every screen looks finished at every targeted size, from the first load. On the title, the basket with Purl and the holder with the yarn ball sit on the nook's floor spot in both orientations. On the knitting screen they sit in the basket slot in all three layouts, clear of the work at fit zoom, with the strand reaching from the ball to the needle and Purl's paw toward the work.
- [ ] Music and sound play (after the first tap or key; `audioState()` shows the context running), no more than 3 ticks overlap, the nook tracks shuffle with crossfades (also offline), and mute works. Each tick family (wood, metal, glass) passed `tick-check.html` with its limits, or that family's code click is in use.
- [ ] `frames()` logs every screen, HTML ones included (frames near 60 a second on a still knitting screen), and shows no flashes.
- [ ] Progress is saved and restored (the unlock counts, equipped things and outfits too), a piece with 300 distinct yarns reloads exactly, and a failed save (`failSaves(true)`) shows the gentle notice instead of losing anything, then saves once turned off.
- [ ] "Report a bug" works as feedback.md's play-test says (once a repo is set).
- [ ] Installs as an app and works offline.
