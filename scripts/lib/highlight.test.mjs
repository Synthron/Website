import assert from 'node:assert/strict';
import test from 'node:test';
import { applyHighlighting, compileLanguage, decodeText, highlight } from './highlight.mjs';
import { errors } from './util.mjs';

const C = compileLanguage({
  keywords: ['int', 'return', '#include'],
  lineComment: ['//'],
  blockComment: [['/*', '*/']],
  strings: ['"', "'"],
  word: '#?[A-Za-z_]\\w*',
});
const span = (kind, text) => `<span class="code-block__${kind}">${text}</span>`;

test('highlight marks keywords, comments, numbers and strings', () => {
  assert.equal(highlight('int x = 0x1F; // done', C),
    `${span('keyword', 'int')} x = ${span('number', '0x1F')}; ${span('comment', '// done')}`);
  assert.equal(highlight('/* a\nb */ return 1.5e3;', C),
    `${span('comment', '/* a\nb */')} ${span('keyword', 'return')} ${span('number', '1.5e3')};`);
  assert.equal(highlight('#include "a.h"', C), `${span('keyword', '#include')} ${span('string', '&quot;a.h&quot;')}`);
});

test('highlight skips keywords and numbers inside strings, comments and identifiers', () => {
  assert.equal(highlight('"int 1" x1 int2', C), `${span('string', '&quot;int 1&quot;')} x1 int2`);
  assert.equal(highlight('"a\\"b" c', C), `${span('string', '&quot;a\\&quot;b&quot;')} c`);
  // An unterminated string ends at the line end.
  assert.equal(highlight('"open\nint', C), `${span('string', '&quot;open')}\n${span('keyword', 'int')}`);
});

test('highlight escapes plain text', () => {
  assert.equal(highlight('a < b && c', C), 'a &lt; b &amp;&amp; c');
});

test('compileLanguage supports ignoreCase and custom number/word patterns', () => {
  const asm = compileLanguage({ keywords: ['lda', '.byte'], ignoreCase: true, lineComment: [';'], number: '\\$[\\da-fA-F]+|%[01]+|\\b\\d+\\b', word: '\\.?[A-Za-z_]\\w*' });
  assert.equal(highlight('LDA #$FF ; x', asm), `${span('keyword', 'LDA')} #${span('number', '$FF')} ${span('comment', '; x')}`);
  assert.equal(highlight('.byte %0101, 7', asm), `${span('keyword', '.byte')} ${span('number', '%0101')}, ${span('number', '7')}`);
});

test('compileLanguage rejects patterns that match the empty string', () => {
  assert.throws(() => compileLanguage({ keywords: [], number: '\\d*' }), /empty string/);
  assert.throws(() => compileLanguage({ keywords: [], word: '(' }));
});

test('decodeText decodes entities and rejects unknown named ones', () => {
  assert.equal(decodeText('&lt;a&gt; &amp; &quot;&#39;&#x41;'), '<a> & "\'A');
  assert.equal(decodeText('&copy;'), null);
});

test('applyHighlighting highlights data-lang blocks only', () => {
  errors.length = 0;
  const plain = '<pre class="code-block"><code>int x;</code></pre>';
  const html = `${plain}<pre class="code-block" data-lang="c"><code>int x = 1 &lt; 2;</code></pre>`;
  assert.equal(applyHighlighting(html, { c: C }, 'de/a.html'),
    `${plain}<pre class="code-block" data-lang="c"><code>${span('keyword', 'int')} x = ${span('number', '1')} &lt; ${span('number', '2')};</code></pre>`);
  assert.equal(errors.length, 0);
});

test('applyHighlighting fails on unknown languages, markup and unknown entities', () => {
  errors.length = 0;
  const block = (lang, code) => `<pre class="code-block" data-lang="${lang}"><code>${code}</code></pre>`;
  for (const html of [block('cobol', 'x'), block('c', '<b>int</b>'), block('c', '&copy;')]) {
    assert.equal(applyHighlighting(html, { c: C }, 'de/a.html'), html);
  }
  assert.equal(errors.length, 3);
  errors.length = 0;
});
