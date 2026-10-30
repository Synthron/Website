// Browser checks for every built page (AGENTS.md -> Verification):
// layout at 320/768/1280 px, no console errors, no external requests,
// no cookies or storage, visible keyboard focus.

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');
const VIEWPORTS = [320, 768, 1280];
const FOCUS_STEPS = 6;

const pages = readdirSync(DIST, { recursive: true })
  .map((file) => String(file).split(path.sep).join('/'))
  .filter((file) => file.endsWith('.html'))
  .sort();

// Collects console errors, page errors and requests leaving the local server.
function watch(page, baseURL) {
  const origin = new URL(baseURL).origin;
  const problems = { console: [], external: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') problems.console.push(message.text());
  });
  page.on('pageerror', (error) => problems.console.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (/^(data|blob):/.test(url)) return;
    if (new URL(url).origin !== origin) problems.external.push(url);
  });
  return problems;
}

test('dist/ contains built pages', () => {
  expect(pages.length, 'run `npm run build` first').toBeGreaterThan(0);
});

for (const rel of pages) {
  test.describe(rel, () => {
    for (const width of VIEWPORTS) {
      test(`${width}px: no overflow, errors, external requests or storage`, async ({ page, context, baseURL }) => {
        await page.setViewportSize({ width, height: 900 });
        const problems = watch(page, baseURL);
        await page.goto(`/${rel}`, { waitUntil: 'networkidle' });

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
        expect(problems.console, 'console errors').toEqual([]);
        expect(problems.external, 'external requests').toEqual([]);
        expect(await context.cookies(), 'cookies').toEqual([]);
        const storage = await page.evaluate(() => localStorage.length + sessionStorage.length);
        expect(storage, 'localStorage/sessionStorage entries').toBe(0);
      });
    }

    test('keyboard focus is visible', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/${rel}`);
      for (let step = 1; step <= FOCUS_STEPS; step += 1) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          if (!element || element === document.body) return null;
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(),
            text: (element.textContent || '').trim().slice(0, 40),
            visible: (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none',
          };
        });
        if (!focus) break; // fewer focusable elements than FOCUS_STEPS
        expect(focus.visible, `focus ring on <${focus.tag}> "${focus.text}" (Tab ${step})`).toBe(true);
      }
    });
  });
}
