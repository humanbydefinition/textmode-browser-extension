import { describe, expect, it } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS, OVERLAY_POST_FX_FILTER_IDS } from '../../src/domain/overlay/overlay-settings';
import {
	SITE_PRESET_VERSION,
	createSitePresetStorageKey,
	createStoredSitePreset,
	normalizeStoredSitePreset,
	resolveSitePresetKey,
} from '../../src/domain/presets/site-preset';

describe('site overlay presets', () => {
	it('uses the normalized hostname while ignoring paths and query strings', () => {
		expect(resolveSitePresetKey(new URL('https://www.youtube.com/watch?v=abc'))).toBe('www.youtube.com');
		expect(resolveSitePresetKey(new URL('https://www.youtube.com/shorts/abc'))).toBe('www.youtube.com');
		expect(resolveSitePresetKey(new URL('https://m.youtube.com/shorts/abc'))).toBe('m.youtube.com');
	});

	it('uses the same host-only rule for all websites', () => {
		expect(resolveSitePresetKey(new URL('https://docs.example.com/watch?v=abc'))).toBe('docs.example.com');
		expect(resolveSitePresetKey(new URL('https://news.bbc.co.uk/sport'))).toBe('news.bbc.co.uk');
	});

	it('ignores unsupported URLs', () => {
		expect(resolveSitePresetKey(new URL('file:///Users/example/video.html'))).toBeNull();
		expect(resolveSitePresetKey(new URL('chrome-extension://abc/popup.html'))).toBeNull();
	});

	it('creates namespaced storage keys', () => {
		expect(createSitePresetStorageKey('www.youtube.com')).toBe('site-preset:v1:www.youtube.com');
	});

	it('normalizes stored settings payloads', () => {
		const preset = normalizeStoredSitePreset({
			version: SITE_PRESET_VERSION,
			updatedAt: 123,
			settings: {
				...DEFAULT_OVERLAY_SETTINGS,
				enabled: false,
				opacity: 99,
				fontSize: 18,
				glyphRamp: 'abc',
				charColor: 'blue',
				postFx: [{ id: 'fx-1', filter: 'brightness', enabled: true, params: { amount: 99 } }],
			},
		});

		expect(preset).toMatchObject({
			version: SITE_PRESET_VERSION,
			updatedAt: 123,
			settings: {
				enabled: false,
				opacity: 1,
				fontSize: 18,
				glyphRamp: 'abc',
				charColor: DEFAULT_OVERLAY_SETTINGS.charColor,
			},
		});
		expect(preset?.settings.postFx).toHaveLength(OVERLAY_POST_FX_FILTER_IDS.length);
		expect(preset?.settings.postFx.map((item) => item.filter).sort()).toEqual(
			[...OVERLAY_POST_FX_FILTER_IDS].sort()
		);
		expect(preset?.settings.postFx[0]).toMatchObject({
			filter: 'brightness',
			enabled: true,
			params: { amount: 3 },
		});
	});

	it('ignores malformed or future-version payloads', () => {
		expect(normalizeStoredSitePreset(null)).toBeNull();
		expect(normalizeStoredSitePreset({ version: SITE_PRESET_VERSION })).toBeNull();
		expect(
			normalizeStoredSitePreset({
				version: SITE_PRESET_VERSION + 1,
				updatedAt: 123,
				settings: DEFAULT_OVERLAY_SETTINGS,
			})
		).toBeNull();
	});

	it('creates versioned presets from current settings', () => {
		expect(createStoredSitePreset({ ...DEFAULT_OVERLAY_SETTINGS, fontSize: 14 }, 456)).toMatchObject({
			version: SITE_PRESET_VERSION,
			updatedAt: 456,
			settings: { fontSize: 14 },
		});
	});
});
