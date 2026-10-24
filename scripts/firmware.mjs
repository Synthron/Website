// Firmware suite scaffold: writes assets/firmware/<suite>/manifest.json for
// the asked chips and prints the <esp-web-install-button> snippet. Node
// built-ins only.
//
// Usage: npm run firmware -- <suite> [--chip ESP32] [--chip ESP32-S3] [--dry-run]
//   --chip can be repeated; each chip becomes one `builds` entry and expects
//   its own binaries (e.g. esp32s3/bootloader.bin, esp32s3/firmware.bin).

import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIRMWARE_DIR = path.join(ROOT, 'wwwroot', 'assets', 'firmware');

// D22 / README: bootloader offset for a plain Arduino/PlatformIO app build.
// ESP32 and ESP32-S2 bootloaders sit at 0x1000; S3 and C3 at 0x0. Partitions
// and the app are the same for all four.
const CHIPS = {
  'ESP32': { bootloader: 0x1000 },
  'ESP32-S2': { bootloader: 0x1000 },
  'ESP32-S3': { bootloader: 0x0 },
  'ESP32-C3': { bootloader: 0x0 },
};
const PARTITIONS_OFFSET = 0x8000;
const APP_OFFSET = 0x10000;

const exists = (file) => access(file).then(() => true, () => false);

// "ESP32-S3" -> "esp32s3" (the binary folder name inside the suite).
function chipDir(chip) {
  return chip.toLowerCase().replace(/-/g, '');
}

// Human-readable suite name from the folder ("nixie-clock" -> "Nixie Clock").
function suiteName(suite) {
  return suite
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function main() {
  const argv = process.argv.slice(2);
  const suite = argv.find((arg) => !arg.startsWith('--'));
  const chips = [];
  const dryRun = argv.includes('--dry-run');
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--chip') chips.push(argv[i + 1] ?? '');
  }
  if (!suite || chips.length === 0) {
    console.error('Usage: npm run firmware -- <suite> --chip ESP32 [--chip ESP32-S3] [--dry-run]');
    console.error(`Supported --chip values: ${Object.keys(CHIPS).join(', ')}`);
    process.exit(1);
  }
  for (const chip of chips) {
    if (!(chip in CHIPS)) {
      console.error(`Unsupported --chip "${chip}" (expected one of: ${Object.keys(CHIPS).join(', ')}).`);
      process.exit(1);
    }
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(suite)) {
    console.error(`Invalid suite folder name "${suite}" (lowercase, hyphenated).`);
    process.exit(1);
  }

  const dir = path.join(FIRMWARE_DIR, suite);
  const manifestFile = path.join(dir, 'manifest.json');
  if (!dryRun && await exists(manifestFile)) {
    console.error(`A manifest already exists at wwwroot/assets/firmware/${suite}/manifest.json.`);
    process.exit(1);
  }

  const builds = chips.map((chip) => ({
    chipFamily: chip,
    parts: [
      { path: `${chipDir(chip)}/bootloader.bin`, offset: CHIPS[chip].bootloader },
      { path: `${chipDir(chip)}/partitions.bin`, offset: PARTITIONS_OFFSET },
      { path: `${chipDir(chip)}/firmware.bin`, offset: APP_OFFSET },
    ],
  }));
  const manifest = {
    name: suiteName(suite),
    version: '1.0.0',
    new_install_prompt_erase: false,
    builds,
  };

  if (dryRun) {
    console.log(`Dry run: would create wwwroot/assets/firmware/${suite}/manifest.json:`);
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  await mkdir(dir, { recursive: true });
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Created wwwroot/assets/firmware/${suite}/manifest.json`);
  console.log(`Expected binaries (drop them into the suite folders): ${chips.map(chipDir).map((d) => `${d}/bootloader.bin, ${d}/partitions.bin, ${d}/firmware.bin`).join('; ')}`);
  console.log('');
  console.log('Button snippet for the project page (before </body>, keep the vendored script tag):');
  console.log(`<esp-web-install-button manifest="{{root}}assets/firmware/${suite}/manifest.json"></esp-web-install-button>`);
  console.log('The CSP style-src exception is added automatically for flasher pages.');
}

main().catch((error) => {
  console.error(`firmware failed: ${error.message}`);
  process.exit(1);
});
