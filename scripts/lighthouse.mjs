// Runs `lhci autorun`, then writes index.html next to the reports as an overview.
// Exits with the lhci status, so failed assertions still fail the run.
// Before running, the `url` list in lighthouserc.json is refreshed from the
// built pages in dist/, so every page is audited even after pages are added,
// renamed or removed (npm run create does not touch this file).

import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { minScores, renderLighthouseOverview } from './lib/lighthouse.mjs';
import { DIST, ROOT, posix, readJson, walk } from './lib/util.mjs';

const CONFIG_FILE = path.join(ROOT, 'lighthouserc.json');
const config = await readJson(CONFIG_FILE);
const reports = path.resolve(ROOT, config.ci?.upload?.outputDir ?? '.lighthouseci');

// Every built HTML page becomes a URL for Lighthouse. The port must match the
// startServerCommand in lighthouserc.json (8020).
const PORT = 8020;
const base = `http://127.0.0.1:${PORT}/`;
const urls = (await walk(DIST))
  .filter((rel) => rel.endsWith('.html'))
  .sort()
  .map((rel) => base + posix(rel));
config.ci.collect.url = urls;
await writeFile(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Refreshed ${urls.length} page(s) in lighthouserc.json`);

const cli = createRequire(import.meta.url).resolve('@lhci/cli/src/cli.js');
const { status } = spawnSync(process.execPath, [cli, 'autorun', ...process.argv.slice(2)], { cwd: ROOT, stdio: 'inherit' });

try {
  const manifest = await readJson(path.join(reports, 'manifest.json'));
  const file = path.join(reports, 'index.html');
  await writeFile(file, renderLighthouseOverview(manifest, { minScores: minScores(config.ci?.assert?.assertions) }));
  console.log(`Overview: ${posix(path.relative(ROOT, file))}`);
} catch (error) {
  console.error(`No overview written: ${error.message}`);
}
process.exit(status ?? 1);
