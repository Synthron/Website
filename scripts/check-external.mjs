// Manual HEAD checks of every external link under wwwroot/ — pages, partials,
// the master template and the data JSONs (projects, navs). Node fetch.
// Never part of `build` or `check`; exit code 1 when any link fails.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'wwwroot');
const EXTERNAL_URL = /https?:\/\/[^\s"'<>)\]]+/g;
const TIMEOUT_MS = 10000;

async function walkFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(file));
    else files.push(file);
  }
  return files;
}

function collect(urls, text) {
  for (const match of text.matchAll(EXTERNAL_URL)) {
    try {
      urls.add(new URL(match[0].replace(/[.,;:!?]+$/, '')).href);
    } catch {
      // not a valid absolute URL: ignore
    }
  }
}

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.status >= 200 && res.status < 400 ? `ok (${res.status})` : `FAIL (${res.status})`;
  } catch (error) {
    return `FAIL (${error.name === 'TimeoutError' ? 'timeout' : error.message})`;
  }
}

async function main() {
  const urls = new Set();
  for (const file of await walkFiles(SRC)) {
    if (!/\.(html|json)$/.test(file)) continue;
    collect(urls, await readFile(file, 'utf8'));
  }

  const sorted = [...urls].sort();
  console.log(`check:external — ${sorted.length} external link(s) found in wwwroot/`);
  let failed = 0;
  for (const url of sorted) {
    const result = await head(url);
    if (result.startsWith('FAIL')) failed += 1;
    console.log(`  ${result.padEnd(44)} ${url}`);
  }
  console.log(failed === 0 ? '\nAll links reachable.' : `\n${failed} link(s) failed.`);
  if (failed > 0) process.exitCode = 1;
}

await main();
