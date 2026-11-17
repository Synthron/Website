// Unit tests for the tracing helpers in vectorize.mjs (node --test built-in runner).

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPalette, layerMasks, mismatchShare, parseHexColor, svgDocument, toHex, traceLayer } from './vectorize.mjs';

// RGBA buffer from a list of [r, g, b, a] pixels.
const rgba = (pixels) => Buffer.from(pixels.flat());
const repeat = (pixel, n) => Array.from({ length: n }, () => pixel);

test('parseHexColor accepts rrggbb with or without #', () => {
  assert.deepEqual(parseHexColor('#0071bc'), [0, 113, 188]);
  assert.deepEqual(parseHexColor('B32027'), [179, 32, 39]);
  assert.throws(() => parseHexColor('#fff'), /invalid colour/);
  assert.throws(() => parseHexColor('red'), /invalid colour/);
});

test('toHex formats an RGB triple', () => {
  assert.equal(toHex([0, 113, 188]), '#0071bc');
});

test('detectPalette returns the flat colours by frequency and ignores edges and transparency', () => {
  const data = rgba([
    ...repeat([0, 113, 188, 255], 600),
    ...repeat([179, 32, 39, 255], 300),
    ...repeat([90, 70, 110, 255], 2),
    ...repeat([8, 113, 188, 255], 50),
    ...repeat([255, 255, 255, 0], 400),
  ]);
  assert.deepEqual(detectPalette(data), [[0, 113, 188], [179, 32, 39]]);
  assert.deepEqual(detectPalette(data, { maxColors: 1 }), [[0, 113, 188]]);
  assert.deepEqual(detectPalette(rgba(repeat([0, 0, 0, 0], 10))), []);
});

test('layerMasks orders layers by coverage and stacks smaller layers into larger ones', () => {
  const blue = [0, 0, 255];
  const red = [255, 0, 0];
  const data = rgba([[0, 0, 250, 255], [0, 0, 255, 255], [250, 0, 0, 128], [0, 0, 0, 0]]);
  const [bottom, top] = layerMasks(data, [red, blue]);
  assert.deepEqual(bottom.color, blue);
  assert.deepEqual([...bottom.mask], [0, 0, 127, 255]);
  assert.deepEqual(top.color, red);
  assert.deepEqual([...top.mask], [255, 255, 127, 255]);
  assert.equal(bottom.coverage, 2);
  assert.equal(layerMasks(data, [blue, [0, 255, 0]])[1].coverage, 0);
});

test('svgDocument wraps paths with the image size as viewBox', () => {
  assert.equal(svgDocument(20, 10, ['<path d="M0 0"/>']), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><path d="M0 0"/></svg>\n');
});

test('mismatchShare counts differing drawn pixels only', () => {
  const a = rgba([[0, 0, 255, 255], [0, 0, 255, 255], [9, 9, 9, 0], [255, 0, 0, 255]]);
  const b = rgba([[0, 0, 255, 255], [0, 0, 250, 255], [200, 9, 9, 0], [0, 0, 255, 255]]);
  assert.equal(mismatchShare(a, b), 1 / 3);
  assert.equal(mismatchShare(a, a), 0);
  assert.equal(mismatchShare(rgba([[0, 0, 0, 0]]), rgba([[0, 0, 0, 0]])), 0);
});

test('traceLayer traces a filled square in the given colour', async () => {
  const size = 20;
  const mask = Buffer.alloc(size * size, 255);
  for (let y = 5; y < 15; y += 1) mask.fill(0, y * size + 5, y * size + 15);
  const tag = await traceLayer(mask, size, size, [179, 32, 39]);
  assert.match(tag, /^<path d="M[^"]+"[^>]*fill="#b32027"/);
});
