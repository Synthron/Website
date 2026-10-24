// Checks on the rendered output and firmware manifests.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DIST, SRC, exists, fail, ref, walk, warn } from './util.mjs';

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

// D22: the bootloader offset for a plain Arduino/PlatformIO app build differs
// by chip family; partitions and app offsets are the same for all supported
// chips. Used to warn about mismatching manifest offsets.
const CHIP_BOOTLOADER_OFFSETS = {
  ESP32: 0x1000,
  'ESP32-S2': 0x1000,
  'ESP32-S3': 0x0,
  'ESP32-C3': 0x0,
};
const PARTITIONS_OFFSET = 0x8000;
const APP_OFFSET = 0x10000;
const FILE_OFFSETS = { 'bootloader.bin': CHIP_BOOTLOADER_OFFSETS, 'partitions.bin': PARTITIONS_OFFSET, 'firmware.bin': APP_OFFSET };

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
        // S44/S11: warn when a known offset does not match its chip family.
        const fileName = path.posix.basename(part.path);
        const expected = FILE_OFFSETS[fileName];
        const chipExpected = expected && typeof expected === 'object' ? expected[build.chipFamily] : undefined;
        if (expected !== undefined && chipExpected !== undefined && part.offset !== chipExpected) {
          warn(`${label}: "${fileName}" offset 0x${part.offset.toString(16)} does not match chipFamily "${build.chipFamily}" (expected 0x${chipExpected.toString(16)})`);
        }
        const file = path.join(path.dirname(manifestFile), part.path);
        if (!await exists(file)) fail(`${label}: file not found: ${part.path}`);
      }
    }
  }
}

// --- Page-level diagnostics (S31-S35) ---------------------------------------
// S31: warn about html/proj/*.html without a projects.json entry.
export function checkOrphanPages(pages, byId) {
  for (const [rel] of pages) {
    if (rel.startsWith('html/proj/') && !byId.has(path.posix.basename(rel, '.html'))) {
      warn(`wwwroot/${rel}: project page without a data/projects.json entry`);
    }
  }
}

// S32: warn about unused images in assets/img/ and leftover placeholder text.
export async function checkUnusedAssets(pages) {
  const imgFiles = (await walk(SRC)).filter((rel) => rel.startsWith('assets/img/'));
  const pageText = pages.map(([, html]) => html).join('\n');
  for (const rel of imgFiles) {
    if (!pageText.includes(`assets/img/${path.posix.basename(rel)}`)) {
      warn(`wwwroot/${rel}: not referenced by any built page`);
    }
  }
}

export function checkPlaceholderText(pages) {
  for (const [rel, html] of pages) {
    if (html.includes('Placeholder paragraph')) {
      warn(`wwwroot/${rel}: contains leftover "Placeholder paragraph" text`);
    }
  }
}

// S33: same-page and cross-page anchor targets must exist; ids must be unique.
function collectIds(html) {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
}

export function checkAnchors(pages) {
  const idsByRel = new Map(pages.map(([rel, html]) => [rel, collectIds(html)]));
  for (const [rel, html] of pages) {
    const dir = path.posix.dirname(rel);
    for (const match of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
      const [, href] = match;
      const [pagePart, ...rest] = href.split('#');
      const id = rest.join('#').split('?')[0];
      if (id === '' || SCHEME.test(pagePart)) continue;
      if (pagePart === '') {
        if (!idsByRel.get(rel).includes(id)) {
          fail(`${ref(rel, html, match.index)}: unknown anchor "#${id}" on this page`);
        }
        continue;
      }
      let target = path.posix.normalize(path.posix.join(dir, pagePart.split(/[?#]/)[0]));
      if (target.startsWith('/')) target = target.slice(1);
      if (target.startsWith('..')) continue; // broken page link reported by checkLinks
      if (!idsByRel.get(target)?.includes(id)) {
        fail(`${ref(rel, html, match.index)}: unknown anchor "${pagePart}#${id}" (no id="${id}" in ${target})`);
      }
    }
    const seen = new Set();
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
      if (seen.has(match[1])) fail(`${ref(rel, html, match.index)}: duplicate id "${match[1]}"`);
      seen.add(match[1]);
    }
  }
}

// S34: HTML rule lint. Violations fail the build (D13). Runs on the rendered
// page, so project-page h1s (from @project-header) count correctly.
export function checkHtmlRules(rel, html) {
  const h1s = (html.match(/<h1\b/g) || []).length;
  if (h1s !== 1) fail(`wwwroot/${rel}: expected exactly one <h1>, found ${h1s}`);
  if (!/<html\b[^>]*\blang\s*=\s*"[^"]+"/i.test(html)) {
    fail(`wwwroot/${rel}: <html lang="..."> attribute missing`);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt\s*=/.test(match[0])) fail(`${ref(rel, html, match.index)}: <img> without alt attribute`);
  }
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/gi)) {
    fail(`${ref(rel, html, match.index)}: inline <script> without src`);
  }
  for (const match of html.matchAll(/\sstyle\s*=/g)) {
    fail(`${ref(rel, html, match.index)}: style attribute (inline styles are not allowed)`);
  }
}

// S35: a page with <esp-web-install-button> must load the vendored script.
export function checkFlasherScript(rel, html) {
  if (!/<esp-web-install-button\b/.test(html)) return;
  if (!/<script\b[^>]*src="[^"]*js\/vendor\/esp-web-tools\/install-button\.js[^"]*"/.test(html)) {
    fail(`wwwroot/${rel}: <esp-web-install-button> needs the vendored install-button.js script tag`);
  }
}
