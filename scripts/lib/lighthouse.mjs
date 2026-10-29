// Overview page for the Lighthouse CI filesystem reports (manifest.json of `lhci upload`).

import { esc } from './util.mjs';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const LABELS = { performance: 'Performance', accessibility: 'Accessibility', 'best-practices': 'Best practices', seo: 'SEO' };

const rank = (key) => {
  const index = CATEGORIES.indexOf(key);
  return index === -1 ? CATEGORIES.length : index;
};

// Lighthouse colour bands: >= 90 pass, >= 50 average, below fail.
export function scoreClass(score) {
  if (typeof score !== 'number') return 'none';
  if (score >= 0.9) return 'pass';
  return score >= 0.5 ? 'average' : 'fail';
}

function pageLabel(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return String(url);
  }
}

// `categories:<key>` minScore values of the lhci assert config.
export function minScores(assertions = {}) {
  const result = {};
  for (const [name, value] of Object.entries(assertions)) {
    const min = Array.isArray(value) ? value[1]?.minScore : undefined;
    if (name.startsWith('categories:') && typeof min === 'number') result[name.slice('categories:'.length)] = min;
  }
  return result;
}

export function renderLighthouseOverview(manifest, { minScores: mins = {}, generated = new Date() } = {}) {
  const runs = manifest.filter((entry) => entry.isRepresentativeRun);
  const keys = [...new Set(runs.flatMap((entry) => Object.keys(entry.summary ?? {})))].sort((a, b) => rank(a) - rank(b));
  const head = keys.map((key) => {
    const min = typeof mins[key] === 'number' ? ` (≥ ${Math.round(mins[key] * 100)})` : '';
    return `<th scope="col">${esc(LABELS[key] ?? key)}${min}</th>`;
  }).join('');
  let below = 0;
  const rows = runs.map((entry) => {
    const file = String(entry.htmlPath).split(/[\\/]/).pop();
    const cells = keys.map((key) => {
      const score = entry.summary?.[key];
      const text = typeof score === 'number' ? Math.round(score * 100) : '–';
      const fails = typeof score === 'number' && typeof mins[key] === 'number' && score < mins[key];
      if (fails) below += 1;
      return `<td class="${scoreClass(score)}${fails ? ' below' : ''}">${text}</td>`;
    }).join('');
    return `      <tr><th scope="row"><a href="${esc(encodeURIComponent(file))}">${esc(pageLabel(entry.url))}</a></th>${cells}</tr>`;
  }).join('\n');
  const stamp = generated.toISOString().replace('T', ' ').slice(0, 16);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lighthouse reports</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 1rem auto; max-width: 60rem; padding: 0 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #8884; padding: 0.4rem 0.6rem; text-align: right; }
    th[scope="row"], thead th:first-child { text-align: left; }
    .pass { color: #0a7c3a; }
    .average { color: #b45f00; }
    .fail { color: #c5221f; font-weight: bold; }
    .below { font-weight: bold; outline: 2px solid currentcolor; outline-offset: -2px; }
    @media (prefers-color-scheme: dark) {
      .pass { color: #4cd07d; }
      .average { color: #ffa94d; }
      .fail { color: #ff6b6b; }
    }
  </style>
</head>
<body>
  <h1>Lighthouse reports</h1>
  <p>${runs.length} pages, generated ${esc(stamp)} UTC. ${below} scores below the asserted minimum (framed).</p>
  <table>
    <thead>
      <tr><th scope="col">Page</th>${head}</tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>
`;
}
