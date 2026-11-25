// node tools/solutions.mjs [--url http://127.0.0.1:8123/] [--only id,id] [--from n] [--headed] [--size 1280x800]
//
// The play-test "solutions" (design: Tech plan, "Play-test solutions"), and the whole-game run.
// From a fresh save it plays every one of the 47 patterns in book order, in one browser:
//   - pattern 1 from the title, by one real tap (first launch: straight into the Garter Dishcloth);
//     the rest from the book: a real press on the card, Cast On (changing slot B through the picker
//     when the pattern has one), and a real press on "Cast on";
//   - knits every stitch with __game.knit(n, {fast: true}) in chunks, with, in between: a slot yarn
//     change, a recent yarn (key 6), a basket yarn (Freestyle), Follow chart again (key C), rip backs
//     (Backspace presses and rip(n)), and a reload mid-piece (the piece must come back stitch for stitch);
//   - finishes, then presses "Display it" or "Not now" (alternating), and checks the gallery copy's
//     piece(id) equals the w- piece taken just before the last stitch plus that stitch's yarn (hash too);
//   - (Change 2) on every round piece: a reload in the middle of a step (the hat's gather, the sock's
//     set-up round, the mitten's hold…), a rip back across a step boundary and knitting it again (and
//     un-joining: back to the cast-on and through the join again), with state().step checked against the
//     chart row at each stop;
//   - (Change 2) first, the migration replay: tools/fixtures/save-v1.json (a save from before the round
//     editions) loads with its gallery pieces' piece and bake hashes and Pip's worn layer unchanged, its
//     cozy sock in progress resumes at 150 of 273 on the flat edition, finishes after 123 taps and lands in
//     the gallery as ed 1, "Knit again" starts the round edition, and with patterns-flat-v1.json blocked
//     the piece shows "This piece needs its old pattern" with Try again and Back and nothing is lost;
//   - records every unlock toast (a MutationObserver that survives reloads), and at the end checks each
//     unlock toasted once, the ribbons, the "Book complete" page (once, and not again after a reload),
//     then reaches the scarf and stitch goals with scarfAddRows / addStitches so every rule has fired.
// Prints one line per pattern as it goes; stops after 3 failures in a row or 30 minutes.
// With no --url it serves game/ itself (no-store) on a free port.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = join(here, '..', 'game');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes(k);

async function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try { return await import(name); } catch { /* try the global install */ }
  }
  const root = execSync('npm root -g').toString().trim();
  const req = createRequire(join(root, 'noop.js'));
  for (const name of ['playwright', 'playwright-core', '@playwright/cli/node_modules/playwright']) {
    try { return req(name); } catch { /* next */ }
  }
  throw new Error('playwright not found (npm i -g playwright)');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.txt': 'text/plain' };
function serve() {
  return new Promise((res) => {
    const srv = createServer(async (rq, rs) => {
      try {
        let p = decodeURIComponent(rq.url.split('?')[0]);
        if (p.endsWith('/')) p += 'index.html';
        const f = normalize(join(gameDir, p));
        if (!f.startsWith(gameDir) || p.split('/').some((x) => x.startsWith('.'))) throw new Error('no');
        const st = await stat(f);
        let body = await readFile(f);
        const head = { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
        const range = rq.headers.range && /bytes=(\d*)-(\d*)/.exec(rq.headers.range);
        if (range) {
          const a = range[1] ? +range[1] : 0, b = range[2] ? +range[2] : st.size - 1;
          body = body.subarray(a, b + 1);
          rs.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': body.length });
        } else rs.writeHead(200, { ...head, 'Content-Length': body.length });
        rs.end(body);
      } catch { rs.writeHead(404); rs.end(); }
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

// the toast recorder: survives reloads (sessionStorage), records each toast's text once as it appears
const INIT = () => {
  const rec = () => {
    const host = document.getElementById('toasts');
    if (!host) return setTimeout(rec, 50);
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement) || !n.classList.contains('toast')) continue;
        const log = JSON.parse(sessionStorage.getItem('__toasts') || '[]');
        log.push({ t: (n.querySelector('.t') || n).textContent, at: Date.now() });
        sessionStorage.setItem('__toasts', JSON.stringify(log));
      }
    }).observe(host, { childList: true });
  };
  addEventListener('DOMContentLoaded', rec);
  // "Report a bug" must never open by accident: count every open
  addEventListener('DOMContentLoaded', () => {
    const fb = document.getElementById('report');
    if (fb && fb.open) { const o = fb.open.bind(fb); fb.open = (...a) => { sessionStorage.setItem('__reports', String(+(sessionStorage.getItem('__reports') || 0) + 1)); return o(...a); }; }
  });
};

const FNV = (ys) => { let h = 2166136261; for (const y of ys) { const s = `${y.color}|${y.type};`; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } } return (h >>> 0).toString(16); };
const SWATCHES = ['Sage', 'Honey', 'Navy', 'Cream', 'Plum', 'Teal'];

// ---------------------------------------------------------------- (Change 2) the migration replay
async function migration(browser, url, log) {
  const fx = readFileSync(join(here, 'fixtures', 'save-v1.json'), 'utf8');
  const hs = JSON.parse(readFileSync(join(here, 'fixtures', 'save-v1-hashes.json'), 'utf8'));
  const out = { ok: true, notes: [] };
  const bad = (m) => { out.ok = false; out.notes.push('FAIL ' + m); };
  for (const blocked of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    let block = blocked;
    await page.route('**/patterns-flat-v1.json', (r) => (block ? r.abort() : r.continue()));
    await page.addInitScript((s) => { if (!sessionStorage.getItem('__fx')) { sessionStorage.setItem('__fx', '1'); localStorage.clear(); localStorage.setItem('knitknack', s); } }, fx);
    const G = (fn, a) => page.evaluate(fn, a);
    await page.goto(url);
    await page.waitForFunction(() => window.__game && window.__game.state().screen === 'title', null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const st = () => G(() => window.__game.state());
    if (!blocked) {
      for (const [gid, h] of Object.entries(hs.gallery)) {
        const p = await G((g) => window.__game.piece(g), gid);
        const b = await G((g) => window.__game.bakeHash(g, 8), gid);
        const ed = await G((g) => import('./src/state.js').then((S) => (S.galleryById(g) || {}).ed), gid);
        if (!p || p.hash !== h.piece) bad(`${gid}: piece hash ${p && p.hash}, was ${h.piece}`);
        if (b !== h.bake) bad(`${gid}: bake hash ${b}, was ${h.bake}`);
        if (ed !== 1) bad(`${gid}: ed ${ed}`);
      }
      const worn = await G(() => window.__game.wornHash('g1', 'pip', 0.5));
      if (worn !== hs.worn.layer) bad(`Pip's worn beanie ${worn}, was ${hs.worn.layer}`);
      await G(() => window.__game.go('knit', 'cozy-sock'));
      await page.waitForTimeout(300);
      let s = await st();
      if (s.screen !== 'knit' || s.stitch !== 150 || s.total !== 273 || s.edition !== 1) bad(`the sock resumes on ${s.screen} at ${s.stitch} of ${s.total} (ed ${s.edition})`);
      await G(() => window.__game.knit(122, { fast: true }));
      s = await st();
      if (s.screen !== 'knit' || s.stitch !== 272) bad(`after 122 taps: ${s.screen} ${s.stitch}`);
      await G(() => window.__game.knit(1, { fast: true }));
      await page.waitForFunction(() => window.__game.state().screen === 'finished', null, { timeout: 8000 }).catch(() => bad('the old sock never finished'));
      s = await st();
      const gid = s.gallery[s.gallery.length - 1];
      const g = await G((g) => import('./src/state.js').then((S) => { const x = S.galleryById(g); return x && { ed: x.ed, n: x.yarns.length, pattern: x.pattern }; }), gid);
      if (!g || g.ed !== 1 || g.n !== 273 || g.pattern !== 'cozy-sock') bad(`the finished old sock: ${JSON.stringify(g)}`);
      await G(() => window.__game.go('knit', 'cozy-sock'));
      await page.waitForTimeout(300);
      s = await st();
      if (s.screen !== 'knit' || s.stitch !== 0 || s.edition !== 2 || !(s.total > 600)) bad(`Knit again: ${s.screen} ${s.stitch} of ${s.total} (ed ${s.edition})`);
      out.notes.push(`hashes equal, Pip's fit equal, sock 150/273 -> finished as ed 1, Knit again ${s.total} sts`);
    } else {
      // the flat edition can't load: gallery pieces still show (plain swatches), the old piece asks
      const n = (await st()).gallery.length;
      await G(() => window.__game.go('gallery'));
      await page.waitForTimeout(600);
      await G(() => window.__game.go('knit', 'cozy-sock'));
      await page.waitForTimeout(400);
      let s = await st();
      const text = await G(() => (document.querySelector('.sheet.in, .sheet') || {}).textContent || '');
      if (s.sheet !== 'old-pattern' || !/needs its old pattern/.test(text) || !/Try again/.test(text) || !/Back/.test(text)) bad(`blocked: sheet ${s.sheet} "${text.slice(0, 80)}"`);
      await G(() => [...document.querySelectorAll('.sheet button')].find((b) => b.textContent === 'Try again').click());
      await page.waitForTimeout(600);
      s = await st();
      if (s.sheet !== 'old-pattern') bad('Try again (still blocked) closed the sheet');
      block = false;
      await G(() => [...document.querySelectorAll('.sheet button')].find((b) => b.textContent === 'Try again').click());
      await page.waitForFunction(() => window.__game.state().screen === 'knit', null, { timeout: 5000 }).catch(() => {});
      s = await st();
      if (s.screen !== 'knit' || s.stitch !== 150 || s.total !== 273) bad(`Try again once it loads: ${s.screen} ${s.stitch} of ${s.total}`);
      if (s.gallery.length !== n) bad('a gallery piece was lost');
      out.notes.push('blocked: "This piece needs its old pattern · Try again · Back", then Try again resumes at 150/273');
    }
    if (errs.length) bad('page errors: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  log(`migration replay ${out.ok ? 'OK' : 'FAIL'}: ${out.notes.join('; ')}`);
  return out;
}

async function main() {
  const pw = await loadPlaywright();
  let srv = null, url = opt('--url');
  if (!url) { srv = await serve(); url = `http://127.0.0.1:${srv.address().port}/`; }
  const [W, H] = (opt('--size', '1280x800')).split('x').map(Number);
  const only = opt('--only') ? opt('--only').split(',') : null;
  const browser = await pw.chromium.launch({ headless: !has('--headed'), args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  await page.addInitScript(INIT);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const t0 = Date.now();
  const log = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s] ${s}`);
  const mig = has('--no-migration') ? { ok: true } : await migration(browser, url, log);
  if (has('--migration')) { await browser.close(); if (srv) srv.close(); process.exit(mig.ok ? 0 : 1); }
  const G = (fn, a) => page.evaluate(fn, a);
  const state = () => G(() => window.__game.state());
  const press = async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(110); await page.mouse.up(); };
  const pressSel = async (sel, text) => {
    const b = await G(([sel, text]) => {
      const els = [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length);
      const e = text ? els.find((x) => x.textContent.trim().includes(text)) : els[0];
      if (!e) return null;
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2];
    }, [sel, text]);
    if (!b) throw new Error(`nothing to press: ${sel} ${text || ''}`);
    await page.waitForTimeout(60);
    await press(b[0], b[1]);
  };
  const waitScreen = async (name, ms = 8000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if ((await G(() => window.__game && window.__game.state().screen).catch(() => null)) === name) return true; await page.waitForTimeout(80); }
    throw new Error(`screen ${name} never came (on ${await G(() => window.__game && window.__game.state().screen).catch(() => '?')})`);
  };
  const loadGame = async () => { await page.waitForFunction(() => window.__game && window.__game.state().screen === 'title', null, { timeout: 15000 }); await page.waitForTimeout(300); };

  // fresh save
  await page.goto(url);
  await G(() => { localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('knitknack-scarf'); });
  await page.reload();
  await loadGame();

  const book = await G(() => import('./src/state.js').then((S) => S.BOOK.map((p) => ({ id: p.id, name: p.name, chapter: p.chapter, wear: !!p.wear }))));
  const results = [];
  let fails = 0;
  for (let i = 0; i < book.length; i++) {
    const p = book[i];
    if (only && !only.includes(p.id)) continue;
    if (Date.now() - t0 > 30 * 60 * 1000) { log('time limit reached'); break; }
    const r = { n: i + 1, id: p.id, ok: false, notes: [] };
    const ts = Date.now();
    try {
      // ---- cast on
      if (i === 0) {
        await pressSel('#tap-start');
        await waitScreen('knit');
        const s = await state();
        if (s.pattern !== p.id || s.stitch !== 0) throw new Error(`first tap opened ${s.pattern} at ${s.stitch}`);
        r.notes.push('first launch: one tap');
      } else {
        const sc = (await state()).screen;
        if (sc !== 'book') { await G(() => window.__game.go('book')); await waitScreen('book'); }
        await G((ch) => window.__game.go('book', { chapter: ch }), p.chapter);
        await page.waitForTimeout(150);
        await pressSel(`.card[data-id="${p.id}"] .card-open`);
        await waitScreen('caston');
        const hasB = await G(() => [...document.querySelectorAll('[data-screen=caston] .slot-row')].length);
        if (hasB >= 2) {
          await pressSel('[data-screen=caston] .slot-row[aria-label="Change yarn B"]');
          await page.waitForSelector('.sheet.in .swatches .sw');
          await page.waitForTimeout(500); // the sheet slides in
          await pressSel(`.sheet .swatches .sw[aria-label="${SWATCHES[i % SWATCHES.length]}"]`).catch(() => pressSel('.sheet .swatches .sw'));
          await page.waitForTimeout(300);
          if ((await state()).sheet) throw new Error('the picker stayed open after a swatch was picked');
          const bName = await G(() => document.querySelector('[data-screen=caston] .slot-row[aria-label="Change yarn B"] .nm').firstChild.textContent);
          if (!bName.startsWith(SWATCHES[i % SWATCHES.length])) throw new Error(`slot B shows ${bName}`);
          r.notes.push(`B: ${bName}`);
        }
        await pressSel('[data-screen=caston] button', 'Cast on');
        await waitScreen('knit');
      }
      let s = await state();
      const T = s.total;
      const pid = s.pieceId;
      const chunk = (f) => Math.max(1, Math.floor(T * f));
      const K = (n) => G((n) => { window.__game.knit(n, { fast: true }); return window.__game.state().stitch; }, n);
      // ---- chunk 1, then a slot change
      await K(chunk(0.2));
      await G(() => window.__game.setYarn('A', '#6f8f6a', 'cotton'));
      await K(chunk(0.1));
      // ---- a recent yarn by its key (Freestyle)
      await page.keyboard.press('6');
      s = await state();
      if (s.mode !== 'freestyle') r.notes.push('key 6 did not switch to Freestyle');
      await K(chunk(0.1));
      // ---- rip back: 3 presses and rip(5)
      const before = (await state()).stitch;
      for (let k = 0; k < 3; k++) { await page.keyboard.press('Backspace'); await page.waitForTimeout(40); }
      await G(() => window.__game.rip(5));
      const after = (await state()).stitch;
      if (after !== before - 8) throw new Error(`rip back: ${before} -> ${after}, wanted ${before - 8}`);
      // ---- a basket yarn (Freestyle): a custom color in a yarn type that's unlocked
      const types = s.unlockedYarns || ['wool'];
      const ty = types[i % types.length];
      const hex = '#' + ((i * 2654435761) >>> 8 & 0xffffff).toString(16).padStart(6, '0');
      await G(([hex, ty]) => window.__game.freestyle(hex, ty), [hex, ty]);
      await K(chunk(0.15));
      // ---- back to the chart
      await page.keyboard.press('c');
      if ((await state()).mode !== 'follow') r.notes.push('key C did not return to Follow chart');
      await K(chunk(0.15));
      // ---- reload mid-piece
      const pre = await G((id) => window.__game.piece(id), pid);
      await page.reload();
      await loadGame();
      await pressSel('#tap-start');
      await waitScreen('book');
      await pressSel('[data-screen=book] .continue');
      await waitScreen('knit');
      const post = await G((id) => window.__game.piece(id), pid);
      s = await state();
      if (!post || post.hash !== pre.hash || post.count !== pre.count || s.stitch !== pre.count || s.pattern !== p.id) throw new Error(`reload lost the piece: ${pre.count}/${pre.hash} -> ${post && post.count}/${post && post.hash} (stitch ${s.stitch})`);
      // ---- (Change 2) a round piece's steps: reload mid-step, rip back across a step boundary, un-join
      const steps = await G((id) => Promise.all([import('./src/render.js'), import('./src/state.js')]).then(([R, S]) => {
        const ch = R.chartOf(S.patternById(id));
        const out = [];
        if (ch.round) for (let r = 1; r <= ch.height; r++) { const row = ch.row(r); if (row.step) out.push({ r, kind: row.step.kind, start: ch.rowStart(r), n: row.map.length }); }
        return out;
      }), p.id);
      if (steps.length) {
        const goTo = async (i) => { const at = (await state()).stitch; if (i > at) await K(i - at); else if (i < at) await G((n) => window.__game.rip(n), at - i); const now = (await state()).stitch; if (now !== i) throw new Error(`could not get to stitch ${i} (at ${now})`); };
        const checkStep = async (i, where) => {
          const st = await state();
          const sp = steps.find((x) => i >= x.start && i < x.start + x.n);
          if ((st.step || null) !== (sp ? sp.kind : null) || (sp && st.stepTap !== i - sp.start)) throw new Error(`${where}: state().step ${st.step}/${st.stepTap} at ${i}, the chart has ${sp ? sp.kind + '/' + (i - sp.start) : 'none'}`);
        };
        const pref = ['gather', 'setup', 'hold', 'joining', 'thumb', 'graft', 'graftUnderarm', 'seam', 'centre', 'markers'];
        const sp = pref.map((k) => steps.find((x) => x.kind === k)).find(Boolean) || steps[0];
        const mid = sp.start + Math.floor(sp.n / 2);
        await goTo(mid); await checkStep(mid, 'mid-step');
        const pre2 = await G((id) => window.__game.piece(id), pid);
        await page.reload(); await loadGame(); await pressSel('#tap-start'); await waitScreen('book'); await pressSel('[data-screen=book] .continue'); await waitScreen('knit');
        const post2 = await G((id) => window.__game.piece(id), pid);
        if (!post2 || post2.hash !== pre2.hash || (await state()).stitch !== mid) throw new Error(`reload mid-${sp.kind} lost the piece`);
        await checkStep(mid, `after the reload mid-${sp.kind}`);
        // rip back across the step's start, then knit through it again
        if (sp.start > 0) { await goTo(sp.start - 1); await checkStep(sp.start - 1, `ripped back before the ${sp.kind}`); }
        await goTo(Math.min(T - 1, sp.start + sp.n)); await checkStep(Math.min(T - 1, sp.start + sp.n), `knit through the ${sp.kind} again`);
        // un-join: back to the cast-on, then through the join again
        const join = steps.find((x) => x.kind === 'join');
        if (join) { await goTo(0); await checkStep(0, 'ripped back to the join'); await goTo(2); await checkStep(2, 'joined again'); }
        r.notes.push(`steps ${[...new Set(steps.map((x) => x.kind))].join(', ')}; reload mid-${sp.kind}${join ? ', un-joined' : ''}`);
        s = await state();
      }
      // ---- knit to the last stitch, then the last one
      await K(T - 1 - s.stitch);
      s = await state();
      if (s.stitch !== T - 1) throw new Error(`at ${s.stitch} of ${T} before the last stitch`);
      const last = await G((id) => window.__game.piece(id), pid);
      const lastYarn = s.yarn;
      await G(() => window.__game.knit(1, { fast: true }));
      await waitScreen('finished');
      const gs = await state();
      const gid = gs.gallery[gs.gallery.length - 1];
      const gp = await G((id) => window.__game.piece(id), gid);
      const want = [...last.yarns, { color: lastYarn.color, type: lastYarn.type }];
      if (gp.count !== T || FNV(want) !== gp.hash || JSON.stringify(gp.yarns) !== JSON.stringify(want)) throw new Error(`gallery copy ${gid} differs from what was knit (${gp.count} vs ${T})`);
      r.gid = gid; r.hash = gp.hash; r.stitches = T;
      // ---- display it, or not now
      await page.waitForFunction(() => document.querySelector('[data-screen=finished] .btns.show'), null, { timeout: 5000 });
      await page.waitForTimeout(150);
      if (i % 3 === 2) {
        await pressSel('[data-screen=finished] button', 'Not now');
        await waitScreen('book');
        const st = await state();
        if (!st.basket.includes(gid)) throw new Error(`Not now: ${gid} not in the Basket`);
        r.notes.push('Not now -> Basket');
      } else {
        await pressSel('[data-screen=finished] button', 'Display it');
        await waitScreen('gallery');
        const st = await state();
        if (!st.wall.includes(gid)) throw new Error(`Display it: ${gid} not on the wall`);
        await page.waitForTimeout(500);
        await pressSel('[data-screen=gallery] button', 'Back to the book');
        await waitScreen('book');
      }
      r.ok = true; fails = 0;
    } catch (e) {
      r.error = String(e.message || e); fails++;
      if (opt('--fail-shots')) await page.screenshot({ path: join(opt('--fail-shots'), `fail-${p.id}.png`) }).catch(() => {});
      try { await G(() => window.__game.go('book')); } catch { /* */ }
    }
    r.secs = +((Date.now() - ts) / 1000).toFixed(1);
    results.push(r);
    log(`${String(r.n).padStart(2)} ${p.id.padEnd(26)} ${r.ok ? 'OK  ' : 'FAIL'} ${r.stitches || ''} ${r.hash || ''} ${r.secs}s ${r.error || r.notes.join('; ')}`);
    if (fails >= 3) { log('3 failures in a row: stopping'); break; }
  }

  // ---- the whole game: unlocks, ribbons, Book complete
  const end = {};
  if (!only) {
    await page.waitForTimeout(500);
    end.bookComplete = await G(() => ({ sheet: window.__game.state().sheet, text: (document.querySelector('.book-complete h2') || {}).textContent || null }));
    if (end.bookComplete.sheet === 'complete') await pressSel('.book-complete button', 'Hooray');
    end.ribbons = await G(() => [...document.querySelectorAll('.ribbons .ribbon')].map((r) => r.className));
    await page.reload(); await loadGame(); await pressSel('#tap-start'); await waitScreen('book'); await page.waitForTimeout(600);
    end.bookCompleteAgain = (await state()).sheet === 'complete';
    // goals play can't reach on the book alone: scarf length and lifetime stitches
    await G(() => window.__game.go('scarf')); await waitScreen('scarf');
    await G(() => window.__game.scarfAddRows(1000, { color: '#d9a441', type: 'wool' }, 'garter'));
    await G(() => window.__game.addStitches(Math.max(0, 20000 - window.__game.state().lifetimeStitches)));
    await page.waitForTimeout(400);
    // let the toast queue drain
    for (let k = 0; k < 120; k++) { const q = (await state()).toasts; if (!q.showing && !q.queued.length) break; await page.waitForTimeout(500); }
    end.rules = await G(() => import('./src/state.js').then((S) => S.UNLOCK_RULES.filter((u) => !u.rule.start).map((u) => ({ id: u.id, met: S.ruleMet(u.rule), seen: S.get().seenUnlocks.filter((x) => x === u.id).length }))));
    end.toastLog = await G(() => JSON.parse(sessionStorage.getItem('__toasts') || '[]').map((t) => t.t));
    end.notOnce = end.rules.filter((u) => !u.met || u.seen !== 1).map((u) => u.id);
    const dup = end.toastLog.filter((t, i, a) => a.indexOf(t) !== i);
    end.duplicateToasts = dup;
    end.state = await G(() => { const s = window.__game.state(); return { piecesFinished: s.piecesFinished, lifetime: s.lifetimeStitches, unlockedPatterns: s.unlockedPatterns, yarns: s.unlockedYarns, needles: s.unlocked.needles.length, dolls: s.unlocked.dolls, gallery: s.gallery.length, wall: s.wall.length, basket: s.basket.length }; });
  }
  end.reportOpens = await G(() => +(sessionStorage.getItem('__reports') || 0));
  end.errors = errors;
  const okN = results.filter((r) => r.ok).length;
  console.log(JSON.stringify({ patterns: `${okN}/${results.length}`, ...end }, null, 1));
  await browser.close();
  if (srv) srv.close();
  console.log(`migration replay: ${mig.ok ? 'OK' : 'FAILED'}`);
  process.exit(okN === results.length && mig.ok && !(end.notOnce || []).length && !errors.length && !end.reportOpens ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
