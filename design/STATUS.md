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
- [ ] 6 Play-test — full play-test helper running (definition of done, 47 solutions → tools/solutions.mjs, whole-game run, every screen at 4 sizes, play it wrong, feedback, offline)
- [ ] 7 Final review
- [ ] 8 Polish
- [ ] 9 Wrap up

## Notes for --continue

- Design accepted after 2 review rounds. Mockups to reuse: nook-land-a.jpg = bg-nook-land (style anchor); purl-cat-a.png = purl-cat candidate; basket-a.png = basket candidate; cmp-giraffe-a.png = giraffe comparison; knit-swatch-a.jpg = 1 of the 3 look-target swatches.
- Confirm imagegen2 (gpt-image-2.6) pricing at the start of the art phase.
- Read comments/feedback on the shared design first.
