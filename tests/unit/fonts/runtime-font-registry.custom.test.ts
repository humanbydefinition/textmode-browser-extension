import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOM_FONT_MAX_BYTES, createRuntimeFontRegistry } from '@/shared/fonts/runtime-font-registry';

const TEST_FONT_ASSET_PATHS = ['fonts/Bescii-Mono.ttf', 'fonts/UrsaFont.ttf'];
const TRUE_TYPE_SIGNATURE = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x01, 0x02]);
const CFF_SIGNATURE = new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 0x01, 0x02]);

describe('runtime custom font registry', () => {
	let createObjectUrl: ReturnType<typeof vi.fn>;
	let revokeObjectUrl: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		createObjectUrl = vi.fn(() => 'blob:test-font');
		revokeObjectUrl = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', {
			configurable: true,
			value: createObjectUrl,
		});
		Object.defineProperty(URL, 'revokeObjectURL', {
			configurable: true,
			value: revokeObjectUrl,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('adds TrueType fonts and exposes blob URLs plus summaries', async () => {
		const registry = createRuntimeFontRegistry(TEST_FONT_ASSET_PATHS, (path) => `chrome-extension://test/${path}`);
		const entry = await registry.addCustomFont(new File([TRUE_TYPE_SIGNATURE], 'Pixel Grid.ttf'));

		expect(entry.id).toMatch(/^custom:/);
		expect(entry.displayName).toBe('Pixel Grid');
		expect(entry.fileName).toBe('Pixel Grid.ttf');
		expect(registry.getCustomFontUrl(entry.id)).toBe('blob:test-font');
		expect(registry.getFontAssetUrl(entry.id)).toBe('blob:test-font');
		expect(registry.resolveFontId(entry.id)).toBe(entry.id);
		expect(registry.getAllFonts().map((font) => font.id)).toEqual([entry.id, 'ursafont', 'bescii']);
		expect(registry.toCustomFontSummaries()).toEqual([{ id: entry.id, displayName: 'Pixel Grid' }]);
	});

	it('revokes blob URLs when custom fonts are removed', async () => {
		const registry = createRuntimeFontRegistry(TEST_FONT_ASSET_PATHS);
		const entry = await registry.addCustomFont(new File([TRUE_TYPE_SIGNATURE], 'Grid.ttf'));

		registry.removeCustomFont(entry.id);

		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:test-font');
		expect(registry.getCustomFontUrl(entry.id)).toBeNull();
		expect(registry.resolveFontId(entry.id)).toBeNull();
	});

	it('rejects unsupported font uploads', async () => {
		const registry = createRuntimeFontRegistry(TEST_FONT_ASSET_PATHS);

		await expect(registry.addCustomFont(new File([TRUE_TYPE_SIGNATURE], 'Grid.woff2'))).rejects.toThrow(
			/WOFF2 fonts are not supported/
		);
		await expect(registry.addCustomFont(new File([CFF_SIGNATURE], 'Grid.otf'))).rejects.toThrow(
			/CFF-based OTF fonts are not supported/
		);
		await expect(registry.addCustomFont(new File([new Uint8Array([1, 2, 3, 4])], 'Grid.ttf'))).rejects.toThrow(
			/supported TrueType/
		);
		await expect(
			registry.addCustomFont(new File([new Uint8Array(CUSTOM_FONT_MAX_BYTES + 1)], 'Huge.ttf'))
		).rejects.toThrow(/under 10 MB/);
	});
});
