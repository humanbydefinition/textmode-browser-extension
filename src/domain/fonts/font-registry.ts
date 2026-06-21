import { BUNDLED_FONTS, DEFAULT_FONT_ID, type BundledFontEntry, type BundledFontId } from './font-metadata';

export type { BundledFontEntry } from './font-metadata';

export interface FontRegistry {
	getAvailableFonts(): readonly BundledFontEntry[];
	getFontEntry(fontId: BundledFontId): BundledFontEntry | null;
	getPreferredFontEntry(fontId: BundledFontId): BundledFontEntry | null;
	resolveFontId(fontId: BundledFontId): BundledFontId | null;
}

export function createFontRegistry(fontAssetPaths: readonly string[]): FontRegistry {
	const availableAssetPathSet = new Set(fontAssetPaths);
	const availableFonts = BUNDLED_FONTS.filter((font) => availableAssetPathSet.has(font.assetPath));
	const fallbackFont = availableFonts.find((font) => font.id === DEFAULT_FONT_ID) ?? availableFonts[0] ?? null;

	function getFontEntry(fontId: BundledFontId): BundledFontEntry | null {
		return availableFonts.find((font) => font.id === fontId) ?? null;
	}

	function getPreferredFontEntry(fontId: BundledFontId): BundledFontEntry | null {
		return getFontEntry(fontId) ?? fallbackFont;
	}

	return {
		getAvailableFonts: () => availableFonts,
		getFontEntry,
		getPreferredFontEntry,
		resolveFontId: (fontId) => getPreferredFontEntry(fontId)?.id ?? null,
	};
}

export { isBundledFontId, isCustomFontId, isFontId, type CustomFontId, type FontId } from './font-id';
