// Shared paths, error collection and small helpers for the build.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SRC = path.join(ROOT, 'wwwroot');
export const DIST = path.join(ROOT, 'dist');

export const errors = [];
export const fail = (message) => errors.push(message);

// Non-fatal diagnostics; printed after a successful build (see build.mjs).
export const warnings = [];
export const warn = (message) => warnings.push(message);

// 1-based "line:col" of an offset within text, for error messages.
export const lineCol = (text, offset) => {
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  const col = offset - before.lastIndexOf('\n');
  return `${line}:${col}`;
};

// "wwwroot/<rel>:<line>:<col>" reference for a match offset, so a VS Code
// problem matcher can link the message to the source file.
export const ref = (rel, text, offset) => `wwwroot/${rel}:${lineCol(text, offset)}`;

export const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const exists = (file) => access(file).then(() => true, () => false);
export const posix = (file) => file.split(path.sep).join('/');

export async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`${posix(path.relative(ROOT, file))}: ${error.message}`, { cause: error });
  }
}

export async function walk(dir, base = '') {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), rel));
    else files.push(rel);
  }
  return files;
}

// Content hashes for cache busting: first 8 hex chars of the SHA-256 of a
// file. Deterministic: the version changes automatically when the file does.
export const sha256Hex = (data) => createHash('sha256').update(data).digest('hex');
export const shortHash = (data) => sha256Hex(data).slice(0, 8);

// "My Cool Project!" / "Über mich" -> "my-cool-project" / "ueber-mich".
// Umlauts are transliterated so German titles yield valid lowercase-hyphenated ids.
export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function safeExternalUrl(value) {
  if (typeof value !== 'string' || value === '') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function formatDate(value, locale = 'en') {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', timeZone: 'UTC' });
}

const execFileAsync = promisify(execFile);
const isoDate = (date) => date.toISOString().slice(0, 10);

// Last git commit date (YYYY-MM-DD) of a wwwroot-relative source
// file, used for the sitemap lastmod of non-project pages. Uncommitted changes
// -> today; untracked files or an unavailable git -> null (lastmod omitted).
export async function gitLastModified(rel) {
  const file = posix(`wwwroot/${rel}`);
  let status;
  try {
    ({ stdout: status } = await execFileAsync('git', ['status', '--porcelain', '--', file], { cwd: ROOT }));
  } catch {
    return null;
  }
  if (status.trim().startsWith('??')) return null; // untracked: no git history
  if (status.trim() !== '') return isoDate(new Date());
  try {
    const { stdout } = await execFileAsync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT });
    return /^\d{4}-\d{2}-\d{2}$/.test(stdout.trim()) ? stdout.trim() : null;
  } catch {
    return null;
  }
}

