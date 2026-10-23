// Minimal static file server for dist/ (local preview only).
// Sends Cache-Control: no-store so CSS/JS changes are never stale while
// developing; mirrors Apache by redirecting directory requests to add a "/".

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 8000;
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

async function isDirectory(file) {
  try {
    return (await stat(file)).isDirectory();
  } catch {
    return false;
  }
}

async function send(res, status, file) {
  const body = await readFile(file);
  res.writeHead(status, {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': NO_STORE,
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (!pathname.endsWith('/')) {
      const file = path.join(DIST, path.normalize(pathname));
      if (file.startsWith(DIST + path.sep) && await isDirectory(file)) {
        res.writeHead(301, {
          // Use the original (still encoded) path so special characters survive.
          Location: `${url.pathname}/${url.search}`,
          'Cache-Control': NO_STORE,
        });
        res.end();
        return;
      }
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(DIST, path.normalize(pathname));
    if (!file.startsWith(DIST + path.sep)) throw new Error('outside root');
    await send(res, 200, file);
  } catch {
    try {
      await send(res, 404, path.join(DIST, '404.html'));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': NO_STORE });
      res.end('Not found');
    }
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Serving dist/ at http://localhost:${PORT}/`);
});
