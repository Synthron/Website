// Minimal static file server for dist/ (local preview only).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function send(res, status, file) {
  const body = await readFile(file);
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(DIST, path.normalize(pathname));
    if (!file.startsWith(DIST + path.sep)) throw new Error('outside root');
    await send(res, 200, file);
  } catch {
    try {
      await send(res, 404, path.join(DIST, '404.html'));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Serving dist/ at http://localhost:${PORT}/`);
});
