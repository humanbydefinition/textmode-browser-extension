import { describe, expect, it } from 'vitest';
import { CUSTOM_FONT_CATALOG_KEY } from '@/domain/fonts/custom-font-storage';
import { createCustomFontCoordinator } from '@/application/background/custom-font-coordinator';
import { createCustomFontStore, type CustomFontStorePort } from '@/shared/fonts/custom-font-store';
import type { StorageChangedListener } from '@/shared/browser/browser-api';

const FONT_BYTES = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x01, 0x02]);

describe('custom font store', () => {
	it('persists uploads and hydrates only catalog metadata in a new runtime', async () => {
		const port = createIntegratedPort();
		const first = createCustomFontStore(port);
		const added = await first.add(new File([FONT_BYTES], 'Grid.ttf'));
		expect(added.metadata.displayName).toBe('Grid');

		port.readKeys.length = 0;
		const restored = createCustomFontStore(port);
		await expect(restored.initialize()).resolves.toMatchObject([{ id: added.metadata.id }]);
		expect(port.readKeys).toEqual([CUSTOM_FONT_CATALOG_KEY]);

		await expect(restored.loadBytes(added.metadata.id)).resolves.toEqual(FONT_BYTES);
		expect(port.readKeys).toContain(added.metadata.dataKey);
	});

	it('propagates committed catalog additions and removals to active stores', async () => {
		const port = createIntegratedPort();
		const first = createCustomFontStore(port);
		const second = createCustomFontStore(port);
		await Promise.all([first.initialize(), second.initialize()]);
		const changes: string[][] = [];
		second.subscribe((change) => changes.push(change.fonts.map((font) => font.id)));

		const added = await first.add(new File([FONT_BYTES], 'Grid.ttf'));
		expect(second.getFonts().map((font) => font.id)).toEqual([added.metadata.id]);
		await first.remove(added.metadata.id);
		expect(second.getFonts()).toEqual([]);
		expect(changes).toEqual([[added.metadata.id], []]);
	});
});

function createIntegratedPort(): CustomFontStorePort & { readKeys: string[] } {
	const records = new Map<string, unknown>();
	const listeners = new Set<StorageChangedListener>();
	const readKeys: string[] = [];
	const storage = {
		async get<TValue>(key: string): Promise<TValue | undefined> {
			readKeys.push(key);
			return records.get(key) as TValue | undefined;
		},
		async set(record: Record<string, unknown>): Promise<void> {
			const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
			for (const [key, value] of Object.entries(record)) {
				changes[key] = { oldValue: records.get(key), newValue: value };
				records.set(key, value);
			}
			for (const listener of listeners) listener(changes, 'local');
		},
		async remove(key: string): Promise<void> {
			const oldValue = records.get(key);
			records.delete(key);
			for (const listener of listeners) listener({ [key]: { oldValue } }, 'local');
		},
	};
	const coordinator = createCustomFontCoordinator(storage);
	return {
		...storage,
		readKeys,
		send: (message) => coordinator.handle(message),
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
