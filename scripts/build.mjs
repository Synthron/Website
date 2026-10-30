// Static site build CLI: wwwroot/ (source) -> dist/ (output).
// Node built-ins only. Resolves includes, {{tokens}} and @directives at build
// time, so the output needs no runtime fetch and no content updates.
// Logic lives in scripts/lib/; this file only orchestrates.

import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIST, ROOT, SRC, errors, exists, gitLastModified, posix, shortHash, walk, warn, warnings } from './lib/util.mjs';
import { loadHam, loadNav, loadPages, loadProjects, loadSite, loadStrings, localize } from './lib/data.mjs';
import { ogImageRel, renderOpenGraph, renderSitemap } from './lib/render.mjs';
import {
  applyCacheBusting, applyDirectives, applyIncludes, applyTokens, classifyPage, isFlasherPage,
  protectRaw, restoreRaw, versionCssUrls, versionJsImports,
} from './lib/pipeline.mjs';
import {
  checkAnchors, checkFirmwareManifests, checkFlasherHtaccess, checkFlasherScript, checkHtmlLang,
  checkHtmlRules, checkLanguageLinks, checkLinks, checkOrphanPages, checkPlaceholderText,
  checkTranslationCoverage, checkUnusedAssets,
} from './lib/checks.mjs';

// Source-only folders/files that are not copied to dist/.
const SKIP_DIRS = new Set(['partials', 'data', 'templates']);
const SKIP_FILES = new Set(['.gitkeep']);
// Whole sub-trees that are not copied to dist/ (checked by path prefix).
const SKIP_PATHS = ['assets/firmware/dummy'];
// Warn once per missing Open Graph image.
const warnedOgImages = new Set();
// Non-HTML files that also go through the token pass.
const TEMPLATE_FILES = new Set(['robots.txt']);

const isSkipped = (rel) => SKIP_DIRS.has(rel.split('/')[0]) || SKIP_PATHS.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`)) || SKIP_FILES.has(rel) || SKIP_FILES.has(path.posix.basename(rel));
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

async function build({ check = false } = {}) {
  const site = await loadSite();
  const { defaultLang } = site;
  const pageIndex = await loadPages(site);
  const pageDir = pageIndex.dir;
  const collections = { projects: await loadProjects(site, pageIndex), ham: await loadHam(site, pageIndex) };
  const navs = await loadNav('nav.json', site);
  const footerNavs = await loadNav('footer-nav.json', site);
  const stringsByLang = await loadStrings(site);
  // Everything a page needs in its own language; `lang` is merged into the
  // strings for formatDate().
  const perLang = Object.fromEntries(site.languages.map(({ code }) => [code, {
    lists: Object.fromEntries(Object.entries(collections).map(([name, entries]) => [name, entries.map((entry) => localize(entry, code)).filter(Boolean)])),
    nav: navs[code] ?? [],
    footerNav: footerNavs[code] ?? [],
    strings: { ...stringsByLang[code], lang: code },
  }]));
  await checkFirmwareManifests();
  // Collection name -> id -> entry.
  const byId = Object.fromEntries(Object.entries(collections).map(([name, entries]) => [name, new Map(entries.map((entry) => [entry.id, entry]))]));
  const projectByRel = new Map(); // page path -> localized project or ham entry
  const infoByRel = new Map(); // page path -> { lang, pagePath, isCommon }

  const partials = {};
  for (const file of await walk(path.join(SRC, 'partials'))) {
    partials[path.basename(file, '.html')] = (await readFile(path.join(SRC, 'partials', file), 'utf8')).trim();
  }

  if (!check) {
    await rm(DIST, { recursive: true, force: true });
    await mkdir(DIST, { recursive: true });
  }

  const files = (await walk(SRC)).filter((rel) => !isSkipped(rel));
  const { versions, outputs } = await computeVersions(files);

  const pages = [];
  for (const rel of files) {
    const from = path.join(SRC, rel);
    const to = path.join(DIST, rel);

    const isHtml = rel.endsWith('.html');
    if (!isHtml && !TEMPLATE_FILES.has(rel)) {
      if (check) continue; // validation only: nothing to write
      await mkdir(path.dirname(to), { recursive: true });
      // CSS and our own JS are rewritten (url/import cache busting) in dist/.
      if (outputs.has(rel)) await writeFile(to, outputs.get(rel));
      else await copyFile(from, to);
      continue;
    }

    const root = rel === '404.html' ? '/' : '../'.repeat(rel.split('/').length - 1);
    const source = await readFile(from, 'utf8');
    const page = classifyPage(rel, source, root, site, pageDir);
    const { lang } = page;
    const collection = page.pagePath === undefined ? undefined : pageIndex.collectionOf(lang, page.pagePath);
    const projectId = collection === undefined ? undefined : pageIndex.projectId(lang, page.pagePath);
    const rawProject = projectId === undefined ? undefined : byId[collection].get(projectId);
    const project = rawProject ? localize(rawProject, lang) ?? undefined : undefined;
    // A project page whose project is hidden in this language (TODO or missing
    // data, already warned about by the loader) is not built.
    if (projectId !== undefined && !project && lang !== defaultLang) continue;

    // Available language versions of this page; hidden projects get none.
    const langVersions = page.pagePath === undefined ? [] : [...pageIndex.counterparts(lang, page.pagePath)]
      .filter(([code]) => projectId === undefined || (rawProject && Object.hasOwn(rawProject.title, code)))
      .map(([code, file]) => ({ lang: code, rel: `${pageDir(code)}/${file}` }));

    const ctx = {
      rel,
      site,
      pages: pageIndex,
      versions: langVersions,
      lang,
      langRoot: page.langRoot,
      isCommon: page.isCommon,
      strings: stringsByLang[lang],
      // The 404 page can be served at any path, so its links must be root-relative.
      root,
      project,
    };
    const { lists, nav, footerNav, strings } = perLang[lang];
    const raw = [];
    let output = protectRaw(source, raw, rel);
    // Second pass protects raw blocks that came in through partials.
    output = protectRaw(applyIncludes(output, partials, rel), raw, rel);
    ctx.flasher = isFlasherPage(output);
    output = applyTokens(output, ctx);
    output = applyDirectives(output, ctx, lists, nav, footerNav, strings);
    // Cache busting before raw blocks are restored, so code samples stay as-is.
    output = applyCacheBusting(output, rel, versions);
    output = restoreRaw(output, raw);
    // Canonical + Open Graph tags go into every built page except 404.html
    // (never indexed). Until the OG image exists the image tag is omitted and
    // the build warns once.
    if (isHtml && rel !== '404.html') {
      const imageRel = ogImageRel(ctx.project);
      let imageUrl = '';
      if (await exists(path.join(SRC, imageRel))) {
        const hash = versions.get(imageRel);
        imageUrl = `${site.url}/${imageRel}${hash ? `?v=${hash}` : ''}`;
      } else if (!warnedOgImages.has(imageRel)) {
        warnedOgImages.add(imageRel);
        warn(`Open Graph image missing: wwwroot/${imageRel} (run \`npm run images\` to create the 1200×630 default PNG)`);
      }
      output = output.replace('</head>', renderOpenGraph(rel, output, site, imageUrl, { lang, versions: langVersions }) + '</head>');
    }
    if (project) projectByRel.set(rel, project);
    if (!check) {
      await mkdir(path.dirname(to), { recursive: true });
      await writeFile(to, output);
    }
    if (isHtml) pages.push([rel, output]);
    if (isHtml) infoByRel.set(rel, { lang, pagePath: page.pagePath, isCommon: page.isCommon });
  }

  // In --check mode nothing was written, so resolve links against wwwroot/.
  const base = check ? SRC : DIST;
  for (const [rel, html] of pages) await checkLinks(rel, html, base);

  checkOrphanPages(infoByRel, pageIndex, byId);
  checkTranslationCoverage(site, pageIndex);
  checkLanguageLinks(pages, infoByRel, site, pageDir);
  await checkUnusedAssets(pages);
  checkPlaceholderText(pages);
  checkAnchors(pages);
  for (const [rel, html] of pages) {
    checkHtmlRules(rel, html);
    checkHtmlLang(rel, html, infoByRel.get(rel));
    checkFlasherScript(rel, html);
  }
  const htaccessFile = path.join(SRC, '.htaccess');
  checkFlasherHtaccess(pages, await exists(htaccessFile) ? await readFile(htaccessFile, 'utf8') : '');

  if (site.url && !check) {
    // lastmod for non-project pages = last git commit date of the source
    // file; omitted when git is unavailable or the file is untracked.
    const lastmodByRel = new Map();
    for (const [rel] of pages) {
      if (rel === '404.html' || projectByRel.has(rel)) continue;
      const lastmod = await gitLastModified(rel);
      if (lastmod) lastmodByRel.set(rel, lastmod);
    }
    await writeFile(path.join(DIST, 'sitemap.xml'), renderSitemap(pages, site.url, projectByRel, lastmodByRel));
  }
  return pages.length;
}

// --check: validate everything, write nothing (used by `npm run check` and
// the pre-commit hook). Errors print like a normal build and exit non-zero.
const check = process.argv.includes('--check');

try {
  const count = await build({ check });
  if (errors.length > 0) {
    console.error(`Build failed with ${errors.length} error(s):`);
    errors.forEach((message) => console.error(`  - ${message}`));
    process.exit(1);
  }
  if (warnings.length > 0) {
    console.error(`${warnings.length} warning(s):`);
    warnings.forEach((message) => console.error(`  - ${message}`));
  }
  console.log(check
    ? `Checked ${count} page(s), no output written.`
    : `Built ${count} page(s) into ${posix(path.relative(ROOT, DIST))}/`);
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
}
