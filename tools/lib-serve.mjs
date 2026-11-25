// lib-serve.mjs — shared by the browser tools: find playwright, serve game/ (no-store) on a free port.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = join(here, '..', 'game');

export async function loadPlaywright() {
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

export const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.txt': 'text/plain' };
export function serve(opts = {}) {
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


export async function waitGame(page) { await page.waitForFunction(() => window.__game && window.__game.state().screen === 'title', null, { timeout: 15000 }); await page.waitForTimeout(300); }
