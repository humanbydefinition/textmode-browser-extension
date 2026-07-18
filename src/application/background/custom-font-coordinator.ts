import {
	CUSTOM_FONT_CATALOG_KEY,
	CUSTOM_FONT_MAX_COUNT,
	CUSTOM_FONT_MAX_TOTAL_BYTES,
	CUSTOM_FONT_STORAGE_VERSION,
	CUSTOM_FONT_UPLOAD_RESERVATION_MAX_AGE_MS,
	createCustomFontDataKey,
	createEmptyCustomFontCatalog,
	normalizeCustomFontUploadDescriptor,
	normalizeStoredCustomFontCatalog,
	normalizeStoredCustomFontPayload,
	type PendingCustomFontUpload,
	type StoredCustomFontCatalog,
	type StoredCustomFontMetadata,
} from '../../domain/fonts/custom-font-storage';
import type { CustomFontId } from '../../domain/fonts/font-id';
import { FontUploadError, toUserMessage } from '../../shared/errors/errors';
import { decodeBase64, sha256Hex, validateCustomFontBytes } from '../../shared/fonts/font-binary';
import { CUSTOM_FONT_MAX_BYTES } from '../../shared/fonts/runtime-font-registry-constants';
import type { CustomFontStorageMessage, CustomFontStorageResponse } from '../../shared/messaging/messages';
import { isCustomFontStorageMessage } from '../../shared/messaging/messages';

export interface CustomFontCoordinatorStoragePort {
	get<TValue>(key: string): Promise<TValue | undefined>;
	set(record: Record<string, unknown>): Promise<void>;
	remove(key: string): Promise<void>;
}

export interface CustomFontCoordinator {
	handle(message: CustomFontStorageMessage): Promise<CustomFontStorageResponse>;
	cleanup(): Promise<void>;
}

export function createCustomFontCoordinator(
	storage: CustomFontCoordinatorStoragePort,
	now: () => number = Date.now
): CustomFontCoordinator {
	let mutationQueue = Promise.resolve();

	function enqueue<T>(mutation: () => Promise<T>): Promise<T> {
		const result = mutationQueue.then(mutation, mutation);
		mutationQueue = result.then(
			() => undefined,
			() => undefined
		);
		return result;
	}

	async function handleMutation(message: CustomFontStorageMessage): Promise<CustomFontStorageResponse> {
		try {
			const catalog = await prepareCatalog(storage, now());
			switch (message.type) {
				case 'BEGIN_CUSTOM_FONT_UPLOAD':
					return { ok: true, font: await beginUpload(storage, catalog, message.descriptor, now()) };
				case 'COMMIT_CUSTOM_FONT_UPLOAD':
					return { ok: true, font: await commitUpload(storage, catalog, message.id, now()) };
				case 'ABORT_CUSTOM_FONT_UPLOAD':
					await abortUpload(storage, catalog, message.id, now());
					return { ok: true };
				case 'REMOVE_CUSTOM_FONT':
					await removeFont(storage, catalog, message.id, now());
					return { ok: true };
			}
		} catch (error) {
			return {
				ok: false,
				error: toUserMessage(error),
				...(error instanceof FontUploadError ? { errorCode: error.code } : {}),
			};
		}
	}

	return {
		handle: (message) => enqueue(() => handleMutation(message)),
		cleanup: () => enqueue(async () => void (await prepareCatalog(storage, now()))),
	};
}

export function attachCustomFontCoordinatorListener(
	coordinator: CustomFontCoordinator,
	addListener: (
		listener: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => true | void
	) => void
): void {
	addListener((message, _sender, sendResponse) => {
		if (!isCustomFontStorageMessage(message)) return;
		void coordinator.handle(message).then(sendResponse);
		return true;
	});
}

async function beginUpload(
	storage: CustomFontCoordinatorStoragePort,
	catalog: StoredCustomFontCatalog,
	descriptorValue: unknown,
	timestamp: number
): Promise<StoredCustomFontMetadata> {
	const descriptor = normalizeCustomFontUploadDescriptor(descriptorValue);
	if (!descriptor) throw new FontUploadError('INVALID_TYPE', 'Invalid custom font upload metadata.');
	if (descriptor.byteLength > CUSTOM_FONT_MAX_BYTES) {
		throw new FontUploadError('TOO_LARGE', 'Font file is too large. Please upload a font under 10 MB.');
	}
	if (catalog.fonts.length + catalog.pendingUploads.length >= CUSTOM_FONT_MAX_COUNT) {
		throw new FontUploadError('COUNT_LIMIT', `You can store up to ${CUSTOM_FONT_MAX_COUNT} custom fonts.`);
	}
	const totalBytes = [...catalog.fonts, ...catalog.pendingUploads].reduce((sum, font) => sum + font.byteLength, 0);
	if (totalBytes + descriptor.byteLength > CUSTOM_FONT_MAX_TOTAL_BYTES) {
		throw new FontUploadError('TOTAL_SIZE_LIMIT', 'Custom fonts can use up to 50 MB in total.');
	}

	const id = `custom:${crypto.randomUUID()}` as CustomFontId;
	const pending: PendingCustomFontUpload = {
		id,
		...descriptor,
		uploadedAt: timestamp,
		reservedAt: timestamp,
		dataKey: createCustomFontDataKey(id),
	};
	await saveCatalog(storage, { ...catalog, pendingUploads: [...catalog.pendingUploads, pending] }, timestamp);
	return pending;
}

async function commitUpload(
	storage: CustomFontCoordinatorStoragePort,
	catalog: StoredCustomFontCatalog,
	id: CustomFontId,
	timestamp: number
): Promise<StoredCustomFontMetadata> {
	const pending = catalog.pendingUploads.find((font) => font.id === id);
	if (!pending) throw new FontUploadError('STORAGE_UNAVAILABLE', 'The custom font upload reservation expired.');
	const payload = normalizeStoredCustomFontPayload(await storage.get(pending.dataKey));
	if (!payload) throw new FontUploadError('CORRUPT_STORED_FONT', 'The persisted custom font data is invalid.');
	const bytes = decodeBase64(payload.data);
	if (bytes.byteLength !== pending.byteLength || (await sha256Hex(bytes)) !== pending.sha256) {
		throw new FontUploadError('CORRUPT_STORED_FONT', 'The persisted custom font failed its integrity check.');
	}
	validateCustomFontBytes(pending.fileName, bytes);

	const metadata: StoredCustomFontMetadata = { ...pending };
	delete (metadata as Partial<PendingCustomFontUpload>).reservedAt;
	await saveCatalog(
		storage,
		{
			...catalog,
			fonts: [...catalog.fonts, metadata],
			pendingUploads: catalog.pendingUploads.filter((font) => font.id !== id),
		},
		timestamp
	);
	return metadata;
}

async function abortUpload(
	storage: CustomFontCoordinatorStoragePort,
	catalog: StoredCustomFontCatalog,
	id: CustomFontId,
	timestamp: number
): Promise<void> {
	const pending = catalog.pendingUploads.find((font) => font.id === id);
	if (!pending) return;
	await saveCatalog(
		storage,
		{
			...catalog,
			pendingUploads: catalog.pendingUploads.filter((font) => font.id !== id),
			garbageDataKeys: [...catalog.garbageDataKeys, pending.dataKey],
		},
		timestamp
	);
	await prepareCatalog(storage, timestamp);
}

async function removeFont(
	storage: CustomFontCoordinatorStoragePort,
	catalog: StoredCustomFontCatalog,
	id: CustomFontId,
	timestamp: number
): Promise<void> {
	const font = catalog.fonts.find((entry) => entry.id === id);
	if (!font) return;
	await saveCatalog(
		storage,
		{
			...catalog,
			fonts: catalog.fonts.filter((entry) => entry.id !== id),
			garbageDataKeys: [...catalog.garbageDataKeys, font.dataKey],
		},
		timestamp
	);
	await prepareCatalog(storage, timestamp);
}

async function prepareCatalog(
	storage: CustomFontCoordinatorStoragePort,
	timestamp: number
): Promise<StoredCustomFontCatalog> {
	const storedCatalog = await storage.get(CUSTOM_FONT_CATALOG_KEY);
	const normalizedCatalog = normalizeStoredCustomFontCatalog(storedCatalog);
	if (storedCatalog !== undefined && !normalizedCatalog) {
		throw new FontUploadError(
			'STORAGE_UNAVAILABLE',
			'The custom font catalog uses an unsupported or invalid storage version.'
		);
	}
	let catalog = normalizedCatalog ?? createEmptyCustomFontCatalog(timestamp);
	const expired = catalog.pendingUploads.filter(
		(font) => timestamp - font.reservedAt > CUSTOM_FONT_UPLOAD_RESERVATION_MAX_AGE_MS
	);
	if (expired.length > 0) {
		catalog = await saveCatalog(
			storage,
			{
				...catalog,
				pendingUploads: catalog.pendingUploads.filter((font) => !expired.some(({ id }) => id === font.id)),
				garbageDataKeys: [...catalog.garbageDataKeys, ...expired.map((font) => font.dataKey)],
			},
			timestamp
		);
	}

	if (catalog.garbageDataKeys.length === 0) return catalog;
	const remaining: string[] = [];
	for (const dataKey of catalog.garbageDataKeys) {
		try {
			await storage.remove(dataKey);
		} catch {
			remaining.push(dataKey);
		}
	}
	if (remaining.length !== catalog.garbageDataKeys.length) {
		catalog = await saveCatalog(storage, { ...catalog, garbageDataKeys: remaining }, timestamp);
	}
	return catalog;
}

async function saveCatalog(
	storage: CustomFontCoordinatorStoragePort,
	catalog: StoredCustomFontCatalog,
	timestamp: number
): Promise<StoredCustomFontCatalog> {
	const next: StoredCustomFontCatalog = {
		...catalog,
		version: CUSTOM_FONT_STORAGE_VERSION,
		revision: catalog.revision + 1,
		updatedAt: timestamp,
	};
	try {
		await storage.set({ [CUSTOM_FONT_CATALOG_KEY]: next });
	} catch (error) {
		if (error instanceof DOMException && error.name === 'QuotaExceededError') {
			throw new FontUploadError('STORAGE_QUOTA', 'The browser has no storage space available for this font.');
		}
		throw new FontUploadError('STORAGE_UNAVAILABLE', `Unable to save custom fonts: ${toUserMessage(error)}`);
	}
	return next;
}
