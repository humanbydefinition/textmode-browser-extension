import { isCustomFontId, type CustomFontId } from './font-id';

export const CUSTOM_FONT_STORAGE_VERSION = 1;
export const CUSTOM_FONT_CATALOG_KEY = 'custom-fonts:catalog:v1';
export const CUSTOM_FONT_DATA_KEY_PREFIX = 'custom-font:data:v1:';
export const CUSTOM_FONT_MAX_COUNT = 10;
export const CUSTOM_FONT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const CUSTOM_FONT_UPLOAD_RESERVATION_MAX_AGE_MS = 10 * 60 * 1000;

export type StoredCustomFontFormat = 'truetype';

export interface StoredCustomFontMetadata {
	id: CustomFontId;
	displayName: string;
	fileName: string;
	format: StoredCustomFontFormat;
	uploadedAt: number;
	byteLength: number;
	sha256: string;
	dataKey: string;
}

export interface PendingCustomFontUpload extends StoredCustomFontMetadata {
	reservedAt: number;
}

export interface StoredCustomFontCatalog {
	version: typeof CUSTOM_FONT_STORAGE_VERSION;
	revision: number;
	updatedAt: number;
	fonts: StoredCustomFontMetadata[];
	pendingUploads: PendingCustomFontUpload[];
	garbageDataKeys: string[];
}

export interface StoredCustomFontPayload {
	version: typeof CUSTOM_FONT_STORAGE_VERSION;
	encoding: 'base64';
	data: string;
}

export interface CustomFontUploadDescriptor {
	displayName: string;
	fileName: string;
	format: StoredCustomFontFormat;
	byteLength: number;
	sha256: string;
}

export function createEmptyCustomFontCatalog(now = Date.now()): StoredCustomFontCatalog {
	return {
		version: CUSTOM_FONT_STORAGE_VERSION,
		revision: 0,
		updatedAt: now,
		fonts: [],
		pendingUploads: [],
		garbageDataKeys: [],
	};
}

export function createCustomFontDataKey(id: CustomFontId): string {
	return `${CUSTOM_FONT_DATA_KEY_PREFIX}${id.slice('custom:'.length)}`;
}

export function normalizeStoredCustomFontCatalog(value: unknown): StoredCustomFontCatalog | null {
	if (!isRecord(value) || value.version !== CUSTOM_FONT_STORAGE_VERSION) return null;
	if (!isFiniteNonNegativeInteger(value.revision) || !isFiniteNumber(value.updatedAt)) return null;
	if (!Array.isArray(value.fonts) || !Array.isArray(value.pendingUploads) || !Array.isArray(value.garbageDataKeys)) {
		return null;
	}

	const fonts = value.fonts.map(normalizeStoredCustomFontMetadata);
	const pendingUploads = value.pendingUploads.map(normalizePendingCustomFontUpload);
	if (fonts.some((font) => !font) || pendingUploads.some((font) => !font)) return null;
	if (!value.garbageDataKeys.every(isCustomFontDataKey)) return null;

	const normalizedFonts = fonts as StoredCustomFontMetadata[];
	const normalizedPending = pendingUploads as PendingCustomFontUpload[];
	const ids = [...normalizedFonts, ...normalizedPending].map((font) => font.id);
	if (new Set(ids).size !== ids.length) return null;

	return {
		version: CUSTOM_FONT_STORAGE_VERSION,
		revision: value.revision,
		updatedAt: value.updatedAt,
		fonts: normalizedFonts,
		pendingUploads: normalizedPending,
		garbageDataKeys: [...new Set(value.garbageDataKeys)],
	};
}

export function normalizeStoredCustomFontMetadata(value: unknown): StoredCustomFontMetadata | null {
	if (!isRecord(value) || !isCustomFontId(value.id)) return null;
	if (!isNonEmptyString(value.displayName) || !isNonEmptyString(value.fileName)) return null;
	if (value.format !== 'truetype') return null;
	if (!isFiniteNumber(value.uploadedAt) || !isFiniteNonNegativeInteger(value.byteLength)) return null;
	if (!isSha256(value.sha256) || !isCustomFontDataKey(value.dataKey)) return null;
	if (value.dataKey !== createCustomFontDataKey(value.id)) return null;

	return {
		id: value.id,
		displayName: value.displayName.trim(),
		fileName: value.fileName.trim(),
		format: value.format,
		uploadedAt: value.uploadedAt,
		byteLength: value.byteLength,
		sha256: value.sha256.toLowerCase(),
		dataKey: value.dataKey,
	};
}

export function normalizeStoredCustomFontPayload(value: unknown): StoredCustomFontPayload | null {
	if (
		!isRecord(value) ||
		value.version !== CUSTOM_FONT_STORAGE_VERSION ||
		value.encoding !== 'base64' ||
		typeof value.data !== 'string'
	) {
		return null;
	}
	return { version: CUSTOM_FONT_STORAGE_VERSION, encoding: 'base64', data: value.data };
}

export function normalizeCustomFontUploadDescriptor(value: unknown): CustomFontUploadDescriptor | null {
	if (!isRecord(value)) return null;
	if (!isNonEmptyString(value.displayName) || !isNonEmptyString(value.fileName)) return null;
	if (value.format !== 'truetype') return null;
	if (!isFiniteNonNegativeInteger(value.byteLength) || !isSha256(value.sha256)) return null;
	return {
		displayName: value.displayName.trim(),
		fileName: value.fileName.trim(),
		format: value.format,
		byteLength: value.byteLength,
		sha256: value.sha256.toLowerCase(),
	};
}

export function isCustomFontDataKey(value: unknown): value is string {
	return typeof value === 'string' && /^custom-font:data:v1:[0-9a-f-]{36}$/i.test(value);
}

function normalizePendingCustomFontUpload(value: unknown): PendingCustomFontUpload | null {
	const metadata = normalizeStoredCustomFontMetadata(value);
	if (!metadata || !isRecord(value) || !isFiniteNumber(value.reservedAt)) return null;
	return { ...metadata, reservedAt: value.reservedAt };
}

function isSha256(value: unknown): value is string {
	return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
	return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
