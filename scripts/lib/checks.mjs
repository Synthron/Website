// Checks on the rendered output.

import path from 'node:path';
import { DIST, exists, fail } from './util.mjs';

const SCHEME = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

export async function checkLinks(rel, html) {
  const dir = path.posix.dirname(rel);
  for (const [, url] of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    if (url === '' || SCHEME.test(url)) continue;
    const target = path.posix.normalize(path.posix.join(dir, url.split(/[?#]/)[0]));
    if (target.startsWith('..') || !await exists(path.join(DIST, target))) fail(`${rel}: broken link "${url}"`);
  }
}
