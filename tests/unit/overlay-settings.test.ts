import { describe, expect, it } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS, mergeOverlaySettings } from '../../src/domain/overlay/overlay-settings';

describe('mergeOverlaySettings', () => {
	it('merges patches over defaults', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			fontSize: 12,
			glyphRamp: 'abc',
		});

		expect(settings.fontSize).toBe(12);
		expect(settings.glyphRamp).toBe('abc');
	});

	it('clamps numeric values into supported ranges', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			opacity: 99,
			fontSize: 99,
		});

		expect(settings.opacity).toBe(1);
		expect(settings.fontSize).toBe(64);
	});

	it('repairs invalid glyph ramps and colors', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			glyphRamp: '   ',
			cellColor: 'blue',
		});

		expect(settings.glyphRamp).toBe(DEFAULT_OVERLAY_SETTINGS.glyphRamp);
		expect(settings.cellColor).toBe(DEFAULT_OVERLAY_SETTINGS.cellColor);
	});

	it('preserves alpha-channel colors', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			charColor: '#ff77aa80',
			cellColor: '#000000cc',
		});

		expect(settings.charColor).toBe('#ff77aa80');
		expect(settings.cellColor).toBe('#000000cc');
	});
});
