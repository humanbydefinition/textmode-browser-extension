import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FONT_ID,
	DEFAULT_OVERLAY_SETTINGS,
	OVERLAY_POST_FX_FILTER_IDS,
	createDefaultOverlaySettings,
	createOverlayPostFxItem,
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
		expect(settings.brightnessEnabled).toBe(true);
	});

	it('clamps numeric values into supported ranges', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			opacity: 99,
			fontSize: 99,
		});

		expect(settings.opacity).toBe(1);
		expect(settings.fontSize).toBe(64);
	});

	it('defaults and normalizes contour settings', () => {
		expect(DEFAULT_OVERLAY_SETTINGS.contour).toEqual({
			enabled: false,
			invert: false,
			threshold: 0.12,
			colorSensitivity: 0.75,
			charColorMode: 'sampled',
			charColor: '#ffffff',
			cellColorMode: 'fixed',
			cellColor: '#000000',
		});

		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			contour: {
				...DEFAULT_OVERLAY_SETTINGS.contour,
				enabled: true,
				threshold: 3,
				colorSensitivity: -1,
				charColor: 'white',
				cellColorMode: 'sampled',
			},
		});

		expect(settings.contour).toEqual({
			...DEFAULT_OVERLAY_SETTINGS.contour,
			enabled: true,
			threshold: 1,
			colorSensitivity: 0,
			cellColorMode: 'sampled',
		});
	});

	it('repairs invalid glyph ramps and colors', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			glyphRamp: '   ',
			cellColor: 'blue',
			background: 'blue',
		});

		expect(settings.glyphRamp).toBe(DEFAULT_OVERLAY_SETTINGS.glyphRamp);
		expect(settings.cellColor).toBe(DEFAULT_OVERLAY_SETTINGS.cellColor);
		expect(settings.background).toBe(DEFAULT_OVERLAY_SETTINGS.background);
	});

	it('preserves alpha-channel colors', () => {
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			charColor: '#ff77aa80',
			cellColor: '#000000cc',
			contour: {
				...DEFAULT_OVERLAY_SETTINGS.contour,
				charColor: '#11223380',
				cellColor: '#445566cc',
			},
		});

		expect(settings.charColor).toBe('#ff77aa80');
		expect(settings.cellColor).toBe('#000000cc');
		expect(settings.contour.charColor).toBe('#11223380');
		expect(settings.contour.cellColor).toBe('#445566cc');
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

	it('defaults to one disabled post-fx item per known filter', () => {
		expect(DEFAULT_OVERLAY_SETTINGS.postFx.map((item) => item.filter)).toEqual(OVERLAY_POST_FX_FILTER_IDS);
		expect(DEFAULT_OVERLAY_SETTINGS.postFx.every((item) => !item.enabled)).toBe(true);
		expect(mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {}).postFx.map((item) => item.filter)).toEqual(
			OVERLAY_POST_FX_FILTER_IDS
		);
	});

	it('creates fresh default post-fx state for reset operations', () => {
		const first = createDefaultOverlaySettings();
		const second = createDefaultOverlaySettings();

		expect(first).toEqual(DEFAULT_OVERLAY_SETTINGS);
		expect(first.postFx).not.toBe(second.postFx);
		expect(first.postFx[0]).not.toBe(second.postFx[0]);
		expect(first.contour).not.toBe(second.contour);
	});

	it('normalizes post-fx chains to one item per known filter while preserving order', () => {
		const first = { ...createOverlayPostFxItem('brightness'), enabled: true, params: { amount: 99 } };
		const duplicate = { ...createOverlayPostFxItem('brightness'), id: 'postfx-brightness-copy' };
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, {
			postFx: [first, duplicate, { id: 'bad', filter: 'unknown', enabled: true, params: {} }],
		} as Record<string, unknown> as Partial<typeof DEFAULT_OVERLAY_SETTINGS>);

		expect(settings.postFx).toHaveLength(OVERLAY_POST_FX_FILTER_IDS.length);
		expect(settings.postFx[0]).toMatchObject({ id: first.id, filter: 'brightness', enabled: true });
		expect(settings.postFx[0]!.params.amount).toBe(3);
		expect(settings.postFx.filter((item) => item.filter === 'brightness')).toHaveLength(1);
		expect(settings.postFx.slice(1).map((item) => item.filter)).toEqual(
			OVERLAY_POST_FX_FILTER_IDS.filter((filter) => filter !== 'brightness')
		);
	});

	describe('isBundledFontId', () => {
		it('returns true for known font ids', () => {
			expect(isBundledFontId('bescii')).toBe(true);
			expect(isBundledFontId('ursafont')).toBe(true);
			expect(isBundledFontId('cpc464')).toBe(true);
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
