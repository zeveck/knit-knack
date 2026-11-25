# Change 3: the cozy room

From request 6, quoted exactly: "let finished toys and dolls sit together in a little cozy room scene you can arrange: drag them onto a rug, an armchair, shelves and a window seat, dressed in what you knit, with the arrangement saved; unlock a few room pieces as you knit"

This lands **after Change 2** (knitting in the round), which rewrites worn.js's fits as tube shape maps. Everything here that touches worn.js (`composeDoll`'s `noLabel`, `drapeOnto`) is written against the worn.js that Change 2 leaves.

## What it is

The **Room** is a new tab in the gallery, after Wall, Basket and Doll Shelf, and a **Cozy Room** button on the book's front page. It's a small painted room, in the same storybook gouache as the nook, with these places to put things:

- **a rug** on the floor, in front of everything;
- **the floor along the back wall**, between the window seat and the armchair;
- **an armchair**: on the seat and on each arm, and a blanket over its back;
- **two shelf boards** on the back wall;
- **a window seat** under a snowy window, with cushions, and a blanket over it;
- **two hooks**: the window's top (the star garland) and the wall beside it (the framed picture).

You drag things from **Your things**, a code-drawn wooden tray along the bottom (at the side in landscape), into the room:

- your **dolls**, wearing exactly what they wear on the Doll Shelf. **Dolls stand everywhere** (they have one standing, front-facing pose, and their wear fits are made for it);
- **Purl**, sitting (`purl-sit`, with her collar and bell);
- your **plush toys** (the finished Knitted Friends), sitting;
- your **pillows and cushions** (Heart Pillow, Bobble Cushion), drawn plush;
- your **blankets** (Chevron Baby Blanket, Patchwork Blanket, Heirloom Afghan), draped;
- the **room pieces** you've unlocked.

Each thing settles onto the place it's dropped on (see "Placing"). Things further back are drawn smaller. Furniture fronts overlap the things on it (the arms of the chair hide a sitter's sides, a shelf's lip hides the feet a little), so things sit *in* the room, not pasted over it.

- **Drag** a thing to move it, or back onto Your things to put it away.
- **Tap** a thing to select it: it hops (a 220 ms squash-and-hop) and comes to the front of its place. A small bar of buttons appears above it: **Move**, **Turn** (only for things that look different mirrored: Purl, the toys and the room pieces that stand on a surface; never the dolls, the knitted pillows and blankets, the garland or the frame), **Look closer** and **Put away**. Tapping elsewhere deselects.
- **Tidy up** (a small button in the tray's header) puts everything back in Your things, after an "Are you sure?" sheet.

The room is saved exactly as you left it.

### The first visit

The room is never empty: **Purl is already sitting on the armchair** (a fresh save, and an older save meeting the room for the first time, both start with her there). The side table is in Your things from the start.

- While you have no doll and no toy, a soft line sits over the rug: "Purl's saving you a seat. Finish a wearable to meet Pip, or a toy from chapter 6, and bring them here."
- The first time the room opens, a code-drawn tip card (like How to play's) says: "Drag things from Your things into the room. Tap one to bring it forward." It shows once (`tips: 'room'`) and closes on any tap.

### Look closer

The room is small on a phone (a doll on the rug is about 85–100 CSS px tall), too small to see stitches, so close-ups are a sheet, not a pinch zoom (pinching fights the drag and the body's `touch-action: none`):

- **a doll or Purl:** a sheet with the doll at the dressing view's size (about 560 px tall at 390×844, so a worn stitch's V shows), drawn by the same `dressedDoll`, and a **Dress Pip** button that goes to the dressing view (Back returns to the room);
- **a toy, pillow or blanket:** the gallery's close-up of that piece (`detail(gid)`, large, with its name);
- **the framed picture:** the close-up of the newest gallery piece;
- **other room pieces:** no Look closer button.

The sheet closes like every sheet (a tap outside, Escape), and the room is as it was.

## Room pieces to unlock

There's no currency; these unlock like everything else and show in the Knitting Bag's new **Room** tab:

| Piece | Unlock id | Unlock | Ref when placed |
|---|---|---|---|
| A little side table with a teacup | room:table | start | piece:table |
| A potted plant | room:plant | finish 4 pieces | piece:plant |
| A stack of storybooks | room:books | 3,000 stitches | piece:books |
| A toy chest | room:chest | finish chapter 3 | piece:chest |
| A tiny tea set | room:teaset | finish 12 pieces | piece:teaset |
| A star garland for the window | room:garland | 8,000 stitches | piece:garland |
| A floor lamp | room:lamp | finish chapter 5 | piece:lamp |
| A framed picture (shows your newest gallery piece) | room:frame | finish 20 pieces | piece:frame |

The tray is called **Your things** (never "toy box"), so it isn't confused with the toy chest.

## Sizes and places

### Room units

All sizes are in **room units (ru)**: **1 ru is a doll's standing height**, from the ground line to the top of Pip's head, measured in `dolls.json` (all six dolls share one scale, so Juniper's ears reach about 1.14 ru). The room's furniture is doll-sized: a doll is about half the height of the armchair's back.

| Thing | Height (ru) | Footprint (ru) | Goes on | Turns |
|---|---|---|---|---|
| a doll | 1.0 (from `dollBounds`: Juniper 1.14, Basil 1.08) | 0.6 (the body; outstretched arms, 0.71 wide, may overlap a neighbour's) | shelves, window seat, chair seat, back floor, rug | no |
| Purl (sitting) | 0.8 | 0.6 | shelves, window seat, chair seat, back floor, rug | yes |
| a toy | 0.55 (every toy, one height band) | its plush width at that height, 0.35–0.8 | everywhere except the drapes and hooks; the chair arms only if ≤ 0.5 | yes |
| a pillow or cushion | 0.5 | its plush width, 0.45–0.7 | window seat, chair seat, rug | no |
| a blanket | (the drape's mesh) | (one per drape spot) | chair drape, seat drape | no |
| side table with teacup | 0.9 | 0.7 | back floor, rug | yes |
| potted plant | 0.6 | 0.4 | shelves, chair arms, window seat, back floor, rug | yes |
| storybooks | 0.35 | 0.45 | everywhere except the drapes and hooks | yes |
| toy chest | 0.8 | 1.1 | back floor, rug | yes |
| tea set | 0.3 | 0.8 | window seat, rug | yes |
| floor lamp | 2.2 | 0.6 | back floor, rug | yes |
| star garland | (its hook) | (one) | garland hook | no |
| framed picture | (its hook) | (one) | frame hook | no |

### Surfaces

Both room pictures have **the same surfaces with the same ids, capacities and limits**; only where they sit on screen differs. Capacity is the surface's length in ru; `maxH` is the tallest thing that fits under what's above it.

| Surface id | Kind | Capacity | maxH | Layer |
|---|---|---|---|---|
| frame-hook | hook | 1 thing | n/a | wall |
| garland-hook | hook | 1 thing | n/a | wall |
| shelf-top | line | 2.5 | 1.15 | shelf-top |
| shelf-low | line | 2.5 | 1.15 | shelf-low |
| floor-back | line | 1.5 | 2.4 | floor-back |
| seat-drape | drape | 1 blanket | n/a | window-seat |
| window-seat | line | 2.0 | 1.6 | window-seat |
| chair-drape | drape | 1 blanket | n/a | chair |
| chair-arm-l, chair-arm-r | line | 0.5 each | 1.5 | chair |
| chair-seat | line | 1.2 | 2.0 | chair |
| rug | line | 3.5 | 3.0 | rug |

That's 14.2 ru of lines: one of every doll, Purl, every room piece, the 8 toys and both pillows (about 13.4 ru) all fit at once; extra "Knit again" copies may not, which is what "full" is for. A doll (0.6) doesn't fit a chair arm (0.5): the arms hold toys, books and the plant.

**In each picture's JSON** (`assets/bg/room-land.json`, `room-port.json`), as fractions of the image:

- each line surface: `line: [[x0, y0], [x1, y1]]` (where feet rest), `scale` (the height of 1 ru there, as a fraction of the image height), `capacity`, `maxH`, `accepts` (from the table above), `layer`, `front` (the front layer drawn over it, or null);
- each hook: `box` (where the piece is drawn);
- each drape: `parts`, two quads (`[[x,y] × 4]`), part 0 under the sitters and part 1 either under them (chair: over the back, then down the back cushion) or over the front layer (window seat: the fold hanging down the seat's front edge), with `over: [false, true]` saying which;
- `fronts`: each front layer's polygon, its cut file and its offset.

**Targets** for the scale (chosen in the pictures, checked with the overlay): in room-land a doll on the rug is about 1/4 of the image's height and on a shelf about 1/5; in room-port about 1/7 and 1/9. Each line's on-screen length should be within ±15% of `capacity × scale`, so that what fits looks like it fits; where a portrait surface can't manage that, its `scale` is lowered (things there are drawn a little smaller), never its capacity.

### Placing (the rules)

- **`t`** is a thing's centre along its surface, in ru from the surface's left end, clamped to `[foot/2, capacity − foot/2]`. It's the same in both pictures.
- **Where a drop lands:** the line surface whose line is nearest below the dragged thing's feet within 40 CSS px and within its x-range; failing that, the nearest line within 80 px; hooks and drapes take a drop anywhere on their box or mesh. Each kind of thing goes only on the surfaces its row allows.
- **It fits** if the surface accepts it, its height ≤ `maxH`, its footprint ≤ the capacity, and the footprints already there plus its own ≤ the capacity. Then it goes in at the drop's `t`, and the others on that surface slide aside to make room (packing, below).
- **It doesn't fit:** the next-nearest surface within 60 CSS px that does take it gets it. If none does, the thing **goes back where it came from** (its old place, or Your things), and one gentle line says why, for the surface under its feet:
  - not allowed there: "The lamp stands on the floor", "Blankets go over the armchair or the window seat", else "Pip can't go on the chair arm";
  - too tall: "Too tall for the top shelf";
  - too wide: "Too big for the chair arm";
  - full: "No room left on the top shelf";
  - nowhere near a surface: "Put it on the rug, a seat or a shelf".
- **Drapes and hooks** hold one thing. Dropping a blanket on a drape that has one swaps them: the old blanket goes back to Your things ("Swapped the blankets").
- **The limit:** at most 40 things in the room at once (to keep memory and drawing small). The 41st goes back with "The room is full. Put something away first." In practice the capacities fill first.
- **Packing** (layout only): a surface's things, sorted by `t`, are pushed right so footprints don't overlap, then pushed back left from the right end. Layout never writes the save.
- **The save is written** only by a drop, Turn, Put away, Tidy up, or a tap's bring-to-front (its `z`). A drop writes the packed `t` of every thing on that surface, so the save is what you see. **A rotation or resize never rewrites the save**: the other picture lays out the same `{surface, t}`.
- **Draw order** is fixed by layer: **wall** (hooks) → **shelf-top** → **shelf-low** → **floor-back** → **window-seat** → **chair** → **rug**. Within a layer: the drape's under-parts, then the things by `z` (each with a soft code contact shadow), then the layer's front layer, then any over-part of the drape. A tap or a drop gives a thing the top `z` of its surface. A dragged thing is drawn above everything until it's dropped.

## Controls

- **Touch and mouse:** drag; tap selects (hop, to the front, the button bar).
  - **Tap threshold:** a press that moves under 10 px is a tap (as in input.js). Over 10 px on a placed thing starts a drag, with `setPointerCapture`.
  - **Picking up from Your things** (which scrolls): the tray has `touch-action: none` and scrolls itself in code (with a little momentum; the mouse wheel and trackpad scroll it natively). On a press, the first 8 px of movement decide: **along** the tray scrolls it; **across** it (up out of a horizontal strip, sideways out of the vertical column) picks the thing up. Holding still for 250 ms also picks it up (it lifts, with sfx-dress). Once picked up, the pointer is captured.
  - **Cancelled drags:** on `pointercancel`, `lostpointercapture`, a resize or rotation, a sheet opening or the page hiding, the held thing goes back where it came from, and nothing is saved.
  - **Hit boxes** come from each thing's trimmed bounds (`dollBounds` for dolls), at least 44 × 44 CSS px, centred on the feet. Things are `<button>`s with `draggable=false` and no long-press callout. The Room tab has no swipe handler.
  - A drop calls `S.saveNow()`.
- **Without dragging:** tap a thing in Your things: it lifts in the tray and a line says "Tap a place in the room". Tap a place: it's placed there by the same rules. Tap the tray or press Escape to cancel. To move a placed thing, select it, tap **Move**, then tap a place.
- **Keyboard:** every placed thing and every tray item is a `<button>` holding its bitmap, labelled "Pip, on the rug" or "Pip, in your things". Tab goes through the room's things (back to front, left to right), then Your things, then Tidy up; focusing a thing selects it, and its Move / Turn / Look closer / Put away buttons follow it in the tab order.
  - **Enter or Space** picks the focused thing up (from the room or the tray; from the tray it appears on the rug, or the first surface that takes it).
  - **While holding:** Left / Right step one footprint along the surface (stopping at the ends); Up / Down go to the next surface back / front in the layer order, skipping ones that won't take it; **Enter or Space** puts it down; **Escape** puts it back where it was; **Delete or Backspace** puts it away.
  - **With nothing held,** Escape opens the menu (as on the other gallery tabs).
  - A polite `aria-live` line says each move: "On the top shelf", "No room left on the top shelf", "Put away".
  - Moves only change transforms: the DOM is never rebuilt while you arrange, so focus stays put.

## Layouts

- **Phone portrait (390×844):** the header and tabs, the room (room-port, contained, about 390×585), and Your things as a horizontal strip below it (about 112 px tall plus the safe area).
- **Phone landscape (844×390):** on a short landscape screen (height under 500) the tabs fold into the header row. Your things is one column of 2 items (about 170 px) at the right; the room (room-land) fills the rest, about 507×338. A doll on the top shelf is then about 68 px tall, on the rug about 84.
- **Desktop (1280×800 and up):** the room large (room-land, about 840×560 at 1280×800), with Your things as a strip below it.
- **Which picture:** room-land when the room's area is wider than tall, else room-port.
- **The book's front page:** on phones, Continue (wide), then Infinite Scarf | Gallery, then Cozy Room | Knitting Bag. At 760 px and up, five columns (`1.3fr repeat(4, 1fr)`), labels allowed to wrap below 1000 px.
- **The gallery's tab list** (Wall, Basket, Doll Shelf, Room) moves into one shared helper, used by gallery.js (now at gallery.js:34), dolls.js (dolls.js:43) and room.js, instead of being written three times.

### Your things

A code-drawn wooden strip (`tex-wood` with an inner shadow and a lighter top edge), headed "Your things" with Tidy up at its end. Its sections, in order: Dolls (unlocked, not yet in the room), Purl (if she's not in the room), Toys (newest first), Soft things (pillows, cushions, blankets), Room pieces (unlocked). Each item is a 72 px cell showing the thing's room bitmap scaled down. Things in the room aren't listed. Empty: "Everything's in the room".

## The Knitting Bag's Room tab

- `TABS` in bag.js gains `['room', 'Room']`, with its "new" dot like the others.
- **Its preview** is code-drawn: a small room-land thumbnail with the room pieces now placed drawn at their places (sprites only, no dolls or toys, so it's cheap).
- **Cards:** the 8 pieces. Owned ones show the sprite, and a tick if it's in the room. Tap one: **Place it**, which opens the room with that piece already held (the "Tap a place in the room" state). Locked ones show a code silhouette of the sprite (filled as `dollSilhouette` does) and what's left ("Finish 3 more pieces").

## Unlock wiring

- `UNLOCK_RULES` gains the 8 `room:` rules (kind `room`, item as in the table). The side table has `rule: { start: true }`.
- `KIND_TOAST.room = 'New for the room'`.
- toasts.js's `usable` list gains `room`; its **Use it** for a room piece does `go('room', { hold: 'piece:<item>' })` (the piece in hand, ready to place) instead of `S.useUnlock`. `equip('room', …)` returns true and changes nothing, so nothing else reports it as unusable.
- An existing save meeting the room for the first time may have several room unlocks earned at once: they show as the usual one "N new things in your Knitting Bag" toast.

## Art

About **$1.60** (cap $2.50), from this change's share of the budget.

- **room-land** (1536×1024): nanogen pro, with **nook-land as the style reference only** (palette, light, brushwork). The prompt says, in so many words: *a bare cream armchair with no blanket or throw; no side table, no floor lamp, no teacup; warm light from a wall sconce and the snowy window; the window seat with two plain cushions on the left under the window and the armchair on the right, apart, not overlapping; a braided rug on the floor in front of both, with empty floor between and behind; two empty wooden shelf boards on the back wall above, between them; no toys, dolls, knitted things or pictures painted in; room to move.* About 3 tries ($0.72). **Accept only after checking:** no throw, table, lamp or teacup; the window seat and chair apart; 2 boards; the scale targets (draw the surfaces over it).
- **room-port** (1024×1536): **an edit of the accepted room-land** (nanogen, recomposed to portrait, same objects), about 2 tries ($0.48). Same checks.
- **Front layers:** cut in Pillow, not generated. `tools/room-fit.html` (like doll-fit) is used to draw each surface line, drape quad and front polygon over the picture and save them to `room-*.json`; `tools/cut-room-fronts.py` cuts each `fronts` polygon from the picture with a 2 px feathered alpha into `bg/room-<land|port>-front-<id>.webp` (cropped, with its offset in the JSON). The fronts: `shelf-top` (the board's lip), `shelf-low` (the lip), `window-seat` (the seat's front edge), `chair` (both arms' fronts and the seat's front edge). Checked with `?surfaces&fill`, which puts a doll (or the widest thing that fits) on every surface in both pictures.
- **The framed picture reuses `items/decor-frame.png`** (the empty frame), with the newest gallery piece drawn in its inner box by the same code as the nook's frame (scene.js), redrawn only when the newest gallery id changes. Its hook is on the wall.
- **room-pieces:** one imagegen2 transparent sheet of the other 7 (side table with teacup, potted plant, storybooks, toy chest, tea set, star garland, floor lamp), at room perspective, split with Pillow into `items/room-<item>.png`. References: the accepted room-land, `decor-bookshelf.png` and `prop-book.png` (the books), `holder-teacup.png` (the teacup and tea set), and crops of nook-land's floor lamp and side table (so they're recognisably the nook's). About 2 tries ($0.40). Checked side by side with the nook and in the room.
- **Code-drawn:** Your things, the contact shadows, the Bag preview and silhouettes, the button bar, the tip card, the surfaces overlay.
- **Sound:** reuse sfx-dress (pick up), sfx-peg (put down, and softer for a tap's hop), sfx-card (the tab), sfx-ui (the buttons). Music: the gallery waltz.

## Tech

- **`src/room.js`**: the screen (`registerScreen('room')`, gallery music), layout, drag and drop, Your things, the keyboard, the close-up sheet and the save. `go('room', { hold: ref })` opens it with a thing held.
- **Rendering, once per thing at one room scale.** The backdrop is an `<img>`; each front layer an `<img>`; each thing a `<button>` with its own canvas, positioned and scaled by CSS transforms (`translate` to its feet, `scale` for its surface's depth, `scaleX(-1)` for a turn). Drags and depth changes touch only transforms; nothing is recomposed per depth or per frame.
  - **The room scale** `kRoom` = the front-most (rug) scale in CSS px per ru × `min(dpr, 2)`, with a doll's bitmap capped at 600 device px tall. Every thing is rendered at it once, on entering; things further back are CSS-scaled down. On a resize, things are re-rendered only if `kRoom` grows by more than 25%.
  - **Dolls and Purl:** `composeDoll(d, outfitOf(d), k, { noLabel: true })` (a new option that skips the scarf's "+ … m more" pill; added to the post-Change-2 composeDoll). The room calls `composeDoll` directly rather than `dressedDoll`, so it doesn't churn the shelf's 16-entry composite LRU. A doll is re-rendered only when its outfit signature (and the scarf version, if worn) changes.
  - **Toys and pillows:** `pieceRender` + `plushify` at one cell size (the toy's eyes as objectRender does it; none for pillows), made by room.js itself so the canvases are its own.
  - **Blankets:** `drapeOnto(gid, mesh, k)`, a narrow new export in worn.js, **written after Change 2 lands**: it bakes the piece with `bakeGallery` at a small cell (≥ 2 px) and draws its row strips into the drape's two quads (the whole blanket, folded at the part boundary), with code shading. It returns one canvas and offset per part.
  - **Room pieces:** their split sprites as `<img>`.
  - **A room-only `Map`** holds all of these; on leaving the room every canvas in it is freed (`width = height = 0`) and the map cleared.
- **Save:** `room: [{ref, surface, t, flip, z}]` in `fresh()`, seeded with Purl: `[{ref: 'doll:purl', surface: 'chair-seat', t: 0.6, flip: false, z: 0}]`.
  - **`ref`** is `doll:<id>` (Purl is `doll:purl`, and she's always available in the room, dressed only once her doll unlock lets you dress her), a gallery id `g12` (a toy, pillow, cushion or blanket, by its pattern), or `piece:<item>`. The kind is worked out from the ref; there's no separate `kind` field.
  - A doll's outfit always comes live from `outfits`, so changing her clothes shows in the room. A gallery piece taken down stays placed (pieces are never deleted; a reset wipes the room too).
  - **`migrate()`**: a missing or non-array `room` becomes the fresh one (Purl on the chair). Otherwise it keeps only entries whose ref exists and is placeable (a known doll, a gallery piece of a placeable pattern, an unlockable room piece), drops duplicate refs, sends an unknown surface to `rug`, coerces `flip` to a boolean, clamps `t`, packs each surface (anything that overflows goes back to Your things), and renumbers `z` per surface.
  - Locked dolls (only possible after a debug `unlockAll`) stay in the save but aren't drawn.
- **Debug hook** (`window.__game`):
  - `room()` returns the saved array;
  - `place(ref, surface, t)` goes through the same function as a real drop and returns `{ok, surface, t, reason}`, with `reason` one of `'not-here' | 'too-tall' | 'too-wide' | 'full' | 'room-full' | 'locked' | 'unknown'`;
  - `roomLayout()` returns `{picture, surfaces: [{id, line (CSS px), scale, capacity, used}], things: [{ref, surface, t, rect, scale, drawIndex, flip}], tray: [{ref, rect}]}`;
  - `clearRoom()` empties it without the confirm;
  - `state().room` = `{count, held, selected, focus, picture}`.
- **`?surfaces`** draws every surface line with its id and used/capacity, the hooks' boxes, the drape quads and the front polygons over the room; `?surfaces&fill` also fills every surface (the art check above).

## Definition of done (additions)

- [ ] room-land and room-port show no throw, side table, lamp or teacup; the window seat and armchair are apart; 2 shelf boards; the rug in front. `?surfaces&fill` in both pictures shows things sitting *in* the furniture (fronts over them) at all four sizes, with each line within ±15% of `capacity × scale`.
- [ ] Every surface takes the right things and refuses the rest with its line (checked with `place()` for each reason), by touch, mouse, tap-then-tap and keyboard. At 390×844 the tray scrolls sideways without picking anything up, and an upward drag or a 250 ms hold picks up; a cancelled touch puts the thing back.
- [ ] Place everything in landscape, rotate to portrait and back, reload: the same things on the same surfaces in the same order, and `room()` unchanged by the rotations.
- [ ] Dolls stand in their current outfits (no "+ m more" pill); Purl and the toys sit; pillows are plush; blankets drape on both drape spots in both pictures. Turn shows only for Purl, toys and standing room pieces.
- [ ] Look closer on a doll at 390×844 shows recognisable knit Vs; Dress Pip and back work.
- [ ] A fresh save opens the room with Purl on the armchair, the soft line and the tip card (once).
- [ ] The arrangement survives a reload. Tidy up clears it after its confirm. A save from before the room loads with Purl on the chair; a hand-mangled `room` loads without errors.
- [ ] Room pieces unlock once each with "New for the room", appear in the Bag's Room tab with its preview, and Use it / Place it open the room with the piece held.
- [ ] At 844×390 the tabs share the header row, a doll on the top shelf is at least 56 CSS px tall, and every placed thing's hit box is at least 44 px.
- [ ] `frames()` stays near 60 a second while dragging a doll across the room on a phone, and leaving the room frees its canvases.
- [ ] Every screen looks finished, with no overlaps between the room, the button bar, the tray and the header; the book's front page fits its five buttons at every size.

## To fold into GAME_DESIGN.md

Another refiner is editing GAME_DESIGN.md now; once that's done, fold these in:

1. **Pitch / The player's fantasy:** a line on arranging your dolls and toys in a cozy room.
2. **Accessories:** a "Room pieces" row (the 8 pieces and unlocks above), and a pointer to the Room screen.
3. **Dolls:** dolls also stand in the Room (one pose, standing everywhere); Purl sits there from the start.
4. **Screens:**
   - Pattern Book: the front page's fifth button, Cozy Room, and its phone/desktop grid.
   - Gallery: the tabs become Wall, Basket, Doll Shelf, Room (one shared tab helper).
   - A new **Room** entry (the room, Your things, selection bar, Look closer, Tidy up, first visit, layouts).
   - Knitting Bag: its tabs gain Room (the design's list should also name the Doll Shelf tab the code already has), with the room preview and Place it.
5. **Art direction / Asset list:** room-land, room-port (an edit of room-land), the Pillow-cut fronts, the room-pieces sheet (7 sprites), decor-frame.png reused in the room.
6. **Audio direction:** the room reuses sfx-dress, sfx-peg, sfx-card, sfx-ui and the gallery waltz.
7. **Tech plan:**
   - Saving: the `room` field, its refs, the seed and the migration.
   - Unlocks: the `room` kind, `KIND_TOAST.room`, `usable` in toasts.js, and Use it opening the room.
   - Dolls and the preview card: `composeDoll`'s `noLabel` and `drapeOnto` (after Change 2).
   - Input: the tray's own scrolling and the 8 px / 250 ms pick-up rule; the room's keyboard model.
   - The debug hook additions (`room`, `place`, `roomLayout`, `clearRoom`, `state().room`) and `?surfaces`.
8. **Cut list:** before item 1, "the blanket drapes (blankets stay out of the room)", then "the room-port picture (portrait shows room-land contained)".
9. **Effort and cost estimate:** + room.js and room-fit/cut tools; + about $1.60 of art (cap $2.50).
10. **Definition of done:** the items above.
