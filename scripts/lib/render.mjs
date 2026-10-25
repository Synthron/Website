// HTML/XML renderers for directives and generated files. All data is escaped.
// UI labels come from data/strings.json (S40); dates use the site language.

import path from 'node:path';
import { esc, formatDate, safeExternalUrl } from './util.mjs';

const LINK_LABELS = [['repo', 'repo'], ['demo', 'demo']];

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

export function renderMeta(project, lang) {
  return `<p class="project-meta">
  <span class="status">${esc(project.status)}</span>
  <time datetime="${esc(project.date)}">${esc(formatDate(project.date, lang))}</time>
</p>`;
}

export function renderTags(tags, strings) {
  const items = tags.map((tag) => `<li><span class="tag">${esc(tag)}</span></li>`).join('\n  ');
  return `<ul class="tag-list" aria-label="${esc(strings.tagsLabel)}">\n  ${items}\n</ul>`;
}

export function renderLinks(project, root, strings) {
  const items = [];
  for (const [key, stringKey] of LINK_LABELS) {
    const href = safeExternalUrl(project.links?.[key]);
    if (!href) continue;
    // The github mark is white, so it sits in a dark badge to stay visible
    // on both light and dark surfaces. The repo link uses it as its leading
    // icon; the demo link keeps a plain text button.
    const icon = key === 'repo'
      ? `<span class="link-list__badge"><img src="${esc(root)}assets/icons/GitHub_Invertocat_White.svg" alt="" width="18" height="18"></span>`
      : '';
    const label = strings[stringKey];
    items.push(`<li><a class="button button--secondary" href="${esc(href)}" rel="noopener noreferrer">${icon}${esc(label)}<span class="visually-hidden"> für ${esc(project.title)}</span></a></li>`);
  }
  return items.length > 0 ? `<ul class="link-list">\n  ${items.join('\n  ')}\n</ul>` : '';
}

export function renderProjectHeader(project, ctx, strings) {
  return [
    '<header class="page-header">',
    `<h1>${esc(project.title)}</h1>`,
    `<p class="page-header__lead">${esc(project.summary)}</p>`,
    renderMeta(project, ctx.site.lang),
    renderTags(project.tags, strings),
    renderLinks(project, ctx.root, strings),
    '</header>',
  ].filter(Boolean).join('\n');
}

export function renderCard(project, root, level, strings) {
  const tag = `h${level}`;
  return `<article class="project-card" data-tags="${esc(JSON.stringify(project.tags))}">
  <img class="project-card__image" src="${esc(root + project.image)}" alt="" loading="lazy" decoding="async">
  <div class="project-card__body">
    <${tag} class="project-card__title"><a class="project-card__link" href="${esc(`${root}html/proj/${project.id}.html`)}">${esc(project.title)}</a></${tag}>
    ${renderMeta(project, strings.lang)}
    <p class="project-card__summary">${esc(project.summary)}</p>
    ${renderTags(project.tags, strings)}
  </div>
</article>`;
}

// S36: draft projects are built but excluded from lists, the tag filter and
// the sitemap. Cards for drafts would leak in-browser otherwise.
const published = (projects) => projects.filter((project) => project.draft !== true);

export function renderProjectList(projects, args, ctx, strings) {
  const [mode, ...rest] = args;
  const options = Object.fromEntries(rest.map((arg) => arg.split('=')));
  const level = options.level === '2' ? 2 : 3;
  const visible = published(projects);
  const selection = mode === 'featured' ? visible.filter((project) => project.featured === true) : visible;
  const id = options.id ? ` id="${esc(options.id)}"` : '';
  const inner = selection.length > 0
    ? selection.map((project) => renderCard(project, ctx.root, level, strings)).join('\n')
    : `<p class="message">${esc(strings.noProjects)}</p>`;
  return `<div class="project-grid"${id}>\n${inner}\n</div>`;
}

// Starts hidden; js/projects.js reveals it. Without JS the full list shows.
export function renderTagFilter(projects, args, lang, strings) {
  const [listId] = args;
  const visible = published(projects);
  const tags = [...new Set(visible.flatMap((project) => project.tags))].sort((a, b) => a.localeCompare(b));
  const buttons = ['', ...tags].map((tag) => `<button class="tag-filter__button" type="button" data-tag="${esc(tag)}" aria-pressed="${tag === ''}">${tag === '' ? esc(strings.all) : esc(tag)}</button>`);
  const format = (count) => count === 1 ? `1 ${strings.countSingular}` : `${count} ${strings.countPlural}`;
  return `<div class="tag-filter" role="group" aria-label="${esc(strings.tagFilterLabel)}" data-tag-filter="${esc(listId)}" hidden>
${buttons.join('\n')}
</div>
<p class="filter-status" role="status" data-filter-status="${esc(listId)}" data-count-singular="${esc(strings.countSingular)}" data-count-plural="${esc(strings.countPlural)}" data-with-tag="${esc(strings.withTag)}" data-lang="${esc(lang)}">${esc(format(visible.length))}</p>`;
}

// S64: project pages use their raster project image for Open Graph; everything
// else (and projects whose image is an SVG) falls back to the OG default PNG
// (D25). The build warns until that file exists.
export const ogImageRel = (project) => (project && /\.(png|jpe?g|webp)$/i.test(project.image) ? project.image : 'assets/img/og-default.png');

// S64: canonical + Open Graph tags. Title and description are read back from
// the rendered page so they match what the page shows; og:image (added by the
// build once the file exists) is cache-busted like any local asset.
export function renderOpenGraph(rel, html, site, imageUrl) {
  const pageUrl = `${site.url}/${rel === 'index.html' ? '' : rel}`;
  const text = (value) => (value ?? '')
    .replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
  const title = text(/<title>([^<]*)<\/title>/i.exec(html)?.[1]) || site.name;
  const description = text(/<meta[^>]+name="description"[^>]*content="([^"]*)"/i.exec(html)?.[1]);
  const tags = [
    `<link rel="canonical" href="${esc(pageUrl)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:locale" content="${esc(site.lang === 'de' ? 'de_DE' : site.lang)}">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
  ];
  if (description) tags.push(`<meta property="og:description" content="${esc(description)}">`);
  tags.push(`<meta property="og:url" content="${esc(pageUrl)}">`);
  if (imageUrl) tags.push(`<meta property="og:image" content="${esc(imageUrl)}">`);
  return `  ${tags.join('\n  ')}\n`;
}

export function renderSitemap(pages, baseUrl, byId, lastmodByRel = new Map()) {
  const entries = [];
  for (const [rel] of pages) {
    if (rel === '404.html') continue;
    const project = rel.startsWith('html/proj/') ? byId.get(path.posix.basename(rel, '.html')) : undefined;
    if (project?.draft) continue;
    const loc = rel === 'index.html' ? `${baseUrl}/` : `${baseUrl}/${rel}`;
    const lines = [`    <loc>${loc}</loc>`];
    // S63/D24: project pages use their date; other pages use the last git
    // commit date of the source file (computed by the build, omitted when git
    // is unavailable or the file is untracked).
    const lastmod = project?.date ? `${project.date}-01` : lastmodByRel.get(rel);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
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
