import { beforeEach, describe, expect, it, vi } from 'vitest';
import { textmode } from 'textmode.js';
import { OverlayManager } from '../../src/features/textmode-overlay/overlay-manager';

interface MockTextmodeInstance {
	canvas: HTMLCanvasElement;
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

		expect(textmode.create).toHaveBeenCalledWith({
			canvas,
			overlay: true,
			pixelDensity: 1,
			fontSize: 16,
			loadingScreen: { transition: 'none' },
		});
		expect(instances[0]?.canvas.style.pointerEvents).toBe('none');
		expect(instances[0]?.canvas.style.mixBlendMode).toBe('normal');
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
