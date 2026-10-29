// HTML/XML renderers for directives and generated files. All data is escaped.
// UI labels come from data/strings.json; dates use the page language.

import { esc, formatDate, safeExternalUrl } from './util.mjs';

const LINK_LABELS = [['repo', 'repo'], ['demo', 'demo']];

// Nav hrefs are relative to the language folder (`ctx.pages.base(lang)`);
// `aria-current` marks the current page. Entries with a `lang` other than the
// page language (cross-language footer links) get `lang`/`hreflang`.
export function renderNav(items, ctx, cls = { list: 'site-nav__list', link: 'site-nav__link' }) {
  const links = items.map((item) => {
    if (item.external) {
      return `<li><a class="${cls.link}" href="${esc(item.href)}" rel="noopener noreferrer">${esc(item.label)}</a></li>`;
    }
    const target = item.lang ?? ctx.lang;
    const base = ctx.pages.base(target);
    const current = base + item.href.split(/[?#]/)[0] === ctx.rel ? ' aria-current="page"' : '';
    const language = target === ctx.lang ? '' : ` lang="${esc(target)}" hreflang="${esc(target)}"`;
    return `<li><a class="${cls.link}" href="${esc(ctx.root + base + item.href)}"${language}${current}>${esc(item.label)}</a></li>`;
  });
  return `<ul class="${cls.list}">\n${links.join('\n')}\n</ul>`;
}

// Language selector: one link per language to the same page in that language
// (`ctx.versions`) or to its home when the page does not exist there. Only
// rendered with two or more languages.
export function renderLangSwitch(ctx, site, strings) {
  if (site.languages.length < 2) return '';
  const versions = new Map((ctx.versions ?? []).map((version) => [version.lang, version.rel]));
  const items = site.languages.map(({ code, name, flag }) => {
    const target = versions.get(code) ?? `${ctx.pages.base(code)}index.html`;
    const current = !ctx.isCommon && code === ctx.lang ? ' aria-current="true"' : '';
    return `<li><a class="lang-switch__link" href="${esc(ctx.root + target)}" lang="${esc(code)}" hreflang="${esc(code)}" aria-label="${esc(name)}"${current}><img class="lang-switch__flag" src="${esc(ctx.root + flag)}" alt="" width="20" height="12"><span>${esc(code.toUpperCase())}</span></a></li>`;
  });
  return `<nav class="lang-switch" aria-label="${esc(strings.languageLabel)}">\n<ul class="lang-switch__list">\n${items.join('\n')}\n</ul>\n</nav>`;
}

// The label is translated; data-status keeps the German key for CSS hooks.
// Ham entries may have no status; then only the date is shown.
export function renderMeta(project, strings) {
  const status = project.status === undefined ? '' : `
  <span class="status" data-status="${esc(project.status)}">${esc(strings.status?.[project.status] ?? project.status)}</span>`;
  return `<p class="project-meta">${status}
  <time datetime="${esc(project.date)}">${esc(formatDate(project.date, strings.lang))}</time>
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
    items.push(`<li><a class="button button--secondary" href="${esc(href)}" rel="noopener noreferrer">${icon}${esc(label)}<span class="visually-hidden"> ${esc(strings.projectLinkFor)} ${esc(project.title)}</span></a></li>`);
  }
  return items.length > 0 ? `<ul class="link-list">\n  ${items.join('\n  ')}\n</ul>` : '';
}

export function renderProjectHeader(project, ctx, strings) {
  return [
    '<header class="page-header">',
    `<h1>${esc(project.title)}</h1>`,
    `<p class="page-header__lead">${esc(project.summary)}</p>`,
    renderMeta(project, strings),
    renderTags(project.tags, strings),
    renderLinks(project, ctx.root, strings),
    '</header>',
  ].filter(Boolean).join('\n');
}

export function renderCard(project, ctx, level, strings) {
  const tag = `h${level}`;
  const page = ctx.pages.projectPage(ctx.lang, project.id) ?? `proj/${project.id}.html`;
  const href = `${ctx.root}${ctx.pages.dir(ctx.lang)}/${page}`;
  return `<article class="project-card" data-tags="${esc(JSON.stringify(project.tags))}">
  <a class="project-card__image-link" href="${esc(href)}" tabindex="-1" aria-hidden="true"><img class="project-card__image" src="${esc(ctx.root + project.image)}" alt="" loading="lazy" decoding="async"></a>
  <div class="project-card__body">
    <${tag} class="project-card__title"><a class="project-card__link" href="${esc(href)}">${esc(project.title)}</a></${tag}>
    ${renderMeta(project, strings)}
    <p class="project-card__summary">${esc(project.summary)}</p>
    ${renderTags(project.tags, strings)}
  </div>
</article>`;
}

// Drafts (title starts with DRAFT, see data.mjs) are built but excluded from
// lists, the tag filter and the sitemap.
const published = (projects) => projects.filter((project) => project.draft !== true);

export function renderProjectList(projects, args, ctx, strings) {
  const [mode, ...rest] = args;
  const options = Object.fromEntries(rest.map((arg) => arg.split('=')));
  const level = options.level === '2' ? 2 : 3;
  const visible = published(projects);
  const selection = mode === 'featured' ? visible.filter((project) => project.featured === true) : visible;
  const id = options.id ? ` id="${esc(options.id)}"` : '';
  const inner = selection.length > 0
    ? selection.map((project) => renderCard(project, ctx, level, strings)).join('\n')
    : `<p class="message">${esc(strings.noProjects)}</p>`;
  return `<div class="project-grid"${id}>\n${inner}\n</div>`;
}

// Compact list for the ham radio pages (title link, meta, summary, tags),
// newest first. Items carry data-tags for js/projects.js like the cards.
export function renderEntryList(entries, args, ctx, strings) {
  const options = Object.fromEntries(args.map((arg) => arg.split('=')));
  const tag = options.level === '3' ? 'h3' : 'h2';
  const id = options.id ? ` id="${esc(options.id)}"` : '';
  const visible = published(entries);
  if (visible.length === 0) return `<p class="message"${id}>${esc(strings.noHamPages)}</p>`;
  const items = visible.map((entry) => {
    const page = ctx.pages.projectPage(ctx.lang, entry.id, 'ham') ?? `ham/${entry.id}.html`;
    const href = `${ctx.root}${ctx.pages.dir(ctx.lang)}/${page}`;
    return `<li class="entry-list__item" data-tags="${esc(JSON.stringify(entry.tags))}">
  <${tag} class="entry-list__title"><a class="entry-list__link" href="${esc(href)}">${esc(entry.title)}</a></${tag}>
  ${renderMeta(entry, strings)}
  <p class="entry-list__summary">${esc(entry.summary)}</p>
  ${renderTags(entry.tags, strings)}
</li>`;
  });
  return `<ul class="entry-list"${id}>\n${items.join('\n')}\n</ul>`;
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
<p class="filter-status" role="status" data-filter-status="${esc(listId)}" data-count-singular="${esc(strings.countSingular)}" data-count-plural="${esc(strings.countPlural)}" data-with-tag="${esc(strings.withTag)}" data-quote-open="${esc(strings.quoteOpen)}" data-quote-close="${esc(strings.quoteClose)}" data-lang="${esc(lang)}">${esc(format(visible.length))}</p>`;
}

// Project pages use their raster project image for Open Graph; everything
// else (and projects whose image is an SVG) falls back to the OG default PNG.
// The build warns until that file exists.
export const ogImageRel = (project) => (project && /\.(png|jpe?g|webp)$/i.test(project.image) ? project.image : 'assets/img/og-default.png');

// Canonical + Open Graph tags. Title and description are read back from
// the rendered page so they match what the page shows; og:image (added by the
// build once the file exists) is cache-busted like any local asset.
// `versions` lists every available language version of the page ({ lang, rel },
// including the page itself); with two or more, hreflang alternates and
// og:locale:alternate are added, x-default points to the root.
export function renderOpenGraph(rel, html, site, imageUrl, { lang = site.defaultLang, versions = [] } = {}) {
  const pageUrl = `${site.url}/${rel === 'index.html' ? '' : rel}`;
  const localeOf = (code) => site.languages.find((language) => language.code === code)?.locale ?? code;
  // Decode the entities esc() writes (&amp; last), so esc() below does not double-escape.
  const text = (value) => (value ?? '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&amp;/g, '&');
  const title = text(/<title>([^<]*)<\/title>/i.exec(html)?.[1]) || site.name;
  const description = text(/<meta[^>]+name="description"[^>]*content="([^"]*)"/i.exec(html)?.[1]);
  const others = versions.filter((version) => version.lang !== lang);
  const alternates = others.length === 0 ? [] : [
    ...versions.map((version) => `<link rel="alternate" hreflang="${esc(version.lang)}" href="${esc(`${site.url}/${version.rel}`)}">`),
    `<link rel="alternate" hreflang="x-default" href="${esc(`${site.url}/`)}">`,
  ];
  const tags = [
    `<link rel="canonical" href="${esc(pageUrl)}">`,
    ...alternates,
    '<meta property="og:type" content="website">',
    `<meta property="og:locale" content="${esc(localeOf(lang))}">`,
    ...others.map((version) => `<meta property="og:locale:alternate" content="${esc(localeOf(version.lang))}">`),
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
  ];
  if (description) tags.push(`<meta property="og:description" content="${esc(description)}">`);
  tags.push(`<meta property="og:url" content="${esc(pageUrl)}">`);
  if (imageUrl) tags.push(`<meta property="og:image" content="${esc(imageUrl)}">`);
  return `  ${tags.join('\n  ')}\n`;
}

// `projectByRel`: page path -> localized project for project pages. Pages that
// are not built (projects hidden in a language) never reach this list.
export function renderSitemap(pages, baseUrl, projectByRel, lastmodByRel = new Map()) {
  const entries = [];
  for (const [rel] of pages) {
    if (rel === '404.html') continue;
    const project = projectByRel.get(rel);
    if (project?.draft) continue;
    const loc = rel === 'index.html' ? `${baseUrl}/` : `${baseUrl}/${rel}`;
    const lines = [`    <loc>${esc(loc)}</loc>`];
    // Project pages use their date; other pages use the last git
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
