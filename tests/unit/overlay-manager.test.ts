import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverlayManager } from '../../src/features/textmode-overlay/overlay-manager';
import { getMediaSecurityHint } from '../../src/shared/errors/errors';
import { createMockSource, MockResizeObserver, mockRect } from './test-helpers';

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

describe('OverlayManager', () => {
	beforeEach(() => {
		instances.length = 0;
		document.body.replaceChildren();
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
		vi.stubGlobal('WebGL2RenderingContext', class WebGL2RenderingContext {});
		vi.stubGlobal('chrome', {
			runtime: {
				getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
			},
		});
	});

	it('replaces the existing overlay when a new element is selected', () => {
		const first = createCanvas('first');
		const second = createCanvas('second');
		document.body.append(first, second);
		const onChange = vi.fn();
		const manager = new OverlayManager(onChange);

		manager.createOverlay(first);
		manager.createOverlay(second);

		expect(manager.list()).toHaveLength(1);
		expect(manager.list()[0]?.elementLabel).toContain('#second');
		expect(instances[0]?.destroy).toHaveBeenCalledTimes(1);
		expect(instances[1]?.destroy).not.toHaveBeenCalled();
	});

	it('initializes overlay canvas chrome for managed instances', () => {
		const canvas = createCanvas('source');
		document.body.append(canvas);
		const manager = new OverlayManager(vi.fn());

		manager.createOverlay(canvas, { fontSize: 16 });

		expect(instances[0]?.canvas.style.pointerEvents).toBe('none');
		expect(instances[0]?.canvas.style.mixBlendMode).toBe('normal');
	});

	it('records export failures on the overlay descriptor', async () => {
		const canvas = createCanvas('source');
		document.body.append(canvas);
		const onChange = vi.fn();
		const manager = new OverlayManager(onChange);

		const overlay = manager.createOverlay(canvas);
		instances[0]?.saveSVG.mockImplementation(() => {
			throw new Error('SVG export failed.');
		});

		await expect(manager.exportOverlay(overlay.id, 'svg')).rejects.toThrow('SVG export failed.');

		expect(manager.list()[0]).toMatchObject({
			status: 'error',
			latestError: 'SVG export failed.',
		});
		expect(onChange).toHaveBeenCalled();
	});

	it('clears and skips image rendering when a video has no current frame', () => {
		const video = createVideo('source');
		document.body.append(video);
		const manager = new OverlayManager(vi.fn());

		manager.createOverlay(video);
		Object.defineProperty(video, 'readyState', { value: video.HAVE_METADATA, configurable: true });
		Object.defineProperty(video, 'videoWidth', { value: 0, configurable: true });

		const drawCallback = instances[0]?.draw.mock.calls[0]?.[0] as (() => void) | undefined;
		drawCallback?.();

		expect(instances[0]?.clear).toHaveBeenCalledTimes(1);
		expect(instances[0]?.image).not.toHaveBeenCalled();
	});

	it('does not classify transient texImage2D no-video errors as media security failures', () => {
		expect(getMediaSecurityHint('WebGL: INVALID_VALUE: texImage2D: no video')).toBeUndefined();
		expect(getMediaSecurityHint('SecurityError: The canvas has been tainted by cross-origin data')).toContain(
			'cross-origin'
		);
	});
});

function createCanvas(id: string): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.id = id;
	mockRect(canvas, { width: 320, height: 180 });
	return canvas;
}

function createVideo(id: string): HTMLVideoElement {
	const video = document.createElement('video');
	video.id = id;
	mockRect(video, { width: 640, height: 360 });
	Object.defineProperty(video, 'readyState', { value: video.HAVE_CURRENT_DATA, configurable: true });
	Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true });
	Object.defineProperty(video, 'videoHeight', { value: 360, configurable: true });
	return video;
}
