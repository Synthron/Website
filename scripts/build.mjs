// Static site build CLI: wwwroot/ (source) -> dist/ (output).
// Node built-ins only. Resolves includes, {{tokens}} and @directives at build
// time, so the output needs no runtime fetch and no content updates.
// Logic lives in scripts/lib/; this file only orchestrates.

import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIST, ROOT, SRC, errors, posix, shortHash, walk } from './lib/util.mjs';
import { loadNav, loadProjects, loadSite } from './lib/data.mjs';
import { renderSitemap } from './lib/render.mjs';
import {
  applyCacheBusting, applyDirectives, applyIncludes, applyTokens, isFlasherPage,
  protectRaw, restoreRaw, versionCssUrls, versionJsImports,
} from './lib/pipeline.mjs';
import { checkFirmwareManifests, checkLinks } from './lib/checks.mjs';

// Source-only folders/files that are not copied to dist/.
const SKIP_DIRS = new Set(['partials', 'data']);
const SKIP_FILES = new Set(['project-template.html', '.gitkeep']);
// Non-HTML files that also go through the token pass.
const TEMPLATE_FILES = new Set(['robots.txt']);

const isSkipped = (rel) => SKIP_DIRS.has(rel.split('/')[0]) || SKIP_FILES.has(rel) || SKIP_FILES.has(path.posix.basename(rel));
// Our own ES modules (js/main.js, nav.js, projects.js) get their relative
// import specifiers versioned. js/vendor/ internals are left as-is.
const isOwnJs = (rel) => rel.startsWith('js/') && !rel.startsWith('js/vendor/') && rel.endsWith('.js');

// Version map (wwwroot-relative path -> ?v= hash) for every file that ends up
// in dist/. Non-text files are versioned by their raw bytes; CSS and our own
// JS embed versions of referenced files, so their output content is hashed
// instead of the source. The module graph is acyclic, so iterating until the
// map stops changing converges deterministically.
async function computeVersions(files) {
  const versions = new Map();
  const outputs = new Map(); // rel -> processed text for css / own-js
  const textSources = new Map(); // rel -> raw source for css / own-js
  for (const rel of files) {
    const buf = await readFile(path.join(SRC, rel));
    if (rel.endsWith('.css') || isOwnJs(rel)) textSources.set(rel, buf.toString('utf8'));
    versions.set(rel, shortHash(buf));
  }
  for (let pass = 0; pass < 10; pass += 1) {
    let changed = false;
    for (const [rel, source] of textSources) {
      const output = rel.endsWith('.css') ? versionCssUrls(source, rel, versions) : versionJsImports(source, rel, versions);
      const hash = shortHash(output);
      if (hash !== versions.get(rel)) changed = true;
      versions.set(rel, hash);
      outputs.set(rel, output);
    }
    if (!changed) break;
  }
  return { versions, outputs };
}

async function build() {
  const site = await loadSite();
  const nav = await loadNav('nav.json');
  const footerNav = await loadNav('footer-nav.json');
  const projects = await loadProjects();
  await checkFirmwareManifests();
  const byId = new Map(projects.map((project) => [project.id, project]));

  const partials = {};
  for (const file of await walk(path.join(SRC, 'partials'))) {
    partials[path.basename(file, '.html')] = (await readFile(path.join(SRC, 'partials', file), 'utf8')).trim();
  }

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const files = (await walk(SRC)).filter((rel) => !isSkipped(rel));
  const { versions, outputs } = await computeVersions(files);

  const pages = [];
  for (const rel of files) {
    const from = path.join(SRC, rel);
    const to = path.join(DIST, rel);
    await mkdir(path.dirname(to), { recursive: true });

    const isHtml = rel.endsWith('.html');
    if (!isHtml && !TEMPLATE_FILES.has(rel)) {
      // CSS and our own JS are rewritten (url/import cache busting) in dist/.
      if (outputs.has(rel)) await writeFile(to, outputs.get(rel));
      else await copyFile(from, to);
      continue;
    }

    const ctx = {
      rel,
      site,
      // The 404 page can be served at any path, so its links must be root-relative.
      root: rel === '404.html' ? '/' : '../'.repeat(rel.split('/').length - 1),
      project: rel.startsWith('html/') ? byId.get(path.posix.basename(rel, '.html')) : undefined,
    };
    const raw = [];
    let output = protectRaw(await readFile(from, 'utf8'), raw, rel);
    // Second pass protects raw blocks that came in through partials.
    output = protectRaw(applyIncludes(output, partials, rel), raw, rel);
    ctx.flasher = isFlasherPage(output);
    output = applyTokens(output, ctx);
    output = applyDirectives(output, ctx, projects, nav, footerNav);
    // Cache busting before raw blocks are restored, so code samples stay as-is.
    output = applyCacheBusting(output, rel, versions);
    output = restoreRaw(output, raw);
    await writeFile(to, output);
    if (isHtml) pages.push([rel, output]);
  }

  for (const [rel, html] of pages) await checkLinks(rel, html);

  if (site.url) {
    await writeFile(path.join(DIST, 'sitemap.xml'), renderSitemap(pages, site.url, byId));
  }
  return pages.length;
}

try {
  const count = await build();
  if (errors.length > 0) {
    console.error(`Build failed with ${errors.length} error(s):`);
    errors.forEach((message) => console.error(`  - ${message}`));
    process.exit(1);
  }
  console.log(`Built ${count} page(s) into ${posix(path.relative(ROOT, DIST))}/`);
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
}
