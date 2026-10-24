// Tests for the output checks (checks.mjs): broken-link detection with a
// temporary directory (node --test built-in runner).

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { errors } from './util.mjs';
import { checkLinks } from './checks.mjs';

let base;

test.before(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'site-check-'));
  await mkdir(path.join(base, 'css'), { recursive: true });
  await mkdir(path.join(base, 'assets', 'img'), { recursive: true });
  await writeFile(path.join(base, 'css', 'base.css'), '');
  await writeFile(path.join(base, 'assets', 'img', 'pic.webp'), '');
});

test.after(async () => {
  await rm(base, { recursive: true, force: true });
});

test('checkLinks accepts files that exist and strips ?v= before resolving', async () => {
  errors.length = 0;
  const html = '<link href="../css/base.css?v=abc123" rel="stylesheet">';
  await checkLinks('html/projects.html', html, base);
  assert.deepEqual(errors, []);
});

test('checkLinks rejects a missing target with a file:line reference', async () => {
  errors.length = 0;
  const html = '<img src="../assets/img/nope.webp" alt="">';
  await checkLinks('html/projects.html', html, base);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /wwwroot\/html\/projects\.html:\d+:\d+: broken link "\.\.\/assets\/img\/nope\.webp"/);
});

test('checkLinks checks every srcset candidate independently', async () => {
  errors.length = 0;
  const html = '<img srcset="assets/img/pic.webp 640w, assets/img/missing.webp 960w" alt="">';
  await checkLinks('index.html', html, base);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /broken link "assets\/img\/missing\.webp"/);
});

test('checkLinks ignores external and same-page schemes', async () => {
  errors.length = 0;
  const html = '<a href="https://example.com/x">x</a><a href="#section">s</a>';
  await checkLinks('index.html', html, base);
  assert.deepEqual(errors, []);
});
