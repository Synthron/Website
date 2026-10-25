// dist/ report (S65): total size, largest files, per-page sizes, raster images
// not converted to WebP and unused assets in assets/img/. Read-only; run after
// `npm run build`. Node built-ins only.

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TOP = 10;

async function walkFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(file));
    else files.push(file);
  }
  return files;
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const pad = (text, width) => text.padStart(width);

async function main() {
  let files;
  try {
    files = await walkFiles(DIST);
  } catch {
    console.error('dist/ not found — run `npm run build` first.');
    process.exit(1);
  }

  const sizes = [];
  const pages = [];
  const rasterImages = [];
  const imgAssets = [];
  let total = 0;
  for (const file of files) {
    const { size } = await stat(file);
    const rel = path.relative(DIST, file).split(path.sep).join('/');
    total += size;
    sizes.push({ rel, size });
    if (rel.endsWith('.html')) pages.push({ rel, size });
    else if (/^assets\/img\/.*\.(png|jpe?g|gif|ico)$/i.test(rel)) rasterImages.push({ rel, size });
    else if (rel.startsWith('assets/img/')) imgAssets.push({ rel, size });
  }
  const bySize = (a, b) => b.size - a.size;
  const print = (rows) => {
    if (rows.length === 0) {
      console.log('  (none)');
      return;
    }
    rows.sort(bySize).slice(0, TOP).forEach(({ rel, size }) => console.log(`  ${pad(kb(size), 9)}  ${rel}`));
  };

  console.log(`dist/ report — ${kb(total)} (${(total / 1048576).toFixed(2)} MB), ${files.length} files`);
  console.log(`\nLargest files (top ${TOP}):`);
  print(sizes);
  console.log('\nPages by size:');
  print(pages);
  console.log('\nRaster images not converted to WebP:');
  if (rasterImages.length === 0) console.log('  (none — all raster images use WebP)');
  else print(rasterImages);
  console.log('\nUnused assets in assets/img/ (not referenced by any built page):');
  const pageText = (await Promise.all(pages.map(({ rel }) => readFile(path.join(DIST, rel), 'utf8')))).join('\n');
  const unused = imgAssets.filter(({ rel }) => !pageText.includes(`assets/img/${path.posix.basename(rel)}`));
  print(unused);
}

await main();
