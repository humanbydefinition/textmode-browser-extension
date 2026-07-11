import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect, test } from '@playwright/test';

test('fixture page renders selectable media targets', async ({ page }) => {
	await page.goto(`file://${process.cwd()}/tests/fixtures/media-page.html`);
	await expect(page.locator('canvas#demo-canvas')).toBeVisible();
	await expect(page.locator('video#demo-video')).toBeVisible();
});

test('Chrome extension can select a canvas and create an overlay', async () => {
	const extensionPath = resolve(import.meta.dirname, '../../.output/chrome-mv3-e2e');
	test.skip(!existsSync(resolve(extensionPath, 'manifest.json')), 'Run npm run build:chrome before e2e.');

	const server = await startFixtureServer();
	const userDataDir = await mkdtemp(join(tmpdir(), 'textmode-extension-e2e-'));
	const context = await chromium.launchPersistentContext(userDataDir, {
		headless: false,
		args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
	});

	try {
		const page = context.pages()[0] ?? (await context.newPage());
		await page.setViewportSize({ width: 800, height: 720 });
		await page.goto(server.url);
		await expect(page.locator('canvas#demo-canvas')).toBeVisible();

		const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
		await serviceWorker.evaluate(async () => {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!tab.id) {
				throw new Error('Missing active tab for extension E2E.');
			}
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: ['/content-runtime.js'],
			});
			await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
		});

		await expect(page.locator('#textmode-ascii-overlay-control-panel-root')).toBeAttached();
		await page.getByRole('button', { name: /select media/i }).click();
		await page.locator('canvas#demo-canvas').click({ position: { x: 24, y: 24 } });

		await expect(page.getByText('canvas selected')).toBeVisible();
		await expect(page.locator('canvas[data-textmode-ascii-extension-ui="true"]')).toHaveCount(1);
		await expect(page.getByRole('tab', { name: 'export' })).toBeVisible();
		await expect(page.getByRole('button', { name: /TXT/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /SVG/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /PNG/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /JPG/i })).toBeVisible();
		await page.getByRole('tab', { name: 'advanced' }).click();
		const brightnessLayout = await readConverterLayout(page, 'brightness');
		expect(brightnessLayout.tabListInsideScrollArea).toBe(false);
		expect(brightnessLayout.viewportClientHeight).toBeGreaterThan(0);
		await page.getByRole('tab', { name: 'contour' }).click();
		const contourLayout = await readConverterLayout(page, 'contour');
		expect(brightnessLayout.viewportScrollHeight).toBeGreaterThan(brightnessLayout.viewportClientHeight);
		expect(brightnessLayout.endAccessible).toBe(true);
		expect(contourLayout.viewportClientHeight).toBeGreaterThan(0);
		expect(contourLayout.viewportScrollHeight).toBeGreaterThan(contourLayout.viewportClientHeight);
		expect(contourLayout.endAccessible).toBe(true);
		await page.getByRole('tab', { name: 'brightness' }).click();
		await page.getByRole('button', { name: /characters color/i }).click();
		await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();

		const popoverState = await page.evaluate(() => {
			const panelHost = document.querySelector('#textmode-ascii-overlay-control-panel-root');
			const popover = panelHost?.shadowRoot?.querySelector<HTMLElement>('[data-slot="popover-content"]');
			const bodyPopover = document.body.querySelector('[data-slot="popover-content"]');
			const styles = popover ? getComputedStyle(popover) : null;

			return {
				isInsideShadowRoot: Boolean(popover),
				isLeakedToBody: Boolean(bodyPopover),
				backgroundColor: styles?.backgroundColor ?? '',
				color: styles?.color ?? '',
			};
		});

		expect(popoverState).toMatchObject({
			isInsideShadowRoot: true,
			isLeakedToBody: false,
		});
		expect(popoverState.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
		expect(popoverState.backgroundColor).not.toBe('transparent');
		expect(popoverState.color).not.toBe('');

		await page.keyboard.press('Escape');
		await page.locator('[role="combobox"]').click();
		await page
			.locator('.tm-font-combobox__file-input')
			.setInputFiles(resolve(import.meta.dirname, '../../public/fonts/atascii.ttf'));
		await expect
			.poll(() =>
				serviceWorker.evaluate(async () => {
					const stored = await chrome.storage.local.get('custom-fonts:catalog:v1');
					const catalog = stored['custom-fonts:catalog:v1'] as { fonts?: unknown[] } | undefined;
					return catalog?.fonts?.length ?? 0;
				})
			)
			.toBe(1);
		await page.keyboard.press('Escape');
		await page.getByRole('button', { name: 'reset all settings to defaults' }).click();
		await expect
			.poll(() =>
				serviceWorker.evaluate(async () => {
					const stored = await chrome.storage.local.get('custom-fonts:catalog:v1');
					const catalog = stored['custom-fonts:catalog:v1'] as { fonts?: unknown[] } | undefined;
					return catalog?.fonts?.length ?? 0;
				})
			)
			.toBe(1);

		await page.reload();
		await serviceWorker.evaluate(async () => {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!tab.id) throw new Error('Missing active tab after reload.');
			await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['/content-runtime.js'] });
			await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
		});
		await page.getByRole('button', { name: /select media/i }).click();
		await page.locator('canvas#demo-canvas').click({ position: { x: 24, y: 24 } });
		await page.getByRole('tab', { name: 'advanced' }).click();
		await page.locator('[role="combobox"]').click();
		await expect(page.getByText('atascii.ttf')).toBeVisible();
	} finally {
		await context.close();
		await rm(userDataDir, { recursive: true, force: true });
		await server.close();
	}
});

async function readConverterLayout(page: import('@playwright/test').Page, converter: 'brightness' | 'contour') {
	return page.evaluate((converterName) => {
		const panelHost = document.querySelector('#textmode-ascii-overlay-control-panel-root');
		const root = panelHost?.shadowRoot;
		const controls = root?.querySelector<HTMLElement>(`.tm-${converterName}-controls`);
		const scrollArea = controls?.closest<HTMLElement>('[data-slot="scroll-area"]');
		const viewport = scrollArea?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
		const tabList = root?.querySelector<HTMLElement>('.tm-converter-tabs-list');
		if (viewport) viewport.scrollTop = viewport.scrollHeight;
		const viewportRect = viewport?.getBoundingClientRect();
		const lastControlRect = controls?.lastElementChild?.getBoundingClientRect();
		const endAccessible = Boolean(
			viewportRect &&
			lastControlRect &&
			lastControlRect.top >= viewportRect.top - 1 &&
			lastControlRect.bottom <= viewportRect.bottom + 1
		);
		if (viewport) viewport.scrollTop = 0;
		return {
			tabListInsideScrollArea: Boolean(tabList?.closest('[data-slot="scroll-area"]')),
			viewportClientHeight: viewport?.clientHeight ?? 0,
			viewportScrollHeight: viewport?.scrollHeight ?? 0,
			endAccessible,
		};
	}, converter);
}

interface FixtureServer {
	url: string;
	close: () => Promise<void>;
}

async function startFixtureServer(): Promise<FixtureServer> {
	const html = await readFile(resolve(import.meta.dirname, '../fixtures/media-page.html'), 'utf8');
	const server = createServer((_request, response) => {
		response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
		response.end(html);
	});

	await new Promise<void>((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
	const address = server.address();
	if (!address || typeof address === 'string') {
		throw new Error('Failed to start fixture server.');
	}

	return {
		url: `http://127.0.0.1:${address.port}/`,
		close: () => closeServer(server),
	};
}

async function closeServer(server: Server): Promise<void> {
	await new Promise<void>((resolveClose, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
			} else {
				resolveClose();
			}
		});
	});
}
