import type { OverlaySettings } from '../../domain/overlay/overlay-settings';
import {
	createSitePresetStorageKey,
	createStoredSitePreset,
	normalizeStoredSitePreset,
	resolveSitePresetKey,
	type StoredSitePreset,
} from '../../domain/presets/site-preset';
import { storageLocalGet, storageLocalRemove, storageLocalSet } from '../../shared/browser/browser-api';

export interface SitePresetStore {
	loadForUrl(url: URL): Promise<OverlaySettings | null>;
	saveForUrl(url: URL, settings: OverlaySettings): Promise<void>;
	removeForUrl(url: URL): Promise<void>;
}

export interface SitePresetStoragePort {
	get<TValue>(key: string): Promise<TValue | undefined>;
	set(record: Record<string, unknown>): Promise<void>;
	remove(key: string): Promise<void>;
}

export function createSitePresetStore(storage: SitePresetStoragePort = defaultSitePresetStorage): SitePresetStore {
	return {
		async loadForUrl(url) {
			const storageKey = getStorageKey(url);
			if (!storageKey) {
				return null;
			}

			const storedPreset = await storage.get<StoredSitePreset>(storageKey);
			return normalizeStoredSitePreset(storedPreset)?.settings ?? null;
		},
		async saveForUrl(url, settings) {
			const storageKey = getStorageKey(url);
			if (!storageKey) {
				return;
			}

			await storage.set({ [storageKey]: createStoredSitePreset(settings) });
		},
		async removeForUrl(url) {
			const storageKey = getStorageKey(url);
			if (!storageKey) {
				return;
			}

			await storage.remove(storageKey);
		},
	};
}

const defaultSitePresetStorage: SitePresetStoragePort = {
	get: storageLocalGet,
	set: storageLocalSet,
	remove: storageLocalRemove,
};

function getStorageKey(url: URL): string | null {
	const siteKey = resolveSitePresetKey(url);
	return siteKey ? createSitePresetStorageKey(siteKey) : null;
}
