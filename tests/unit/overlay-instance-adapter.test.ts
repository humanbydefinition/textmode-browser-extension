import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '@/domain/overlay/overlay-settings';
import { applyControllerSettings, createOverlayInstance } from '@/features/textmode-overlay/overlay-instance-adapter';
import type { OverlayController } from '@/features/textmode-overlay/overlay-session';
import type { ExportableTextmodeInstance } from '@/features/textmode-overlay/overlay-renderer';
import { createMockSource } from './test-helpers';

type MockTextmodeInstance = {
	canvas: HTMLCanvasElement;
	setup: ReturnType<typeof vi.fn>;
	draw: ReturnType<typeof vi.fn>;
	clear: ReturnType<typeof vi.fn>;
	image: ReturnType<typeof vi.fn>;
	filter: ReturnType<typeof vi.fn>;
	filters: { has: ReturnType<typeof vi.fn> };
	grid: { cols: number; rows: number };
	targetFrameRate: ReturnType<typeof vi.fn>;
	noLoop: ReturnType<typeof vi.fn>;
	loop: ReturnType<typeof vi.fn>;
	fontSize: ReturnType<typeof vi.fn>;
	loadFont: ReturnType<typeof vi.fn>;
	readonly overlay: Record<string, () => unknown>;
};

describe('overlay instance adapter', () => {
	it('applies paused settings to the textmode instance and source element', () => {
		const canvas = document.createElement('canvas');
		canvas.style.opacity = '0.25';
		const instance = createTextmodeInstance();
		const controller: OverlayController = {
			id: 'overlay-1',
			element: canvas,
			settings: { ...DEFAULT_OVERLAY_SETTINGS, enabled: false, opacity: 0.4, fontSize: 12 },
			instance: instance as unknown as ExportableTextmodeInstance,
			status: 'active',
			previousInlineOpacity: '0.25',
			loadedFontId: DEFAULT_OVERLAY_SETTINGS.fontId,
		};

		applyControllerSettings(controller);

		expect(canvas.style.opacity).toBe('0.25');
		expect(instance.canvas.style.opacity).toBe('0.4');
		expect(instance.canvas.style.display).toBe('none');
		expect(instance.noLoop).toHaveBeenCalled();
		expect(instance.fontSize).toHaveBeenCalledWith(12);
		expect(controller.status).toBe('paused');
	});

	it('queues post-fx filters after drawing the overlay source', () => {
		const canvas = document.createElement('canvas');
		let drawCallback: (() => void) | null = null;
		const instance = createTextmodeInstance({
			grid: { cols: 10, rows: 8 },
			draw: vi.fn((callback: () => void) => {
				drawCallback = callback;
			}),
		});
		const controller: OverlayController = {
			id: 'overlay-1',
			element: canvas,
			settings: {
				...DEFAULT_OVERLAY_SETTINGS,
				postFx: [
					{ id: 'fx-1', filter: 'brightness', enabled: true, params: { amount: 1.2 } },
					{ id: 'fx-2', filter: 'invert', enabled: true, params: {} },
				],
			},
			status: 'active',
			previousInlineOpacity: '',
			postFxFiltersReady: true,
		};

		createOverlayInstance(
			controller,
			{
				create: vi.fn(() => instance as unknown as ExportableTextmodeInstance),
			},
			{ resolveFontAssetUrl: () => null }
		);
		controller.postFxFiltersReady = true;
		expect(drawCallback).not.toBeNull();
		const callback = drawCallback as unknown as () => void;
		callback();

		expect(vi.mocked(instance.image).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(instance.filter).mock.invocationCallOrder[0]
		);
		expect(instance.filter).toHaveBeenNthCalledWith(1, 'brightness', { amount: 1.2 });
		expect(instance.filter).toHaveBeenNthCalledWith(2, 'invert', undefined);
	});
});

function createTextmodeInstance(overrides: Partial<MockTextmodeInstance> = {}): MockTextmodeInstance {
	const source = createMockSource();
	return {
		canvas: document.createElement('canvas'),
		setup: vi.fn(),
		draw: vi.fn(),
		clear: vi.fn(),
		image: vi.fn(),
		filter: vi.fn(),
		filters: { has: vi.fn(() => true) },
		grid: { cols: 1, rows: 1 },
		targetFrameRate: vi.fn(),
		noLoop: vi.fn(),
		loop: vi.fn(),
		fontSize: vi.fn((value?: number) => (value === undefined ? 8 : undefined)),
		loadFont: vi.fn(async () => undefined),
		get overlay() {
			return source;
		},
		...overrides,
	} as unknown as MockTextmodeInstance;
}
