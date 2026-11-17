// Raster -> SVG (npm run vectorize): traces flat-colour images (logos, icons) with potrace,
// one layer per colour, optimises the result with svgo (svgo.config.mjs) and reports how
// closely the SVG matches the original. Writes <name>.svg next to the input; originals stay.
//
// Usage: npm run vectorize -- <image> [<image> …] [--colors 0071bc,b32027] [--force] [--dry-run]
//   <image>   path (relative to the current folder) or file name in wwwroot/assets/img/
//   --colors  palette to trace (default: detected); write it without "#" or quote it in PowerShell
//   --force   overwrite an existing SVG
//   --dry-run trace and report only, write nothing

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, optimize } from 'svgo';
import { ROOT, SRC, exists, posix } from './lib/util.mjs';
import { detectPalette, layerMasks, mismatchShare, parseHexColor, svgDocument, toHex, traceLayer } from './lib/vectorize.mjs';

const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MISMATCH_WARN = 0.05;
const USAGE = 'Usage: npm run vectorize -- <image> [<image> …] [--colors 0071bc,b32027] [--force] [--dry-run]';

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const rel = (file) => posix(path.relative(ROOT, file));

function parseArgs(argv) {
  const options = { files: [], colors: null, force: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--colors') options.colors = (argv[++i] ?? '').split(',').filter(Boolean).map(parseHexColor);
    else if (arg === '--force') options.force = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else options.files.push(arg);
  }
  if (options.files.length === 0) throw new Error('no input image given');
  if (options.colors?.length === 0) throw new Error('--colors needs at least one colour');
  return options;
}

async function resolveInput(arg) {
  const fromCwd = path.resolve(process.env.INIT_CWD ?? process.cwd(), arg);
  if (await exists(fromCwd)) return fromCwd;
  const fromImg = path.join(SRC, 'assets', 'img', arg);
  if (await exists(fromImg)) return fromImg;
  throw new Error(`${arg}: file not found`);
}

async function vectorize(file, options, svgoConfig) {
  if (!RASTER.has(path.extname(file).toLowerCase())) throw new Error(`${rel(file)}: expected a raster image (${[...RASTER].join(', ')})`);
  const target = file.replace(/\.[^.]+$/, '.svg');
  if (await exists(target) && !options.force && !options.dryRun) {
    console.log(`skip   ${rel(target)} (exists; --force overwrites)`);
    return;
  }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const palette = options.colors ?? detectPalette(data);
  if (palette.length === 0) throw new Error(`${rel(file)}: no flat colour found; pass --colors`);
  const layers = layerMasks(data, palette);
  const paths = [];
  for (const layer of layers) {
    if (layer.coverage === 0) {
      console.warn(`warn   ${rel(file)}: colour ${toHex(layer.color)} not found, skipped`);
      continue;
    }
    paths.push(await traceLayer(layer.mask, info.width, info.height, layer.color));
  }
  const { data: svg } = optimize(svgDocument(info.width, info.height, paths), { ...svgoConfig, path: target });
  const rendered = await sharp(Buffer.from(svg))
    .resize({ width: info.width, height: info.height, fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const mismatch = mismatchShare(data, rendered);
  const input = (await readFile(file)).length;
  const output = Buffer.byteLength(svg);
  if (!options.dryRun) await writeFile(target, svg);
  console.log(`${options.dryRun ? '[dry-run] ' : ''}svg    ${rel(file)} (${kb(input)}) -> ${rel(target)} (${kb(output)}); colours ${layers.filter((l) => l.coverage).map((l) => toHex(l.color)).join(', ')}; mismatch ${(mismatch * 100).toFixed(1)} %`);
  if (mismatch > MISMATCH_WARN) {
    console.warn(`warn   ${rel(target)}: mismatch above ${MISMATCH_WARN * 100} %; check it visually, pass --colors or keep the raster image (photos and gradients do not trace well)`);
  }
  if (output > input) console.warn(`warn   ${rel(target)}: larger than the original; probably not a flat-colour image, keep the raster image`);
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`vectorize: ${error.message}`);
  console.error(USAGE);
  process.exit(1);
}

const svgoConfig = await loadConfig(path.join(ROOT, 'svgo.config.mjs'), ROOT);
let failed = false;
for (const arg of options.files) {
  try {
    await vectorize(await resolveInput(arg), options, svgoConfig);
  } catch (error) {
    console.error(`vectorize failed: ${error.message}`);
    failed = true;
  }
}
if (failed) process.exit(1);
