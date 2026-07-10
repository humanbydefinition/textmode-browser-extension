import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOM_FONT_MAX_BYTES, createRuntimeFontRegistry } from '@/shared/fonts/runtime-font-registry';
import type { CustomFontStore } from '@/shared/fonts/custom-font-store';
import { readAndValidateCustomFont } from '@/shared/fonts/font-binary';
import type { StoredCustomFontMetadata } from '@/domain/fonts/custom-font-storage';

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
		const registry = createRuntimeFontRegistry((path) => `chrome-extension://test/${path}`, createMockStore());
		const entry = await registry.addCustomFont(new File([TRUE_TYPE_SIGNATURE], 'Pixel Grid.ttf'));

		expect(entry.id).toMatch(/^custom:/);
		expect(entry.displayName).toBe('Pixel Grid');
		expect(entry.fileName).toBe('Pixel Grid.ttf');
		expect(registry.getCustomFontUrl(entry.id)).toBe('blob:test-font');
		expect(registry.getFontAssetUrl(entry.id)).toBe('blob:test-font');
		expect(registry.resolveFontId(entry.id)).toBe(entry.id);
		expect(registry.getAllFonts().map((font) => font.id)).toEqual([
			entry.id,
			'ursafont',
			'atascii',
			'bescii',
			'cpc464',
		]);
		expect(registry.toCustomFontSummaries()).toEqual([{ id: entry.id, displayName: 'Pixel Grid' }]);
	});

	it('revokes blob URLs when custom fonts are removed', async () => {
		const registry = createRuntimeFontRegistry(undefined, createMockStore());
		const entry = await registry.addCustomFont(new File([TRUE_TYPE_SIGNATURE], 'Grid.ttf'));

		await registry.removeCustomFont(entry.id);

		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:test-font');
		expect(registry.getCustomFontUrl(entry.id)).toBeNull();
		expect(registry.resolveFontId(entry.id)).toBeNull();
	});

	it('rejects unsupported font uploads', async () => {
		const registry = createRuntimeFontRegistry(undefined, createMockStore());

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

	it('hydrates metadata without loading bytes and shares concurrent lazy loads', async () => {
		const id = 'custom:123e4567-e89b-12d3-a456-426614174000' as const;
		const metadata: StoredCustomFontMetadata = {
			id,
			displayName: 'Stored Grid',
			fileName: 'Stored Grid.ttf',
			format: 'truetype',
			uploadedAt: 1,
			byteLength: TRUE_TYPE_SIGNATURE.byteLength,
			sha256: '0'.repeat(64),
			dataKey: 'custom-font:data:v1:123e4567-e89b-12d3-a456-426614174000',
		};
		const loadBytes = vi.fn(async () => TRUE_TYPE_SIGNATURE);
		const store: CustomFontStore = {
			initialize: async () => [metadata],
			getFonts: () => [metadata],
			add: vi.fn(),
			remove: vi.fn(),
			loadBytes,
			subscribe: () => vi.fn(),
			dispose: vi.fn(),
		};
		const registry = createRuntimeFontRegistry(undefined, store);

		await registry.initialize();
		expect(registry.getCustomFonts()).toMatchObject([{ id, displayName: 'Stored Grid' }]);
		expect(loadBytes).not.toHaveBeenCalled();
		expect(createObjectUrl).not.toHaveBeenCalled();

		await Promise.all([registry.resolveFontAssetUrl(id), registry.resolveFontAssetUrl(id)]);
		expect(loadBytes).toHaveBeenCalledTimes(1);
		expect(createObjectUrl).toHaveBeenCalledTimes(1);
	});
});

function createMockStore(): CustomFontStore {
	let fonts: StoredCustomFontMetadata[] = [];
	const bytesById = new Map<`custom:${string}`, Uint8Array>();
	const listeners = new Set<Parameters<CustomFontStore['subscribe']>[0]>();
	return {
		initialize: async () => fonts,
		getFonts: () => fonts,
		async add(file) {
			const bytes = await readAndValidateCustomFont(file);
			const id = `custom:${crypto.randomUUID()}` as const;
			const metadata: StoredCustomFontMetadata = {
				id,
				displayName: file.name.replace(/\.[^.]+$/, ''),
				fileName: file.name,
				format: 'truetype',
				uploadedAt: Date.now(),
				byteLength: bytes.byteLength,
				sha256: '0'.repeat(64),
				dataKey: `custom-font:data:v1:${id.slice('custom:'.length)}`,
			};
			fonts = [...fonts, metadata];
			bytesById.set(id, bytes);
			for (const listener of listeners) listener({ fonts, added: [metadata], removedIds: [] });
			return { metadata, bytes };
		},
		async remove(id) {
			fonts = fonts.filter((font) => font.id !== id);
			bytesById.delete(id);
			for (const listener of listeners) listener({ fonts, added: [], removedIds: [id] });
		},
		async loadBytes(id) {
			const bytes = bytesById.get(id);
			if (!bytes) throw new Error('Missing font');
			return bytes;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		dispose: vi.fn(),
	};
}
