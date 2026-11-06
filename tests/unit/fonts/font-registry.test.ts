import { describe, expect, it, vi } from 'vitest';
import { createFontRegistry } from '@/domain/fonts/font-registry';
import { createRuntimeFontRegistry } from '@/shared/fonts/runtime-font-registry';

describe('font-registry', () => {
	it('returns all 11 bundled fonts', () => {
		const registry = createFontRegistry();
		const fonts = registry.getAvailableFonts();

		expect(fonts).toHaveLength(11);
		expect(fonts.map((font) => font.id)).toEqual([
			'ursafont',
			'atascii',
			'bescii',
			'unscii8',
			'unscii8Alt',
			'unscii8Mcr',
			'unscii8Thin',
			'unscii8Fantasy',
			'cpc464',
			'dungeonmode',
			'rook',
		]);
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

	it('returns null for an unknown custom font', () => {
		const registry = createRuntimeFontRegistry();
		expect(registry.getFontAssetUrl('custom:nonexistent')).toBeNull();
	});

	it('provides usable bundled font data without requesting extension URLs from the page', async () => {
		vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } });
		try {
			const registry = createRuntimeFontRegistry();
			for (const font of registry.getAvailableFonts()) {
				const url = registry.getFontAssetUrl(font.id);
				expect(url, font.id).toMatch(/^data:font\/ttf;base64,/);
				expect(await registry.resolveFontAssetUrl(font.id)).toBe(url);
				const bytes = new Uint8Array(await (await fetch(url!)).arrayBuffer());
				expect([...bytes.slice(0, 4)]).toEqual([0, 1, 0, 0]);
			}
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
