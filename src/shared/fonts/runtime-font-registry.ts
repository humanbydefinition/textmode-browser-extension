import type { CustomFontEntry, CustomFontSummary } from '../../domain/fonts/custom-font-entry';
import { toCustomFontSummary } from '../../domain/fonts/custom-font-entry';
import type { BundledFontEntry } from '../../domain/fonts/font-registry';
import { createFontRegistry } from '../../domain/fonts/font-registry';
import {
	createCustomFontId,
	isBundledFontId,
	isCustomFontId,
	type CustomFontId,
	type FontId,
} from '../../domain/fonts/font-id';
import { FontUploadError } from '../errors/errors';
import { getExtensionAssetUrl } from '../browser/browser-api';
import { availableFontAssetPaths } from '../config/available-font-assets';

export const CUSTOM_FONT_MAX_BYTES = 10 * 1024 * 1024;

export interface RuntimeFontRegistry {
	getPreferredFontEntry(fontId: FontId): BundledFontEntry | CustomFontEntry | null;
	getAvailableFonts(): readonly BundledFontEntry[];
	resolveFontId(fontId: FontId): FontId | null;
	getFontAssetUrl(fontId: FontId): string | null;
	getCustomFonts(): readonly CustomFontEntry[];
	getAllFonts(): readonly (BundledFontEntry | CustomFontEntry)[];
	addCustomFont(file: File): Promise<CustomFontEntry>;
	removeCustomFont(id: CustomFontId): void;
	getCustomFontUrl(id: CustomFontId): string | null;
	toCustomFontSummaries(): CustomFontSummary[];
}

export function createRuntimeFontRegistry(
	fontAssetPaths: readonly string[],
	resolveAssetUrl: (assetPath: string) => string = getExtensionAssetUrl
): RuntimeFontRegistry {
	const registry = createFontRegistry(fontAssetPaths);
	const customFonts = new Map<CustomFontId, { entry: CustomFontEntry; blobUrl: string }>();

	function getCustomFonts(): CustomFontEntry[] {
		return [...customFonts.values()].map(({ entry }) => entry).sort((a, b) => a.uploadedAt - b.uploadedAt);
	}

	return {
		getPreferredFontEntry: (fontId) => {
			if (isCustomFontId(fontId)) {
				return customFonts.get(fontId)?.entry ?? null;
			}
			return registry.getPreferredFontEntry(fontId);
		},
		getAvailableFonts: () => registry.getAvailableFonts(),
		resolveFontId: (fontId) => {
			if (isCustomFontId(fontId)) {
				return customFonts.has(fontId) ? fontId : null;
			}
			return isBundledFontId(fontId) ? registry.resolveFontId(fontId) : null;
		},
		getFontAssetUrl: (fontId) => {
			if (isCustomFontId(fontId)) {
				return customFonts.get(fontId)?.blobUrl ?? null;
			}
			const entry = registry.getFontEntry(fontId);
			return entry ? resolveAssetUrl(entry.assetPath) : null;
		},
		getCustomFonts,
		getAllFonts: () => [...getCustomFonts(), ...registry.getAvailableFonts()],
		addCustomFont: async (file) => {
			await validateCustomFontFile(file);
			const id = createCustomFontId();
			const entry: CustomFontEntry = {
				id,
				displayName: getDisplayName(file.name),
				fileName: file.name,
				uploadedAt: Date.now(),
			};
			customFonts.set(id, {
				entry,
				blobUrl: URL.createObjectURL(file),
			});
			return entry;
		},
		removeCustomFont: (id) => {
			const font = customFonts.get(id);
			if (!font) return;
			URL.revokeObjectURL(font.blobUrl);
			customFonts.delete(id);
		},
		getCustomFontUrl: (id) => customFonts.get(id)?.blobUrl ?? null,
		toCustomFontSummaries: () => getCustomFonts().map(toCustomFontSummary),
	};
}

const runtimeFontRegistry = createRuntimeFontRegistry(availableFontAssetPaths);

export function getPreferredFontEntry(fontId: FontId): BundledFontEntry | CustomFontEntry | null {
	return runtimeFontRegistry.getPreferredFontEntry(fontId);
}

export function getAvailableFonts(): readonly BundledFontEntry[] {
	return runtimeFontRegistry.getAvailableFonts();
}

export function resolveFontId(fontId: FontId): FontId | null {
	return runtimeFontRegistry.resolveFontId(fontId);
}

export function getFontAssetUrl(fontId: FontId): string | null {
	return runtimeFontRegistry.getFontAssetUrl(fontId);
}

export function getCustomFonts(): readonly CustomFontEntry[] {
	return runtimeFontRegistry.getCustomFonts();
}

export function getAllFonts(): readonly (BundledFontEntry | CustomFontEntry)[] {
	return runtimeFontRegistry.getAllFonts();
}

export function addCustomFont(file: File): Promise<CustomFontEntry> {
	return runtimeFontRegistry.addCustomFont(file);
}

export function removeCustomFont(id: CustomFontId): void {
	runtimeFontRegistry.removeCustomFont(id);
}

export function getCustomFontUrl(id: CustomFontId): string | null {
	return runtimeFontRegistry.getCustomFontUrl(id);
}

export function toCustomFontSummaries(): CustomFontSummary[] {
	return runtimeFontRegistry.toCustomFontSummaries();
}

async function validateCustomFontFile(file: File): Promise<void> {
	const lowerName = file.name.toLowerCase();
	if (lowerName.endsWith('.woff2')) {
		throw new FontUploadError('INVALID_TYPE', 'WOFF2 fonts are not supported. Please upload a .ttf or .otf file.');
	}
	if (!lowerName.endsWith('.ttf') && !lowerName.endsWith('.otf')) {
		throw new FontUploadError('INVALID_TYPE', 'Please upload a .ttf or .otf font file.');
	}
	if (file.size > CUSTOM_FONT_MAX_BYTES) {
		throw new FontUploadError('TOO_LARGE', 'Font file is too large. Please upload a font under 10 MB.');
	}

	const signature = new Uint8Array(await readBlobBytes(file.slice(0, 4)));
	const isTrueTypeSfnt =
		signature[0] === 0x00 && signature[1] === 0x01 && signature[2] === 0x00 && signature[3] === 0x00;
	const isCffOpenType =
		signature[0] === 0x4f && signature[1] === 0x54 && signature[2] === 0x54 && signature[3] === 0x4f;
	if (isCffOpenType) {
		throw new FontUploadError(
			'INVALID_SIGNATURE',
			'CFF-based OTF fonts are not supported yet. Please upload a TrueType .ttf or .otf file.'
		);
	}
	if (!isTrueTypeSfnt) {
		throw new FontUploadError('INVALID_SIGNATURE', 'This does not look like a supported TrueType font file.');
	}
}

function readBlobBytes(blob: Blob): Promise<ArrayBuffer> {
	if (typeof blob.arrayBuffer === 'function') {
		return blob.arrayBuffer();
	}

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('load', () => {
			if (reader.result instanceof ArrayBuffer) {
				resolve(reader.result);
			} else {
				reject(new Error('Unable to read font file bytes.'));
			}
		});
		reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read font file bytes.')));
		reader.readAsArrayBuffer(blob);
	});
}

function getDisplayName(fileName: string): string {
	const trimmed = fileName.trim();
	const stem = trimmed.replace(/\.[^.]+$/, '').trim();
	return stem || 'Uploaded font';
}
