import type { PanelPlacement, StoredPanelPlacement } from '../../domain/presets/panel-placement';
import {
	createStoredPanelPlacement,
	normalizeStoredPanelPlacement,
	resolvePanelPlacementKey,
} from '../../domain/presets/panel-placement';
import { storageLocalGet, storageLocalRemove, storageLocalSet } from '../../shared/browser/browser-api';

export interface PanelPlacementStore {
	loadForUrl(url: URL): Promise<PanelPlacement | null>;
	saveForUrl(url: URL, placement: PanelPlacement): Promise<void>;
	removeForUrl(url: URL): Promise<void>;
}

export interface PanelPlacementStoragePort {
	get<TValue>(key: string): Promise<TValue | undefined>;
	set(record: Record<string, unknown>): Promise<void>;
	remove(key: string): Promise<void>;
}

export function createPanelPlacementStore(
	storage: PanelPlacementStoragePort = defaultPanelPlacementStorage
): PanelPlacementStore {
	return {
		async loadForUrl(url) {
			const storageKey = resolvePanelPlacementKey(url);
			if (!storageKey) return null;

			const storedPlacement = await storage.get<StoredPanelPlacement>(storageKey);
			return normalizeStoredPanelPlacement(storedPlacement)?.placement ?? null;
		},
		async saveForUrl(url, placement) {
			const storageKey = resolvePanelPlacementKey(url);
			if (!storageKey) return;

			await storage.set({ [storageKey]: createStoredPanelPlacement(placement) });
		},
		async removeForUrl(url) {
			const storageKey = resolvePanelPlacementKey(url);
			if (!storageKey) return;

			await storage.remove(storageKey);
		},
	};
}

const defaultPanelPlacementStorage: PanelPlacementStoragePort = {
	get: storageLocalGet,
	set: storageLocalSet,
	remove: storageLocalRemove,
};
