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
