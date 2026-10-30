// Image processing (npm run images):
// - raster images in assets/img/ -> WebP next to the original (originals untouched)
// - assets/img/og-default.png (1200x630) from favicon.svg, if missing
// - SVGs in assets/img/, assets/icons/ and favicon.svg optimised in place (svgo.config.mjs)
// Existing outputs are never overwritten. --dry-run reports without writing.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, optimize } from 'svgo';
import { ROOT, SRC, exists } from './lib/util.mjs';

const dryRun = process.argv.includes('--dry-run');
const RASTER = new Set(['.png', '.jpg', '.jpeg']);
const OG_IMAGE = 'assets/img/og-default.png';
const OG_SIZE = { width: 1200, height: 630 };
const OG_LOGO_HEIGHT = 420;
// Light background of css/base.css (--color-bg).
const OG_BACKGROUND = '#fdfdfc';
const WEBP_QUALITY = 82;

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const log = (message) => console.log(`${dryRun ? '[dry-run] ' : ''}${message}`);

async function listFiles(dir) {
  const abs = path.join(SRC, dir);
  if (!await exists(abs)) return [];
  return (await readdir(abs, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => `${dir}/${entry.name}`);
}

async function convertRaster() {
  for (const rel of await listFiles('assets/img')) {
    if (!RASTER.has(path.extname(rel).toLowerCase()) || rel === OG_IMAGE) continue;
    const target = rel.replace(/\.[^.]+$/, '.webp');
    if (await exists(path.join(SRC, target))) {
      log(`skip   ${target} (exists)`);
      continue;
    }
    const input = await readFile(path.join(SRC, rel));
    const output = await sharp(input).webp({ quality: WEBP_QUALITY }).toBuffer();
    if (output.length >= input.length) {
      log(`skip   ${rel} (WebP ${kb(output.length)} would not be smaller; keep the original)`);
      continue;
    }
    if (!dryRun) await writeFile(path.join(SRC, target), output);
    log(`webp   ${rel} (${kb(input.length)}) -> ${target} (${kb(output.length)}); switch references to the WebP`);
  }
}

async function createOgImage() {
  if (await exists(path.join(SRC, OG_IMAGE))) {
    log(`skip   ${OG_IMAGE} (exists)`);
    return;
  }
  const logo = await sharp(path.join(SRC, 'favicon.svg'), { density: 600 })
    .resize({ height: OG_LOGO_HEIGHT })
    .png()
    .toBuffer();
  const output = await sharp({ create: { ...OG_SIZE, channels: 3, background: OG_BACKGROUND } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  if (!dryRun) await writeFile(path.join(SRC, OG_IMAGE), output);
  log(`og     favicon.svg -> ${OG_IMAGE} (${OG_SIZE.width}x${OG_SIZE.height}, ${kb(output.length)})`);
}

async function optimiseSvgs() {
  const config = await loadConfig(path.join(ROOT, 'svgo.config.mjs'), ROOT);
  const files = [...await listFiles('assets/img'), ...await listFiles('assets/icons'), 'favicon.svg']
    .filter((rel) => rel.endsWith('.svg'));
  for (const rel of files) {
    const file = path.join(SRC, rel);
    const input = await readFile(file, 'utf8');
    const { data } = optimize(input, { ...config, path: file });
    const before = Buffer.byteLength(input);
    const after = Buffer.byteLength(data);
    if (after >= before) {
      log(`skip   ${rel} (already optimal)`);
      continue;
    }
    if (!dryRun) await writeFile(file, data);
    log(`svgo   ${rel} ${kb(before)} -> ${kb(after)}`);
  }
}

try {
  await convertRaster();
  await createOgImage();
  await optimiseSvgs();
} catch (error) {
  console.error(`images failed: ${error.message}`);
  process.exit(1);
}
