import type { BundledFontEntry } from '../../domain/fonts/font-registry';
import { createFontRegistry } from '../../domain/fonts/font-registry';
import type { BundledFontId } from '../../domain/overlay/overlay-settings';
import { getExtensionAssetUrl } from '../browser/browser-api';
import { availableFontAssetPaths } from '../config/available-font-assets';

export interface RuntimeFontRegistry {
	getPreferredFontEntry(fontId: BundledFontId): BundledFontEntry | null;
	getAvailableFonts(): readonly BundledFontEntry[];
	resolveFontId(fontId: BundledFontId): BundledFontId | null;
	getFontAssetUrl(fontId: BundledFontId): string | null;
}

export function createRuntimeFontRegistry(
	fontAssetPaths: readonly string[],
	resolveAssetUrl: (assetPath: string) => string = getExtensionAssetUrl
): RuntimeFontRegistry {
	const registry = createFontRegistry(fontAssetPaths);
	return {
		getPreferredFontEntry: (fontId) => registry.getPreferredFontEntry(fontId),
		getAvailableFonts: () => registry.getAvailableFonts(),
		resolveFontId: (fontId) => registry.resolveFontId(fontId),
		getFontAssetUrl: (fontId) => {
			const entry = registry.getFontEntry(fontId);
			return entry ? resolveAssetUrl(entry.assetPath) : null;
		},
	};
}

const runtimeFontRegistry = createRuntimeFontRegistry(availableFontAssetPaths);

export function getPreferredFontEntry(fontId: BundledFontId): BundledFontEntry | null {
	return runtimeFontRegistry.getPreferredFontEntry(fontId);
}

export function getAvailableFonts(): readonly BundledFontEntry[] {
	return runtimeFontRegistry.getAvailableFonts();
}

export function resolveFontId(fontId: BundledFontId): BundledFontId | null {
	return runtimeFontRegistry.resolveFontId(fontId);
}

export function getFontAssetUrl(fontId: BundledFontId): string | null {
	return runtimeFontRegistry.getFontAssetUrl(fontId);
}
