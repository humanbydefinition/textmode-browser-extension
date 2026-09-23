import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect, test, type Locator } from '@playwright/test';

declare global {
	interface Window {
		resetGeometry: () => void;
		setAncestorTransform: (scaleX: number, scaleY?: number, panX?: number, panY?: number) => void;
		setCssZoom: (zoom: number, panX?: number, panY?: number) => void;
		setTargetTransform: (scaleX: number, scaleY: number, panX?: number, panY?: number) => void;
		setCompensatedCssZoom: (zoom: number) => void;
		initializeOverlayApi: () => void;
		rebindOverlayPointerEvents: (pointerEvents?: 'auto' | 'none') => boolean;
		requestDirectOverlaySync: () => void;
		__canvasClicks: number;
		__overlayClicks: number;
	}
}

test('fixture page renders selectable media targets', async ({ page }) => {
	await page.goto(`file://${process.cwd()}/tests/fixtures/media-page.html`);
	await expect(page.locator('canvas#demo-canvas')).toBeVisible();
	await expect(page.locator('video#demo-video')).toBeVisible();
});

test('published overlay bundle reconfigures a same-target binding in place', async ({ page, browserName }) => {
	const server = await startFixtureServer('zoom-page.html');
	try {
		await page.goto(server.url);
		await page.evaluate(() => window.initializeOverlayApi());
		const target = page.locator('#zoom-canvas');
		const overlay = page.locator('#direct-overlay');
		const expectAligned = async (scenario: string): Promise<void> => {
			await expect
				.poll(
					async () => {
						const targetBox = await target.boundingBox();
						const overlayBox = await overlay.boundingBox();
						if (!targetBox || !overlayBox) return Number.POSITIVE_INFINITY;
						return Math.max(
							Math.abs(targetBox.x - overlayBox.x),
							Math.abs(targetBox.y - overlayBox.y),
							Math.abs(targetBox.width - overlayBox.width),
							Math.abs(targetBox.height - overlayBox.height)
						);
					},
					{ message: `${browserName}: overlay misaligned for ${scenario}` }
				)
				.toBeLessThanOrEqual(1.5);
		};

		await expect(overlay).toHaveCSS('pointer-events', 'none');
		await expectAligned('initial binding');
		await target.click({ position: { x: 320, y: 180 } });
		expect(await page.evaluate(() => [window.__canvasClicks, window.__overlayClicks])).toEqual([1, 0]);

		expect(await page.evaluate(() => window.rebindOverlayPointerEvents('auto'))).toBe(true);
		await expect(overlay).toHaveCSS('pointer-events', 'auto');
		await overlay.click({ position: { x: 320, y: 180 } });
		expect(await page.evaluate(() => [window.__canvasClicks, window.__overlayClicks])).toEqual([1, 1]);

		expect(await page.evaluate(() => window.rebindOverlayPointerEvents())).toBe(true);
		await expect(overlay).toHaveCSS('pointer-events', 'none');

		for (const zoom of [0.5, 1, 2]) {
			await page.evaluate((value) => {
				window.setCssZoom(value, 30, 20);
				window.requestDirectOverlaySync();
			}, zoom);
			await expectAligned(`CSS zoom ${zoom}`);
		}
	} finally {
		await server.close();
	}
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
			if (!tab?.id) {
				throw new Error('Missing active tab for extension E2E.');
			}
			await chrome.scripting.executeScript({
				target: { tabId: tab.id, allFrames: true },
				files: ['/content-runtime.js'],
			});
			const ready = await chrome.tabs.sendMessage(tab.id, { type: 'FRAME_PING' }, { frameId: 0 });
			if (!ready?.ok) throw new Error('The injected frame runtime did not acknowledge startup.');
			await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, { frameId: 0 });
		});

		await expect(page.locator('#textmode-ascii-overlay-control-panel-root')).toBeAttached();
		const panelHost = page.locator('#textmode-ascii-overlay-control-panel-root');
		const initialPanelRect = await panelHost.boundingBox();
		const initialViewport = await page.evaluate(() => ({
			clientWidth: document.documentElement.clientWidth,
			clientHeight: document.documentElement.clientHeight,
			scrollHeight: document.documentElement.scrollHeight,
		}));
		if (!initialPanelRect) throw new Error('Expected the default panel to have visible bounds.');
		expect(initialViewport.scrollHeight).toBeGreaterThan(initialViewport.clientHeight);
		expect(initialPanelRect.y).toBeGreaterThanOrEqual(9);
		expect(initialViewport.clientWidth - (initialPanelRect.x + initialPanelRect.width)).toBeGreaterThanOrEqual(9);
		const moveHandle = page.getByRole('button', { name: /move panel/i });
		const moveHandleRect = await moveHandle.boundingBox();
		if (!initialPanelRect || !moveHandleRect) {
			throw new Error('Expected the in-page panel and move handle to have visible bounds.');
		}

		await page.mouse.move(
			moveHandleRect.x + moveHandleRect.width / 2,
			moveHandleRect.y + moveHandleRect.height / 2
		);
		await page.mouse.down();
		await page.mouse.move(
			moveHandleRect.x + moveHandleRect.width / 2 - 180,
			moveHandleRect.y + moveHandleRect.height / 2 + 60,
			{ steps: 4 }
		);
		await page.mouse.up();

		const movedPanelRect = await panelHost.boundingBox();
		if (!movedPanelRect) throw new Error('Expected the moved panel to remain visible.');
		expect(movedPanelRect.x).toBeLessThan(initialPanelRect.x - 150);
		expect(movedPanelRect.y).toBeGreaterThan(initialPanelRect.y + 40);
		expect(movedPanelRect.x).toBeGreaterThanOrEqual(9);
		expect(movedPanelRect.y).toBeGreaterThanOrEqual(9);
		expect(movedPanelRect.x + movedPanelRect.width).toBeLessThanOrEqual(791);
		expect(movedPanelRect.y + movedPanelRect.height).toBeLessThanOrEqual(711);

		await expect
			.poll(() =>
				serviceWorker.evaluate(async () => {
					const stored = await chrome.storage.local.get('site-panel-position:v1:127.0.0.1');
					return stored['site-panel-position:v1:127.0.0.1'];
				})
			)
			.toMatchObject({
				version: 1,
				placement: {
					xRatio: expect.any(Number),
					yRatio: expect.any(Number),
				},
			});

		await page.getByRole('button', { name: /close panel/i }).click();
		await expect(panelHost).toHaveCount(0);
		await serviceWorker.evaluate(async () => {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!tab?.id) throw new Error('Missing active tab while reopening panel.');
			await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, { frameId: 0 });
		});
		await expect(panelHost).toBeAttached();
		const reopenedPanelRect = await panelHost.boundingBox();
		expect(reopenedPanelRect?.x).toBeCloseTo(movedPanelRect.x, 0);
		expect(reopenedPanelRect?.y).toBeCloseTo(movedPanelRect.y, 0);

		await page.getByRole('button', { name: /select media/i }).click();
		const pickerStatus = page.locator('.tm-picker-status');
		await expect(page.getByText('2 selectable elements')).toBeVisible();
		await expect(page.getByText('1 non-selectable element')).toBeVisible();
		await expect(page.locator('.tm-picker-status code', { hasText: '<canvas>' })).toBeVisible();
		await expect(page.locator('.tm-picker-status code', { hasText: '<video>' })).toBeVisible();
		await expect(page.locator('.tm-picker-status code', { hasText: '2' })).toBeVisible();
		await expect(page.locator('.tm-picker-status code', { hasText: '1' })).toBeVisible();
		await expect(page.locator('.tm-picker-status code', { hasText: 'Esc' })).toBeVisible();
		await page.setViewportSize({ width: 320, height: 720 });
		const statusRect = await pickerStatus.boundingBox();
		expect(statusRect).not.toBeNull();
		expect(statusRect?.x).toBeGreaterThanOrEqual(12);
		expect((statusRect?.x ?? 0) + (statusRect?.width ?? 0)).toBeLessThanOrEqual(308);
		await page.setViewportSize({ width: 800, height: 720 });
		const readyMarker = page.locator('.tm-picker-marker[data-availability="ready"]').first();
		await expect(readyMarker).toBeVisible();
		await expect(readyMarker).toHaveCSS('border-radius', '0px');
		const stackingOrder = await page.evaluate(() => {
			const host = document.querySelector('.textmode-ascii-overlay-picker');
			const status = host?.shadowRoot?.querySelector<HTMLElement>('.tm-picker-status');
			const marker = host?.shadowRoot?.querySelector<HTMLElement>('.tm-picker-marker');
			return {
				status: Number(status ? getComputedStyle(status).zIndex : 0),
				marker: Number(marker ? getComputedStyle(marker).zIndex : 0),
			};
		});
		expect(stackingOrder.status).toBeGreaterThan(stackingOrder.marker);
		expect(await readyMarker.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain(
			'repeating-linear-gradient'
		);
		await page.locator('canvas#demo-canvas').click({ position: { x: 24, y: 24 } });

		await expect(page.locator('canvas[data-textmode-ascii-extension-ui="true"]')).toHaveCount(1);
		const exportOverlayHost = page.locator('[data-plugin="textmode-export-overlay-host"]');
		await expect(exportOverlayHost).toHaveCount(1);
		await expect(exportOverlayHost).toHaveCSS('display', 'none');
		const opacitySlider = page.locator('.tm-field--range', { hasText: 'opacity' });
		const opacityFieldBounds = await opacitySlider.boundingBox();
		const opacityThumbBounds = await opacitySlider.locator('[data-slot="slider-thumb"]').boundingBox();
		if (!opacityFieldBounds || !opacityThumbBounds) {
			throw new Error('Expected the maximum-value opacity slider and thumb to have visible bounds.');
		}
		expect(opacityThumbBounds.x + opacityThumbBounds.width).toBeLessThanOrEqual(
			opacityFieldBounds.x + opacityFieldBounds.width
		);
		const opacityThumb = opacitySlider.locator('[data-slot="slider-thumb"]');
		await opacityThumb.press('Home');
		const minimumOpacityThumbBounds = await opacityThumb.boundingBox();
		if (!minimumOpacityThumbBounds) {
			throw new Error('Expected the minimum-value opacity thumb to have visible bounds.');
		}
		expect(minimumOpacityThumbBounds.x).toBeGreaterThanOrEqual(opacityFieldBounds.x);
		await opacityThumb.press('End');
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
		const glyphRampInput = page.locator('.tm-brightness-controls input.tm-input');
		await glyphRampInput.focus();
		await expect(glyphRampInput).toHaveCSS('outline-style', 'solid');
		const glyphRampViewport = page.locator(
			'.tm-converter-tabs-content[data-state="active"] [data-slot="scroll-area-viewport"]'
		);
		await glyphRampViewport.evaluate((viewport) => {
			viewport.scrollTop = viewport.scrollHeight;
		});
		const glyphRampInset = await readScrollViewportInset(glyphRampInput, glyphRampViewport);
		expect(Math.min(glyphRampInset.left, glyphRampInset.right, glyphRampInset.bottom)).toBeGreaterThanOrEqual(4);

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
		const resetButton = page.getByRole('button', { name: 'reset all settings to defaults' });
		await expect(resetButton).toHaveCSS('border-top-width', '0px');
		await expect(resetButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
		await expect(resetButton).toHaveCSS('box-shadow', 'none');
		await resetButton.hover();
		await expect(resetButton).toHaveCSS('border-top-width', '0px');
		await expect(resetButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
		await resetButton.click();
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
			if (!tab?.id) throw new Error('Missing active tab after reload.');
			await chrome.scripting.executeScript({
				target: { tabId: tab.id, allFrames: true },
				files: ['/content-runtime.js'],
			});
			const ready = await chrome.tabs.sendMessage(tab.id, { type: 'FRAME_PING' }, { frameId: 0 });
			if (!ready?.ok) throw new Error('The reinjected frame runtime did not acknowledge startup.');
			await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, { frameId: 0 });
		});
		await expect(panelHost).toBeAttached();
		const reloadedPanelRect = await panelHost.boundingBox();
		expect(reloadedPanelRect?.x).toBeCloseTo(movedPanelRect.x, 0);
		expect(reloadedPanelRect?.y).toBeCloseTo(movedPanelRect.y, 0);
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

test('Chrome extension preserves overlay geometry across supported coordinate-space changes', async () => {
	const extensionPath = resolve(import.meta.dirname, '../../.output/chrome-mv3-e2e');
	test.skip(!existsSync(resolve(extensionPath, 'manifest.json')), 'Run npm run build:e2e:chrome before e2e.');

	const server = await startFixtureServer('zoom-page.html');
	const userDataDir = await mkdtemp(join(tmpdir(), 'textmode-extension-zoom-e2e-'));
	const context = await chromium.launchPersistentContext(userDataDir, {
		headless: false,
		args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
	});

	try {
		const page = context.pages()[0] ?? (await context.newPage());
		await page.setViewportSize({ width: 800, height: 720 });
		await page.goto(server.url);
		await expect(page.locator('#zoom-canvas')).toBeVisible();

		const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
		await serviceWorker.evaluate(async () => {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!tab?.id) throw new Error('Missing active tab for zoom E2E.');
			await chrome.scripting.executeScript({
				target: { tabId: tab.id, allFrames: true },
				files: ['/content-runtime.js'],
			});
			const ready = await chrome.tabs.sendMessage(tab.id, { type: 'FRAME_PING' }, { frameId: 0 });
			if (!ready?.ok) throw new Error('The injected frame runtime did not acknowledge startup.');
			await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, { frameId: 0 });
		});
		await expect(page.locator('#textmode-ascii-overlay-control-panel-root')).toBeAttached();

		await page.getByRole('button', { name: /(?:select|replace) media/i }).click();
		await page.locator('#zoom-canvas').click({ position: { x: 24, y: 24 } });
		const overlay = page.locator('canvas[data-textmode-ascii-extension-ui="true"]');
		await expect(overlay).toHaveCount(1);
		await expect(overlay).toHaveCSS('pointer-events', 'none');
		const expectAligned = async (scenario: string): Promise<void> => {
			await expect
				.poll(
					async () => {
						const targetBox = await page.locator('#zoom-canvas').boundingBox();
						const overlayBox = await overlay.boundingBox();
						if (!targetBox || !overlayBox) return Number.POSITIVE_INFINITY;
						return Math.max(
							Math.abs(targetBox.x - overlayBox.x),
							Math.abs(targetBox.y - overlayBox.y),
							Math.abs(targetBox.width - overlayBox.width),
							Math.abs(targetBox.height - overlayBox.height)
						);
					},
					{ message: `overlay misaligned for ${scenario}` }
				)
				.toBeLessThanOrEqual(1.5);
		};
		const sendFrameCommand = async (type: 'PAUSE_ALL' | 'RESUME_ALL'): Promise<void> => {
			await serviceWorker.evaluate(async (commandType) => {
				const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
				if (!tab?.id) throw new Error(`Missing active tab for ${commandType}.`);
				const response = await chrome.tabs.sendMessage(tab.id, { type: commandType }, { frameId: 0 });
				if (!response?.ok) throw new Error(response?.error ?? `${commandType} failed.`);
			}, type);
		};

		for (const scale of [0.5, 0.75, 1, 1.25, 2]) {
			await page.evaluate((value) => window.setAncestorTransform(value, value, 30, 20), scale);
			await expectAligned(`ancestor transform scale ${scale}`);
		}
		await page.evaluate(() => window.setAncestorTransform(1.5, 0.75, 35, 25));
		await expectAligned('non-uniform ancestor scale and translation');

		for (const zoom of [0.5, 0.75, 1, 1.25, 2]) {
			await page.evaluate((value) => window.setCssZoom(value, 30, 20), zoom);
			await expectAligned(`CSS zoom ${zoom}`);
		}

		await page.evaluate(() => window.setTargetTransform(1.25, 0.75, 30, 20));
		await expectAligned('target-owned positive scale and translation');

		await page.evaluate(() => {
			window.resetGeometry();
			document.querySelector('#zoom-viewport')?.scrollTo(120, 80);
		});
		await expectAligned('nested scrolling');

		await page.evaluate(() => window.resetGeometry());
		await expectAligned('unchanged-target baseline');
		const unchangedTargetBaseline = await page.locator('#zoom-canvas').boundingBox();
		if (!unchangedTargetBaseline) throw new Error('Expected the unchanged-target baseline bounds.');
		await page.evaluate(() => window.setCompensatedCssZoom(2));
		await expect
			.poll(async () => {
				const box = await page.locator('#zoom-canvas').boundingBox();
				if (!box) return Number.POSITIVE_INFINITY;
				return Math.max(
					Math.abs(box.x - unchangedTargetBaseline.x),
					Math.abs(box.y - unchangedTargetBaseline.y),
					Math.abs(box.width - unchangedTargetBaseline.width),
					Math.abs(box.height - unchangedTargetBaseline.height)
				);
			})
			.toBeLessThanOrEqual(0.1);
		await expectAligned('unchanged target rectangle with a changed output coordinate space');
		expect(await overlay.evaluate((canvas) => Number.parseFloat(getComputedStyle(canvas).width))).toBeCloseTo(
			320,
			0
		);

		await sendFrameCommand('PAUSE_ALL');
		await expect(overlay).toBeHidden();
		await page.evaluate(() => window.setAncestorTransform(1.25, 0.75, 45, 30));
		await page.evaluate(
			() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
		);
		await sendFrameCommand('RESUME_ALL');
		await expect(overlay).toBeVisible();
		await expectAligned('hide, change geometry, then show');

		await page.evaluate(() => window.resetGeometry());
		await expectAligned('reset geometry');
		await page.locator('#zoom-canvas').click({ position: { x: 320, y: 180 } });
		expect(await page.evaluate(() => window.__canvasClicks)).toBe(1);
	} finally {
		await context.close();
		await rm(userDataDir, { recursive: true, force: true });
		await server.close();
	}
});

test('Chrome extension can select media in same-origin, nested, srcdoc, and newly added iframes', async () => {
	const extensionPath = resolve(import.meta.dirname, '../../.output/chrome-mv3-e2e');
	test.skip(!existsSync(resolve(extensionPath, 'manifest.json')), 'Run npm run build:e2e:chrome before e2e.');

	const server = await startFixtureServer();
	const userDataDir = await mkdtemp(join(tmpdir(), 'textmode-extension-iframe-e2e-'));
	const context = await chromium.launchPersistentContext(userDataDir, {
		headless: false,
		args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
	});

	try {
		const page = context.pages()[0] ?? (await context.newPage());
		await page.setViewportSize({ width: 900, height: 900 });
		await page.goto(server.url);
		const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
		await serviceWorker.evaluate(async () => {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!tab?.id) throw new Error('Missing active tab for iframe E2E.');
			await chrome.scripting.executeScript({
				target: { tabId: tab.id, allFrames: true },
				files: ['/content-runtime.js'],
			});
			const ready = await chrome.tabs.sendMessage(tab.id, { type: 'FRAME_PING' }, { frameId: 0 });
			if (!ready?.ok) throw new Error('The injected frame runtime did not acknowledge startup.');
			await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, { frameId: 0 });
		});

		await expect(page.locator('#textmode-ascii-overlay-control-panel-root')).toBeAttached();
		await test.step('select a one-level same-origin target', async () => {
			await selectIframeCanvas(page, '#same-origin-frame', '#iframe-canvas');
			await expect(
				page.frameLocator('#same-origin-frame').locator('canvas[data-textmode-ascii-extension-ui="true"]')
			).toHaveCount(1);
			await expect
				.poll(() =>
					serviceWorker.evaluate(async () => {
						const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
						if (!tab?.id) return '';
						const response = await chrome.tabs.sendMessage(
							tab.id,
							{ type: 'LIST_OVERLAYS' },
							{ frameId: 0 }
						);
						return response.overlays?.[0]?.elementLabel ?? '';
					})
				)
				.toContain('— iframe');
		});

		await test.step('select a nested same-origin target', async () => {
			await selectNestedIframeCanvas(page);
			await expect(
				page
					.frameLocator('#nested-root-frame')
					.frameLocator('#nested-frame')
					.locator('canvas[data-textmode-ascii-extension-ui="true"]')
			).toHaveCount(1);
		});

		await test.step('select an inherited srcdoc target', async () => {
			await selectIframeCanvas(page, '#srcdoc-frame', '#srcdoc-canvas');
			await expect(
				page.frameLocator('#srcdoc-frame').locator('canvas[data-textmode-ascii-extension-ui="true"]')
			).toHaveCount(1);
		});

		await test.step('inject and select in a newly added iframe', async () => {
			await page.evaluate(() => {
				const iframe = document.createElement('iframe');
				iframe.id = 'dynamic-frame';
				iframe.title = 'dynamic same-origin media';
				iframe.src = '/iframe-dynamic';
				iframe.style.width = '320px';
				iframe.style.height = '180px';
				document.body.append(iframe);
			});
			await expect(page.frameLocator('#dynamic-frame').locator('#dynamic-canvas')).toBeVisible();
			await selectIframeCanvas(page, '#dynamic-frame', '#dynamic-canvas');
			await expect(
				page.frameLocator('#dynamic-frame').locator('canvas[data-textmode-ascii-extension-ui="true"]')
			).toHaveCount(1);
		});

		await test.step('mark a cross-origin iframe as unavailable', async () => {
			await page.getByRole('button', { name: /(?:select|replace) media/i }).click();
			const blocker = page.locator('.textmode-ascii-overlay-iframe-blocker');
			await expect(blocker).toBeVisible();
			await expect(blocker).toHaveAttribute('aria-label', /share the page origin/i);
			await blocker.click();
			await expect(blocker).toBeVisible();
			await page.keyboard.press('Escape');
			await expect(blocker).toHaveCount(0);
		});
	} finally {
		await context.close();
		await rm(userDataDir, { recursive: true, force: true });
		await server.close();
	}
});

async function selectIframeCanvas(
	page: import('@playwright/test').Page,
	frameSelector: string,
	canvasSelector: string
) {
	await page.getByRole('button', { name: /(?:select|replace) media/i }).click();
	await page
		.frameLocator(frameSelector)
		.locator(canvasSelector)
		.click({ position: { x: 24, y: 24 } });
}

async function selectNestedIframeCanvas(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: /(?:select|replace) media/i }).click();
	await page
		.frameLocator('#nested-root-frame')
		.frameLocator('#nested-frame')
		.locator('#nested-canvas')
		.click({ position: { x: 24, y: 24 }, force: true });
}

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

async function readScrollViewportInset(target: Locator, viewport: Locator) {
	const [targetRect, viewportRect] = await Promise.all([target.boundingBox(), viewport.boundingBox()]);
	if (!targetRect || !viewportRect) throw new Error('Expected visible scroll viewport and target bounds.');
	return {
		left: targetRect.x - viewportRect.x,
		right: viewportRect.x + viewportRect.width - targetRect.x - targetRect.width,
		bottom: viewportRect.y + viewportRect.height - targetRect.y - targetRect.height,
	};
}

interface FixtureServer {
	url: string;
	close: () => Promise<void>;
}

async function startFixtureServer(pageFile = 'media-page.html'): Promise<FixtureServer> {
	const html = await readFile(resolve(import.meta.dirname, `../fixtures/${pageFile}`), 'utf8');
	const overlayBundle = await readFile(
		resolve(import.meta.dirname, '../../node_modules/textmode.overlay.js/dist/textmode.overlay.umd.js'),
		'utf8'
	);
	let serverPort = 0;
	const server = createServer((request, response) => {
		if (request.url === '/textmode.overlay.umd.js') {
			response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
			response.end(overlayBundle);
			return;
		}
		response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
		switch (request.url) {
			case '/iframe-media':
				response.end(createIframeFixture('iframe-canvas'));
				break;
			case '/iframe-nested':
				response.end(createIframeFixture('nested-canvas'));
				break;
			case '/iframe-nested-root':
				response.end(createNestedRootFixture());
				break;
			case '/iframe-dynamic':
				response.end(createIframeFixture('dynamic-canvas'));
				break;
			default:
				response.end(html.replaceAll('__SERVER_PORT__', String(serverPort)));
		}
	});

	await new Promise<void>((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
	const address = server.address();
	if (!address || typeof address === 'string') {
		throw new Error('Failed to start fixture server.');
	}
	serverPort = address.port;

	return {
		url: `http://127.0.0.1:${address.port}/`,
		close: () => closeServer(server),
	};
}

function createIframeFixture(canvasId: string): string {
	return `<!doctype html>
		<style>html,body{margin:0;background:#020617}canvas,iframe{width:320px;height:180px;border:0}</style>
		<canvas id="${canvasId}" width="320" height="180"></canvas>`;
}

function createNestedRootFixture(): string {
	return `<!doctype html>
		<style>html,body{margin:0;background:#020617}iframe{width:320px;height:180px;border:0}</style>
		<iframe id="nested-frame" src="/iframe-nested" title="nested media"></iframe>`;
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
