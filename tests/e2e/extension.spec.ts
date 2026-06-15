import { expect, test } from '@playwright/test';

test('fixture page renders selectable media targets', async ({ page }) => {
	await page.goto(`file://${process.cwd()}/tests/fixtures/media-page.html`);
	await expect(page.locator('canvas#demo-canvas')).toBeVisible();
	await expect(page.locator('video#demo-video')).toBeVisible();
});
