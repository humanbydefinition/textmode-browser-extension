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

	it('exposes complete, unique, and valid metadata for available fonts', () => {
		const registry = createFontRegistry(TEST_FONT_ASSET_PATHS);
		const paths = new Set<string>();

		for (const font of registry.getAvailableFonts()) {
			expect(font.displayName, font.id).not.toBe('');
			expect(font.author, font.id).not.toBe('');
			expect(font.cssFontFamily, font.id).not.toBe('');
			expect(paths.has(font.assetPath), font.id).toBe(false);
			expect(() => new URL(font.authorUrl)).not.toThrow();
			expect(() => new URL(font.sourceUrl)).not.toThrow();
			paths.add(font.assetPath);
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
});
