# Knit Knack

## Requests

1. `A game in which you tap to knit. We need a bunch of cool things to knit, with real patterns, and the idea is you have needles and yarn and can pick the color and you knit whatever. You start with a few patterns, but can unlock more. We should have like 47 maybe? But when you "play" it's just a clicker -- each tap of the screen knits one stitch of the work, and you see it form over time. When you finish, you can just "display" the item in your gallery. You can change the color and type of the yarn. They are settable at any time, including on any stitch, so you can make things colored how you want. The key is tap --> knit knit knit until done. You can also work on your "infinite scart" which is just a scarf that gets longer and longer and maybe has some fun graphics/facts to depict the length as it gets longer and longer. --plan-only --share-design --art-sheet --feedback Real patterns the knit graphics/animation should look like you're really knitting the thing you're knitting and reflect color choices.`
2. `yes` (to adding the plan to the plans page)
3. `--art-sheet --budget 50 --out knit-knack --feedback it's critical they be real patterns, real knits, and tapping produces good looking knit animations that track and help you feel like you're making the thing and it looks right and reflects your colors and yarn. you should be able to unlock needles and accessories and such. maybe small dolls to put your knits on.` (interrupted by the person and re-sent as 4)
4. `--art-sheet --budget 50 --out knit-knack --feedback it's critical they be real patterns, real knits, and tapping produces good looking knit animations that track and help you feel like you're making the thing and it looks right and reflects your colors and yarn. you should be able to unlock needles and accessories and such. maybe small dolls to put your knits on. --publish --no-confirm`
5. `--change knit hats, socks, mittens, mitts, cowls, headbands and the sweater's body in the round as real knitters do: show the work as a tube on circular needles (or double-pointed needles for socks and mittens), word their patterns by round ("Rnd", every round from the right side, garter as knit and purl rounds), and finish them without seams (crown gathered, heel turned, toe grafted), so they wear on the dolls as true tubes. Keep flat what's really knit flat (dishcloths, coasters, blankets, scarves, the toys' pieces). Fix anything else we knit flat that shouldn't be. Playability and a strong feel of really knitting matter more than proving every rule: loosen the pattern checks where they get in the way, but keep the written patterns honest. Also give the cables a more raised, rope-like look.`
6. `--change let finished toys and dolls sit together in a little cozy room scene you can arrange: drag them onto a rug, an armchair, shelves and a window seat, dressed in what you knit, with the arrangement saved; unlock a few room pieces as you knit`
7. `--fix all --publish --no-confirm` — #1: Swipe back (https://github.com/zeveck/knit-knack/issues/1); #2: Cat (https://github.com/zeveck/knit-knack/issues/2); #3: Menu location (https://github.com/zeveck/knit-knack/issues/3); #4: Unlock all toggle (https://github.com/zeveck/knit-knack/issues/4)
8. `--fix all --publish --no-confirm` — no open issues this time; publishes changes 2 and 3
9. `Do all three gamegen changes you suggested then publish no-confirm.` — the three suggested changes, in Claude's words:
   - 9a `--change repaint the cozy room's landscape picture with more space between the shelves so dolls up top are bigger`
   - 9b `--change make pillows and toys look soft and stuffed in the gallery close-up too`
   - 9c `--change let the infinite scarf hang in the cozy room, growing across the wall as it gets longer`
   then publish (--no-confirm)

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
- [x] 9 Wrap up — README (making-of), media/ screenshots, social card + github-social.jpg, Pages workflow, title links. Published 2026-11-24 at https://knitknack.synapticnoise.com (repo zeveck/knit-knack, public; DNS CNAME added at GoDaddy; HTTPS on; Report a bug → zeveck/knit-knack issues). Live game checked on desktop and iPhone 15, no errors. Gallery: added at the top of synapticnoise.com. Plans card: Published (Play, Plan, Design, Art). Design page updated to the game as built. Art sheet: https://synapticnoise.com/plans/knit-knack/art/ (art-sheet.py output patched for phone overflow: grid minmax(min(var(--w),100%)) and scroll-margin; rebuild loses it).

## Notes for --continue

- Design accepted after 2 review rounds. Mockups to reuse: nook-land-a.jpg = bg-nook-land (style anchor); purl-cat-a.png = purl-cat candidate; basket-a.png = basket candidate; cmp-giraffe-a.png = giraffe comparison; knit-swatch-a.jpg = 1 of the 3 look-target swatches.
- Confirm imagegen2 (gpt-image-2.6) pricing at the start of the art phase.
- Read comments/feedback on the shared design first.

- Note: bulk design/screenshots (~580 MB) are kept out of git; a curated set (pattern sheets, doll sheet, stitch lab) is committed. Earlier committed verification screenshots were removed from the unpublished history before the first push.
- Spending: about $12.33 of $50 (design/ASSETS.md).

## Change 2 (request 5): knitting in the round

- [x] Design change + one review round — CHANGE_2.md (Player, Builder, knitting expert), folded into GAME_DESIGN.md
- [x] Build (tube view, circular/DPN needles, round wording, seamless finishing, round patterns, worn tubes, raised cables) — parts A, B1, B2 done; 19 patterns by round, book 24,660 sts
- [x] Play-test changed parts + all 47 replays — final review (1 must-fix, fixed), fix and polish passes; solutions 47/47 + migration replay
- [x] Final check, README/design page/plans update (publish only when asked) — done in the wrap-up below; not published
Budget for this change: $20 (default).

## Change 3 (request 6): the cozy room

- [x] Design change + one review round — CHANGE_3.md reviewed, folded into GAME_DESIGN.md
- [x] Assets (room backdrop, furniture pieces), within its own $20 — room-land/port, 4 fronts, 7 pieces, ~$0.86 (ASSETS.md)
- [x] Build after change 2 lands (room screen, drag and drop, unlocks, save) — e039cdd, then room fixes 86cae11, cb61843, 058ac0b
- [x] Play-test changed parts + all replays — room review (no must-fix) and polish pass; solutions 47/47 + migration

## Wrap-up (changes 2 and 3)

- [x] Wrap-up — README (tour: in the round, the room; room controls; requests 5 and 6 quoted; new art), 5 new screenshots in media/screenshots/, art sheet rebuilt (room places, room pieces, Purl's coats, sfx-join; phone fix reapplied) and design page + plans card updated in the gallery clone, committed locally only. Not published or pushed: the art page's room pictures and sfx-join link to knitknack.synapticnoise.com, so they show once the game is published.

## Fixes (request 7): issues #1–#4, then publish

- [x] #1 swipe back (cdcba51 + 60fb57f), #3 menu top-right / rip back top-left (a67bb0d) — second check done
- [x] #2 cat coat/name/petting (ef81f17 + 4bd9a8b neutral captions), #4 unlock-all setting (e117309)
- [x] Replays 47/47 ✓; published 2026-11-25 (deploy c985fa3), issues #1–#4 closed, live check on iPhone 15 OK
Order: these land before changes 2 and 3 are built.

## Publish (request 8)

- [x] Published 2026-11-26: changes 2 and 3 pushed (3146fb3, deploy OK), live check on desktop 1280x800 and iPhone 15 (title, first launch, Cozy Sock on DPNs, finish, room: no errors, text scan clean); plans design + art pages pushed (gallery 278e041) and live. Gallery entry unchanged (same title, tagline, card).

## Changes 9a–9c (request 9), then publish

- [ ] 9b plush look in the gallery close-up (art/render only) — helper RUNNING (progress plush9.md)
- [ ] 9a+9c spec (CHANGE_4.md) + one short review round
- [ ] 9a repaint room-land with more shelf space (own $20) + 9c scarf in the room — build
- [ ] Play-test changed parts; solutions 47/47 + migration; polish check
- [ ] README/design/art page updates; publish; live check

## Handoff (2026-11-25 02:46 UTC, before context compaction)

**Where things stand**
- Live: https://knitknack.synapticnoise.com at deploy c985fa3 (fixes #1–#4 published, issues closed). Repo zeveck/knit-knack, branch main.
- Change 2 (knitting in the round), spec design/CHANGE_2.md (reviewed; findings in .gamegen/review/c2-*.md):
  - Part A (engine, patterns, migration) DONE in commits cd2d564, c0ee96c, cc7b801, 2de1268 (expert review clean): round model in chart.js (rsOf, round row map, step rows, Rnd wording, parser), patternKit helpers, 19 patterns rebuilt (book 24,637 sts), editions + patterns-flat-v1.json + v1 save fixture, check-chart 110 checks, check-patterns 47/47, solutions.mjs 47/47 + migration replay.
  - Part A's API for part B is documented at the top of game/src/chart.js.
  - Part B2 (finished look: tube.js shape maps, worn tubes, card/gallery/finish objects) DONE in 6f9db01 (migration hashes unchanged). Part B1 (knitting view, roundView.js: tube, needles, steps, raised cables, sfx-join) DONE in c0f0f28, a24055a, 34cb20a; weak spots: stepped crowns/toes, cast-on notch at the marker, fragmented frozen heel view, untidy pre-join/yoke cable path, graft view unchecked, DPN swap not animated, slip stitch not elongated, ghost not via tube.js. Change 2 final review DONE (.gamegen/review/c2-final-play.md: 1 must-fix = sock view falls apart from the heel; c2-final-bugs.md); change-2 fix pass DONE (2ab8929, cc58d19, 6f11e39, 2a16f9b; solutions 47/47 + migration). Left: jagged tube edges where ring size changes, ragged top of heel cup, jog briefly at the front at round start, subtle yoke sleeve stubs, cable headband twists like dashes on the doll, soft top zoom on round pieces, stand-in charts in Continue % / Read the pattern. Room BUILT (e039cdd: room.js, roomRules.js, galTabs.js, room.css; GAME_DESIGN folded); room review DONE (.gamegen/review/c3-final.md, no must-fix); room fix pass DONE (86cae11 plush, cb61843 drapes, 058ac0b room fixes; left: landscape top-shelf doll 48 px, gallery pillows still flat). Polish review DONE (.gamegen/review/polish2.md: book/Cast On round previews flat, shredded tube edges, Basil blindfold, toasts over wall, Place it off-screen, Look closer landscape, sock finish crop + nice); polish fix DONE (2f3f7ec…3ec8322; solutions 47/47 + migration; note: round view frame ~23–35 ms in headless software rendering). Wrap-up DONE (progress wrapup2.md): README/making-of (requests 5–7), screenshots, design page/plans card/art sheet refreshed in the gallery clone (local commits, not pushed); changes 2–3 published 2026-11-26 (request 8). Room build was (progress .gamegen/progress/room.md; it may only add drapeOnto + noLabel to worn.js). Next: change-2 fix pass (avoid room files), then room review.
  - Part B STARTED 2026-11-25 as two helpers: B1 knitting view (work.js, stitches.js, knit.js, scarf.js; progress .gamegen/progress/round-b1.md) and B2 finished look (new tube.js, worn.js, cardRenderer.js, render/gallery bake; progress round-b2.md). Scope: the turning-tube view (column-strip projection, needle tip travels, eased turns every 4–6 sts / per DPN, left-to-right front motion, marker charm, end-of-round beat, jog at the back, flat sections frozen), circular cable / DPN needles, step animations, tube.js shape maps (dome, ring, sock, mitten, body; back + front halves) for worn/card/gallery/ghost, raised-cable relief pass, first-round tip, sfx-join (~$0.25). Spec sections B, E, F, I.
- Change 3 (the cozy room), spec design/CHANGE_3.md (reviewed; findings .gamegen/review/c3-*.md). Art DONE and UNTRACKED (commit with the room build): game/assets/bg/room-{land,port}.webp + .json + room-*-front-*.png, items/room-*.png, tools/cut-room-fronts.py (~$0.86). Build after change 2 part B (drapeOnto needs the new worn.js). Then fold CHANGE_3's "To fold into GAME_DESIGN.md" list into GAME_DESIGN.md.
- After both: play-test changed parts + node tools/solutions.mjs (all 47 + migration), final review (playtester + bug hunter), polish pass, README/making-of (requests 5 and 6), shared design page + plans card + art sheet update. Publishing changes 2 and 3 was NOT requested: ask, or wait for --publish.

**Gotchas**
- `pkill -f <pattern>` matching your own command line kills the Bash call (exit 144): use pgrep with a [b]racket trick or kill by PID.
- design/screenshots is gitignored except a curated few; never commit bulk screenshots (history was rewritten once to drop 580 MB before the first push).
- Local git identity: commit with `-c user.name=gamegen -c user.email=gamegen@users.noreply.github.com`; the gallery repo (zeveck/synapticnoise, cloned at .gamegen/gallery) uses Rich Conlan <2100661+zeveck@users.noreply.github.com>.
- The art page in plans/knit-knack/art/ was hand-patched for phones (gamegen issue #56); a rebuild loses the patch.
- Spending: original $12.33 of $50; change 3 art $0.86 of its $20.
