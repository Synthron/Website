// HTML/XML renderers for directives and generated files. All data is escaped.

import path from 'node:path';
import { countLabel, esc, formatDate, safeExternalUrl } from './util.mjs';

const LINK_LABELS = [['repo', 'Source'], ['demo', 'Demo']];

// Nav links are relative to the web root; `aria-current` marks the current page.
export function renderNav(items, ctx, cls = { list: 'site-nav__list', link: 'site-nav__link' }) {
  const links = items.map((item) => {
    if (item.external) {
      return `<li><a class="${cls.link}" href="${esc(item.href)}" rel="noopener noreferrer">${esc(item.label)}</a></li>`;
    }
    const current = item.href.split(/[?#]/)[0] === ctx.rel ? ' aria-current="page"' : '';
    return `<li><a class="${cls.link}" href="${esc(ctx.root + item.href)}"${current}>${esc(item.label)}</a></li>`;
  });
  return `<ul class="${cls.list}">\n${links.join('\n')}\n</ul>`;
}

export function renderMeta(project) {
  return `<p class="project-meta">
  <span class="status">${esc(project.status)}</span>
  <time datetime="${esc(project.date)}">${esc(formatDate(project.date))}</time>
</p>`;
}

export function renderTags(tags) {
  const items = tags.map((tag) => `<li><span class="tag">${esc(tag)}</span></li>`).join('\n  ');
  return `<ul class="tag-list" aria-label="Tags">\n  ${items}\n</ul>`;
}

export function renderLinks(project, root) {
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

export function renderProjectHeader(project, ctx) {
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

export function renderCard(project, root, level) {
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

export function renderProjectList(projects, args, ctx) {
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
export function renderTagFilter(projects, args) {
  const [listId] = args;
  const tags = [...new Set(projects.flatMap((project) => project.tags))].sort((a, b) => a.localeCompare(b));
  const buttons = ['', ...tags].map((tag) => `<button class="tag-filter__button" type="button" data-tag="${esc(tag)}" aria-pressed="${tag === ''}">${tag === '' ? 'All' : esc(tag)}</button>`);
  return `<div class="tag-filter" role="group" aria-label="Filter by tag" data-tag-filter="${esc(listId)}" hidden>
${buttons.join('\n')}
</div>
<p class="filter-status" role="status" data-filter-status="${esc(listId)}">${countLabel(projects.length)}</p>`;
}

export function renderSitemap(pages, baseUrl, byId) {
  const entries = [];
  for (const [rel] of pages) {
    if (rel === '404.html') continue;
    const loc = rel === 'index.html' ? `${baseUrl}/` : `${baseUrl}/${rel}`;
    const project = rel.startsWith('html/proj/') ? byId.get(path.posix.basename(rel, '.html')) : undefined;
    const lines = [`    <loc>${loc}</loc>`];
    if (project?.date) lines.push(`    <lastmod>${project.date}-01</lastmod>`);
    entries.push(`  <url>\n${lines.join('\n')}\n  </url>`);
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join('\n'),
    '</urlset>',
    '',
  ].join('\n');
}
