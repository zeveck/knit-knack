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
| `frame-hook.box` | [0.362,0.191,0.068,0.103] (it would now overlap the top shelf's left end) | **[0.700,0.232,0.058,0.092]**: on the wall under the moved sconce, above the armchair's top-left, lamp-lit. (Review round 1: under the low shelf, floor-back things taller than about 0.7 ru hid it.) |
| `fronts.shelf-top/-low` polygons | the old lips | the new lips (board x 0.415–0.70 and 0.40–0.665, lip about 0.02 tall), re-cut. The low board **passes behind the armchair**: it is clipped by the chair-back mask, and so is its shadow |
| new `fronts.chair-back`, `fronts.pegs` (each with `layer: "wall"`) | — | the armchair's back above the arms (land: x 0.66–0.915, from its top edge down to y 0.56), and the peg knobs, cut from the picture and drawn over the scarf (9c) |
| new `surfaces.scarf-pegs` | — | see 9c |
| everything else (seat, chair, arms, drapes, rug, floor-back, garland-hook) | | unchanged, to the pixel |

Capacities, `maxH` and save positions (`t` in ru) don't change, so no save is rewritten. The shelves just draw bigger.

**The sconce** moves from x 0.735, y 0.13–0.25 to **x 0.715–0.745, y 0.09–0.20**, between the top shelf's end and the pegs. **9c's wall** is then **x 0.765–0.995, y 0.06–0.33** above the armchair back (353×276 art px, about 117×91 CSS px at 844×390 and 193×150 at 1280×800), plus the strip right of the chair (x 0.91–0.995) down to the skirting.

**room-port needs the change too.** Its shelves (x 0.44–0.97) and the sconce fill the wall above the chair, so there's no room for the scarf. Its shelf scale (0.117, about 58 px at 390×844) is already fine. The shelves get **shortened** and keep their height:

- `shelf-top.line` becomes [0.445,0.1623]→[0.785,0.1623] (348 px; ideal 384, −9%), and `shelf-low.line` becomes [0.445,0.348]→[0.785,0.348]. The boards run x 0.43–0.80.
- The sconce stays where it is.
- The front polygons for both lips are cut back to x 0.80, and new `chair-back`, `pegs` and `scarf-pegs` are added.
- **The scarf's wall in portrait:** x 0.81–0.995, y 0.03–0.385 (189×466 art px, about 72×178 CSS px at 390×844).
- **Its pegs are 2, at x 0.83 and 0.975** (about 56 CSS px apart at 390×844, not 39), on a rail x 0.815–0.99. The portrait scarf grows **downward** (9c, "How it grows").

### How it's made: edit, don't regenerate

Last time nanogen ignored numeric shelf positions (CHANGE_3's t3 edit asked for 1/5 and got 0.15). So the shelves are placed **in Pillow**, to the pixel, and only the wall behind them is repainted. The rest of each picture stays **byte-identical**. New script: `tools/room-recompose.py`.

**Review round 1 changed the order: the wall is filled in Pillow first, and nanogen is only the fallback.** Gemini edits aren't pixel-registered, the portrait 4:5 output would be stretched to 0.78, and a single mean-colour offset leaves the sconce glow cut in two. The wall here is a smooth gradient with a fine gouache grain, which Pillow can rebuild:

- **Pillow wall fill (the main path, no cost).** The mask covers the old shelves, their shadows, and (land) the old sconce. It is **eroded at least 32 px away from the chair, the window recess and anything kept**, so its 24 px feather lies on bare wall only. Inside it, the low frequencies come from a normalized convolution of the surrounding wall (blur(img·keep)/blur(keep), at 3 radii, finest first), so the glow and the gradient carry straight across with no single-offset step. The grain is the high-pass of a clean wall patch from the same picture (land: x 0.80–0.99, y 0.03–0.30; port: x 0.45–0.75, y 0.03–0.13), tiled with a random offset per 96 px block and blended in at its own strength.
- **nanogen pro (fallback only),** if the 200% crops show a seam or a ghost shelf. It uses the clear prompt below, and the output is **cropped** to the picture's aspect, never stretched. Only the masked wall is used, with a low-frequency colour match (the blurred difference over a 30 px ring, added back), not a mean offset.

The rest of the original plan, kept for the fallback:

1. **Clear the wall (nanogen pro, edit mode).** Run `node generate.cjs --model pro --image game/assets/bg/room-land.webp --aspect 3:2 --size 2K --output .gamegen/candidates/room4/land-clear-tN.png` with this prompt:
   > Edit this picture. Remove the two empty wooden wall shelves (their boards and brackets) and the small brass wall sconce, and paint plain bare cream wall where they were, continuing the wall's soft warm gradient and gouache brushwork. Change nothing else: the window, curtains, window seat and its two cushions, armchair, rug, floor, skirting board, light, colours and painting style stay exactly as they are. Add nothing: no shelves, lamp, pictures, hooks, plants, toys or text. cozy hand-painted storybook illustration, soft gouache texture, palette of cream, cranberry red, sage green, honey gold and deep plum night blue, no text

   For room-port: the same call on room-port.webp with `--aspect 4:5`. Its prompt removes **only the two shelves** and says "keep the brass wall sconce exactly where it is". The result is resized to 1024×1313; only its wall area is used.
2. **Paste back only the wall.** A mask covers the old shelves and sconce:
   - land: x 0.40–0.80, y 0.08–0.38 (above the chair: the glow to its right is kept as painted), minus the window recess and the chair, each grown by 32 px;
   - port: x 0.80–1.0, y 0.14–0.37 (the shelves' right ends only), minus the chair's top grown by 32 px.

   The mask is feathered 24 px, with the low-frequency colour match above. Outside the mask the original pixels stay.
3. **Re-place the shelves and the sconce.**
   - Shelves: cut the old top board with its brackets (RGBA polygon) from the original. Stretch only the plank between the brackets to the new length and paste it at the new y. Add a soft shadow below (plum, 25%, 6 px down, 8 px blur). Land's low board and its shadow are then clipped by the chair-back mask (the chair's own pixels pasted back over it), so the board passes behind the armchair instead of touching its outline.
   - Sconce (land): cut the old sconce and paste it at the new spot. The fill keeps the old glow's broad light (it lies a little below the shade, as a sconce lights both ways); a small radial screen-blend (radius 0.06 h, honey #ffd98a, peak alpha 0.25) is added at the new shade. Tune it until the wall brightness 40 px from the lamp is within ±6 levels of today's, and the wall at x 0.80–0.88, y 0.30 within ±4 of today's (no bright band where the scarf hangs).
4. **Pegs (Pillow, from the room's own wood; review round 1 dropped imagegen2).** A generated rail wouldn't match the shelves' wood, brushwork and light. So the rail's board is a strip of the shelf board's front plank (the same wood, outline and grain), cut to length with its rounded ends taken from the plank's own ends. Each peg is drawn from that wood's colours: a turned knob (a shaded disc with a darker rim, a highlight up-left toward the sconce, and a short collar). The rail and pegs get the shelves' plum shadow (25%, 6 px down, 8 px blur), slightly longer to the right, away from the sconce.
   - land: 3 pegs on a rail at x 0.775–0.975, pegs at x 0.80, 0.875 and 0.95, y 0.088;
   - port: 2 pegs on a rail at x 0.815–0.99, pegs at x 0.83 and 0.975, y 0.055.

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
| Pillow wall fill, shelves, sconce, pegs | any | $0 |
| nanogen pro land clear (fallback only) | up to 3 | $0.40 |
| nanogen pro port clear (fallback only) | up to 3 | $0.40 |
| **Total** | | **$0 expected; at most about $0.80** (cap $2.50, of this change's $20) |

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
  - **`hookOf(ref)`**: a hook piece's own hook, `'scarf-pegs'` for the scarf, else null. `isHookThing(ref) = !!hookOf(ref)`. Every place that read `PIECES[ref.slice(6)].hook` uses `hookOf` (review round 1: `isHookThing` was true only for `piece:` refs, so the scarf would have been treated as a line thing and could never be hung back);
  - `sizeOf('scarf')` is `{h: 0, foot: 1}` like the other hook things (no floor shadow);
  - `available('scarf')` is `S.get().scarf.stitches > 0` (kept in step by scarf.js `sync()`);
  - `nameOf` returns "Your Infinite Scarf"; `turns` is false;
  - `reasonText('not-here', 'scarf')` is "The scarf hangs on the pegs";
  - `allThings()` lists it when it's available, under **Soft things**, after the gallery's soft things (not at the end, which would give a second "Soft things" header).
- **room.js, each site that assumed a hook thing is a piece** (review round 1):
  - `renderNew`: the scarf's info comes from `bakeScarf` (`hook: true`, its own geometry, never `galleryById`);
  - `keyPickFromTray` and `keyStepSurface` use `hookOf`; `keyShow` shows the scarf in place on its pegs (its own box, not lifted as a 1 ru frame);
  - `showBar`: Knit more, Look closer and Put away (no Move, no Turn);
  - `closerKind` and `lookCloser`: the scarf's own sheet (below), never `galleryDetail`;
  - `label`: "Your Infinite Scarf, 12.4 m, on the pegs";
  - `heldEl` and `thumbInto`: a small **code-drawn folded scarf** (a ribbon folded in three with fringe, in the scarf's newest colours), never the whole wall bake. It is drawn in the tray and in the hand.
- **JSON** (each picture):

  ```
  "scarf-pegs": { "kind": "hook", "capacity": 1, "layer": "wall", "accepts": ["scarf"],
    "box": [0.765, 0.06, 0.23, 0.62], "pegs": [[0.80,0.088],[0.875,0.088],[0.95,0.088]],
    "hang": 0.33, "scale": 0.13 }
  ```

  - `box` is what the bake covers and clips to.
  - `hang` is where the hanging ends tuck behind the `chair-back` front. **It is a polyline traced from the chair-back front's top edge** (review round 1: the chair's top curves, 0.33 at its crown and about 0.35 at peg 2, and has nothing under peg 3), and `strip` is the bare wall right of the chair ([x0, x1, yBottom]: land [0.915, 0.995, 0.68]), where the live end hangs free.
  - `scale` is the ru at the wall.
  - Port: box [0.81,0.03,0.185,0.62], 2 pegs [[0.83,0.055],[0.975,0.055]], hang traced the same way, scale 0.094, `"down": true` (the downward stages below).

### How it grows (1 row = 1 cm)

| Length | Look |
|---|---|
| 0 | Nothing: the empty peg rail. The thing is hidden, not in Your things, and has no button. |
| 1 cm – 1.5 m (1–149 rows) | **Hangs** folded over peg 1, both ends down. Each end is max(0.1, cm/150) × the drop to `hang`, so the ends reach the chair back at 1.5 m. |
| 1.5 – 10 m | **Swags.** The cast-on end hangs at peg 1, and the scarf swags to peg 2 (land: on to peg 3 from 4.4 m, "the bus"). The live end hangs from the last peg. The sag deepens with length, up to 0.18 of the box. |
| 10 – 100 m (1,000–9,999 rows) | **Garlands:** a 2nd row of deeper swags at 10 m and a 3rd at 30 m (3 at most), the back rows drawn first. The ends run down behind the chair back (land), or down the strip to it (port). |
| ≥ 100 m (10,000+ rows) | **Plus the knitting bag** (`items/holder-bag.png`, reused at 0.8 ru), hung by its drawstring on the last peg and full of coils in the newest colours, clipped by `holders.json`'s rim. The needles poke out over the rim. Its fill is log-scaled: ¼ at 100 m, ⅔ at 1 km, overflowing at 10 km and up, with a loop spilling over the rim. |

- **The live end** always hangs **free from the last peg, in the bare wall right of the chair** (land's `strip`), a set length (0.9 ru, or less while the scarf is shorter), with its two needles through the last row. Only the swags and the cast-on end tuck behind the chair back.
- **Portrait grows downward** (review round 1: its two pegs are only about 56 px apart, so side-to-side swags would tangle). `drapePath` has a per-zone stage rule:

  | Length | Portrait look |
  |---|---|
  | 1 cm – 1.5 m | Folded over peg 1, both ends down, as in landscape. |
  | 1.5 – 10 m | One deep loop from peg 1 to peg 2, lengthening toward the chair back as the scarf grows; the live end hangs free from peg 2 with its needles. |
  | 10 – 100 m | 2, then (at 30 m) 3 nested loops, each longer than the last, the back ones drawn first. |
  | ≥ 100 m | Plus the knitting bag on peg 2, as in landscape. |

  The tag hangs from the rail's left end.
- **The band:** the scarf is 0.3 ru wide, which is 13 px at 844×390, 14 at 390×844 and 22 at 1280×800. It is drawn as a ribbon along the path with a fold blob at each peg, then the `pegs` front over it, so the knobs sit in front.
- **The tag:** a paper tag on a string from peg 1 shows `fmtLen(cm)` ("12.4 m"). It's a DOM span inside the scarf's button: Caveat, at least 13 CSS px, shown from 10 cm. Its text is in the button's label.

### Drawing it from the real scarf, cheaply

- **New module `src/roomScarf.js`:**
  - `drapePath(cm, zone)` is pure (testable in node): it returns the polylines, the stage, the peg folds, the bag box and the tag point.
  - `bakeScarf(zone, W, H, dpr)` draws one canvas the size of the zone box × min(dpr, 2). At 1920×1080 at 2× that's at most about 560×1000 px, 2.2 MB.
- **Colours:** rows are mapped linearly along the path, from the cast-on end at peg 1 to the live end. A 12×N **colour strip** is sampled once, with N = min(rows, 2 × path px, 3000):
  - if rows ≤ N, the rows are copied 1:1 from `store.idx` (stripe yarns via `yarnColorAt`);
  - otherwise each output row averages **at most 8 evenly spaced source rows** per column, read straight from `store.idx` through a per-yarn RGB memo. That is O(N × 12 × 8) whatever the length, so a long scarf reads as its blended stripes. (Review round 1: `store.strips()` walks every stitch on its first call each session, about 25 ms at 100k rows in node and far more on a phone, and at 40 km it would allocate about 977 strip canvases, around 380 MB; a 50:1 `drawImage` downscale also aliases the stripes. So `strips()` is never used here.)

  The strip is kept at module level, keyed by `store.version` (12×N×4 B, at most 144 KB).
- **Knit look:** a 3 px V pattern (`createPattern`) is multiplied over the band at 25%, with scarf.js's edge sheen across it. The needles are code-drawn in the equipped needles' colour.
- **Caching:** the scarf can't change inside the room, so it's baked **once per entry** into the room-only cache. The key is `s|pic|store.version|kDev`; the bake is freed on leaving and redone on a rotation that swaps the picture.
  - The room waits for `scarf.init()` (started at boot by features.js) before the first bake, **but never on its own `Promise.all`**: the room draws as soon as its art is in, and the scarf is added when the store arrives. `indexedDB.open` gets a 4 s timeout and an `onblocked` handler (review round 1: with neither, a stuck open would have left "Tidying the room…" up with no Back). If the store fails to load, there's no scarf.
  - Budget: **≤ 20 ms at 100k rows** (1 km) **and at 4M rows** (40 km), reported in `roomLayout().scarf.ms`. No per-row loop is longer than N.
- `render()` maps a front's `layer` field to its z: `chair-back` and `pegs` go at wall layer + 80, so the hanging ends tuck behind the chair. The blanket over the chair back (chair layer) still covers it.

### Interaction

- **Tap or Enter selects it:**
  - it plays a 600 ms sway about peg 1 (±1.5°) instead of the hop, with sfx-peg softly;
  - the bar shows **Knit more**, **Look closer** and **Put away**. There's no Move or Turn.
  - **Knit more** is `go('scarf', {from: 'room'})`. From there, **Back returns to the room** (the browser's or phone's Back, and a "Back to the room" item at the top of the menu), not to the book (review round 1: otherwise nothing shows what the knitting did).
  - Enter or Space picks it up like the other hooks. Up and Down only find the pegs, and Delete puts it away.
- **Look closer** opens a sheet:
  - the length, big;
  - the last milestone passed, with its `assets/cmp` picture ("Taller than a giraffe");
  - the next goal ("1.2 m to go: taller than a house", using `goalText` from scarf.js; scarf.js doesn't import room.js);
  - one fact, the next in `FACTS` each time it opens (then the scarf stats via `slotCard`);
  - buttons Knit more and Close.
- **The growth moment** (review round 1). The save keeps `roomScarfCm`, the length the room last showed. On entering the room, if the scarf has grown since:
  - the tag's digits roll up from the last-seen length to now (900 ms), and the scarf sways once;
  - if it crossed a stage (land: reached peg 2, peg 3, a new garland row, the bag; port: the loop, a new loop, the bag), one gentle line shows, e.g. "Your scarf reached the third peg!";
  - with reduced motion, the tag shows the new length at once and the line still shows; there's no roll and no sway.

  Then `roomScarfCm` is set to now. A first visit (no `roomScarfCm`) just sets it.
- **Hit area: from `drapePath`'s geometry, clipped to what's visible** (review round 1: the bake's alpha bounds covered the empty chair back and the right arm, so taps on the chair would have grabbed the scarf). The main hit rect is the bounding box of the path's points **above the `hang` polyline** (plus the tag, and the bag's box), padded by half the band plus 6 px. The live end in the `strip` gets a second hit rect of its own, like a blanket's second part. Each is at least 44 × 44 (centred on peg 1's fold for the main one). There's no `alphaBox` over the bake. Wall-layer z sits under the chair layer, so the blanket and things on the right arm still win taps where they overlap.
- **Keyboard order:** wall things first, left to right: garland, frame, scarf. The label reads "Your Infinite Scarf, 12.4 m, on the pegs".
- **Reduced motion** (`prefers-reduced-motion`): no sway and no hop, only the selection glow. There's no idle animation at any setting.
- A doll in the room may be wearing the scarf at the same time. That's allowed: she wears its start, as on the Doll Shelf.

### Saving

- `freshRoom()` returns the cat **and** `{ref:'scarf', surface:'scarf-pegs', t:0.5, flip:false, z:0}` (hidden until the first stitch), so both a fresh save and a mangled `room` get it. `fresh()` sets `roomV: 2`.
- `migrate()`: tests **`!(raw.roomV >= 2)`**, not `s.roomV` (review round 1: `migrate` starts from `fresh()`, whose `roomV` is already 2, so a test on `s` would never fire). Such a save gets the scarf entry **unshifted** (put first) once, if it's missing, so `cleanRoom`'s 40-thing cap, which keeps the saved order, can't drop it. An existing knitter then finds it already hanging. Then `roomV = 2`. A scarf that was put away later stays away.
- `migrateRoom` already accepts the ref. `cleanRoom` keeps the entry via `kindOf`.
- The bake is never saved. The scarf's own data stays in IndexedDB, unchanged.

## Also: Your things draws pillows stuffed

The room's renderer (and so the tray and the hand) makes a toy's or pillow's plush through plush.js's `plushPiece`, the same path the gallery took in fe58996, instead of its own copy of the eye and `plushify` code.

## Risks

| Risk | What it could break | Guard |
|---|---|---|
| The nanogen clear shifts tone or leaves a ghost shelf | A visible patch or seam on the wall | Paste back only the masked wall with a 24 px feather and mean-colour match; 200% crop check; clone-fill fallback |
| Bigger top-shelf things | Heads touch the top edge; the `.room-msg.high` pill covers them; low-shelf heads overlap the top lip | Headroom numbers above; `?surfaces&fill` with Juniper on both shelves at 844×390 |
| The frame hook moves under the moved sconce | The frame crowding the top shelf's last doll, the sconce or the chair's top | `?surfaces&fill` with Juniper at the top shelf's right end, and the frame hung, at the 4 sizes |
| `kindOf('scarf')` or `available` missed | `cleanRoom` drops the seeded entry and the scarf never shows | The save fixture (below) and the fresh-save check |
| The scarf's hit box over the chair or the top shelf's end | Taps or drags grab the scarf instead of a toy or blanket | Hit rects from `drapePath` clipped above `hang`; z order (wall < chair); real taps on the empty chair back, the right arm, the chair drape and the top shelf's last slot |
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
- **The save fixture:** new `tools/fixtures/save-room-v3.json`, made from the build *before* this change (**before any code edit**). It is the localStorage save, with every surface filled, the top shelf full, and the garland and frame hung. A fixture can't carry the IndexedDB scarf (solutions.mjs deletes `knitknack-scarf`, and `scarf.init()` → `sync()` overwrites `scarf.stitches` with the store's), so the test loads the fixture, checks `available('scarf')` is false, adds 500 rows with `scarfAddRows`, **reloads**, and then checks:
  - `room()` equals the old one plus the one scarf entry, first;
  - `available('scarf')` is true;
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
- **Cost:** $0 expected (Pillow), at most about $0.80 if the nanogen fallback is needed.

## Review round 1: finding → what we did

Reviews: `.gamegen/review/c4-player-art.md` (PA) and `.gamegen/review/c4-builder.md` (B). Each was checked against the code and the pictures first.

| # | Finding | Checked | What we did |
|---|---|---|---|
| PA1 | Portrait pegs only about 39 px apart; swags would tangle | Yes: 0.10 × 390 ≈ 39 px | Pegs moved to x 0.83 and 0.975 (about 56 px); portrait drape grows downward with its own stage rule in `drapePath`; tag from the rail's left end |
| PA2 | Knit more → Back goes to the book; nothing shows the growth | Yes: history.js's Back goes to the book from any screen | Knit more is `go('scarf', {from:'room'})`, and Back (and a menu item) returns to the room; `roomScarfCm` drives a growth moment (digits roll, one sway, a stage line; reduced motion: no roll or sway) |
| PA3 | Moved frame hook under the low shelf is hidden by floor-back things | Yes: a 2.2 ru lamp reaches y 0.41, a table 0.58, a doll 0.55 | Frame hook moved to [0.700, 0.232, 0.058, 0.092], under the moved sconce above the chair's top-left |
| PA4 | The paste mask cuts the sconce glow and lies on the chair and recess outlines | Yes: wall lum 224 at x 0.80 falling to 203 at 0.95 (y 0.30); the mask edge was on the glow | Pillow wall fill first: mask eroded 32 px from the chair, recess and kept things; low frequencies by normalized convolution (no single mean offset); the glow right of x 0.80 kept as painted |
| PA5 | An imagegen peg rail won't match the shelves' wood; no shadow | Agreed (no rail exists yet to compare, but CHANGE_3's generated props needed matching too) | imagegen2 step dropped: the rail is cut from the shelf plank, knobs drawn in Pillow from its colours, with the shelves' plum shadow |
| PA6 | Low shelf board's right end touches the armchair's outline | Yes: chair back's left edge at x ≈ 0.662 at y 0.455; board to 0.665 | The board and its shadow are clipped by the chair-back mask: it passes behind the chair; the line stays 0.41–0.655 |
| PA7 | Hit box from the bake's alpha bounds covers the chair at the garland stage | Yes: room.js `position()` makes a rect from `info.trim` | Hit rects from `drapePath`, clipped above `hang`, plus a separate strip rect for the live end (same as B5) |
| PA nice | `hang` is flat, but the chair's top curves and peg 3 has nothing under it | Yes | `hang` is a polyline traced from the chair-back front's top; the live end hangs free in `strip` with its needles |
| B1 | MUST: hook handling only works for `piece:` refs; the scarf would act as a line thing | Yes: roomRules.js `isHookThing`, room.js 917 would throw, and 9 more sites listed | `hookOf(ref)`; `isHookThing = !!hookOf`; each listed site has a scarf branch (renderNew via bakeScarf, bar, Look closer sheet, label, keyShow in place, code-drawn icon in tray and hand, `allThings` under Soft things after the gallery's) |
| B2 | `roomV` check never fires: `migrate` starts from `fresh()` | Yes: state.js `Object.assign(s, raw)` over a fresh `roomV: 2` | Test `raw.roomV`; unshift the entry; `freshRoom()` includes the scarf |
| B3 | 20 ms at 100k rows impossible through `strips()`; 40 km would allocate ~380 MB | Yes: `_stripDone` starts at 0 each session; 4096-row canvases | The 12×N strip is read straight from `store.idx`, ≤ 8 samples per output row per column, N ≤ 3000; no `strips()`; hit area from geometry, no `alphaBox` |
| B4 | Paste mask cuts the glow and lies on the chair; Gemini isn't pixel-registered; port stretched | Yes (same as PA4) | Pillow fill as the main path; nanogen only as fallback, cropped not stretched, low-frequency colour match |
| B5 | Scarf hit box covers the empty chair back and the right arm | Yes (same as PA7) | As PA7 |
| B6 | Proof gap: a localStorage fixture can't hold the IndexedDB scarf | Yes: solutions.mjs clears `knitknack-scarf`; `sync()` overwrites `scarf.stitches` | Fixture made first from the current build; the test adds rows with `scarfAddRows` and reloads, checking `available('scarf')` before and after |
| B below bar | `indexedDB.open` has no timeout; the room's `Promise.all` could hang | Yes: scarfStore.js `open()` | 4 s timeout and `onblocked`; the room never waits on the store to draw |
