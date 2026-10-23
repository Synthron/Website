// Checks on the rendered output and firmware manifests.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DIST, SRC, exists, fail, ref } from './util.mjs';

const SCHEME = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;
const LINK_ATTRS = /\b(href|src|manifest|poster|srcset)="([^"]*)"/g;

// srcset holds comma-separated image candidates: "URL [descriptor], URL [descriptor]".
function urls(value, attr) {
  if (attr !== 'srcset') return [value];
  return value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]);
}

// `base` is the tree the targets are resolved against: `dist/` when building,
// `wwwroot/` when running `--check` (which writes nothing).
export async function checkLinks(rel, html, base = DIST) {
  const dir = path.posix.dirname(rel);
  for (const match of html.matchAll(LINK_ATTRS)) {
    const [, attr, value] = match;
    for (const url of urls(value, attr)) {
      if (url === '' || SCHEME.test(url)) continue;
      const target = path.posix.normalize(path.posix.join(dir, url.split(/[?#]/)[0]));
      if (target.startsWith('..') || !await exists(path.join(base, target))) {
        fail(`${ref(rel, html, match.index)}: broken link "${url}"`);
      }
    }
  }
}

// Every assets/firmware/<suite>/manifest.json must be valid JSON that references
// real binaries next to it; offsets must be integers.
export async function checkFirmwareManifests() {
  const suites = path.join(SRC, 'assets/firmware');
  for (const rel of await readdir(suites, { withFileTypes: true })) {
    if (!rel.isDirectory()) continue;
    const manifestRel = `assets/firmware/${rel.name}/manifest.json`;
    const manifestFile = path.join(SRC, manifestRel);
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    } catch (error) {
      fail(`${manifestRel}: invalid JSON (${error.message})`);
      continue;
    }
    if (!Array.isArray(manifest.builds) || manifest.builds.length === 0) {
      fail(`${manifestRel}: "builds" must be a non-empty array`);
      continue;
    }
    for (const [buildIndex, build] of manifest.builds.entries()) {
      const parts = build.parts;
      if (!Array.isArray(parts) || parts.length === 0) {
        fail(`${manifestRel}: builds[${buildIndex}].parts must be a non-empty array`);
        continue;
      }
      for (const [partIndex, part] of parts.entries()) {
        const label = `${manifestRel}: builds[${buildIndex}].parts[${partIndex}]`;
        if (typeof part?.path !== 'string' || part.path === '') {
          fail(`${label}.path must be a non-empty string`);
          continue;
        }
        if (!Number.isInteger(part.offset)) {
          fail(`${label}.offset must be an integer (is ${JSON.stringify(part.offset)})`);
        }
        const file = path.join(path.dirname(manifestFile), part.path);
        if (!await exists(file)) fail(`${label}: file not found: ${part.path}`);
      }
    }
  }
}
