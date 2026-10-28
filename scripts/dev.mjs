// Dev server: builds wwwroot/, serves dist/ with live reload and rebuilds on
// changes in wwwroot/ or scripts/ (debounced fs.watch, recursive).
// The reload script and SSE stream exist only here: nothing extra is written
// to dist/, and the CSP ('self') still holds because both are same-origin.

import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasFlasher, languageCodes, rootRedirect } from './lib/preview.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'wwwroot');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';
const DEBOUNCE_MS = 150;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.bin': 'application/octet-stream',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const NO_STORE = 'no-store';
// Security headers mirrored from wwwroot/.htaccess (S60): the local preview
// should behave like production. Flasher pages (detected from the served
// HTML) get the style-src 'self' 'unsafe-inline' CSP exception, as in .htaccess.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), serial=(self)',
  'Strict-Transport-Security': 'max-age=86400',
};
const FLASHER_CSP = "default-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";
// Serves only while `npm run dev` runs; never part of dist/.
const RELOAD_SCRIPT = '<script src="/__reload.js"></script>';
const RELOAD_JS = `const source = new EventSource('/__reload');\nsource.addEventListener('reload', () => location.reload());\n`;

const clients = new Set();

function runBuild() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/build.mjs'], { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', (code) => resolve(code === 0));
  });
}

// Rebuild once; if a change arrives while building, run once more afterwards.
let building = false;
let queued = false;

async function rebuild() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  console.log('Change detected, rebuilding ...');
  const ok = await runBuild();
  building = false;
  if (ok) {
    console.log('Build ok — reloading browser tab(s).');
    for (const res of clients) res.write('data: reload\n\n');
  } else {
    console.error('Build failed; the server keeps running. Fix the error to trigger the next rebuild.');
  }
  if (queued) {
    queued = false;
    rebuild();
  }
}

async function isDirectory(file) {
  try {
    return (await stat(file)).isDirectory();
  } catch {
    return false;
  }
}

async function send(res, status, file, extraHeaders = {}) {
  let body = await readFile(file);
  const html = path.extname(file) === '.html';
  const flasher = html && hasFlasher(body.toString('utf8'));
  if (html) {
    // Inject the dev-only reload script, never written to disk.
    body = Buffer.from(body.toString('utf8').replace('</body>', `${RELOAD_SCRIPT}\n  </body>`));
  }
  const headers = {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': NO_STORE,
    ...SECURITY_HEADERS,
    ...extraHeaders,
  };
  if (flasher) headers['Content-Security-Policy'] = FLASHER_CSP;
  res.writeHead(status, headers);
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  // SSE stream for live reload.
  if (pathname === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': NO_STORE,
      Connection: 'keep-alive',
      ...SECURITY_HEADERS,
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // Dev-only reload client (same origin, so the CSP 'self' still holds).
  if (pathname === '/__reload.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': NO_STORE, ...SECURITY_HEADERS });
    res.end(RELOAD_JS);
    return;
  }

  try {
    // Mirrors the .htaccess redirect for "/" (302, Vary: Accept-Language).
    if (pathname === '/') {
      const target = rootRedirect(req.headers['accept-language'], await languageCodes());
      if (target) {
        res.writeHead(302, { Location: target, Vary: 'Accept-Language', 'Cache-Control': NO_STORE, ...SECURITY_HEADERS });
        res.end();
        return;
      }
    }
    let filePath = pathname;
    if (!filePath.endsWith('/')) {
      const dirFile = path.join(DIST, path.normalize(filePath));
      if (dirFile.startsWith(DIST + path.sep) && await isDirectory(dirFile)) {
        res.writeHead(301, {
          Location: `${url.pathname}/${url.search}`,
          'Cache-Control': NO_STORE,
          ...SECURITY_HEADERS,
        });
        res.end();
        return;
      }
    }
    if (filePath.endsWith('/')) filePath += 'index.html';
    const file = path.join(DIST, path.normalize(filePath));
    if (!file.startsWith(DIST + path.sep)) throw new Error('outside root');
    await send(res, 200, file, filePath === '/index.html' ? { Vary: 'Accept-Language' } : {});
  } catch {
    try {
      await send(res, 404, path.join(DIST, '404.html'));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': NO_STORE, ...SECURITY_HEADERS });
      res.end('Not found');
    }
  }
});

const debounce = {};
function scheduleRebuild() {
  clearTimeout(debounce.timer);
  debounce.timer = setTimeout(rebuild, DEBOUNCE_MS);
}

for (const dir of [SRC, path.join(ROOT, 'scripts')]) {
  const watcher = watch(dir, { recursive: true }, () => scheduleRebuild());
  watcher.on('error', (error) => console.error(`Watcher error on ${dir}: ${error.message}`));
}

const ok = await runBuild();
if (!ok) console.error('Initial build failed; starting the dev server anyway.');

server.listen(PORT, HOST, () => {
  console.log(`Dev server: http://${HOST}:${PORT}/ (live reload)`);
  // S59: WebSerial needs a secure context; a LAN preview (non-loopback host)
  // is fine for layout testing, but not for the web flasher.
  if (HOST !== '127.0.0.1' && HOST !== '::1' && HOST !== 'localhost') {
    console.log('Note: non-loopback HOST — WebSerial needs a secure context, so the flasher will not work here.');
  }
});
