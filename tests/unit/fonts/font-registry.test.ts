import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAvailableFonts, getFontAssetUrl, getFontEntry, getFontEntryOrDefault } from '@/domain/fonts/font-registry';
import { BUNDLED_FONT_IDS, type BundledFontId } from '@/domain/overlay/overlay-settings';

describe('font-registry', () => {
	beforeEach(() => {
		vi.stubGlobal('chrome', {
			runtime: {
				getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
			},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns all 18 bundled font entries', () => {
		const fonts = getAvailableFonts();
		expect(fonts).toHaveLength(18);
	});

	it('every font has all required metadata fields', () => {
		for (const font of getAvailableFonts()) {
			expect(font, font.id).toHaveProperty('id');
			expect(font, font.id).toHaveProperty('displayName');
			expect(font, font.id).toHaveProperty('author');
			expect(font, font.id).toHaveProperty('authorUrl');
			expect(font, font.id).toHaveProperty('sourceUrl');
			expect(font, font.id).toHaveProperty('assetPath');
			expect(font, font.id).toHaveProperty('cssFontFamily');
			expect(typeof font.id).toBe('string');
			expect(typeof font.displayName).toBe('string');
			expect(typeof font.author).toBe('string');
			expect(typeof font.authorUrl).toBe('string');
			expect(typeof font.sourceUrl).toBe('string');
			expect(typeof font.assetPath).toBe('string');
			expect(typeof font.cssFontFamily).toBe('string');
		}
	});

	it('matches the BUNDLED_FONT_IDS set', () => {
		const fontIds = getAvailableFonts().map((f: { id: string }) => f.id);
		for (const id of BUNDLED_FONT_IDS) {
			expect(fontIds).toContain(id);
		}
	});

	it('getFontEntry returns the correct entry for valid ids', () => {
		for (const id of BUNDLED_FONT_IDS) {
			const entry = getFontEntry(id);
			expect(entry).not.toBeNull();
			expect(entry!.id).toBe(id);
		}
	});

	it('getFontEntryOrDefault falls back to default for unknown ids', () => {
		const entry = getFontEntryOrDefault('unknown' as BundledFontId);
		expect(entry).not.toBeNull();
		expect(BUNDLED_FONT_IDS).toContain(entry.id);
	});

	it('getFontAssetUrl resolves to a chrome extension URL', () => {
		const url = getFontAssetUrl('chunky');
		expect(url).toBe('chrome-extension://test/fonts/CHUNKY.ttf');
	});

	it('every font has a unique assetPath', () => {
		const paths = getAvailableFonts().map((f: { assetPath: string }) => f.assetPath);
		expect(new Set(paths).size).toBe(paths.length);
	});

	it('every font displayName is non-empty', () => {
		for (const font of getAvailableFonts()) {
			expect(font.displayName.length).toBeGreaterThan(0);
		}
	});

	it('every font authorUrl and sourceUrl are valid URLs', () => {
		for (const font of getAvailableFonts()) {
			expect(() => new URL(font.authorUrl)).not.toThrow();
			expect(() => new URL(font.sourceUrl)).not.toThrow();
		}
	});
});
