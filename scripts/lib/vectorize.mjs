// Raster -> SVG tracing helpers (npm run vectorize): one potrace layer per palette colour.

import potrace from 'potrace';
import sharp from 'sharp';

// Pixels at or above this alpha count for palette detection (edges are anti-aliased).
const OPAQUE = 250;
const NONE = 0xffff;
// turdSize drops specks up to 4 px²; low optTolerance keeps curves close to the original.
export const TRACE_PARAMS = { turdSize: 4, optTolerance: 0.2, alphaMax: 1, threshold: 128 };

export function parseHexColor(value) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(value).trim());
  if (!match) throw new Error(`invalid colour "${value}" (expected rrggbb or #rrggbb)`);
  return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16));
}

export const toHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

const distance2 = (data, i, c) => (data[i] - c[0]) ** 2 + (data[i + 1] - c[1]) ** 2 + (data[i + 2] - c[2]) ** 2;

// Dominant flat colours of an RGBA buffer, most frequent first. Colours below minShare of the
// opaque pixels (anti-aliasing, noise) and colours closer than mergeDistance to a kept one are dropped.
export function detectPalette(data, { minShare = 0.005, maxColors = 8, mergeDistance = 48 } = {}) {
  const buckets = new Map();
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < OPAQUE) continue;
    opaque += 1;
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, bucket = { n: 0, sum: [0, 0, 0] });
    bucket.n += 1;
    for (let c = 0; c < 3; c += 1) bucket.sum[c] += data[i + c];
  }
  const palette = [];
  for (const bucket of [...buckets.values()].sort((a, b) => b.n - a.n)) {
    if (bucket.n < opaque * minShare || palette.length === maxColors) break;
    const rgb = bucket.sum.map((s) => Math.round(s / bucket.n));
    if (palette.some((c) => distance2(rgb, 0, c) < mergeDistance ** 2)) continue;
    palette.push(rgb);
  }
  return palette;
}

// One potrace input mask per colour (0 = covered, 255 = empty), in drawing order: largest
// coverage first. Each mask also covers the pixels of the layers drawn above it, so adjacent
// colours overlap instead of leaving hairline gaps.
export function layerMasks(data, palette) {
  const pixels = data.length / 4;
  const nearest = new Uint16Array(pixels);
  const coverage = new Array(palette.length).fill(0);
  for (let p = 0, i = 0; p < pixels; p += 1, i += 4) {
    if (data[i + 3] === 0) {
      nearest[p] = NONE;
      continue;
    }
    let best = 0;
    for (let k = 1; k < palette.length; k += 1) {
      if (distance2(data, i, palette[k]) < distance2(data, i, palette[best])) best = k;
    }
    nearest[p] = best;
    coverage[best] += data[i + 3] / 255;
  }
  const order = palette.map((_, k) => k).sort((a, b) => coverage[b] - coverage[a]);
  const rank = new Map(order.map((k, r) => [k, r]));
  return order.map((k, r) => {
    const mask = Buffer.alloc(pixels, 255);
    for (let p = 0; p < pixels; p += 1) {
      if (nearest[p] !== NONE && rank.get(nearest[p]) >= r) mask[p] = 255 - data[p * 4 + 3];
    }
    return { color: palette[k], coverage: Math.round(coverage[k]), mask };
  });
}

export async function traceLayer(mask, width, height, color, params = TRACE_PARAMS) {
  const png = await sharp(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
  const tracer = new potrace.Potrace(params);
  await new Promise((resolve, reject) => tracer.loadImage(png, (error) => (error ? reject(error) : resolve())));
  return tracer.getPathTag(toHex(color));
}

export const svgDocument = (width, height, paths) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${paths.join('')}</svg>\n`;

// Share of drawn pixels (either image) whose premultiplied RGBA differs by more than `tolerance`.
export function mismatchShare(a, b, tolerance = 64) {
  let drawn = 0;
  let differ = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 128 && b[i + 3] < 128) continue;
    drawn += 1;
    for (let c = 0; c < 4; c += 1) {
      const va = c < 3 ? a[i + c] * a[i + 3] / 255 : a[i + c];
      const vb = c < 3 ? b[i + c] * b[i + 3] / 255 : b[i + c];
      if (Math.abs(va - vb) > tolerance) {
        differ += 1;
        break;
      }
    }
  }
  return drawn ? differ / drawn : 0;
}
