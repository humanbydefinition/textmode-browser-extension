import {
	CUSTOM_FONT_CATALOG_KEY,
	CUSTOM_FONT_STORAGE_VERSION,
	createEmptyCustomFontCatalog,
	normalizeStoredCustomFontCatalog,
	normalizeStoredCustomFontMetadata,
	normalizeStoredCustomFontPayload,
	type StoredCustomFontCatalog,
	type StoredCustomFontMetadata,
} from '../../domain/fonts/custom-font-storage';
import type { CustomFontId } from '../../domain/fonts/font-id';
import {
	addStorageChangedListener,
	sendMessageToRuntime,
	storageLocalGet,
	storageLocalRemove,
	storageLocalSet,
	type StorageChangedListener,
} from '../browser/browser-api';
import { FontUploadError } from '../errors/errors';
import type { CustomFontStorageMessage, CustomFontStorageResponse } from '../messaging/messages';
import {
	decodeBase64,
	encodeBase64,
	readAndValidateCustomFont,
	sha256Hex,
	validateCustomFontBytes,
} from './font-binary';

export interface CustomFontCatalogChange {
	fonts: readonly StoredCustomFontMetadata[];
	added: readonly StoredCustomFontMetadata[];
	removedIds: readonly CustomFontId[];
}

export interface CustomFontStorePort {
	get<TValue>(key: string): Promise<TValue | undefined>;
	set(record: Record<string, unknown>): Promise<void>;
	remove(key: string): Promise<void>;
	send(message: CustomFontStorageMessage): Promise<CustomFontStorageResponse>;
	subscribe(listener: StorageChangedListener): () => void;
}

export interface CustomFontStore {
	initialize(): Promise<readonly StoredCustomFontMetadata[]>;
	getFonts(): readonly StoredCustomFontMetadata[];
	add(file: File): Promise<{ metadata: StoredCustomFontMetadata; bytes: Uint8Array }>;
	remove(id: CustomFontId): Promise<void>;
	loadBytes(id: CustomFontId): Promise<Uint8Array>;
	subscribe(listener: (change: CustomFontCatalogChange) => void): () => void;
	dispose(): void;
}

export function createCustomFontStore(port: CustomFontStorePort = defaultPort): CustomFontStore {
	let catalog = createEmptyCustomFontCatalog(0);
	let initializePromise: Promise<readonly StoredCustomFontMetadata[]> | undefined;
	let unsubscribeStorage: (() => void) | undefined;
	const listeners = new Set<(change: CustomFontCatalogChange) => void>();

	async function refresh(): Promise<readonly StoredCustomFontMetadata[]> {
		const stored = normalizeStoredCustomFontCatalog(await port.get(CUSTOM_FONT_CATALOG_KEY));
		applyCatalog(stored ?? createEmptyCustomFontCatalog(0));
		return catalog.fonts;
	}

	function applyCatalog(next: StoredCustomFontCatalog): void {
		if (next.revision < catalog.revision) return;
		if (next.revision === catalog.revision && sameFontIds(next.fonts, catalog.fonts)) return;
		const previousById = new Map(catalog.fonts.map((font) => [font.id, font]));
		const nextIds = new Set(next.fonts.map((font) => font.id));
		const added = next.fonts.filter((font) => !previousById.has(font.id));
		const removedIds = catalog.fonts.filter((font) => !nextIds.has(font.id)).map((font) => font.id);
		catalog = next;
		if (added.length === 0 && removedIds.length === 0) return;
		const change = { fonts: catalog.fonts, added, removedIds };
		for (const listener of listeners) listener(change);
	}

	function initialize(): Promise<readonly StoredCustomFontMetadata[]> {
		initializePromise ??= (async () => {
			unsubscribeStorage = port.subscribe((changes, areaName) => {
				if (areaName !== 'local') return;
				const next = normalizeStoredCustomFontCatalog(changes[CUSTOM_FONT_CATALOG_KEY]?.newValue);
				if (next) applyCatalog(next);
			});
			return refresh();
		})();
		return initializePromise;
	}

	return {
		initialize,
		getFonts: () => catalog.fonts,
		async add(file) {
			await initialize();
			const bytes = await readAndValidateCustomFont(file);
			const descriptor = {
				displayName: getDisplayName(file.name),
				fileName: file.name.trim(),
				format: 'truetype' as const,
				byteLength: bytes.byteLength,
				sha256: await sha256Hex(bytes),
			};
			const reservation = await sendOrThrow(port, { type: 'BEGIN_CUSTOM_FONT_UPLOAD', descriptor });
			const pending = normalizeStoredCustomFontMetadata(reservation.font);
			if (!pending)
				throw new FontUploadError('STORAGE_UNAVAILABLE', 'The browser returned an invalid font reservation.');

			try {
				await port.set({
					[pending.dataKey]: {
						version: CUSTOM_FONT_STORAGE_VERSION,
						encoding: 'base64',
						data: encodeBase64(bytes),
					},
				});
				const committed = await sendOrThrow(port, { type: 'COMMIT_CUSTOM_FONT_UPLOAD', id: pending.id });
				const metadata = normalizeStoredCustomFontMetadata(committed.font);
				if (!metadata)
					throw new FontUploadError('STORAGE_UNAVAILABLE', 'The browser returned invalid font metadata.');
				await refresh();
				return { metadata, bytes };
			} catch (error) {
				await Promise.allSettled([
					port.send({ type: 'ABORT_CUSTOM_FONT_UPLOAD', id: pending.id }),
					port.remove(pending.dataKey),
				]);
				throw mapStorageError(error);
			}
		},
		async remove(id) {
			await initialize();
			await sendOrThrow(port, { type: 'REMOVE_CUSTOM_FONT', id });
			await refresh();
		},
		async loadBytes(id) {
			await initialize();
			const metadata = catalog.fonts.find((font) => font.id === id);
			if (!metadata) throw new FontUploadError('CORRUPT_STORED_FONT', 'This custom font is no longer available.');
			const payload = normalizeStoredCustomFontPayload(await port.get(metadata.dataKey));
			if (!payload)
				throw new FontUploadError('CORRUPT_STORED_FONT', 'A stored custom font is missing or corrupt.');
			const bytes = decodeBase64(payload.data);
			if (bytes.byteLength !== metadata.byteLength || (await sha256Hex(bytes)) !== metadata.sha256) {
				throw new FontUploadError('CORRUPT_STORED_FONT', 'A stored custom font failed its integrity check.');
			}
			validateCustomFontBytes(metadata.fileName, bytes);
			return bytes;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		dispose() {
			unsubscribeStorage?.();
			unsubscribeStorage = undefined;
			listeners.clear();
		},
	};
}

const defaultPort: CustomFontStorePort = {
	get: storageLocalGet,
	set: storageLocalSet,
	remove: storageLocalRemove,
	send: (message) => sendMessageToRuntime<CustomFontStorageResponse>(message),
	subscribe: addStorageChangedListener,
};

async function sendOrThrow(
	port: CustomFontStorePort,
	message: CustomFontStorageMessage
): Promise<CustomFontStorageResponse> {
	const response = await port.send(message);
	if (!response.ok) {
		throw new FontUploadError(
			response.errorCode ?? 'STORAGE_UNAVAILABLE',
			response.error ?? 'Unable to update custom fonts.'
		);
	}
	return response;
}

function mapStorageError(error: unknown): unknown {
	if (error instanceof FontUploadError) return error;
	if (error instanceof DOMException && error.name === 'QuotaExceededError') {
		return new FontUploadError('STORAGE_QUOTA', 'The browser has no storage space available for this font.');
	}
	return new FontUploadError(
		'STORAGE_UNAVAILABLE',
		error instanceof Error ? error.message : 'Unable to persist the custom font.'
	);
}

function getDisplayName(fileName: string): string {
	const stem = fileName
		.trim()
		.replace(/\.[^.]+$/, '')
		.trim();
	return stem || 'Uploaded font';
}

function sameFontIds(left: readonly StoredCustomFontMetadata[], right: readonly StoredCustomFontMetadata[]): boolean {
	return left.length === right.length && left.every((font, index) => font.id === right[index]?.id);
}
