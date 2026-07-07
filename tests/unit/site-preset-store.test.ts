import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '../../src/domain/overlay/overlay-settings';
import { createSitePresetStorageKey } from '../../src/domain/presets/site-preset';
import {
	createSitePresetStore,
	type SitePresetStoragePort,
} from '../../src/application/page-runtime/site-preset-store';

describe('site preset store', () => {
	it('loads normalized settings from browser storage', async () => {
		const storage = createMemoryStorage({
			[createSitePresetStorageKey('www.youtube.com')]: {
				version: 1,
				updatedAt: 1,
				settings: { ...DEFAULT_OVERLAY_SETTINGS, fontSize: 22 },
			},
		});
		const store = createSitePresetStore(storage);

		await expect(store.loadForUrl(new URL('https://www.youtube.com/watch?v=abc'))).resolves.toMatchObject({
			fontSize: 22,
		});
	});

	it('saves one preset for the current hostname without path-specific keys', async () => {
		const storage = createMemoryStorage();
		const store = createSitePresetStore(storage);

		await store.saveForUrl(new URL('https://www.youtube.com/shorts/abc'), {
			...DEFAULT_OVERLAY_SETTINGS,
			fontSize: 20,
		});

		expect(storage.set).toHaveBeenCalledWith({
			[createSitePresetStorageKey('www.youtube.com')]: expect.objectContaining({
				version: 1,
				settings: expect.objectContaining({ fontSize: 20 }),
			}),
		});
	});

	it('skips unsupported URLs', async () => {
		const storage = createMemoryStorage();
		const store = createSitePresetStore(storage);

		await store.saveForUrl(new URL('file:///tmp/video.html'), DEFAULT_OVERLAY_SETTINGS);

		expect(storage.set).not.toHaveBeenCalled();
		await expect(store.loadForUrl(new URL('file:///tmp/video.html'))).resolves.toBeNull();
	});
});

function createMemoryStorage(initial: Record<string, unknown> = {}): SitePresetStoragePort & {
	set: ReturnType<typeof vi.fn>;
} {
	const records = new Map(Object.entries(initial));
	const get: SitePresetStoragePort['get'] = async <TValue>(key: string) => records.get(key) as TValue | undefined;
	return {
		get: vi.fn(get) as SitePresetStoragePort['get'],
		set: vi.fn(async (record: Record<string, unknown>) => {
			for (const [key, value] of Object.entries(record)) {
				records.set(key, value);
			}
		}),
		remove: vi.fn(async (key: string) => {
			records.delete(key);
		}),
	};
}
