// Page pipeline: raw blocks out -> includes -> tokens -> directives -> versioning -> raw blocks back in.

import path from 'node:path';
import { esc, fail, ref } from './util.mjs';
import { renderLangSwitch, renderNav, renderProjectHeader, renderProjectList, renderTagFilter } from './render.mjs';

const RAW_BLOCK = /<!--\s*@raw\s*-->([\s\S]*?)<!--\s*@endraw\s*-->/g;
const RAW_MARKER = /<!--\s*@(?:raw|endraw)\s*-->/g;
// NUL never occurs in source files, so no pass can match the placeholder.
// eslint-disable-next-line no-control-regex
const RAW_PLACEHOLDER = /\u0000raw(\d+)\u0000/g;

export function protectRaw(text, store, rel) {
  return text
    .replace(RAW_BLOCK, (_, content) => `\u0000raw${store.push(content) - 1}\u0000`)
    .replace(RAW_MARKER, (marker, offset) => {
      fail(`${ref(rel, text, offset)}: unmatched ${marker.replace(/<!--\s*|\s*-->/g, '')}`);
      return '';
    });
}

export const restoreRaw = (text, store) => text.replace(RAW_PLACEHOLDER, (_, index) => store[Number(index)]);

const CSP = "default-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
// ESP Web Tools injects inline styles, so flasher pages need this exception.
const CSP_FLASHER = `${CSP}; style-src 'self' 'unsafe-inline'`;

export const isFlasherPage = (html) => /<esp-web-install-button\b/.test(html);

// Language of a page. Language pages live in their language folder
// (`pageDir(code)`), common pages are root pages whose source carries a literal
// `<html lang="xx">`. Other root files (robots.txt) count as default-language
// files. `langRoot` is
// the relative path from the page to its language folder (the root for common
// and legacy pages); `pagePath` is the path inside the language folder.
export function classifyPage(rel, source, root, site, pageDir) {
  const folder = site.languages.find(({ code }) => rel.startsWith(`${pageDir(code)}/`));
  if (folder) {
    const pagePath = rel.slice(pageDir(folder.code).length + 1);
    return { lang: folder.code, isCommon: false, langRoot: '../'.repeat(pagePath.split('/').length - 1), pagePath };
  }
  const literal = rel.includes('/') ? undefined : /<html\b[^>]*\blang="([^"]*)"/i.exec(source)?.[1];
  if (literal !== undefined && !/[{}]/.test(literal)) {
    if (!site.languages.some(({ code }) => code === literal)) {
      fail(`wwwroot/${rel}: <html lang="${literal}"> is not a configured language`);
      return { lang: site.defaultLang, isCommon: true, langRoot: root, pagePath: undefined };
    }
    return { lang: literal, isCommon: true, langRoot: root, pagePath: undefined };
  }
  return { lang: site.defaultLang, isCommon: false, langRoot: root, pagePath: undefined };
}

export function applyIncludes(html, partials, rel) {
  return html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (match, name, offset) => {
    if (!(name in partials)) {
      fail(`${ref(rel, html, offset)}: unknown include "${name}"`);
      return '';
    }
    return partials[name];
  });
}

export function applyTokens(text, ctx) {
  return text.replace(/\{\{\s*([\w:]+)\s*\}\}/g, (match, key, offset) => {
    if (key.startsWith('t:')) {
      const value = ctx.strings?.[key.slice(2)];
      if (typeof value !== 'string') {
        fail(`${ref(ctx.rel, text, offset)}: unknown UI string ${match} for language "${ctx.lang}"`);
        return '';
      }
      return esc(value);
    }
    const values = {
      lang: ctx.lang,
      langRoot: ctx.langRoot,
      name: ctx.site.name,
      year: ctx.site.year,
      footerNote: ctx.site.footerNote[ctx.lang],
      email: ctx.site.email,
      url: ctx.site.url,
      sitemapUrl: ctx.site.sitemapUrl,
      root: ctx.root,
      csp: ctx.flasher ? CSP_FLASHER : CSP,
      projectTitle: ctx.project?.title,
      projectSummary: ctx.project?.summary,
    };
    if (values[key] === undefined) {
      fail(`${ref(ctx.rel, text, offset)}: unknown token ${match}`);
      return '';
    }
    return esc(values[key]);
  });
}

export function applyDirectives(html, ctx, projects, nav, footerNav, strings) {
  return html.replace(/<!--\s*@([\w-]+)([^>]*?)-->/g, (match, name, rawArgs, offset) => {
    const args = rawArgs.trim().split(/\s+/).filter(Boolean);
    switch (name) {
      case 'nav':
        // Common pages show only the brand (and the language selector).
        return ctx.isCommon ? '' : renderNav(nav, ctx);
      case 'lang-switch':
        return renderLangSwitch(ctx, ctx.site, strings);
      case 'footer-nav':
        return renderNav(footerNav, ctx, { list: 'site-footer__list', link: 'site-footer__link' });
      case 'projects':
        return renderProjectList(projects, args, ctx, strings);
      case 'tag-filter':
        return renderTagFilter(projects, args, ctx.lang, strings);
      case 'project-header':
        if (!ctx.project) {
          fail(`${ref(ctx.rel, html, offset)}: @project-header needs a project with id "${path.basename(ctx.rel, '.html')}"`);
          return '';
        }
        return renderProjectHeader(ctx.project, ctx, strings);
      default:
        fail(`${ref(ctx.rel, html, offset)}: unknown directive @${name}`);
        return '';
    }
  });
}

// --- Cache busting -----------------------------------------------------------
// Appends ?v=<hash> to local asset URLs so dist/ files can be cached forever
// (.htaccess). Versions come from the content-hash map built by the build
// (see build.mjs); lookups resolve wwwroot-relative paths.

// Versionable file types: stylesheets, scripts, images, favicon.svg. HTML,
// firmware manifests and .bin files stay unversioned (they are revalidated).
const ASSET_RE = /\.(css|js|svg|png|jpe?g|webp|gif|ico)$/i;
const SCHEME_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const URL_ATTR_RE = /\b(href|src)="([^"]*)"/g;
const JS_IMPORT_RE = /(['"])(\.{1,2}\/[^'"\s]+\.js)\1/g;
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

// Resolve a page-relative (or root-relative with a leading "/") URL to the
// wwwroot-relative path the version map is keyed by.
function resolvePath(rel, url) {
  const pathname = url.split(/[?#]/)[0];
  if (pathname.startsWith('/')) return pathname.slice(1);
  return path.posix.normalize(path.posix.join(path.posix.dirname(rel), pathname));
}

// HTML: version href/src pointing at versionable assets. Runs before raw
// blocks are restored, so code samples are never rewritten.
export function applyCacheBusting(html, rel, versions) {
  return html.replace(URL_ATTR_RE, (match, attr, value) => {
    if (value === '' || SCHEME_RE.test(value)) return match;
    const key = resolvePath(rel, value);
    const hash = versions.get(key);
    if (!hash || !ASSET_RE.test(key)) return match;
    return `${attr}="${value.split(/[?#]/)[0]}?v=${hash}"`;
  });
}

// Our own ES modules: version relative import specifiers ('./nav.js') so a
// cached main.js never refetches stale nav.js/projects.js when one of them is
// re-hashed. Skip js/vendor/ internals (their chunks already carry hashes in
// their file names; only install-button.js gets ?v= from the HTML).
export function versionJsImports(source, rel, versions) {
  return source.replace(JS_IMPORT_RE, (match, quote, spec) => {
    const key = resolvePath(rel, spec);
    const hash = versions.get(key);
    if (!hash || key.startsWith('js/vendor/')) return match;
    return `${quote}${spec.split(/[?#]/)[0]}?v=${hash}${quote}`;
  });
}

// Stylesheets: version url(...) references to local images.
export function versionCssUrls(source, rel, versions) {
  return source.replace(CSS_URL_RE, (match, quote, url) => {
    const value = url.trim();
    if (value === '' || SCHEME_RE.test(value)) return match;
    const key = resolvePath(rel, value);
    const hash = versions.get(key);
    if (!hash || !ASSET_RE.test(key)) return match;
    return `url(${quote}${value.split(/[?#]/)[0]}?v=${hash}${quote})`;
  });
}
