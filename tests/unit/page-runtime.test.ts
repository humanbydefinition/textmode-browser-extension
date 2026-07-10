import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageRuntime } from '../../src/application/page-runtime/page-runtime';
import { DEFAULT_OVERLAY_SETTINGS, type OverlayDescriptor } from '../../src/domain/overlay/overlay-settings';
import type { SitePresetStore } from '../../src/application/page-runtime/site-preset-store';
import { createMockSource, MockResizeObserver, mockRect } from './test-helpers';
import { sendMessageToRuntime } from '../../src/shared/browser/browser-api';

interface MockTextmodeInstance {
	canvas: HTMLCanvasElement;
	setup: ReturnType<typeof vi.fn>;
	draw: ReturnType<typeof vi.fn>;
	clear: ReturnType<typeof vi.fn>;
	image: ReturnType<typeof vi.fn>;
	targetFrameRate: ReturnType<typeof vi.fn>;
	noLoop: ReturnType<typeof vi.fn>;
	loop: ReturnType<typeof vi.fn>;
	fontSize: ReturnType<typeof vi.fn>;
	loadFont: ReturnType<typeof vi.fn>;
	saveCanvas: ReturnType<typeof vi.fn>;
	saveSVG: ReturnType<typeof vi.fn>;
	saveStrings: ReturnType<typeof vi.fn>;
	destroy: ReturnType<typeof vi.fn>;
}

const instances: MockTextmodeInstance[] = [];

vi.mock('../../src/shared/browser/browser-api', () => ({
	addRuntimeMessageListener: vi.fn(),
	sendMessageToRuntime: vi.fn(async () => undefined),
	getExtensionAssetUrl: vi.fn((path: string) => `chrome-extension://test/${path}`),
	storageLocalGet: vi.fn(),
	storageLocalGetAll: vi.fn(),
	storageLocalSet: vi.fn(),
	storageLocalRemove: vi.fn(),
	addStorageChangedListener: vi.fn(() => vi.fn()),
}));

vi.mock('textmode.js', () => ({
	textmode: {
		create: vi.fn(() => {
			const source = createMockSource();
			const instance = {
				canvas: document.createElement('canvas'),
				setup: vi.fn(),
				draw: vi.fn(),
				clear: vi.fn(),
				image: vi.fn(),
				targetFrameRate: vi.fn(),
				noLoop: vi.fn(),
				loop: vi.fn(),
				fontSize: vi.fn((value?: number) => (value === undefined ? 8 : undefined)),
				loadFont: vi.fn(async () => undefined),
				saveCanvas: vi.fn(async () => undefined),
				saveSVG: vi.fn(),
				saveStrings: vi.fn(),
				destroy: vi.fn(),
				get overlay() {
					return source;
				},
			};
			instances.push(instance);
			return instance;
		}),
	},
}));

vi.mock('textmode.export.js', () => ({
	createTextmodeExportPlugin: vi.fn(() => ({
		name: 'textmode.export',
		version: 'test',
		install: vi.fn(),
	})),
}));

describe('PageRuntime site presets', () => {
	const pageUrl = new URL('https://www.youtube.com/watch?v=abc');
	let store: SitePresetStore;

	beforeEach(() => {
		instances.length = 0;
		document.body.replaceChildren();
		vi.mocked(sendMessageToRuntime).mockClear();
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
		vi.stubGlobal('WebGL2RenderingContext', class WebGL2RenderingContext {});
		vi.stubGlobal('chrome', {
			runtime: {
				getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
			},
		});
		store = {
			loadForUrl: vi.fn(async () => ({ ...DEFAULT_OVERLAY_SETTINGS, fontSize: 19 })),
			saveForUrl: vi.fn(async () => undefined),
			removeForUrl: vi.fn(async () => undefined),
		};
	});

	it('applies the loaded site preset when media is selected', async () => {
		const runtime = new PageRuntime({ pageUrl, presetStore: store });
		const canvas = createCanvas('source');
		document.body.append(canvas);

		await createOverlay(runtime, canvas);
		const response = await handleMessage(runtime, { type: 'LIST_OVERLAYS' });

		expect(store.loadForUrl).toHaveBeenCalledWith(pageUrl);
		expect(response.overlays?.[0]?.settings.fontSize).toBe(19);
	});

	it('saves normalized settings after successful overlay updates', async () => {
		const runtime = new PageRuntime({ pageUrl, presetStore: store });
		const canvas = createCanvas('source');
		document.body.append(canvas);
		await createOverlay(runtime, canvas);
		const overlayId = await getActiveOverlayId(runtime);

		const response = await handleMessage(runtime, {
			type: 'UPDATE_OVERLAY',
			id: overlayId,
			settings: { opacity: 99, fontSize: 24 },
		});
		await flushPromises();

		expect(response.ok).toBe(true);
		expect(store.saveForUrl).toHaveBeenCalledWith(
			pageUrl,
			expect.objectContaining({
				opacity: 1,
				fontSize: 24,
			})
		);
	});

	it('reuses the last saved site preset when media is replaced', async () => {
		const runtime = new PageRuntime({ pageUrl, presetStore: store });
		const first = createCanvas('first');
		const second = createCanvas('second');
		document.body.append(first, second);
		await createOverlay(runtime, first);
		const overlayId = await getActiveOverlayId(runtime);

		await handleMessage(runtime, {
			type: 'UPDATE_OVERLAY',
			id: overlayId,
			settings: { fontSize: 31 },
		});
		await createOverlay(runtime, second);
		const response = await handleMessage(runtime, { type: 'LIST_OVERLAYS' });

		expect(response.overlays).toHaveLength(1);
		expect(response.overlays?.[0]?.elementLabel).toContain('#second');
		expect(response.overlays?.[0]?.settings.fontSize).toBe(31);
	});

	it('reports storage save failures without failing live overlay edits', async () => {
		vi.mocked(store.saveForUrl).mockRejectedValue(new Error('Storage unavailable.'));
		const runtime = new PageRuntime({ pageUrl, presetStore: store });
		const canvas = createCanvas('source');
		document.body.append(canvas);
		await createOverlay(runtime, canvas);
		const overlayId = await getActiveOverlayId(runtime);

		const response = await handleMessage(runtime, {
			type: 'UPDATE_OVERLAY',
			id: overlayId,
			settings: { fontSize: 28 },
		});
		await flushPromises();

		expect(response).toMatchObject({
			ok: true,
			overlays: [expect.objectContaining({ settings: expect.objectContaining({ fontSize: 28 }) })],
		});
		expect(sendMessageToRuntime).toHaveBeenCalledWith({ type: 'ERROR', message: 'Storage unavailable.' });
	});
});

function createCanvas(id: string): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.id = id;
	mockRect(canvas, { width: 320, height: 180 });
	return canvas;
}

async function createOverlay(runtime: PageRuntime, element: HTMLCanvasElement): Promise<void> {
	await (runtime as unknown as { createOverlay(element: HTMLCanvasElement): Promise<void> }).createOverlay(element);
}

async function handleMessage(
	runtime: PageRuntime,
	message: { type: string; id?: string; settings?: unknown }
): Promise<{ ok: boolean; overlays?: OverlayDescriptor[] }> {
	return (
		runtime as unknown as {
			handleMessage(message: unknown): Promise<{ ok: boolean; overlays?: OverlayDescriptor[] }>;
		}
	).handleMessage(message);
}

async function getActiveOverlayId(runtime: PageRuntime): Promise<string> {
	const response = await handleMessage(runtime, { type: 'LIST_OVERLAYS' });
	const overlayId = response.overlays?.[0]?.id;
	if (!overlayId) {
		throw new Error('Expected an active overlay.');
	}
	return overlayId;
}

async function flushPromises(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}
