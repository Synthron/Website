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

// The bootloader offset for a plain Arduino/PlatformIO app build differs
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
// real binaries inside its suite folder; offsets must be integers.
export async function checkFirmwareManifests(src = SRC) {
  const suites = path.join(src, 'assets/firmware');
  for (const rel of await readdir(suites, { withFileTypes: true })) {
    if (!rel.isDirectory()) continue;
    const manifestRel = `assets/firmware/${rel.name}/manifest.json`;
    const manifestFile = path.join(src, manifestRel);
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
        const normalized = path.posix.normalize(part.path);
        if (SCHEME.test(part.path) || part.path.includes('\\') || path.posix.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../')) {
          fail(`${label}.path must be a relative path inside the suite folder (is "${part.path}")`);
          continue;
        }
        if (!Number.isInteger(part.offset)) {
          fail(`${label}.offset must be an integer (is ${JSON.stringify(part.offset)})`);
        }
        // Warn when a known offset does not match its chip family.
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

// --- Page-level diagnostics -------------------------------------------------
// Warn about project (and ham) pages without data in their language.
// `infoByRel` maps built page paths to { lang, pagePath, isCommon } (see build.mjs);
// `byCollection` maps a collection name (projects, ham) to its entries by id.
export function checkOrphanPages(infoByRel, pageIndex, byCollection) {
  for (const [rel, info] of infoByRel) {
    if (!info.pagePath?.includes('/')) continue;
    const collection = pageIndex.collectionOf(info.lang, info.pagePath);
    if (!(collection in byCollection)) continue;
    const folder = info.pagePath.split('/')[0];
    const project = byCollection[collection].get(pageIndex.projectId(info.lang, info.pagePath));
    if (!project) warn(`wwwroot/${rel}: ${folder}/ page without a data entry`);
    else if (!Object.hasOwn(project.title, info.lang)) warn(`wwwroot/${rel}: entry "${project.id}" has no "${info.lang}" data`);
  }
}

// <html lang> of a language page must be its language. Common pages are
// validated against the configured languages when they are classified.
export function checkHtmlLang(rel, html, info) {
  if (info.isCommon) return;
  const found = /<html\b[^>]*\blang="([^"]*)"/i.exec(html)?.[1];
  if (found !== undefined && found !== info.lang) {
    fail(`wwwroot/${rel}: <html lang="${found}"> must be "${info.lang}" (language of its folder)`);
  }
}

// Every page of a non-default language needs a default-language
// counterpart (fail); default-language pages without a counterpart are
// reported (warn). Entry pages (collection folders) are covered by the data warnings.
export function checkTranslationCoverage(site, pageIndex) {
  const { defaultLang, languages } = site;
  if (languages.length < 2) return;
  const seen = new Set();
  for (const { code } of languages) {
    for (const file of pageIndex.files(code)) {
      const counterparts = pageIndex.counterparts(code, file);
      const key = [...counterparts].map(([other, target]) => `${other}:${target}`).sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      if (!counterparts.has(defaultLang)) {
        fail(`wwwroot/${pageIndex.dir(code)}/${file}: page has no "${defaultLang}" counterpart (required)`);
      } else if (pageIndex.collectionOf(code, file) === undefined && counterparts.size < languages.length) {
        const missing = languages.filter(({ code: other }) => !counterparts.has(other)).map(({ code: other }) => other);
        warn(`wwwroot/${pageIndex.dir(defaultLang)}/${counterparts.get(defaultLang)}: no counterpart in ${missing.map((other) => `"${other}"`).join(', ')}`);
      }
    }
  }
}

// Links must stay inside the page's language folder. Exempt: the language
// selector and declared cross-language entries (both carry hreflang) and
// common pages. Links into a removed html/ folder fail once no language
// lives there any more.
export function checkLanguageLinks(pages, infoByRel, site, pageDir) {
  const dirs = site.languages.map(({ code }) => [code, pageDir(code)]);
  const htmlRemoved = !dirs.some(([, dir]) => dir === 'html');
  for (const [rel, html] of pages) {
    const info = infoByRel.get(rel);
    if (!info) continue;
    for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
      const href = /\bhref="([^"]*)"/.exec(match[0])?.[1];
      const pathname = href?.split(/[?#]/)[0];
      if (!pathname || SCHEME.test(href)) continue;
      const target = pathname.startsWith('/')
        ? path.posix.normalize(pathname.slice(1))
        : path.posix.normalize(path.posix.join(path.posix.dirname(rel), pathname));
      if (htmlRemoved && target.startsWith('html/')) {
        fail(`${ref(rel, html, match.index)}: link into the removed html/ folder "${href}"`);
        continue;
      }
      if (info.isCommon || /\bhreflang=/.test(match[0])) continue;
      const owner = dirs.find(([, dir]) => target === dir || target.startsWith(`${dir}/`))?.[0];
      if (owner !== undefined && owner !== info.lang) {
        warn(`${ref(rel, html, match.index)}: link into the "${owner}" folder "${href}" (use the language selector or a declared cross-language entry)`);
      }
    }
  }
}

// Flasher pages need the CSP exception in .htaccess (a <Files> or
// <FilesMatch> block that sets 'unsafe-inline'); the server matches by file name.
export function checkFlasherHtaccess(pages, htaccess) {
  if (!htaccess) return;
  const matchers = [];
  for (const [, kind, pattern, body] of htaccess.matchAll(/<(Files|FilesMatch)\s+"([^"]+)">([\s\S]*?)<\/\1>/g)) {
    if (!body.includes('unsafe-inline')) continue;
    const source = kind === 'FilesMatch' ? pattern : `^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`;
    matchers.push(new RegExp(source));
  }
  for (const [rel, html] of pages) {
    if (!/<esp-web-install-button\b/.test(html)) continue;
    const name = path.posix.basename(rel);
    if (!matchers.some((matcher) => matcher.test(name))) {
      warn(`wwwroot/${rel}: flasher page "${name}" is not covered by the CSP exception in wwwroot/.htaccess`);
    }
  }
}

// The placeholder SVGs (assets/img/placeholder*.svg) are reserved: they serve
// the master template and as the scaffold default image, so the build never
// flags them as unused.
const PLACEHOLDER_IMG = /^placeholder.*\.svg$/;
export const isPlaceholderImg = (rel) => PLACEHOLDER_IMG.test(path.posix.basename(rel));

// Warn about unused images in assets/img/ (placeholder*.svg are reserved and
// always ignored) and leftover placeholder text.
export async function checkUnusedAssets(pages) {
  const imgFiles = (await walk(SRC)).filter((rel) => rel.startsWith('assets/img/'));
  const pageText = pages.map(([, html]) => html).join('\n');
  for (const rel of imgFiles) {
    if (isPlaceholderImg(rel)) continue;
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
    // Rendered offsets do not match the source lines, so report per page only.
    const todos = html.replace(/<!--[\s\S]*?-->/g, '').match(/\bTODO(?![A-Za-z0-9])/g) ?? [];
    if (todos.length > 0) {
      warn(`wwwroot/${rel}: ${todos.length} leftover TODO marker(s) (TODO, TODO_…, TODO:)`);
    }
  }
}

// Same-page and cross-page anchor targets and aria-labelledby/aria-describedby
// references must exist; ids must be unique.
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
    for (const match of html.matchAll(/\baria-(labelledby|describedby)="([^"]*)"/g)) {
      for (const id of match[2].split(/\s+/).filter(Boolean)) {
        if (!idsByRel.get(rel).includes(id)) {
          fail(`${ref(rel, html, match.index)}: aria-${match[1]} references unknown id "${id}"`);
        }
      }
    }
    const seen = new Set();
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
      if (seen.has(match[1])) fail(`${ref(rel, html, match.index)}: duplicate id "${match[1]}"`);
      seen.add(match[1]);
    }
  }
}

// HTML rule lint. Violations fail the build. Runs on the rendered
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

// A page with <esp-web-install-button> must load the vendored script.
export function checkFlasherScript(rel, html) {
  if (!/<esp-web-install-button\b/.test(html)) return;
  if (!/<script\b[^>]*src="[^"]*js\/vendor\/esp-web-tools\/install-button\.js[^"]*"/.test(html)) {
    fail(`wwwroot/${rel}: <esp-web-install-button> needs the vendored install-button.js script tag`);
  }
}
