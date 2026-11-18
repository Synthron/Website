// Build-time syntax highlighting of <pre data-lang="…"><code> blocks. Rules per
// language come from data/code-languages.json; the output is plain <span>s.

import { esc, fail, ref } from './util.mjs';

const DEFAULT_NUMBER = String.raw`\b(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)[uUlLfF]*\b`;
const DEFAULT_WORD = String.raw`[A-Za-z_]\w*`;

const escRe = (value) => value.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

// Single-line string; an unterminated one ends at the line end.
const stringPattern = (quote) => {
  const q = escRe(quote);
  return String.raw`${q}(?:\\[^\n]|[^\\\n${q}])*${q}?`;
};

// Compiles one language definition into a single scanner regex. Alternatives
// are tried in this order: comment, string, number, word. Throws on invalid
// or empty-matching patterns.
export function compileLanguage(def) {
  for (const key of ['number', 'word']) {
    if (def[key] !== undefined && new RegExp(`^(?:${def[key]})$`).test('')) {
      throw new Error(`"${key}" pattern matches the empty string`);
    }
  }
  const comments = [
    ...(def.blockComment ?? []).map(([open, close]) => String.raw`${escRe(open)}[\s\S]*?(?:${escRe(close)}|$)`),
    ...(def.lineComment ?? []).map((prefix) => String.raw`${escRe(prefix)}[^\n]*`),
  ];
  const strings = (def.strings ?? []).map(stringPattern);
  const parts = [];
  if (comments.length > 0) parts.push(`(?<comment>${comments.join('|')})`);
  if (strings.length > 0) parts.push(`(?<string>${strings.join('|')})`);
  parts.push(`(?<number>${def.number ?? DEFAULT_NUMBER})`, `(?<word>${def.word ?? DEFAULT_WORD})`);
  const ignoreCase = def.ignoreCase === true;
  return {
    pattern: new RegExp(parts.join('|'), 'g'),
    keywords: new Set((def.keywords ?? []).map((word) => (ignoreCase ? word.toLowerCase() : word))),
    ignoreCase,
  };
}

// Plain code text -> escaped HTML with code-block__<kind> spans.
export function highlight(code, lang) {
  let html = '';
  let last = 0;
  for (const match of code.matchAll(lang.pattern)) {
    const [text] = match;
    if (text === '') continue;
    const { comment, string, number } = match.groups;
    let kind = null;
    if (comment !== undefined) kind = 'comment';
    else if (string !== undefined) kind = 'string';
    else if (number !== undefined) kind = 'number';
    else if (lang.keywords.has(lang.ignoreCase ? text.toLowerCase() : text)) kind = 'keyword';
    html += esc(code.slice(last, match.index));
    html += kind ? `<span class="code-block__${kind}">${esc(text)}</span>` : esc(text);
    last = match.index + text.length;
  }
  return html + esc(code.slice(last));
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };

// Decodes the escaped source text; returns null on an unknown named entity.
export function decodeText(html) {
  let unknown = false;
  const text = html.replace(/&(?:#(\d+)|#x([\da-f]+)|(\w+));/gi, (match, dec, hex, name) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    const value = ENTITIES[name.toLowerCase()];
    if (value === undefined) unknown = true;
    return value ?? match;
  });
  return unknown ? null : text;
}

const CODE_BLOCK = /(<pre\b[^>]*\bdata-lang="([^"]*)"[^>]*>\s*<code\b[^>]*>)([\s\S]*?)(<\/code>\s*<\/pre>)/g;

// Highlights every <pre data-lang="…"><code>…</code></pre> of a built page.
// Blocks without data-lang stay as they are.
export function applyHighlighting(html, languages, rel) {
  return html.replace(CODE_BLOCK, (match, open, name, code, close, offset) => {
    const lang = languages[name];
    if (!lang) {
      fail(`${ref(rel, html, offset)}: unknown code language data-lang="${name}" (data/code-languages.json)`);
      return match;
    }
    if (/<[a-z/!?]/i.test(code)) {
      fail(`${ref(rel, html, offset)}: code block data-lang="${name}" contains markup; escape < as &lt;`);
      return match;
    }
    const text = decodeText(code);
    if (text === null) {
      fail(`${ref(rel, html, offset)}: code block data-lang="${name}" contains an unsupported entity (use &amp;, &lt;, &gt;, &quot;, &apos;, &nbsp; or numeric ones)`);
      return match;
    }
    return open + highlight(text, lang) + close;
  });
}
