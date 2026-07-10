import { BUNDLED_FONTS, DEFAULT_FONT_ID, type BundledFontEntry, type BundledFontId } from './font-metadata';

export type { BundledFontEntry } from './font-metadata';

export interface FontRegistry {
	getAvailableFonts(): readonly BundledFontEntry[];
	getFontEntry(fontId: BundledFontId): BundledFontEntry | null;
	getPreferredFontEntry(fontId: BundledFontId): BundledFontEntry;
	resolveFontId(fontId: BundledFontId): BundledFontId | null;
}

export function createFontRegistry(): FontRegistry {
	const availableFonts = BUNDLED_FONTS;
	const defaultEntry = availableFonts.find((font) => font.id === DEFAULT_FONT_ID)!;

	function getFontEntry(fontId: BundledFontId): BundledFontEntry | null {
		return availableFonts.find((font) => font.id === fontId) ?? null;
	}

	function getPreferredFontEntry(fontId: BundledFontId): BundledFontEntry {
		return getFontEntry(fontId) ?? defaultEntry;
	}

	return {
		getAvailableFonts: () => availableFonts,
		getFontEntry,
		getPreferredFontEntry,
		resolveFontId: (fontId) => getFontEntry(fontId)?.id ?? null,
	};
}

export { isBundledFontId, isCustomFontId, isFontId, type CustomFontId, type FontId } from './font-id';
