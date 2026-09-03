import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '@/domain/overlay/overlay-settings';
import { applyControllerSettings, createOverlayInstance } from '@/features/textmode-overlay/overlay-instance-adapter';
import type { OverlayController } from '@/features/textmode-overlay/overlay-session';
import type { ExportableTextmodeInstance } from '@/features/textmode-overlay/overlay-renderer';
import { createMockOverlayController } from './test-helpers';
import { CONTOUR_DEFAULT_CHARACTERS } from 'textmode.contour.js';

type MockTextmodeInstance = {
	canvas: HTMLCanvasElement;
	setup: ReturnType<typeof vi.fn>;
	draw: ReturnType<typeof vi.fn>;
	background: ReturnType<typeof vi.fn>;
	image: ReturnType<typeof vi.fn>;
	filter: ReturnType<typeof vi.fn>;
	filters: { has: ReturnType<typeof vi.fn> };
	grid: { cols: number; rows: number };
	targetFrameRate: ReturnType<typeof vi.fn>;
	noLoop: ReturnType<typeof vi.fn>;
	loop: ReturnType<typeof vi.fn>;
	fontSize: ReturnType<typeof vi.fn>;
	loadFont: ReturnType<typeof vi.fn>;
	readonly overlay: {
		source: Record<string, () => unknown>;
		target?: unknown;
		setTarget: ReturnType<typeof vi.fn>;
		clearTarget: ReturnType<typeof vi.fn>;
		show: ReturnType<typeof vi.fn>;
		hide: ReturnType<typeof vi.fn>;
		toggle: ReturnType<typeof vi.fn>;
		isVisible: ReturnType<typeof vi.fn>;
	};
	exportOverlay?: {
		hide: ReturnType<typeof vi.fn>;
	};
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
		expect(instance.overlay.hide).toHaveBeenCalled();
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
				background: '#00000080',
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
			vi.mocked(instance.filter).mock.invocationCallOrder[0]!
		);
		expect(instance.background).toHaveBeenCalledWith('#00000080');
		expect(vi.mocked(instance.background).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(instance.image).mock.invocationCallOrder[0]!
		);
		expect(instance.filter).toHaveBeenNthCalledWith(1, 'brightness', { amount: 1.2 });
		expect(instance.filter).toHaveBeenNthCalledWith(2, 'invert', undefined);
	});

	it('uses single-pass brightness rendering while contours are disabled', () => {
		const instance = createTextmodeInstance();
		const controller = createController(instance);

		applyControllerSettings(controller);

		expect(instance.overlay.source.conversionMode).toHaveBeenCalledWith('brightness');
		expect(instance.overlay.source.conversions).not.toHaveBeenCalled();
	});

	it('layers configured contours over the brightness pass', () => {
		const instance = createTextmodeInstance();
		const controller = createController(instance, {
			contour: {
				...DEFAULT_OVERLAY_SETTINGS.contour,
				enabled: true,
				invert: true,
				threshold: 0.24,
				colorSensitivity: 0.6,
				charColor: '#ff8800',
				cellColor: '#000000',
			},
		});

		applyControllerSettings(controller);

		expect(instance.overlay.source.conversions).toHaveBeenCalledWith([
			{
				mode: 'brightness',
				characters: DEFAULT_OVERLAY_SETTINGS.glyphRamp,
				charColorMode: DEFAULT_OVERLAY_SETTINGS.charColorMode,
				charColor: DEFAULT_OVERLAY_SETTINGS.charColor,
				cellColorMode: DEFAULT_OVERLAY_SETTINGS.cellColorMode,
				cellColor: DEFAULT_OVERLAY_SETTINGS.cellColor,
			},
			{
				mode: 'contour',
				characters: CONTOUR_DEFAULT_CHARACTERS,
				invert: true,
				charColorMode: 'sampled',
				charColor: '#ff8800',
				cellColorMode: 'fixed',
				cellColor: '#000000',
				options: { threshold: 0.24, colorSensitivity: 0.6 },
			},
		]);

		controller.settings = { ...controller.settings, contour: { ...controller.settings.contour, enabled: false } };
		applyControllerSettings(controller);
		expect(instance.overlay.source.conversionMode).toHaveBeenLastCalledWith('brightness');
	});

	it('renders contours without a brightness pass when brightness is disabled', () => {
		const instance = createTextmodeInstance();
		const controller = createController(instance, {
			brightnessEnabled: false,
			contour: { ...DEFAULT_OVERLAY_SETTINGS.contour, enabled: true },
		});

		applyControllerSettings(controller);

		expect(instance.overlay.source.conversions).toHaveBeenCalledWith([
			expect.objectContaining({ mode: 'contour', characters: CONTOUR_DEFAULT_CHARACTERS }),
		]);
	});

	it('skips source drawing when both converters are disabled', () => {
		let drawCallback: (() => void) | null = null;
		const instance = createTextmodeInstance({
			draw: vi.fn((callback: () => void) => {
				drawCallback = callback;
			}),
		});
		const controller = createController(instance, {
			brightnessEnabled: false,
			contour: { ...DEFAULT_OVERLAY_SETTINGS.contour, enabled: false },
		});

		createOverlayInstance(
			controller,
			{ create: vi.fn(() => instance as unknown as ExportableTextmodeInstance) },
			{ resolveFontAssetUrl: () => null }
		);
		(drawCallback as unknown as () => void)();

		expect(instance.image).not.toHaveBeenCalled();
	});
});

function createController(
	instance: MockTextmodeInstance,
	settings: Partial<OverlayController['settings']> = {}
): OverlayController {
	return {
		id: 'overlay-1',
		element: document.createElement('canvas'),
		settings: { ...DEFAULT_OVERLAY_SETTINGS, ...settings },
		instance: instance as unknown as ExportableTextmodeInstance,
		status: 'active',
		previousInlineOpacity: '',
		loadedFontId: DEFAULT_OVERLAY_SETTINGS.fontId,
	};
}

function createTextmodeInstance(overrides: Partial<MockTextmodeInstance> = {}): MockTextmodeInstance {
	const overlayController = createMockOverlayController();
	return {
		canvas: document.createElement('canvas'),
		setup: vi.fn((callback?: () => void | Promise<void>) => {
			if (callback) void callback();
		}),
		draw: vi.fn(),
		background: vi.fn(),
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
			return overlayController;
		},
		exportOverlay: {
			hide: vi.fn(),
		},
		...overrides,
	} as unknown as MockTextmodeInstance;
}
