// Minimal static file server for dist/ (local preview only).
// Sends Cache-Control: no-store so CSS/JS changes are never stale while
// developing; mirrors Apache by redirecting directory requests to add a "/".
// S60: mirrors the production security headers (.htaccess) so local preview
// behaves like dm7wb.de; S59: HOST can bind to a LAN address for phone tests.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';
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

// Security headers mirrored from wwwroot/.htaccess (S60). The CSP header adds
// frame-ancestors 'none', which a <meta> CSP ignores; HSTS is only honored
// over HTTPS, so it has no effect on a plain http preview.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), serial=(self)',
  'Strict-Transport-Security': 'max-age=86400',
};
// Same exception as <Files "nixie-clock.html"> in .htaccess (ESP Web Tools
// injects inline styles on the flasher page only).
const FLASHER_CSP = "default-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";
const isFlasherPage = (pathname) => path.posix.basename(pathname) === 'nixie-clock.html';

async function isDirectory(file) {
  try {
    return (await stat(file)).isDirectory();
  } catch {
    return false;
  }
}

async function send(res, status, file, flasher = false) {
  const body = await readFile(file);
  const headers = {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': NO_STORE,
    ...SECURITY_HEADERS,
  };
  if (flasher) headers['Content-Security-Policy'] = FLASHER_CSP;
  res.writeHead(status, headers);
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const flasher = isFlasherPage(url.pathname);
    let pathname = decodeURIComponent(url.pathname);
    if (!pathname.endsWith('/')) {
      const file = path.join(DIST, path.normalize(pathname));
      if (file.startsWith(DIST + path.sep) && await isDirectory(file)) {
        res.writeHead(301, {
          // Use the original (still encoded) path so special characters survive.
          Location: `${url.pathname}/${url.search}`,
          'Cache-Control': NO_STORE,
          ...SECURITY_HEADERS,
        });
        res.end();
        return;
      }
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(DIST, path.normalize(pathname));
    if (!file.startsWith(DIST + path.sep)) throw new Error('outside root');
    await send(res, 200, file, flasher);
  } catch {
    try {
      await send(res, 404, path.join(DIST, '404.html'));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': NO_STORE, ...SECURITY_HEADERS });
      res.end('Not found');
    }
  }
}).listen(PORT, HOST, () => {
  console.log(`Serving dist/ at http://${HOST}:${PORT}/`);
  // S59: WebSerial needs a secure context (HTTPS or localhost); a LAN preview
  // is fine for layout testing, but the web flasher will not work there.
  if (HOST !== '127.0.0.1' && HOST !== '::1' && HOST !== 'localhost') {
    console.log('Note: non-loopback HOST — WebSerial needs a secure context, so the flasher will not work here.');
  }
});
