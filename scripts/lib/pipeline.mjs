// Page pipeline: raw blocks out -> includes -> tokens -> directives -> raw blocks back in.

import path from 'node:path';
import { esc, fail } from './util.mjs';
import { renderNav, renderProjectHeader, renderProjectList, renderTagFilter } from './render.mjs';

const RAW_BLOCK = /<!--\s*@raw\s*-->([\s\S]*?)<!--\s*@endraw\s*-->/g;
const RAW_MARKER = /<!--\s*@(?:raw|endraw)\s*-->/g;
// NUL never occurs in source files, so no pass can match the placeholder.
const RAW_PLACEHOLDER = /\u0000raw(\d+)\u0000/g;

export function protectRaw(text, store, rel) {
  return text
    .replace(RAW_BLOCK, (_, content) => `\u0000raw${store.push(content) - 1}\u0000`)
    .replace(RAW_MARKER, (marker) => {
      fail(`${rel}: unmatched ${marker.replace(/<!--\s*|\s*-->/g, '')}`);
      return '';
    });
}

export const restoreRaw = (text, store) => text.replace(RAW_PLACEHOLDER, (_, index) => store[Number(index)]);

const CSP = "default-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
// ESP Web Tools injects inline styles, so flasher pages need this exception.
const CSP_FLASHER = `${CSP}; style-src 'self' 'unsafe-inline'`;

export const isFlasherPage = (html) => /<esp-web-install-button\b/.test(html);

export function applyIncludes(html, partials, rel) {
  return html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => {
    if (!(name in partials)) {
      fail(`${rel}: unknown include "${name}"`);
      return '';
    }
    return partials[name];
  });
}

export function applyTokens(text, ctx) {
  return text.replace(/\{\{\s*([\w:]+)\s*\}\}/g, (match, key) => {
    const values = {
      name: ctx.site.name,
      year: ctx.site.year,
      footerNote: ctx.site.footerNote,
      email: ctx.site.email,
      monogram: ctx.site.monogram,
      url: ctx.site.url,
      sitemapUrl: ctx.site.sitemapUrl,
      root: ctx.root,
      csp: ctx.flasher ? CSP_FLASHER : CSP,
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

export function applyDirectives(html, ctx, projects, nav, footerNav) {
  return html.replace(/<!--\s*@([\w-]+)([^>]*?)-->/g, (match, name, rawArgs) => {
    const args = rawArgs.trim().split(/\s+/).filter(Boolean);
    switch (name) {
      case 'nav':
        return renderNav(nav, ctx);
      case 'footer-nav':
        return renderNav(footerNav, ctx, { list: 'site-footer__list', link: 'site-footer__link' });
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
