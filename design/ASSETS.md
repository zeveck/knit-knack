# Knit Knack — assets and spending

Budget: $50 (raised from $20 by request 4). imagegen2 (gpt-image-2.6-flare) priced by token, checked 2026-11-24: $8 per million image input tokens, $30 per million image output tokens, $5 per million text input tokens (OpenAI pricing page, as reported at developers.openai.com/api/docs/pricing). A medium 1024² image with one reference (~1,500 in, ~1,450 out) is about $0.06; estimates below round up to $0.08. nanogen pro (gemini-3-pro-image) 1K/2K = $0.134.

## Mock pictures (for the shared design)

| ID | File | Tool | Prompt (short) | Tries | Est. cost | Verdict |
|---|---|---|---|---|---|---|
| mock-nook | .gamegen/candidates/nook-land-a.jpg → design/mockups/nook.jpg | nanogen pro 3:2 2K | knitting nook, empty floor patch, no yarn/basket | 1 | $0.134 | Excellent; becomes the style anchor bg-nook-land |
| mock-purl | candidates/purl-cat-a.png → mockups/purl.png | imagegen2 medium 1024², transparent, ref nook | Purl, loaf pose, eyes closed | 1 | $0.08 | Clean edges; candidate for purl-cat |
| mock-basket | candidates/basket-a.png → mockups/basket.png | imagegen2 medium 1024², transparent, ref nook | empty wicker basket | 1 | $0.08 | Clean; candidate for basket-back (front cut in Pillow) |
| mock-knit-look | candidates/knit-swatch-a.jpg → mockups/knit-look.jpg | nanogen pro 3:2 1K, ref nook | painted knitted fabric on needles, cable + Fair Isle + rib | 1 | $0.134 | Good look target for the stitch lab |
| mock-giraffe | candidates/cmp-giraffe-a.png → mockups/scarf-giraffe.png | imagegen2 medium 1024×1536, transparent, ref nook | giraffe, side view, on ground line | 1 | $0.08 | Good; candidate for cmp giraffe, template works |
| mock-composite | mockups/nook-with-purl.jpg | code (Pillow) | nook + basket + Purl layered | — | $0 | Shows the layering plan |

**Running total: about $0.51** (of $5 for mockups, of $20 overall)

## Audio (audio helper, 2026-11-24) — all accepted

5 music tracks (mus-nook-1/2/3 180 s, mus-gallery 120 s, mus-scarf 150 s) and 22 sfx in game/assets/audio/. All three tick families pass tools/tick-check.html (wood 6 clicks 58–79 ms; metal 6 clicks 96–186 ms; glass 7 clicks 56–157 ms). Quiet clips need per-clip gain in audio.js (+15–20 dB): sfx-row, sfx-caston, sfx-card, sfx-rip-loop, sfx-purr. Music mastered loud (RMS −17..−19 dB): play at low gain. Metal clip has an extra soft click at 1136 ms the slicer must skip (min spacing). ElevenLabs creator plan: no credit line.

| Group | Items | Tries | Est. cost |
|---|---|---|---|
| Music | 5 tracks, 13.5 min | 5 | $4.05 |
| Ticks | wood, metal, glass | 5 | $0.60 |
| Sound effects | 19 | 23 | $2.76 |
| **Audio total** | | | **$7.41** |

**Running total: about $7.92**

## Dolls and comparisons (dolls helper) — all accepted

6 dolls (pip, clementine, bramble, juniper, basil, mabel; 512×768 webp on one template: ground y=720, head top y=100, Juniper's head top y=146) + purl-sit (512 png); anchors and over-polygons in game/assets/dolls/dolls.json (incl. purl-cat neck anchor measured on purl-cat-a resized to 512 with Lanczos). 20 comparisons cmp-01…20 in game/assets/cmp/ (trimmed webp, long side 1024; cmp-12 giraffe reused the mockup). 33 imagegen2 images.

| Group | Tries | Est. cost |
|---|---|---|
| Dolls + purl-sit | 11 | $0.71 |
| Comparisons | 22 | $1.31 |
| **Total** | | **$2.02** |

**Running total: about $9.94**

## Scene art (scene helper) — all accepted

bg/nook-land.webp (anchor) + nook-land.json; bg/nook-port.webp + nook-port.json (basket, decor and window boxes as fractions); tools/ref/ref-{stockinette,rib,cable}.jpg (rib is not a true 2×2: use for shading/fuzz only); tex/tex-{wood,paper}.webp, tex/tex-fibre{,-fuzzy}.png (seamless); items/yarn-{wool,cotton,chunky,mohair,sparkle,striping,velvet,glow}.png (neutral grey); sprites/basket-back.png, basket-front.png (+ tools/basket-mask.json); sprites/purl-cat.png; sprites/purl-cheer/purl-cheer-0..3.png (registered to purl-cat baseline row 450, brightness matched); items/gallery-{peg,shelf,lamp}.png; items/holder-{bowl,bag,teacup}.png + items/holders.json; items/decor-{fern,lights,rug,frame,bookshelf}.png; items/prop-{book,teapot}.png, prop-armchair.webp; items/fin-{pompom,tassel,button-4hole,button-2hole}.png; ui/app-icon.png. Composites checked in both nooks.

| Group | Tries | Est. cost |
|---|---|---|
| nanogen pro (portrait nook, 3 ref swatches, 4 textures) | 13 | $1.74 |
| imagegen2 (yarn, props, holders, decor, fin, icon) | 7 | $0.43 |
| anim8gen purl-cheer | 4 frames | $0.21 |
| **Total** | | **$2.39** |

**Running total: about $12.33 of $50**

## Change 3: room art

| ID | File | Tool | Tries | Est. cost | Verdict |
|---|---|---|---|---|---|
| room-land | game/assets/bg/room-land.webp (1536×1024) + room-land.json | nanogen pro 3:2 2K, nook-land as style ref only | 3 (kept t2) | $0.40 | Accepted. No throw/table/lamp/teacup; window seat (2 cushions) left, bare armchair right, apart; 2 empty boards between them; braided rug in front. Shelf gap only ~140 px, so shelf scale is 0.125 (1/8, target 1/5); rug 0.22 (1/4.5). |
| room-port | game/assets/bg/room-port.webp (1024×1536) + room-port.json | nanogen pro 2:3 2K, edit of room-land (t3 = shelf edit of t2) | 3 (t1 cropped the seat; t3 an edit of t2) | $0.40 | Accepted. Same furniture, all whole. Rug 0.143 (1/7), shelves 0.10 (1/10), window seat 0.112, chair 0.09–0.10, back floor 0.08 (narrow gap between seat and chair). |
| room fronts | game/assets/bg/room-{land,port}-front-{shelf-top,shelf-low,window-seat,chair}.png | Pillow (tools/cut-room-fronts.py, 2 px feather) | – | $0 | Accepted; checked with a doll/Purl fill in both pictures (.gamegen/candidates/room/check-*-fill.png). |
| room-pieces | game/assets/items/room-{table,plant,books,chest,teaset,garland,lamp}.png (sheet: .gamegen/candidates/room/room-pieces-t1.png) | imagegen2 gpt-image-2.6-flare, 1536×1024 medium, native alpha, 6 refs | 1 | $0.06 | Accepted. Clean alpha; lamp and table match the nook's; garland is the sheet's upper strand. |
| room frame | items/decor-frame.png (reused) | – | – | $0 | Reused on frame-hook. |

Change 3 art total: 6 nanogen pro calls ($0.80) + 1 imagegen2 sheet (≈ $0.06) ≈ $0.86 of the $2.50 cap.

## Change 2: sfx-join (round B1, 2026-11-25) — accepted

| ID | File | Tool | Prompt | Tries | Est. cost | Verdict |
|---|---|---|---|---|---|---|
| sfx-join | game/assets/audio/sfx/sfx-join.mp3 | audiogen sfx (eleven_text_to_sound_v3), 0.8 s | "the soft click of two wooden knitting needle tips meeting and a loop of wool yarn drawn closed, gentle, close-up, quiet room" | 1 | $0.12 | A soft click and a short pull; quiet (peak −30 dB), so audio.js plays it at +20 dB with the usual onset trim. Plays on the join, and on the last tap of a gather, graft and seam |

**Running total: + $0.12**

## Change 4: the roomier landscape room and the scarf's pegs (9a)

Every take is in `.gamegen/candidates/room4/` (`src/` holds the Change 3 pictures, `t1`–`t16` the runs of `tools/room-recompose.py`). No generator was called: the Pillow path held, so the nanogen fallback wasn't needed.

| ID | File | Tool | Tries | Cost | Verdict |
|---|---|---|---|---|---|
| room-land | game/assets/bg/room-land.webp (1536×1024) | Pillow + numpy (tools/room-recompose.py) | 16 runs (t1 boxes round the lifted layers; t2 lifted alpha gated near each thing; t3–t4 the rail's lip trimmed; t16 kept) | $0 | Accepted. Shelves at y 0.235 and 0.455 (scale 0.17), straight, brackets whole; the low board passes behind the armchair; sconce 0.04 higher with a small glow at its shade; a 3-peg rail cut from the shelf's own plank at y 0.088 with the shelves' plum shadow. 200% crops of every patch edge: no seam, halo or doubled outline |
| room-port | game/assets/bg/room-port.webp (1024×1313) | Pillow + numpy (same script) | 16 runs (t5 nconv ran out at the edge; t6–t12 the sconce's lit box, which the shelves had bounded, blurred into a soft glow right of their new ends; t13 the boards re-pasted over the blur; t16 kept) | $0 | Accepted. Shelves end at x 0.80 (lines 0.445–0.785, scale 0.117), their own right end and bracket moved in, colour-matched and cross-faded; a 2-peg rail at x 0.83 and 0.975, y 0.055 |
| room fronts | bg/room-{land,port}-front-{shelf-top,shelf-low,window-seat,chair,chair-back,pegs}.png | Pillow (tools/cut-room-fronts.py) | – | $0 | Re-cut from the new pictures. New: `chair-back` (the back's top edge, traced from the picture, round its right side to the arms) and `pegs` (the knobs), both `layer: "wall"` |

Change 4 art total: **$0** of the $20 (no generation calls).

**Running total: unchanged**
