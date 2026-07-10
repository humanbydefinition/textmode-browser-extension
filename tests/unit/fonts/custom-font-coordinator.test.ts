import { describe, expect, it, vi } from 'vitest';
import {
	CUSTOM_FONT_CATALOG_KEY,
	CUSTOM_FONT_MAX_COUNT,
	CUSTOM_FONT_STORAGE_VERSION,
	normalizeStoredCustomFontCatalog,
	type CustomFontUploadDescriptor,
} from '@/domain/fonts/custom-font-storage';
import {
	createCustomFontCoordinator,
	type CustomFontCoordinatorStoragePort,
} from '@/application/background/custom-font-coordinator';
import { encodeBase64, sha256Hex } from '@/shared/fonts/font-binary';

const FONT_BYTES = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x01, 0x02]);

describe('custom font coordinator', () => {
	it('reserves, verifies, and commits an upload', async () => {
		const storage = createMemoryStorage();
		const coordinator = createCustomFontCoordinator(storage, () => 100);
		const descriptor = await createDescriptor();
		const begun = await coordinator.handle({ type: 'BEGIN_CUSTOM_FONT_UPLOAD', descriptor });
		expect(begun.ok).toBe(true);
		expect(begun.font?.id).toMatch(/^custom:/);

		await storage.set({
			[begun.font!.dataKey]: {
				version: CUSTOM_FONT_STORAGE_VERSION,
				encoding: 'base64',
				data: encodeBase64(FONT_BYTES),
			},
		});
		const committed = await coordinator.handle({ type: 'COMMIT_CUSTOM_FONT_UPLOAD', id: begun.font!.id });
		expect(committed).toMatchObject({ ok: true, font: { displayName: 'Grid', byteLength: FONT_BYTES.length } });
		const catalog = normalizeStoredCustomFontCatalog(await storage.get(CUSTOM_FONT_CATALOG_KEY));
		expect(catalog?.fonts).toHaveLength(1);
		expect(catalog?.pendingUploads).toHaveLength(0);
	});

	it('serializes concurrent reservations and enforces the count cap', async () => {
		const coordinator = createCustomFontCoordinator(createMemoryStorage(), () => 100);
		const descriptor = await createDescriptor();
		const results = await Promise.all(
			Array.from({ length: CUSTOM_FONT_MAX_COUNT + 1 }, () =>
				coordinator.handle({ type: 'BEGIN_CUSTOM_FONT_UPLOAD', descriptor })
			)
		);
		expect(results.filter((result) => result.ok)).toHaveLength(CUSTOM_FONT_MAX_COUNT);
		expect(results.find((result) => !result.ok)?.error).toMatch(/up to 10/);
	});

	it('expires abandoned reservations and deletes staged payloads', async () => {
		let timestamp = 0;
		const storage = createMemoryStorage();
		const coordinator = createCustomFontCoordinator(storage, () => timestamp);
		const begun = await coordinator.handle({
			type: 'BEGIN_CUSTOM_FONT_UPLOAD',
			descriptor: await createDescriptor(),
		});
		await storage.set({ [begun.font!.dataKey]: { version: 1, encoding: 'base64', data: 'AA==' } });
		timestamp = 11 * 60 * 1000;
		await coordinator.cleanup();

		expect(await storage.get(begun.font!.dataKey)).toBeUndefined();
		const catalog = normalizeStoredCustomFontCatalog(await storage.get(CUSTOM_FONT_CATALOG_KEY));
		expect(catalog?.pendingUploads).toHaveLength(0);
		expect(catalog?.garbageDataKeys).toHaveLength(0);
	});

	it('rejects a payload whose digest does not match its reservation', async () => {
		const storage = createMemoryStorage();
		const coordinator = createCustomFontCoordinator(storage);
		const begun = await coordinator.handle({
			type: 'BEGIN_CUSTOM_FONT_UPLOAD',
			descriptor: await createDescriptor(),
		});
		await storage.set({
			[begun.font!.dataKey]: { version: 1, encoding: 'base64', data: encodeBase64(new Uint8Array([0, 1, 0, 0])) },
		});
		const response = await coordinator.handle({ type: 'COMMIT_CUSTOM_FONT_UPLOAD', id: begun.font!.id });
		expect(response).toMatchObject({ ok: false });
		expect(response.error).toMatch(/integrity check/);
	});
});

async function createDescriptor(): Promise<CustomFontUploadDescriptor> {
	return {
		displayName: 'Grid',
		fileName: 'Grid.ttf',
		format: 'truetype',
		byteLength: FONT_BYTES.byteLength,
		sha256: await sha256Hex(FONT_BYTES),
	};
}

function createMemoryStorage(): CustomFontCoordinatorStoragePort & {
	set: ReturnType<typeof vi.fn>;
} {
	const records = new Map<string, unknown>();
	return {
		get: async <TValue>(key: string) => records.get(key) as TValue | undefined,
		set: vi.fn(async (record: Record<string, unknown>) => {
			for (const [key, value] of Object.entries(record)) records.set(key, value);
		}),
		remove: async (key: string) => void records.delete(key),
	};
}
