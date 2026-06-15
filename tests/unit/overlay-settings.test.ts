import { describe, expect, it } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS, mergeOverlaySettings } from '../../src/shared/overlay-settings';

describe('mergeOverlaySettings', () => {
	it('merges patches over defaults', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			fontSize: 12,
			glyphRamp: 'abc',
			hideOriginal: true,
		});

		expect(settings.fontSize).toBe(12);
		expect(settings.glyphRamp).toBe('abc');
		expect(settings.hideOriginal).toBe(true);
	});

	it('clamps numeric values into supported ranges', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			opacity: 99,
			fontSize: 1,
			frameRate: 120,
			brightnessStart: -20,
			brightnessEnd: 999,
		});

		expect(settings.opacity).toBe(1);
		expect(settings.fontSize).toBe(4);
		expect(settings.frameRate).toBe(60);
		expect(settings.brightnessStart).toBe(0);
		expect(settings.brightnessEnd).toBe(255);
	});

	it('repairs invalid glyph ramps and colors', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			glyphRamp: '   ',
			cellColor: 'blue',
		});

		expect(settings.glyphRamp).toBe(DEFAULT_OVERLAY_SETTINGS.glyphRamp);
		expect(settings.cellColor).toBe(DEFAULT_OVERLAY_SETTINGS.cellColor);
	});
});
