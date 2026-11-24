# Knit Knack

## Requests

1. `A game in which you tap to knit. We need a bunch of cool things to knit, with real patterns, and the idea is you have needles and yarn and can pick the color and you knit whatever. You start with a few patterns, but can unlock more. We should have like 47 maybe? But when you "play" it's just a clicker -- each tap of the screen knits one stitch of the work, and you see it form over time. When you finish, you can just "display" the item in your gallery. You can change the color and type of the yarn. They are settable at any time, including on any stitch, so you can make things colored how you want. The key is tap --> knit knit knit until done. You can also work on your "infinite scart" which is just a scarf that gets longer and longer and maybe has some fun graphics/facts to depict the length as it gets longer and longer. --plan-only --share-design --art-sheet --feedback Real patterns the knit graphics/animation should look like you're really knitting the thing you're knitting and reflect color choices.`
2. `yes` (to adding the plan to the plans page)
3. `--art-sheet --budget 50 --out knit-knack --feedback it's critical they be real patterns, real knits, and tapping produces good looking knit animations that track and help you feel like you're making the thing and it looks right and reflects your colors and yarn. you should be able to unlock needles and accessories and such. maybe small dolls to put your knits on.` (interrupted by the person and re-sent as 4)
4. `--art-sheet --budget 50 --out knit-knack --feedback it's critical they be real patterns, real knits, and tapping produces good looking knit animations that track and help you feel like you're making the thing and it looks right and reflects your colors and yarn. you should be able to unlock needles and accessories and such. maybe small dolls to put your knits on. --publish --no-confirm`

## Settings

- Platform: both (default)
- Target: web
- 3D: no (2D)
- Scope: medium (judged from the request: 47 patterns + infinite scarf, but a single clicker mechanic)
- Budget: $50 (raised by request 4; includes the ~$0.51 already spent on mockups)
- Rounds: 2
- Plan only: was yes (request 1); now building (request 4, treated as --continue with notes since --out names this planned game)
- Share design: page (plain --share-design); plans page is on, so the page goes on the plans page
- Mockups: $5
- Art sheet: yes (made once the art is ready, on --continue; with the plans page on it goes to plans/knit-knack/art/)
- Feedback: on
- Publish: yes, at the end (request 4), with --no-confirm; GAMEGEN_DOMAIN synapticnoise.com, gallery zeveck/synapticnoise
- Making-of: on (GAMEGEN_MAKING_OF)
- Plans page: GAMEGEN_PLANS=synapticnoise.com/plans (gallery zeveck/synapticnoise) — Plans page: yes
- Credit: Rich Conlan (from GAMEGEN_CREDIT)
- ElevenLabs tier: creator (paid: no credit line)

- GitHub preview image: to upload (none set)
- Repo: zeveck/knit-knack (public), address https://knitknack.synapticnoise.com

## Available

openai (imagegen2, anim8gen), gemini (nanogen), elevenlabs (audiogen), node, python3+Pillow, playwright-cli. Plugins up to date.

## Phases

- [x] 1 Brief — BRIEF.md written
- [x] 2 Design — GAME_DESIGN.md v1: 47 patterns, scarf, gallery, medium
- [x] 3 Design review — 2 rounds; 6 must-fix and 33 should-fix findings, all fixed; ~$14 estimate
- [x] Share design + mockups — 5 mock pictures (~$0.51, design/mockups/). Design shared: https://synapticnoise.com/plans/knit-knack/, as a page on the plans page (gallery repo zeveck/synapticnoise, plans/knit-knack/).
- [x] Plans page card — Plans page: yes (approved 2026-11-24). Card "Planned" at https://synapticnoise.com/plans/ (commit e4ec742).
- [x] Change 1 (request 4) — CHANGE_1 folded into GAME_DESIGN.md after one review round (Player 6, Art 7, Builder 8 should-fix; all fixed). ~19,000 stitches, 12 needles, accessories, 7 dolls, written patterns. Estimate ~$18 of $50.
- [x] 4 Art and audio — all accepted: ~48 images, Purl's cheer (4 frames), 5 songs, 22 sounds; ~$12.33 of $50 (design/ASSETS.md). Art sheet deferred to wrap-up (after publish, so it links the live site).
- [x] 5 Build — all features built: chart/stitches/work (stitch lab), app shell + knitting screen, 47 patterns (tech-edited and fixed, commit aba0793: bind-off counts, row-start CO, parts, whale, octopus, cardigan, bunny safety note, drape waves for chevron/Old Shale, heart pillow width bug), dolls/bag/scarf/preview card.
- [x] 6 Play-test — DoD passes (47/47 twice, hashes match; whole-game run, 43 unlocks once each; 100k scarf; feedback; offline). Fixed in eca7ca4, b927d53, ae999e6, 587fcde, 84ca10a. tools/solutions.mjs replays all 47. Leftover small layout items: doll shelf (landscape tag, desktop arm overlap, phone empty wood), landscape wall tag size, 1920 empty space, ruler label formats/size, scarf HUD over knitting on phone, Clementine orphan, right needle under desktop panel, grouped toasts.
- [x] 7 Final review — round 1: 1 must-fix + 8 should (fixed 993681e, 3acda60); round 2: no must-fix, 7 should + lead notes (fixed 10f0d9e, 5eafc0d, a9e1260, deff481: purl underlay in yarn shade, strand, start zoom fit + remembered, real-stitch preview card, toys plush + shelf, friendly blurbs, finish turns into the object, canvas cap). solutions.mjs 47/47.
- [x] 8 Polish — 12 should-fix + 6 nice fixed (7e4f77b), rescanned at 4 sizes, solutions 47/47.
- [ ] 9 Wrap up — wrap-up helper: github-social, social card check, README (making-of), media screenshots, art sheet; then publish to knitknack.synapticnoise.com, gallery, plans card + design page update

## Notes for --continue

- Design accepted after 2 review rounds. Mockups to reuse: nook-land-a.jpg = bg-nook-land (style anchor); purl-cat-a.png = purl-cat candidate; basket-a.png = basket candidate; cmp-giraffe-a.png = giraffe comparison; knit-swatch-a.jpg = 1 of the 3 look-target swatches.
- Confirm imagegen2 (gpt-image-2.6) pricing at the start of the art phase.
- Read comments/feedback on the shared design first.
