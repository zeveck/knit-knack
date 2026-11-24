# Knit Knack: brief

**In one sentence:** a cozy tap-to-knit clicker where every tap knits one real-looking stitch. You watch hats, mittens, cables, lace and little toys appear stitch by stitch in the yarn you pick, then hang them in your own gallery.

**The feeling:** calm and absorbing, like knitting by a lamp on a winter evening. Each tap feels a little satisfying, and finishing a piece feels proud. Nothing is ever lost and you're never rushed.

## What they asked for

- [ ] "tap to knit": the core of the game. **"The key is tap --> knit knit knit until done."**
- [ ] "each tap of the screen knits one stitch of the work, and you see it form over time"
- [ ] "a bunch of cool things to knit, with real patterns"
- [ ] "you have needles and yarn": needles and yarn are on screen and visibly do the knitting
- [ ] "can pick the color and you knit whatever"
- [ ] "You start with a few patterns, but can unlock more"
- [ ] "We should have like 47 maybe?" *(loose: 47 is the target; we plan exactly 47)*
- [ ] "When you finish, you can just 'display' the item in your gallery"
- [ ] "You can change the color and type of the yarn"
- [ ] "settable at any time, including on any stitch, so you can make things colored how you want"
- [ ] "infinite scart" (read as **infinite scarf**): "a scarf that gets longer and longer"
- [ ] "maybe has some fun graphics/facts to depict the length as it gets longer" *(loose: we plan illustrated size comparisons plus facts)*
- [ ] "Real patterns": "the knit graphics/animation should look like you're really knitting the thing you're knitting"
- [ ] "and reflect color choices"

## Who, where, how long

- Anyone who likes cozy, relaxing games, knitters and non-knitters alike. Knitters should recognize real stitches (knit Vs, purl bumps, ribbing, cables, eyelets, colorwork) and real pattern wording (k2, p2, C4F, yo, k2tog).
- Phones (portrait, one thumb) and desktop (mouse click or Space).
- Sessions of 2 to 15 minutes: finish a small piece, or chip at a big one. Coming back to a long project over days is part of it.

## Style references

No `--style` given. The look we're choosing: **a cozy hand-painted storybook knitting nook** (warm lamplight, an armchair, a window with snow, a basket of yarn). The knitting itself is drawn in code, stitch by stitch, so it looks like real knitted fabric in exactly the colors and yarns the player chose. Borrowed in spirit from cozy games and incremental clickers: the calm pacing, the steady small rewards, an unlock book. Nothing copied: every name, character and picture is original.

## Settings and decisions

- Platform both, web target, 2D, medium scope (47 patterns plus an endless scarf, one mechanic), $20 budget, 2 review rounds.
- `--plan-only`: stop after the reviewed design. `--share-design`: a design page with about $5 of mock pictures, on the plans page (synapticnoise.com/plans). `--art-sheet`: made once the art exists, when the game is built (`--continue`). `--feedback on`: a "Report a bug" button in the menu.
- Decisions made for them: "infinite scart" is the **infinite scarf**. One tap = one stitch exactly, with no auto-knitting upgrades, because they said tapping is the key. Patterns are shrunk to tap-friendly stitch counts (60 to about 1,500 taps), but each uses real stitches and real construction. Pattern charts carry color *slots* that the player fills with any yarn; a "follow the chart" helper switches skeins for colorwork, and the player can override any single stitch.
- Credit: Rich Conlan.
