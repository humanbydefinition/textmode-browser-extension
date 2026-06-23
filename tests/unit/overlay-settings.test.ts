import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FONT_ID,
	DEFAULT_OVERLAY_SETTINGS,
	isBundledFontId,
	mergeOverlaySettings,
} from '../../src/domain/overlay/overlay-settings';

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

	it('repairs invalid fontId by falling back to default', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			fontId: 'not_a_real_font',
		} as Record<string, unknown> as Partial<Record<string, unknown>>);

		expect(settings.fontId).toBe(DEFAULT_FONT_ID);
	});

	it('preserves custom font ids and repairs malformed custom ids', () => {
		const customSettings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			fontId: 'custom:abc',
		});
		const malformedSettings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			fontId: 'custom:',
		});

		expect(customSettings.fontId).toBe('custom:abc');
		expect(malformedSettings.fontId).toBe(DEFAULT_FONT_ID);
	});

	describe('isBundledFontId', () => {
		it('returns true for known font ids', () => {
			expect(isBundledFontId('chunky')).toBe(true);
			expect(isBundledFontId('bescii')).toBe(true);
			expect(isBundledFontId('t64')).toBe(true);
		});

		it('returns false for unknown strings', () => {
			expect(isBundledFontId('helvetica')).toBe(false);
			expect(isBundledFontId('')).toBe(false);
			expect(isBundledFontId('chunkyy')).toBe(false);
		});

		it('returns false for non-string values', () => {
			expect(isBundledFontId(null)).toBe(false);
			expect(isBundledFontId(undefined)).toBe(false);
			expect(isBundledFontId(42)).toBe(false);
		});
	});
});
