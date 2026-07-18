import { describe, expect, it } from 'vitest';
import { createFontRegistry } from '@/domain/fonts/font-registry';
import { createRuntimeFontRegistry } from '@/shared/fonts/runtime-font-registry';

describe('font-registry', () => {
	it('returns all 4 bundled fonts', () => {
		const registry = createFontRegistry();
		const fonts = registry.getAvailableFonts();

		expect(fonts).toHaveLength(4);
		expect(fonts.map((font) => font.id)).toEqual(['ursafont', 'atascii', 'bescii', 'cpc464']);
	});

	it('exposes complete, unique, and valid metadata for bundled fonts', () => {
		const registry = createFontRegistry();
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

	it('getFontEntry returns a font entry for valid ids', () => {
		const registry = createFontRegistry();
		expect(registry.getFontEntry('bescii')?.id).toBe('bescii');
		expect(registry.getPreferredFontEntry('bescii')?.id).toBe('bescii');
		expect(registry.getPreferredFontEntry('ursafont')?.id).toBe('ursafont');
	});

	it('getFontAssetUrl resolves valid FontId to extension URLs and returns null for unknown ids', () => {
		const registry = createRuntimeFontRegistry((path) => `chrome-extension://test/${path}`);
		expect(registry.getFontAssetUrl('bescii')).toBe('chrome-extension://test/fonts/Bescii-Mono.ttf');
		expect(registry.getFontAssetUrl('custom:nonexistent')).toBeNull();
	});
});
