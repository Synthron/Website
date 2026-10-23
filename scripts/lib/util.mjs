// Shared paths, error collection and small helpers for the build.

import { createHash } from 'node:crypto';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SRC = path.join(ROOT, 'wwwroot');
export const DIST = path.join(ROOT, 'dist');

export const errors = [];
export const fail = (message) => errors.push(message);

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
    throw new Error(`${posix(path.relative(ROOT, file))}: ${error.message}`);
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

export function safeExternalUrl(value) {
  if (typeof value !== 'string' || value === '') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function formatDate(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return date.toLocaleDateString('en', { year: 'numeric', month: 'short', timeZone: 'UTC' });
}

export const countLabel = (count) => (count === 1 ? '1 project' : `${count} projects`);
