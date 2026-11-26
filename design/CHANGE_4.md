# Change 4: a roomier landscape room, and the Infinite Scarf on the wall

From request 9 (two of its three changes; 9b, the plush close-up, is separate):

- 9a: "repaint the cozy room's landscape picture with more space between the shelves so dolls up top are bigger"
- 9c: "let the infinite scarf hang in the cozy room, growing across the wall as it gets longer"

Builds on CHANGE_3.md (the room). Don't touch render.js or plush.js (9b's helper is working on them).

## 9a: the landscape room, with roomier shelves

**Today:** in room-land the shelf lines sit at y 0.152 and 0.304 (a gap of 156 art px). Each has scale 0.125, and the top doll's ears reach y 0.01. At 844×390 the room box is about 507×338, so a doll on the top shelf is 0.125 × 338 ≈ 42–48 px tall. The target is at least 56.

**Target:** both shelves get scale **0.17**: 57 px at 844×390, about 95 px at 1280×800 (1.36× today). The tallest doll (Juniper, 1.14 ru) clears the picture's top by 0.04.

The free wall between the window recess (x 0.40) and the armchair back (x 0.66) only just takes two 2.5 ru shelves at that scale. Moving the chair would mean repainting the floor and rug, so the chair stays where it is and the shelves are staggered:

| room-land.json | Now | New |
|---|---|---|
| `shelf-top.line`, `scale` | [0.4557,0.1523]→[0.6641,0.1523], 0.125 | **[0.43,0.235]→[0.69,0.235], 0.17** (399 px; ideal 435, −8%) |
| `shelf-low.line`, `scale` | [0.4557,0.3037]→[0.6641,0.3037], 0.125 | **[0.41,0.455]→[0.655,0.455], 0.17** (376 px, −13.5%; headroom 0.455 − 1.15×0.17 = 0.26, just under the top board's lip) |
| `frame-hook.box` | [0.362,0.191,0.068,0.103] (it would now overlap the top shelf's left end) | **[0.445,0.515,0.06,0.09]**: under the low shelf, behind the floor-back things |
| `fronts.shelf-top/-low` polygons | the old lips | the new lips (board x 0.415–0.70 and 0.40–0.665, lip about 0.02 tall), re-cut |
| new `fronts.chair-back`, `fronts.pegs` (each with `layer: "wall"`) | — | the armchair's back and right side, and the peg knobs, cut from the picture and drawn over the scarf (9c) |
| new `surfaces.scarf-pegs` | — | see 9c |
| everything else (seat, chair, arms, drapes, rug, floor-back, garland-hook) | | unchanged, to the pixel |

Capacities, `maxH` and save positions (`t` in ru) don't change, so no save is rewritten. The shelves just draw bigger.

**The sconce** moves from x 0.735, y 0.13–0.25 to **x 0.715–0.745, y 0.09–0.20**, between the top shelf's end and the pegs. **9c's wall** is then **x 0.765–0.995, y 0.06–0.33** above the armchair back (353×276 art px, about 117×91 CSS px at 844×390 and 193×150 at 1280×800), plus the strip right of the chair (x 0.91–0.995) down to the skirting.

**room-port needs the change too.** Its shelves (x 0.44–0.97) and the sconce fill the wall above the chair, so there's no room for the scarf. Its shelf scale (0.117, about 58 px at 390×844) is already fine. The shelves get **shortened** and keep their height:

- `shelf-top.line` becomes [0.445,0.1623]→[0.785,0.1623] (348 px; ideal 384, −9%), and `shelf-low.line` becomes [0.445,0.348]→[0.785,0.348]. The boards run x 0.43–0.80.
- The sconce stays where it is.
- The front polygons for both lips are cut back to x 0.80, and new `chair-back`, `pegs` and `scarf-pegs` are added.
- **The scarf's wall in portrait:** x 0.81–0.995, y 0.03–0.385 (189×466 art px, about 72×178 CSS px at 390×844).

### How it's made: edit, don't regenerate

Last time nanogen ignored numeric shelf positions (CHANGE_3's t3 edit asked for 1/5 and got 0.15). So the shelves are placed **in Pillow**, to the pixel, and only the wall behind them is repainted. The rest of each picture stays **byte-identical**. New script: `tools/room-recompose.py`. Its steps:

1. **Clear the wall (nanogen pro, edit mode).** Run `node generate.cjs --model pro --image game/assets/bg/room-land.webp --aspect 3:2 --size 2K --output .gamegen/candidates/room4/land-clear-tN.png` with this prompt:
   > Edit this picture. Remove the two empty wooden wall shelves (their boards and brackets) and the small brass wall sconce, and paint plain bare cream wall where they were, continuing the wall's soft warm gradient and gouache brushwork. Change nothing else: the window, curtains, window seat and its two cushions, armchair, rug, floor, skirting board, light, colours and painting style stay exactly as they are. Add nothing: no shelves, lamp, pictures, hooks, plants, toys or text. cozy hand-painted storybook illustration, soft gouache texture, palette of cream, cranberry red, sage green, honey gold and deep plum night blue, no text

   For room-port: the same call on room-port.webp with `--aspect 4:5`. Its prompt removes **only the two shelves** and says "keep the brass wall sconce exactly where it is". The result is resized to 1024×1313; only its wall area is used.
2. **Paste back only the wall.** A mask covers the old shelves, sconce and glow:
   - land: x 0.27–0.80, y 0–0.50, minus the window recess and the chair;
   - port: x 0.42–1.0, y 0.10–0.39, minus the sconce.

   The mask is feathered 24 px, and the patch's mean colour is matched to a 30 px ring around it. Outside the mask the original pixels stay.
3. **Re-place the shelves and the sconce.**
   - Shelves: cut the old top board with its brackets (RGBA polygon) from the original. Stretch only the plank between the brackets to the new length and paste it at the new y. Add a soft shadow below (plum, 25%, 6 px down, 8 px blur).
   - Sconce (land): cut the old sconce and paste it at the new spot. Then re-add its glow: a radial screen-blend, radius 0.14 h, honey #ffd98a, peak alpha 0.35. Tune it until the wall brightness 40 px from the lamp is within ±4 levels of today's.
4. **Pegs (imagegen2, gpt-image-2.6-flare).** One sheet: `--size 1536x1024 --quality medium --background transparent --image game/assets/bg/room-land.webp --image game/assets/items/room-table.png`, with this prompt:
   > A short wooden Shaker peg rail for a wall: a plain honey-brown wooden board with three round turned wooden pegs evenly spaced, seen straight on from the front, mounted flat (no wall drawn). Separately to its right, a two-peg version of the same rail. Same hand-painted storybook gouache style, soft brown outlines and warm light as the reference room. Isolated on a transparent background, no shadows, nothing hanging on it, no scarf, no text.

   Split the sheet in Pillow. Then paste the pegs into each picture:
   - land: 3 pegs on a rail at x 0.77–0.98, pegs at x 0.80, 0.875 and 0.95, y 0.088;
   - port: 2 pegs on a rail at x 0.83–0.98, pegs at x 0.85 and 0.95, y 0.055.

   The pegs are part of the room, so a fresh save sees an empty peg rail.
5. Update both JSONs, then run `python3 tools/cut-room-fronts.py` on both. It learns an optional `layer` per front. The unchanged fronts come out identical, and `git diff --stat` must show only the two shelf fronts plus the new fronts.

**Accept only after:**
- the 200% crops of the patch edges show no seam;
- the shelves are straight and their brackets whole;
- `?surfaces&fill` shows both pictures with dolls standing *on* the new lips at all 4 sizes, each line within ±15% of capacity × scale;
- at 844×390, `roomLayout()` gives a top-shelf doll rect at least 56 px tall.

**Cost:**

| Step | Tries | Cost |
|---|---|---|
| nanogen pro land clear | up to 3 | $0.40 |
| nanogen pro port clear | up to 3 | $0.40 |
| imagegen2 pegs | up to 2 | $0.16 |
| **Total** | | **about $1.00** (cap $2.50, of this change's $20) |

If a clear leaves a ghost shelf, fall back to a Pillow clone-fill of the wall from the clean band to its right (no cost).

## 9c: the Infinite Scarf hangs on the pegs

**The idea:** it's the room's own scarf rack. Your Infinite Scarf hangs over the pegs above the armchair, lit by the sconce, and it grows as you knit: first a scarf on a hook, then swags from peg to peg, then layered garlands, then a knitting bag hung on the last peg and stuffed with the rest. Its live end always has two little needles through the last row, because it's never finished.

### What it is in the rules

The scarf is a **hook thing**, like the garland and the frame, so the existing machinery does the work:

- **ref and surface:** ref `'scarf'`; surface `scarf-pegs` (`kind: 'hook'`, layer `wall`, `accepts: ['scarf']`, name "the pegs").
- **Places:** it goes only on its pegs. Move, drag and keyboard can only bring it back there; a drop elsewhere says "The scarf hangs on the pegs".
- **Capacity:** it counts 1 of the 40-thing limit and uses no line capacity.
- **Turn off:** **Put away** (or Tidy up) takes it down into Your things under Soft things, as "Infinite Scarf". Drag it or tap-then-tap it back onto the pegs. There's no settings toggle.
- **roomRules.js:**
  - `kindOf('scarf') = 'scarf'` (without this, `cleanRoom` would drop it);
  - `available('scarf')` is `S.get().scarf.stitches > 0` (kept in step by scarf.js `sync()`);
  - `nameOf` returns "Your Infinite Scarf"; `turns` is false;
  - `allThings()` lists it when it's available and not placed.
- **JSON** (each picture):

  ```
  "scarf-pegs": { "kind": "hook", "capacity": 1, "layer": "wall", "accepts": ["scarf"],
    "box": [0.765, 0.06, 0.23, 0.62], "pegs": [[0.80,0.088],[0.875,0.088],[0.95,0.088]],
    "hang": 0.33, "scale": 0.13 }
  ```

  - `box` is what the bake covers and clips to.
  - `hang` is where the hanging ends tuck behind the `chair-back` front.
  - `scale` is the ru at the wall.
  - Port: box [0.81,0.03,0.185,0.62], 2 pegs, hang 0.385, scale 0.094.

### How it grows (1 row = 1 cm)

| Length | Look |
|---|---|
| 0 | Nothing: the empty peg rail. The thing is hidden, not in Your things, and has no button. |
| 1 cm – 1.5 m (1–149 rows) | **Hangs** folded over peg 1, both ends down. Each end is max(0.1, cm/150) × the drop to `hang`, so the ends reach the chair back at 1.5 m. |
| 1.5 – 10 m | **Swags.** The cast-on end hangs at peg 1, and the scarf swags to peg 2 (land: on to peg 3 from 4.4 m, "the bus"). The live end hangs from the last peg. The sag deepens with length, up to 0.18 of the box. |
| 10 – 100 m (1,000–9,999 rows) | **Garlands:** a 2nd row of deeper swags at 10 m and a 3rd at 30 m (3 at most), the back rows drawn first. The ends run down behind the chair back (land), or down the strip to it (port). |
| ≥ 100 m (10,000+ rows) | **Plus the knitting bag** (`items/holder-bag.png`, reused at 0.8 ru), hung by its drawstring on the last peg and full of coils in the newest colours, clipped by `holders.json`'s rim. The needles poke out over the rim. Its fill is log-scaled: ¼ at 100 m, ⅔ at 1 km, overflowing at 10 km and up, with a loop spilling over the rim. |

- **The band:** the scarf is 0.3 ru wide, which is 13 px at 844×390, 14 at 390×844 and 22 at 1280×800. It is drawn as a ribbon along the path with a fold blob at each peg, then the `pegs` front over it, so the knobs sit in front.
- **The tag:** a paper tag on a string from peg 1 shows `fmtLen(cm)` ("12.4 m"). It's a DOM span inside the scarf's button: Caveat, at least 13 CSS px, shown from 10 cm. Its text is in the button's label.

### Drawing it from the real scarf, cheaply

- **New module `src/roomScarf.js`:**
  - `drapePath(cm, zone)` is pure (testable in node): it returns the polylines, the stage, the peg folds, the bag box and the tag point.
  - `bakeScarf(zone, W, H, dpr)` draws one canvas the size of the zone box × min(dpr, 2). At 1920×1080 at 2× that's at most about 560×1000 px, 2.2 MB.
- **Colours:** rows are mapped linearly along the path, from the cast-on end at peg 1 to the live end. A 12×N **colour strip** is sampled once, with N = min(rows, 2 × path px):
  - if rows ≤ N, the rows are copied 1:1 from `store.yarnAt` (stripe yarns via `yarnColorAt`);
  - otherwise `store.strips()` is drawn scaled down, so the canvas averages it. A long scarf then reads as its blended stripes, as in "How long is it?" zoomed out.

  The strip is kept at module level, keyed by `store.version` (12×N×4 B, at most 150 KB).
- **Knit look:** a 3 px V pattern (`createPattern`) is multiplied over the band at 25%, with scarf.js's edge sheen across it. The needles are code-drawn in the equipped needles' colour.
- **Caching:** the scarf can't change inside the room, so it's baked **once per entry** into the room-only cache. The key is `s|pic|store.version|kDev`; the bake is freed on leaving and redone on a rotation that swaps the picture.
  - The room awaits `scarf.init()` (started at boot by features.js) before the first bake. If the store fails to load, there's no scarf.
  - Budget: **≤ 20 ms at 100k rows** (1 km), reported in `roomLayout().scarf.ms`. No per-row loop is longer than N.
- `render()` maps a front's `layer` field to its z: `chair-back` and `pegs` go at wall layer + 80, so the hanging ends tuck behind the chair. The blanket over the chair back (chair layer) still covers it.

### Interaction

- **Tap or Enter selects it:**
  - it plays a 600 ms sway about peg 1 (±1.5°) instead of the hop, with sfx-peg softly;
  - the bar shows **Knit more** (`go('scarf')`, whose Back returns to the book as usual), **Look closer** and **Put away**. There's no Move or Turn.
  - Enter or Space picks it up like the other hooks. Up and Down only find the pegs, and Delete puts it away.
- **Look closer** opens a sheet:
  - the length, big;
  - the last milestone passed, with its `assets/cmp` picture ("Taller than a giraffe");
  - the next goal ("1.2 m to go: taller than a house", using `goalText` from scarf.js; scarf.js doesn't import room.js);
  - one fact, the next in `FACTS` each time it opens (then the scarf stats via `slotCard`);
  - buttons Knit more and Close.
- **Hit box:** the bake's alpha bounds, at least 44 × 44. Wall-layer z sits under the chair layer, so the blanket and things on the right arm still win taps where they overlap.
- **Keyboard order:** wall things first, left to right: garland, frame, scarf. The label reads "Your Infinite Scarf, 12.4 m, on the pegs".
- **Reduced motion** (`prefers-reduced-motion`): no sway and no hop, only the selection glow. There's no idle animation at any setting.
- A doll in the room may be wearing the scarf at the same time. That's allowed: she wears its start, as on the Doll Shelf.

### Saving

- `fresh()` seeds `room` with `{ref:'scarf', surface:'scarf-pegs', t:0.5, flip:false, z:0}` (hidden until the first stitch) and sets `roomV: 2`.
- `migrate()`: a save with `roomV` < 2 gets the scarf entry added once, if it's missing, so an existing knitter finds it already hanging. Then `roomV = 2`. A scarf that was put away later stays away.
- `migrateRoom` already accepts the ref. `cleanRoom` keeps the entry via `kindOf`.
- The bake is never saved. The scarf's own data stays in IndexedDB, unchanged.

## Risks

| Risk | What it could break | Guard |
|---|---|---|
| The nanogen clear shifts tone or leaves a ghost shelf | A visible patch or seam on the wall | Paste back only the masked wall with a 24 px feather and mean-colour match; 200% crop check; clone-fill fallback |
| Bigger top-shelf things | Heads touch the top edge; the `.room-msg.high` pill covers them; low-shelf heads overlap the top lip | Headroom numbers above; `?surfaces&fill` with Juniper on both shelves at 844×390 |
| The frame hook moves under the low shelf | The frame hidden by a lamp on floor-back, or under the brackets | Check the frame with a lamp and a table on floor-back |
| `kindOf('scarf')` or `available` missed | `cleanRoom` drops the seeded entry and the scarf never shows | The save fixture (below) and the fresh-save check |
| The scarf's hit box over the chair or the top shelf's end | Taps or drags grab the scarf instead of a toy or blanket | z order (wall < chair); `place()` and real taps on the right arm, the chair drape and the top shelf's last slot |
| Bake cost or memory at 1 km and up | A jank on entering the room, or memory on phones | N-capped sampling, `roomLayout().scarf.ms` ≤ 20, canvas freed on leaving |
| The store isn't loaded yet (a quick first visit) | No scarf, or an error | Await `scarf.init()`; a missing store means no scarf |
| state.js (`fresh`, `migrate`) is shared | Older saves, unlock counts | solutions.mjs migration replay plus the room fixture |
| Old screenshots, art sheet and README | Stale media | The wrap-up step (already in STATUS) |

## Proof plan (change.md's table)

- **Art** (room-land, room-port, fronts, pegs). Shelf scale and hit boxes change, so this is also a rules change.
  - Every scene that draws the pictures (the room, and the Bag's Room-tab preview) at **390×844, 844×390, 1280×800 and 1920×1080**.
  - `?surfaces&fill` in both pictures.
  - `place()` for every surface and every reason, as in CHANGE_3's done list.
  - At 844×390, the top-shelf doll is at least 56 px.
- **Code around play** (room.js, roomRules.js, roomScarf.js, room.css, state.js): the room's own play-test at the 4 sizes:
  - **Scarf lengths:** 0, 30 cm, 1.2 m, 5 m, 50 m, 1 km (100k rows through `scarfAddRows`), and 40 km.
  - **Put away and hang back:** by drag, by tap-then-tap and by keyboard; Tidy up.
  - **Look closer and Knit more.**
  - **Reduced motion** emulated.
  - **Leaving:** `frames()` while dragging a doll with the 1 km scarf hung, and leaving frees the bake.
  - **Rotation:** rotate twice, and `room()` doesn't change.
- **The save fixture:** new `tools/fixtures/save-room-v3.json`, made from the build *before* this change. It has every surface filled, the top shelf full, the garland and frame hung, and a 5 m scarf in IndexedDB. After loading it:
  - `room()` equals the old one plus the one scarf entry;
  - nothing goes back to Your things;
  - the scarf hangs in swags.

  Also check a fresh save (an empty rail, no scarf button) and a mangled `room`.
- **Shared code** (state.js) is touched, so run **`node tools/solutions.mjs`** once at the end: 47/47 plus the migration replay.

## Folding into GAME_DESIGN.md

- **Room** (Screens): the pegs and the Infinite Scarf hanging on them, its stages, the tag, Look closer and Knit more.
- **The Infinite Scarf:** "it also hangs in the Cozy Room".
- **Asset list:** room-land and room-port recomposed (the shelf and sconce moves, the pegs); the room-pegs sheet; holder-bag reused.
- **Tech plan:** the `scarf` ref, `scarf-pegs`, `roomV`, roomScarf.js and the bake budget.
- **Done list:** the checks above.
- **Cost:** about $1.00.
