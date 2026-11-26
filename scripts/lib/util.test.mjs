// Unit tests for the pure helpers in util.mjs (node --test built-in runner).

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { esc, formatDate, mapLimit, safeExternalUrl, slugify, walk } from './util.mjs';

test('walk rejects symbolic links', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'site-walk-'));
  try {
    await writeFile(path.join(dir, 'a.txt'), 'a');
    assert.deepEqual(await walk(dir), ['a.txt']);
    // File symlinks need a privilege on Windows; a junction counts as a link too.
    await symlink(dir, path.join(dir, 'link'), 'junction');
    await assert.rejects(walk(dir), /link: symbolic links are not allowed/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('mapLimit keeps input order and never exceeds the limit', async () => {
  let running = 0;
  let peak = 0;
  const results = await mapLimit([5, 1, 4, 2, 3], 2, async (value) => {
    running += 1;
    peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, value));
    running -= 1;
    return value * 10;
  });
  assert.deepEqual(results, [50, 10, 40, 20, 30]);
  assert.equal(peak, 2);
  assert.deepEqual(await mapLimit([], 4, async (value) => value), []);
});

test('esc escapes HTML characters', () => {
  // \x26 = "&": written via escapes so the literal entity text is not decoded.
  assert.equal(esc('<a href="x">&</a>'), '\x26lt;a href=\x26quot;x\x26quot;\x26gt;\x26amp;\x26lt;/a\x26gt;');
  assert.equal(esc('plain'), 'plain');
});

test('slugify lowercases and hyphenates', () => {
  assert.equal(slugify('My Cool Project!'), 'my-cool-project');
  assert.equal(slugify('  double   spaces  '), 'double-spaces');
  assert.equal(slugify('Über mich'), 'ueber-mich');
  assert.equal(slugify('Nußknacker'), 'nussknacker');
  assert.equal(slugify('a'), 'a');
});

test('safeExternalUrl only accepts http(s)', () => {
  assert.equal(safeExternalUrl('https://example.com/x'), 'https://example.com/x');
  assert.equal(safeExternalUrl('http://example.com'), 'http://example.com/');
  assert.equal(safeExternalUrl('ftp://example.com'), null);
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl(''), null);
  assert.equal(safeExternalUrl(null), null);
  assert.equal(safeExternalUrl(42), null);
});

test('formatDate renders the locale and keeps the month', () => {
  assert.equal(formatDate('2026-05', 'de'), 'Mai 2026');
  assert.equal(formatDate('2026-05'), 'May 2026');
});

test('formatDate formats the same month per language and ignores the local time zone', () => {
  assert.equal(formatDate('2026-05', 'en'), 'May 2026');
  assert.equal(formatDate('2026-01', 'en'), 'Jan 2026');
  assert.equal(formatDate('2026-12', 'en-GB'), 'Dec 2026');
});
