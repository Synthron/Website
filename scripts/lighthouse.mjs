// Runs `lhci autorun`, then writes index.html next to the reports as an overview.
// Exits with the lhci status, so failed assertions still fail the run.

import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { minScores, renderLighthouseOverview } from './lib/lighthouse.mjs';
import { ROOT, posix, readJson } from './lib/util.mjs';

const config = await readJson(path.join(ROOT, 'lighthouserc.json'));
const reports = path.resolve(ROOT, config.ci?.upload?.outputDir ?? '.lighthouseci');
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
