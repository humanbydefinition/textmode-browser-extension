import { describe, expect, it } from 'vitest';
import { createFontRegistry } from '@/domain/fonts/font-registry';
import { createRuntimeFontRegistry } from '@/shared/fonts/runtime-font-registry';

const TEST_FONT_ASSET_PATHS = [
	'fonts/Bescii-Mono.woff',
	'fonts/UrsaFont.woff',
	'fonts/atascii.woff',
	'fonts/cpc464.woff',
];

describe('font-registry', () => {
	it('returns only fonts with matching local asset files', () => {
		const registry = createFontRegistry(TEST_FONT_ASSET_PATHS);
		const fonts = registry.getAvailableFonts();

		expect(fonts).toHaveLength(4);
		expect(fonts.map((font) => font.id)).toEqual(['ursafont', 'atascii', 'bescii', 'cpc464']);
	});

	it('every font has all required metadata fields', () => {
		const registry = createFontRegistry(TEST_FONT_ASSET_PATHS);

		for (const font of registry.getAvailableFonts()) {
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

	it('getFontEntry returns null for known fonts without local assets', () => {
		const registry = createFontRegistry(TEST_FONT_ASSET_PATHS);
		expect(registry.getFontEntry('chunky')).toBeNull();
		expect(registry.getFontEntry('bescii')?.id).toBe('bescii');
	});

	it('preferred font selection falls back to the default available font', () => {
		const registry = createFontRegistry(TEST_FONT_ASSET_PATHS);
		expect(registry.getPreferredFontEntry('chunky')?.id).toBe('bescii');
		expect(registry.resolveFontId('chunky')).toBe('bescii');
	});

	it('getFontAssetUrl resolves only available fonts to extension URLs', () => {
		const registry = createRuntimeFontRegistry(TEST_FONT_ASSET_PATHS, (path) => `chrome-extension://test/${path}`);
		expect(registry.getFontAssetUrl('bescii')).toBe('chrome-extension://test/fonts/Bescii-Mono.woff');
		expect(registry.getFontAssetUrl('chunky')).toBeNull();
	});

	it('every font has a unique assetPath', () => {
		const registry = createFontRegistry(TEST_FONT_ASSET_PATHS);
		const paths = registry.getAvailableFonts().map((f: { assetPath: string }) => f.assetPath);
		expect(new Set(paths).size).toBe(paths.length);
	});

	it('every font displayName is non-empty', () => {
		const registry = createFontRegistry(TEST_FONT_ASSET_PATHS);
		for (const font of registry.getAvailableFonts()) {
			expect(font.displayName.length).toBeGreaterThan(0);
		}
	});

	it('every font authorUrl and sourceUrl are valid URLs', () => {
		const registry = createFontRegistry(TEST_FONT_ASSET_PATHS);
		for (const font of registry.getAvailableFonts()) {
			expect(() => new URL(font.authorUrl)).not.toThrow();
			expect(() => new URL(font.sourceUrl)).not.toThrow();
		}
	});
});
