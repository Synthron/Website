// Static site build: wwwroot/ (source) -> dist/ (output).
// Node built-ins only. Resolves includes, {{tokens}} and @directives at build
// time, so the output needs no runtime fetch and no content updates.

import { access, copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'wwwroot');
const DIST = path.join(ROOT, 'dist');

// Source-only folders/files that are not copied to dist/.
const SKIP_DIRS = new Set(['partials', 'data']);
const SKIP_FILES = new Set(['project-template.html', '.gitkeep']);
// Non-HTML files that also go through the token pass.
const TEMPLATE_FILES = new Set(['favicon.svg']);
const REQUIRED_PROJECT_FIELDS = ['id', 'title', 'summary', 'tags', 'status', 'date', 'links', 'image', 'featured'];
const LINK_LABELS = [['repo', 'Source'], ['demo', 'Demo']];

const errors = [];
const fail = (message) => errors.push(message);

// Helpers

const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const exists = (file) => access(file).then(() => true, () => false);
const posix = (file) => file.split(path.sep).join('/');

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`${posix(path.relative(ROOT, file))}: ${error.message}`);
  }
}

async function walk(dir, base = '') {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), rel));
    else files.push(rel);
  }
  return files;
}

function safeExternalUrl(value) {
  if (typeof value !== 'string' || value === '') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return date.toLocaleDateString('en', { year: 'numeric', month: 'short', timeZone: 'UTC' });
}

const countLabel = (count) => (count === 1 ? '1 project' : `${count} projects`);

// Data

async function loadSite() {
  const site = await readJson(path.join(SRC, 'data/site.json'));
  for (const key of ['name', 'footerNote', 'email']) {
    if (typeof site[key] !== 'string' || site[key] === '') fail(`data/site.json: "${key}" must be a non-empty string`);
  }
  if (site.copyrightYear !== undefined && !Number.isInteger(site.copyrightYear)) {
    fail('data/site.json: "copyrightYear" must be an integer');
  }
  return {
    name: site.name ?? '',
    footerNote: site.footerNote ?? '',
    email: site.email ?? '',
    year: site.copyrightYear ?? new Date().getFullYear(),
    monogram: Array.from(site.name ?? '').find((char) => char.trim() !== '')?.toUpperCase() ?? '',
  };
}

async function loadNav() {
  const data = await readJson(path.join(SRC, 'data/nav.json'));
  if (!Array.isArray(data) || data.length === 0) throw new Error('data/nav.json: expected a non-empty array');
  const items = [];
  for (const [index, item] of data.entries()) {
    const label = `data/nav.json[${index}]`;
    if (typeof item?.label !== 'string' || item.label.trim() === '') {
      fail(`${label}: "label" must be a non-empty string`);
      continue;
    }
    if (typeof item.href !== 'string' || item.href === '') {
      fail(`${label}: "href" must be a non-empty string`);
      continue;
    }
    const external = /^https?:\/\//i.test(item.href);
    if (!external && /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(item.href)) {
      fail(`${label}: "href" must be a path relative to the web root or an http(s) URL`);
      continue;
    }
    items.push({ label: item.label, href: item.href, external });
  }
  return items;
}

async function loadProjects() {
  const data = await readJson(path.join(SRC, 'data/projects.json'));
  if (!Array.isArray(data)) throw new Error('data/projects.json: expected an array');
  const seen = new Set();
  const projects = [];

  for (const [index, project] of data.entries()) {
    const label = `data/projects.json[${index}]`;
    const missing = REQUIRED_PROJECT_FIELDS.filter((key) => !(key in (project ?? {})));
    if (missing.length > 0) {
      fail(`${label}: missing field(s) ${missing.join(', ')}`);
      continue;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(project.id)) fail(`${label}: invalid id "${project.id}"`);
    if (seen.has(project.id)) fail(`${label}: duplicate id "${project.id}"`);
    seen.add(project.id);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(project.date)) {
      fail(`${label}: date must be YYYY-MM`);
      continue;
    }
    if (!Array.isArray(project.tags) || !project.tags.every((tag) => typeof tag === 'string')) {
      fail(`${label}: tags must be an array of strings`);
      continue;
    }
    if (!await exists(path.join(SRC, project.image))) fail(`${label}: image not found: ${project.image}`);
    if (!await exists(path.join(SRC, 'html', 'proj', `${project.id}.html`))) {
      fail(`${label}: missing page wwwroot/html/proj/${project.id}.html`);
    }
    projects.push(project);
  }
  return projects.sort((a, b) => b.date.localeCompare(a.date));
}

// Rendering

// Nav links are relative to the web root; `aria-current` marks the current page.
function renderNav(items, ctx) {
  const links = items.map((item) => {
    if (item.external) {
      return `<li><a class="site-nav__link" href="${esc(item.href)}" rel="noopener noreferrer">${esc(item.label)}</a></li>`;
    }
    const current = item.href.split(/[?#]/)[0] === ctx.rel ? ' aria-current="page"' : '';
    return `<li><a class="site-nav__link" href="${esc(ctx.root + item.href)}"${current}>${esc(item.label)}</a></li>`;
  });
  return `<ul class="site-nav__list">\n${links.join('\n')}\n</ul>`;
}

function renderMeta(project) {
  return `<p class="project-meta">
  <span class="status">${esc(project.status)}</span>
  <time datetime="${esc(project.date)}">${esc(formatDate(project.date))}</time>
</p>`;
}

function renderTags(tags) {
  const items = tags.map((tag) => `<li><span class="tag">${esc(tag)}</span></li>`).join('\n  ');
  return `<ul class="tag-list" aria-label="Tags">\n  ${items}\n</ul>`;
}

function renderLinks(project, root) {
  const items = [];
  for (const [key, label] of LINK_LABELS) {
    const href = safeExternalUrl(project.links?.[key]);
    if (!href) continue;
    // The github mark is white, so it sits in a dark badge to stay visible
    // on both light and dark surfaces. The repo link uses it as its leading
    // icon; the demo link keeps a plain text button.
    const icon = key === 'repo'
      ? `<span class="link-list__badge"><img src="${esc(root)}assets/icons/GitHub_Invertocat_White.svg" alt="" width="18" height="18"></span>`
      : '';
    items.push(`<li><a class="button button--secondary" href="${esc(href)}" rel="noopener noreferrer">${icon}${label}<span class="visually-hidden"> for ${esc(project.title)}</span></a></li>`);
  }
  return items.length > 0 ? `<ul class="link-list">\n  ${items.join('\n  ')}\n</ul>` : '';
}

function renderProjectHeader(project, ctx) {
  return [
    '<header class="page-header">',
    `<h1>${esc(project.title)}</h1>`,
    `<p class="page-header__lead">${esc(project.summary)}</p>`,
    renderMeta(project),
    renderTags(project.tags),
    renderLinks(project, ctx.root),
    '</header>',
  ].filter(Boolean).join('\n');
}

function renderCard(project, root, level) {
  const tag = `h${level}`;
  return `<article class="project-card" data-tags="${esc(JSON.stringify(project.tags))}">
  <img class="project-card__image" src="${esc(root + project.image)}" alt="" loading="lazy" decoding="async">
  <div class="project-card__body">
    <${tag} class="project-card__title"><a class="project-card__link" href="${esc(`${root}html/proj/${project.id}.html`)}">${esc(project.title)}</a></${tag}>
    ${renderMeta(project)}
    <p class="project-card__summary">${esc(project.summary)}</p>
    ${renderTags(project.tags)}
  </div>
</article>`;
}

function renderProjectList(projects, args, ctx) {
  const [mode, ...rest] = args;
  const options = Object.fromEntries(rest.map((arg) => arg.split('=')));
  const level = options.level === '2' ? 2 : 3;
  const selection = mode === 'featured' ? projects.filter((project) => project.featured === true) : projects;
  const id = options.id ? ` id="${esc(options.id)}"` : '';
  const inner = selection.length > 0
    ? selection.map((project) => renderCard(project, ctx.root, level)).join('\n')
    : '<p class="message">No projects to show yet.</p>';
  return `<div class="project-grid"${id}>\n${inner}\n</div>`;
}

// Starts hidden; js/projects.js reveals it. Without JS the full list shows.
function renderTagFilter(projects, args) {
  const [listId] = args;
  const tags = [...new Set(projects.flatMap((project) => project.tags))].sort((a, b) => a.localeCompare(b));
  const buttons = ['', ...tags].map((tag) => `<button class="tag-filter__button" type="button" data-tag="${esc(tag)}" aria-pressed="${tag === ''}">${tag === '' ? 'All' : esc(tag)}</button>`);
  return `<div class="tag-filter" role="group" aria-label="Filter by tag" data-tag-filter="${esc(listId)}" hidden>
${buttons.join('\n')}
</div>
<p class="filter-status" role="status" data-filter-status="${esc(listId)}">${countLabel(projects.length)}</p>`;
}

// Page pipeline: includes -> tokens -> directives

function applyIncludes(html, partials, rel) {
  return html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => {
    if (!(name in partials)) {
      fail(`${rel}: unknown include "${name}"`);
      return '';
    }
    return partials[name];
  });
}

function applyTokens(text, ctx) {
  return text.replace(/\{\{\s*([\w:]+)\s*\}\}/g, (match, key) => {
    const values = {
      name: ctx.site.name,
      year: ctx.site.year,
      footerNote: ctx.site.footerNote,
      email: ctx.site.email,
      monogram: ctx.site.monogram,
      root: ctx.root,
      projectTitle: ctx.project?.title,
      projectSummary: ctx.project?.summary,
    };
    if (values[key] === undefined) {
      fail(`${ctx.rel}: unknown token ${match}`);
      return '';
    }
    return esc(values[key]);
  });
}

function applyDirectives(html, ctx, projects, nav) {
  return html.replace(/<!--\s*@([\w-]+)([^>]*?)-->/g, (match, name, rawArgs) => {
    const args = rawArgs.trim().split(/\s+/).filter(Boolean);
    switch (name) {
      case 'nav':
        return renderNav(nav, ctx);
      case 'projects':
        return renderProjectList(projects, args, ctx);
      case 'tag-filter':
        return renderTagFilter(projects, args);
      case 'project-header':
        if (!ctx.project) {
          fail(`${ctx.rel}: @project-header needs a project with id "${path.basename(ctx.rel, '.html')}"`);
          return '';
        }
        return renderProjectHeader(ctx.project, ctx);
      default:
        fail(`${ctx.rel}: unknown directive @${name}`);
        return '';
    }
  });
}

// Link check on the rendered output

const SCHEME = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

async function checkLinks(rel, html) {
  const dir = path.posix.dirname(rel);
  for (const [, url] of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    if (url === '' || SCHEME.test(url)) continue;
    const target = path.posix.normalize(path.posix.join(dir, url.split(/[?#]/)[0]));
    if (target.startsWith('..') || !await exists(path.join(DIST, target))) fail(`${rel}: broken link "${url}"`);
  }
}

// Build

async function build() {
  const site = await loadSite();
  const nav = await loadNav();
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
    let output = await readFile(from, 'utf8');
    output = applyIncludes(output, partials, rel);
    output = applyTokens(output, ctx);
    output = applyDirectives(output, ctx, projects, nav);
    await writeFile(to, output);
    if (isHtml) pages.push([rel, output]);
  }

  for (const [rel, html] of pages) await checkLinks(rel, html);
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
