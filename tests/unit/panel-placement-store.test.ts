import { describe, expect, it, vi } from 'vitest';
import {
	createPanelPlacementStore,
	type PanelPlacementStoragePort,
} from '../../src/application/page-runtime/panel-placement-store';
import { createPanelPlacementStorageKey } from '../../src/domain/presets/panel-placement';

describe('panel placement store', () => {
	it('loads and saves placement for the normalized hostname', async () => {
		const key = createPanelPlacementStorageKey('www.youtube.com');
		const storage = createMemoryStorage({
			[key]: {
				version: 1,
				placement: { xRatio: 0.2, yRatio: 0.8 },
				updatedAt: 1,
			},
		});
		const store = createPanelPlacementStore(storage);

		await expect(store.loadForUrl(new URL('https://www.youtube.com/watch?v=abc'))).resolves.toEqual({
			xRatio: 0.2,
			yRatio: 0.8,
		});
		await store.saveForUrl(new URL('https://www.youtube.com/shorts/abc'), { xRatio: 0.4, yRatio: 0.6 });

		expect(storage.set).toHaveBeenCalledWith({
			[key]: expect.objectContaining({
				version: 1,
				placement: { xRatio: 0.4, yRatio: 0.6 },
			}),
		});
	});

	it('removes saved placement and skips unsupported URLs', async () => {
		const storage = createMemoryStorage();
		const store = createPanelPlacementStore(storage);

		await store.removeForUrl(new URL('https://example.com/page'));
		expect(storage.remove).toHaveBeenCalledWith(createPanelPlacementStorageKey('example.com'));

		await store.saveForUrl(new URL('file:///tmp/media.html'), { xRatio: 0, yRatio: 1 });
		await expect(store.loadForUrl(new URL('file:///tmp/media.html'))).resolves.toBeNull();
		expect(storage.set).not.toHaveBeenCalled();
	});

	it('ignores invalid stored placement', async () => {
		const storage = createMemoryStorage({
			[createPanelPlacementStorageKey('example.com')]: {
				version: 1,
				placement: { xRatio: 2, yRatio: 0 },
			},
		});
		const store = createPanelPlacementStore(storage);

		await expect(store.loadForUrl(new URL('https://example.com'))).resolves.toBeNull();
	});
});

function createMemoryStorage(initial: Record<string, unknown> = {}): PanelPlacementStoragePort & {
	set: ReturnType<typeof vi.fn>;
	remove: ReturnType<typeof vi.fn>;
} {
	const records = new Map(Object.entries(initial));
	const get: PanelPlacementStoragePort['get'] = async <TValue>(key: string) => records.get(key) as TValue | undefined;
	return {
		get: vi.fn(get) as PanelPlacementStoragePort['get'],
		set: vi.fn(async (record: Record<string, unknown>) => {
			for (const [key, value] of Object.entries(record)) records.set(key, value);
		}),
		remove: vi.fn(async (key: string) => {
			records.delete(key);
		}),
	};
}
