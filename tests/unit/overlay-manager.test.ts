import { beforeEach, describe, expect, it, vi } from 'vitest';
import { textmode } from 'textmode.js';
import { OverlayManager } from '../../src/features/textmode-overlay/overlay-manager';

interface MockTextmodeInstance {
	canvas: HTMLCanvasElement;
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

	it('creates textmode overlays with the current rendering contract', () => {
		const canvas = createCanvas('source');
		document.body.append(canvas);
		const manager = new OverlayManager(vi.fn());

		manager.createOverlay(canvas, { fontSize: 16 });

		expect(textmode.create).toHaveBeenCalledWith(
			expect.objectContaining({
				canvas,
				overlay: true,
				pixelDensity: 1,
				fontSize: 16,
				loadingScreen: { transition: 'none' },
				plugins: [expect.objectContaining({ name: 'textmode.export' })],
			})
		);
		expect(instances[0]?.canvas.style.pointerEvents).toBe('none');
		expect(instances[0]?.canvas.style.mixBlendMode).toBe('normal');
	});

	it('exports the active overlay with fixed one-click options', async () => {
		const canvas = createCanvas('source');
		document.body.append(canvas);
		const manager = new OverlayManager(vi.fn());

		const overlay = manager.createOverlay(canvas);

		await manager.exportOverlay(overlay.id, 'txt');
		await manager.exportOverlay(overlay.id, 'svg');
		await manager.exportOverlay(overlay.id, 'png');
		await manager.exportOverlay(overlay.id, 'jpg');

		expect(instances[0]?.saveStrings).toHaveBeenCalledWith({
			filename: 'textmode-overlay.txt',
			preserveTrailingSpaces: false,
			emptyCharacter: ' ',
		});
		expect(instances[0]?.saveSVG).toHaveBeenCalledWith({
			filename: 'textmode-overlay.svg',
			includeBackgroundRectangles: true,
			drawMode: 'fill',
			strokeWidth: 1,
		});
		expect(instances[0]?.saveCanvas).toHaveBeenCalledWith({
			filename: 'textmode-overlay.png',
			format: 'png',
			scale: 1,
		});
		expect(instances[0]?.saveCanvas).toHaveBeenCalledWith({
			filename: 'textmode-overlay.jpg',
			format: 'jpg',
			scale: 1,
		});
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
});

class MockResizeObserver {
	public observe = vi.fn();
	public unobserve = vi.fn();
	public disconnect = vi.fn();
}

function createCanvas(id: string): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.id = id;
	mockRect(canvas, 320, 180);
	return canvas;
}

function createMockSource(): Record<string, () => unknown> {
	const source: Record<string, () => unknown> = {};
	for (const method of [
		'characters',
		'conversionMode',
		'invert',
		'brightnessRange',
		'charColorMode',
		'charColor',
		'cellColorMode',
		'cellColor',
		'background',
	]) {
		source[method] = vi.fn(() => source);
	}
	return source;
}

function mockRect(element: Element, width: number, height: number): void {
	element.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			right: width,
			bottom: height,
			width,
			height,
			toJSON: () => undefined,
		}) as DOMRect;
}
