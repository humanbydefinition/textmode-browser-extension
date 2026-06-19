import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '@/domain/overlay/overlay-settings';
import { applyControllerSettings } from '@/features/textmode-overlay/overlay-instance-adapter';
import type { OverlayController } from '@/features/textmode-overlay/overlay-session';
import type { ExportableTextmodeInstance } from '@/features/textmode-overlay/overlay-renderer';
import { createMockSource } from './test-helpers';

describe('overlay instance adapter', () => {
	it('applies paused settings to the textmode instance and source element', () => {
		const canvas = document.createElement('canvas');
		canvas.style.opacity = '0.25';
		const instance = createTextmodeInstance();
		const controller: OverlayController = {
			id: 'overlay-1',
			element: canvas,
			settings: { ...DEFAULT_OVERLAY_SETTINGS, enabled: false, opacity: 0.4, fontSize: 12 },
			instance,
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
});

function createTextmodeInstance(): ExportableTextmodeInstance {
	const source = createMockSource();
	return {
		canvas: document.createElement('canvas'),
		targetFrameRate: vi.fn(),
		noLoop: vi.fn(),
		loop: vi.fn(),
		fontSize: vi.fn((value?: number) => (value === undefined ? 8 : undefined)),
		loadFont: vi.fn(async () => undefined),
		get overlay() {
			return source;
		},
	} as unknown as ExportableTextmodeInstance;
}
