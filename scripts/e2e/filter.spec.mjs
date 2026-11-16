// Ham tag filter on the ham listing pages (js/projects.js): every tag button
// shows exactly the entries with that tag and hides the others, "All" shows
// every entry again, the status line reports the visible count.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');
const LIST = 'ham-list';

const listings = readdirSync(DIST, { recursive: true })
  .map((file) => String(file).split(path.sep).join('/'))
  .filter((file) => file.endsWith('.html') && readFileSync(path.join(DIST, file), 'utf8').includes(`data-tag-filter="${LIST}"`))
  .sort();

const itemTags = (page) => page.locator(`#${LIST} > [data-tags]`).evaluateAll((items) => items.map((item) => JSON.parse(item.dataset.tags)));

async function expectFilter(page, tag, tags) {
  const host = page.locator(`[data-tag-filter="${LIST}"]`);
  await host.locator(`button[data-tag="${tag}"]`).click();
  for (const button of await host.locator('button[data-tag]').all()) {
    await expect(button).toHaveAttribute('aria-pressed', String((await button.getAttribute('data-tag')) === tag));
  }
  const items = page.locator(`#${LIST} > [data-tags]`);
  let visible = 0;
  for (const [index, entryTags] of tags.entries()) {
    const show = tag === '' || entryTags.includes(tag);
    if (show) visible += 1;
    await (show ? expect(items.nth(index)).toBeVisible() : expect(items.nth(index)).toBeHidden());
  }
  await expect(page.locator(`[data-filter-status="${LIST}"]`)).toHaveText(new RegExp(`^${visible} `));
}

test('dist/ contains a ham listing page with tag filter', () => {
  expect(listings.length, 'run `npm run build` first').toBeGreaterThan(0);
});

for (const rel of listings) {
  test.describe(rel, () => {
    test('each tag shows its entries, "All" shows every entry', async ({ page }) => {
      await page.goto(`/${rel}`);
      await expect(page.locator(`[data-tag-filter="${LIST}"]`)).toBeVisible();
      const tags = await itemTags(page);
      const buttons = await page.locator(`[data-tag-filter="${LIST}"] button[data-tag]`).evaluateAll((items) => items.map((item) => item.dataset.tag));
      expect(buttons[0], 'first button is "All"').toBe('');
      for (const tag of buttons.slice(1)) await expectFilter(page, tag, tags);
      await expectFilter(page, '', tags);
    });

    // The real entries may all share their tags; an untagged entry proves hiding.
    test('entries without the tag are hidden and shown again', async ({ page }) => {
      await page.route(`**/${rel}`, async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replace(/(<li [^>]*data-tags=")[^"]*"/, '$1[]"');
        await route.fulfill({ response, body });
      });
      await page.goto(`/${rel}`);
      const tags = await itemTags(page);
      expect(tags[0], 'first entry untagged').toEqual([]);
      const first = await page.locator(`[data-tag-filter="${LIST}"] button[data-tag]:not([data-tag=""])`).first().getAttribute('data-tag');
      await expectFilter(page, first, tags);
      await expect(page.locator(`#${LIST} > [data-tags]`).first()).toBeHidden();
      await expectFilter(page, '', tags);
    });
  });
}
