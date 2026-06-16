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
	} finally {
		await context.close();
		await rm(userDataDir, { recursive: true, force: true });
		await server.close();
	}
});

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
