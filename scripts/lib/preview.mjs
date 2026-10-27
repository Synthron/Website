// Helpers shared by the local preview servers (serve.mjs, dev.mjs).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SRC } from './util.mjs';

// Language codes from data/site.json, read per request so that a new language
// is picked up without restarting the dev server.
export async function languageCodes() {
  try {
    const site = JSON.parse(await readFile(path.join(SRC, 'data', 'site.json'), 'utf8'));
    return (site.languages ?? []).map((language) => language.code);
  } catch {
    return [];
  }
}

// Mirrors the .htaccess redirect for "/": the first listed Accept-Language
// entry (browsers list the highest priority first) decides by its primary
// subtag ("de-AT" -> "de"). Returns the target path or null (landing page).
export function rootRedirect(acceptLanguage, codes) {
  const first = String(acceptLanguage ?? '').split(',')[0]?.split(';')[0]?.trim().toLowerCase();
  const primary = first?.split('-')[0];
  return primary && codes.includes(primary) ? `/${primary}/` : null;
}

// Same exception as the <Files> block in .htaccess; detected from the served
// page itself because file names can differ per language.
export const hasFlasher = (html) => /<esp-web-install-button\b/.test(html);
