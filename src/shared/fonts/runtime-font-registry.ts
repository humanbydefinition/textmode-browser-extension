import type { CustomFontEntry, CustomFontSummary } from '../../domain/fonts/custom-font-entry';
import { toCustomFontSummary } from '../../domain/fonts/custom-font-entry';
import type { BundledFontEntry } from '../../domain/fonts/font-registry';
import { createFontRegistry } from '../../domain/fonts/font-registry';
import { isBundledFontId, isCustomFontId, type CustomFontId, type FontId } from '../../domain/fonts/font-id';
import type { StoredCustomFontMetadata } from '../../domain/fonts/custom-font-storage';
import { getExtensionAssetUrl } from '../browser/browser-api';
import { FontUploadError } from '../errors/errors';
import { createCustomFontStore, type CustomFontStore } from './custom-font-store';

export { CUSTOM_FONT_MAX_BYTES } from './runtime-font-registry-constants';

export interface RuntimeFontRegistryChange {
	added: readonly CustomFontEntry[];
	removedIds: readonly CustomFontId[];
}

export interface RuntimeFontRegistry {
	initialize(): Promise<void>;
	getPreferredFontEntry(fontId: FontId): BundledFontEntry | CustomFontEntry | null;
	getAvailableFonts(): readonly BundledFontEntry[];
	resolveFontId(fontId: FontId): FontId | null;
	getFontAssetUrl(fontId: FontId): string | null;
	resolveFontAssetUrl(fontId: FontId): Promise<string | null>;
	getCustomFonts(): readonly CustomFontEntry[];
	getAllFonts(): readonly (BundledFontEntry | CustomFontEntry)[];
	addCustomFont(file: File): Promise<CustomFontEntry>;
	removeCustomFont(id: CustomFontId): Promise<void>;
	getCustomFontUrl(id: CustomFontId): string | null;
	toCustomFontSummaries(): CustomFontSummary[];
	subscribe(listener: (change: RuntimeFontRegistryChange) => void): () => void;
	dispose(): void;
}

export function createRuntimeFontRegistry(
	resolveAssetUrl: (assetPath: string) => string = getExtensionAssetUrl,
	store: CustomFontStore = createCustomFontStore()
): RuntimeFontRegistry {
	const registry = createFontRegistry();
	const metadataById = new Map<CustomFontId, StoredCustomFontMetadata>();
	const blobUrls = new Map<CustomFontId, string>();
	const pendingLoads = new Map<CustomFontId, Promise<string>>();
	const listeners = new Set<(change: RuntimeFontRegistryChange) => void>();
	let initializePromise: Promise<void> | undefined;
	let unsubscribeStore: (() => void) | undefined;

	function getCustomFonts(): CustomFontEntry[] {
		return [...metadataById.values()].map(toEntry).sort((a, b) => a.uploadedAt - b.uploadedAt);
	}

	function applyMetadata(fonts: readonly StoredCustomFontMetadata[]): void {
		metadataById.clear();
		for (const font of fonts) metadataById.set(font.id, font);
	}

	function initialize(): Promise<void> {
		initializePromise ??= (async () => {
			unsubscribeStore = store.subscribe((change) => {
				applyMetadata(change.fonts);
				for (const id of change.removedIds) revokeFontUrl(id);
				const registryChange = { added: change.added.map(toEntry), removedIds: change.removedIds };
				for (const listener of listeners) listener(registryChange);
			});
			applyMetadata(await store.initialize());
		})();
		return initializePromise;
	}

	async function resolveCustomFontAssetUrl(id: CustomFontId): Promise<string> {
		const cached = blobUrls.get(id);
		if (cached) return cached;
		const pending = pendingLoads.get(id);
		if (pending) return pending;
		const load = (async () => {
			try {
				const bytes = await store.loadBytes(id);
				const blobUrl = URL.createObjectURL(new Blob([toArrayBuffer(bytes)], { type: 'font/ttf' }));
				blobUrls.set(id, blobUrl);
				return blobUrl;
			} catch (error) {
				if (
					error instanceof FontUploadError &&
					['CORRUPT_STORED_FONT', 'INVALID_SIGNATURE', 'INVALID_TYPE'].includes(error.code)
				) {
					void store.remove(id).catch(() => undefined);
				}
				throw error;
			} finally {
				pendingLoads.delete(id);
			}
		})();
		pendingLoads.set(id, load);
		return load;
	}

	function revokeFontUrl(id: CustomFontId): void {
		const blobUrl = blobUrls.get(id);
		if (blobUrl) URL.revokeObjectURL(blobUrl);
		blobUrls.delete(id);
	}

	return {
		initialize,
		getPreferredFontEntry: (fontId) => {
			if (isCustomFontId(fontId)) {
				const metadata = metadataById.get(fontId);
				return metadata ? toEntry(metadata) : null;
			}
			return registry.getPreferredFontEntry(fontId);
		},
		getAvailableFonts: () => registry.getAvailableFonts(),
		resolveFontId: (fontId) => {
			if (isCustomFontId(fontId)) return metadataById.has(fontId) ? fontId : null;
			return isBundledFontId(fontId) ? registry.resolveFontId(fontId) : null;
		},
		getFontAssetUrl: (fontId) => {
			if (isCustomFontId(fontId)) return blobUrls.get(fontId) ?? null;
			const entry = registry.getFontEntry(fontId);
			return entry ? resolveAssetUrl(entry.assetPath) : null;
		},
		async resolveFontAssetUrl(fontId) {
			if (isCustomFontId(fontId)) {
				await initialize();
				return metadataById.has(fontId) ? resolveCustomFontAssetUrl(fontId) : null;
			}
			const entry = registry.getFontEntry(fontId);
			return entry ? resolveAssetUrl(entry.assetPath) : null;
		},
		getCustomFonts,
		getAllFonts: () => [...getCustomFonts(), ...registry.getAvailableFonts()],
		async addCustomFont(file) {
			await initialize();
			const { metadata, bytes } = await store.add(file);
			applyMetadata(store.getFonts());
			const blobUrl = URL.createObjectURL(new Blob([toArrayBuffer(bytes)], { type: 'font/ttf' }));
			blobUrls.set(metadata.id, blobUrl);
			return toEntry(metadata);
		},
		async removeCustomFont(id) {
			await initialize();
			await store.remove(id);
			applyMetadata(store.getFonts());
			revokeFontUrl(id);
		},
		getCustomFontUrl: (id) => blobUrls.get(id) ?? null,
		toCustomFontSummaries: () => getCustomFonts().map(toCustomFontSummary),
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		dispose() {
			unsubscribeStore?.();
			for (const id of blobUrls.keys()) revokeFontUrl(id);
			store.dispose();
			listeners.clear();
		},
	};
}

function toEntry(metadata: StoredCustomFontMetadata): CustomFontEntry {
	return {
		id: metadata.id,
		displayName: metadata.displayName,
		fileName: metadata.fileName,
		uploadedAt: metadata.uploadedAt,
	};
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

const runtimeFontRegistry = createRuntimeFontRegistry();

export const initialize = (): Promise<void> => runtimeFontRegistry.initialize();
export const getPreferredFontEntry = (fontId: FontId): BundledFontEntry | CustomFontEntry | null =>
	runtimeFontRegistry.getPreferredFontEntry(fontId);
export const getAvailableFonts = (): readonly BundledFontEntry[] => runtimeFontRegistry.getAvailableFonts();
export const resolveFontId = (fontId: FontId): FontId | null => runtimeFontRegistry.resolveFontId(fontId);
export const getFontAssetUrl = (fontId: FontId): string | null => runtimeFontRegistry.getFontAssetUrl(fontId);
export const resolveFontAssetUrl = (fontId: FontId): Promise<string | null> =>
	runtimeFontRegistry.resolveFontAssetUrl(fontId);
export const getCustomFonts = (): readonly CustomFontEntry[] => runtimeFontRegistry.getCustomFonts();
export const getAllFonts = (): readonly (BundledFontEntry | CustomFontEntry)[] => runtimeFontRegistry.getAllFonts();
export const addCustomFont = (file: File): Promise<CustomFontEntry> => runtimeFontRegistry.addCustomFont(file);
export const removeCustomFont = (id: CustomFontId): Promise<void> => runtimeFontRegistry.removeCustomFont(id);
export const getCustomFontUrl = (id: CustomFontId): string | null => runtimeFontRegistry.getCustomFontUrl(id);
export const toCustomFontSummaries = (): CustomFontSummary[] => runtimeFontRegistry.toCustomFontSummaries();
export const subscribe = (listener: (change: RuntimeFontRegistryChange) => void): (() => void) =>
	runtimeFontRegistry.subscribe(listener);
export const dispose = (): void => runtimeFontRegistry.dispose();
