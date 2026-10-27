import assert from 'node:assert/strict';
import test from 'node:test';
import { isTodo, localize } from './data.mjs';

const project = {
  id: 'demo',
  title: { de: 'Titel' },
  summary: { de: 'Text' },
  tags: { de: ['hardware'] },
};

test('isTodo detects TODO placeholders only', () => {
  assert.equal(isTodo('TODO'), true);
  assert.equal(isTodo('TODO: translate'), true);
  assert.equal(isTodo('Todos are fine'), false);
  assert.equal(isTodo(undefined), false);
});

test('localize returns a flat view or null', () => {
  assert.deepEqual(localize(project, 'de'), { ...project, title: 'Titel', summary: 'Text', tags: ['hardware'] });
  assert.equal(localize(project, 'en'), null);
});
