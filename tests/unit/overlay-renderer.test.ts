import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '../../src/domain/overlay/overlay-settings';
import { textmodeOverlayRenderer } from '../../src/features/textmode-overlay/overlay-renderer';
import { textmode } from 'textmode.js';

vi.mock('textmode.js', () => ({
	textmode: {
		create: vi.fn(() => ({ canvas: document.createElement('canvas') })),
	},
}));

describe('textmodeOverlayRenderer', () => {
	it('creates textmode overlays with the extension rendering contract', () => {
		const canvas = document.createElement('canvas');

		textmodeOverlayRenderer.create(canvas, { ...DEFAULT_OVERLAY_SETTINGS, fontSize: 16 });

		expect(textmode.create).toHaveBeenCalledWith({
			canvas,
			overlay: true,
			pixelDensity: 1,
			fontSize: 16,
			loadingScreen: { transition: 'none' },
		});
	});
});
