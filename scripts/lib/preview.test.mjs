// Tests for the preview server helpers (preview.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { hasFlasher, rootRedirect } from './preview.mjs';

const codes = ['de', 'en'];

test('rootRedirect follows the first Accept-Language entry by primary subtag', () => {
  assert.equal(rootRedirect('de-AT,de;q=0.9,en;q=0.8', codes), '/de/');
  assert.equal(rootRedirect('en-US,en;q=0.9', codes), '/en/');
  assert.equal(rootRedirect('EN-gb', codes), '/en/');
});

test('rootRedirect returns null for other, wildcard or missing languages', () => {
  assert.equal(rootRedirect('fr-FR,de;q=0.5', codes), null);
  assert.equal(rootRedirect('*', codes), null);
  assert.equal(rootRedirect(undefined, codes), null);
  assert.equal(rootRedirect('', codes), null);
});

test('hasFlasher detects the install button in served HTML', () => {
  assert.equal(hasFlasher('<p><esp-web-install-button manifest="m.json"></esp-web-install-button>'), true);
  assert.equal(hasFlasher('<p>esp-web-install-button</p>'), false);
});
