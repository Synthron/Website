// Static site build CLI: wwwroot/ (source) -> dist/ (output).
// Node built-ins only. Resolves includes, {{tokens}} and @directives at build
// time, so the output needs no runtime fetch and no content updates.
// Logic lives in scripts/lib/; this file only orchestrates.

import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIST, ROOT, SRC, errors, posix, walk } from './lib/util.mjs';
import { loadNav, loadProjects, loadSite } from './lib/data.mjs';
import { renderSitemap } from './lib/render.mjs';
import { applyDirectives, applyIncludes, applyTokens, isFlasherPage, protectRaw, restoreRaw } from './lib/pipeline.mjs';
import { checkLinks } from './lib/checks.mjs';

// Source-only folders/files that are not copied to dist/.
const SKIP_DIRS = new Set(['partials', 'data']);
const SKIP_FILES = new Set(['project-template.html', '.gitkeep']);
// Non-HTML files that also go through the token pass.
const TEMPLATE_FILES = new Set(['robots.txt']);

async function build() {
  const site = await loadSite();
  const nav = await loadNav('nav.json');
  const footerNav = await loadNav('footer-nav.json');
  const projects = await loadProjects();
  const byId = new Map(projects.map((project) => [project.id, project]));

  const partials = {};
  for (const file of await walk(path.join(SRC, 'partials'))) {
    partials[path.basename(file, '.html')] = (await readFile(path.join(SRC, 'partials', file), 'utf8')).trim();
  }

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const pages = [];
  for (const rel of await walk(SRC)) {
    if (SKIP_DIRS.has(rel.split('/')[0]) || SKIP_FILES.has(rel) || SKIP_FILES.has(path.posix.basename(rel))) continue;
    const from = path.join(SRC, rel);
    const to = path.join(DIST, rel);
    await mkdir(path.dirname(to), { recursive: true });

    const isHtml = rel.endsWith('.html');
    if (!isHtml && !TEMPLATE_FILES.has(rel)) {
      await copyFile(from, to);
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
