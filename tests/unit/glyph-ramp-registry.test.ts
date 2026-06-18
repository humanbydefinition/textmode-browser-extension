import { describe, expect, it } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '../../src/domain/overlay/overlay-settings';
import {
	getAdjacentGlyphRampPreset,
	getGlyphRampPresetName,
	getGlyphRampPresets,
} from '../../src/domain/overlay/glyph-ramp-registry';

describe('glyph ramp registry', () => {
	it('provides global ramps for every bundled font', () => {
		const presets = getGlyphRampPresets('bescii');

		expect(presets[0]).toMatchObject({
			id: 'classic',
			name: 'classic',
			glyphRamp: DEFAULT_OVERLAY_SETTINGS.glyphRamp,
		});
		expect(getGlyphRampPresetName('bescii', DEFAULT_OVERLAY_SETTINGS.glyphRamp)).toBe('classic');
	});

	it('adds font-specific ramps after the global presets', () => {
		const besciiPresets = getGlyphRampPresets('bescii');
		const atasciiPresets = getGlyphRampPresets('atascii');

		expect(atasciiPresets.slice(0, besciiPresets.length)).toEqual(besciiPresets);
		expect(atasciiPresets.at(-1)).toMatchObject({
			id: 'atascii-symbols',
			name: 'atascii',
		});
	});

	it('labels unmatched ramps as custom', () => {
		expect(getGlyphRampPresetName('bescii', 'abc123')).toBe('custom');
	});

	it('selects adjacent presets and wraps at the ends', () => {
		const presets = getGlyphRampPresets('bescii');

		expect(getAdjacentGlyphRampPreset('bescii', presets[0]!.glyphRamp, 1)).toBe(presets[1]);
		expect(getAdjacentGlyphRampPreset('bescii', presets[0]!.glyphRamp, -1)).toBe(presets.at(-1));
		expect(getAdjacentGlyphRampPreset('bescii', 'custom', 1)).toBe(presets[0]);
		expect(getAdjacentGlyphRampPreset('bescii', 'custom', -1)).toBe(presets.at(-1));
	});
});
