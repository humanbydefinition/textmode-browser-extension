import { DEFAULT_FONT_ID, type BundledFontId } from '../overlay/overlay-settings';
import { availableFontAssetPaths } from '../../shared/config/available-font-assets';

export type BundledFontEntry = {
	id: BundledFontId;
	displayName: string;
	author: string;
	authorUrl: string;
	sourceUrl: string;
	assetPath: string;
	cssFontFamily: string;
};

type FontMeta = {
	author: string;
	authorUrl: string;
	sourceUrl: string;
	assetPath: string;
	cssFontFamily: string;
};

const UNSCII_META: Pick<FontMeta, 'author' | 'authorUrl' | 'sourceUrl'> = {
	author: 'Viznut',
	authorUrl: 'https://viznut.fi/',
	sourceUrl: 'https://viznut.fi/unscii/',
};

const GLYPH_SOURCE_META: Record<BundledFontId, FontMeta> = {
	chunky: {
		assetPath: 'fonts/CHUNKY.ttf',
		cssFontFamily: 'Font-Chunky',
		author: 'batfeula',
		authorUrl: 'https://batfeula.neocities.org/',
		sourceUrl: 'https://batfeula.itch.io/chunky',
	},
	cultistScript: {
		assetPath: 'fonts/CultistScript.ttf',
		cssFontFamily: 'Font-CultistScript',
		author: 'littlebitspace',
		authorUrl: 'https://littlebitspace.com/',
		sourceUrl: 'https://littlebitspace.com/resources/',
	},
	frogblock: {
		assetPath: 'fonts/FROGBLOCK-V2.1.ttf',
		cssFontFamily: 'Font-Frogblock',
		author: 'Polyducks',
		authorUrl: 'https://polyducks.co.uk/',
		sourceUrl: 'https://polyducks.itch.io/frogblock',
	},
	ursafont: {
		assetPath: 'fonts/UrsaFont.woff',
		cssFontFamily: 'Font-Ursa',
		author: 'UrsaFrank',
		authorUrl: 'https://www.stormrooster.com/',
		sourceUrl: 'https://ursafrank.itch.io/ursafont',
	},
	atascii: {
		assetPath: 'fonts/atascii.ttf',
		cssFontFamily: 'Font-Atascii',
		author: 'Damian Vila',
		authorUrl: 'https://codeberg.org/Dmian/font-atascii',
		sourceUrl: 'https://damianvila.com/',
	},
	bescii: {
		assetPath: 'fonts/Bescii-Mono.ttf',
		cssFontFamily: 'Font-Bescii-Mono',
		author: 'Damian Vila',
		authorUrl: 'https://codeberg.org/Dmian/font-bescii',
		sourceUrl: 'https://damianvila.com/',
	},
	c64ProMono: {
		assetPath: 'fonts/C64_Pro_Mono-STYLE.ttf',
		cssFontFamily: 'Font-C64-Pro-Mono',
		author: 'Style',
		authorUrl: 'https://style64.org/',
		sourceUrl: 'https://style64.org/c64-truetype',
	},
	unscii8: {
		assetPath: 'fonts/unscii-8.ttf',
		cssFontFamily: 'Font-Unscii-8',
		...UNSCII_META,
	},
	unscii8Alt: {
		assetPath: 'fonts/unscii-8-alt.ttf',
		cssFontFamily: 'Font-Unscii-8-Alt',
		...UNSCII_META,
	},
	unscii8Mcr: {
		assetPath: 'fonts/unscii-8-mcr.ttf',
		cssFontFamily: 'Font-Unscii-8-Mcr',
		...UNSCII_META,
	},
	unscii8Thin: {
		assetPath: 'fonts/unscii-8-thin.ttf',
		cssFontFamily: 'Font-Unscii-8-Thin',
		...UNSCII_META,
	},
	unscii8Fantasy: {
		assetPath: 'fonts/unscii-8-fantasy.ttf',
		cssFontFamily: 'Font-Unscii-8-Fantasy',
		...UNSCII_META,
	},
	cpc464: {
		assetPath: 'fonts/cpc464.ttf',
		cssFontFamily: 'Font-CPC464',
		author: 'Damian Vila',
		authorUrl: 'https://codeberg.org/Dmian/font-cpc464',
		sourceUrl: 'https://damianvila.com/',
	},
	rook: {
		assetPath: 'fonts/Rook.ttf',
		cssFontFamily: 'Font-Rook',
		author: 'Funky Tiger Highsaturn',
		authorUrl: 'https://autojunkio.itch.io/',
		sourceUrl: 'https://outer-spec.itch.io/rook',
	},
	dungeonmode: {
		assetPath: 'fonts/dungeonmode.ttf',
		cssFontFamily: 'Font-Dungeonmode',
		author: 'datagoblin',
		authorUrl: 'https://datagoblin.itch.io/',
		sourceUrl: 'https://datagoblin.itch.io/dungeonmode',
	},
	publicPixel: {
		assetPath: 'fonts/PublicPixel.ttf',
		cssFontFamily: 'Font-PublicPixel',
		author: 'GGBotNet',
		authorUrl: 'https://ggbot.itch.io/',
		sourceUrl: 'https://ggbot.itch.io/public-pixel-font',
	},
	myceliumOG: {
		assetPath: 'fonts/MyceliumOG.ttf',
		cssFontFamily: 'Font-MyceliumOG',
		author: 'littlebitspace',
		authorUrl: 'https://littlebitspace.com/',
		sourceUrl: 'https://littlebitspace.com/resources/',
	},
	t64: {
		assetPath: 'fonts/T64.ttf',
		cssFontFamily: 'Font-T64',
		author: 'littlebitspace',
		authorUrl: 'https://littlebitspace.com/',
		sourceUrl: 'https://littlebitspace.com/resources/',
	},
};

const AVAILABLE_FONTS: readonly BundledFontEntry[] = Object.entries(GLYPH_SOURCE_META).map(([id, meta]) => ({
	id: id as BundledFontId,
	displayName: idToDisplayName(id as BundledFontId),
	...meta,
}));

export interface FontRegistry {
	getAvailableFonts(): readonly BundledFontEntry[];
	getFontEntry(fontId: BundledFontId): BundledFontEntry | null;
	getPreferredFontEntry(fontId: BundledFontId): BundledFontEntry | null;
	resolveFontId(fontId: BundledFontId): BundledFontId | null;
	getFontAssetUrl(fontId: BundledFontId): string | null;
}

export function createFontRegistry(fontAssetPaths: readonly string[]): FontRegistry {
	const availableAssetPathSet = new Set(fontAssetPaths);
	const availableFonts = AVAILABLE_FONTS.filter((font) => availableAssetPathSet.has(font.assetPath));
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
		getFontAssetUrl: (fontId) => {
			const entry = getFontEntry(fontId);
			return entry ? chrome.runtime.getURL(entry.assetPath) : null;
		},
	};
}

const fontRegistry = createFontRegistry(availableFontAssetPaths);

function idToDisplayName(id: BundledFontId): string {
	const displayNames: Record<BundledFontId, string> = {
		chunky: 'CHUNKY',
		cultistScript: 'Cultist Script',
		frogblock: 'FROGBLOCK',
		ursafont: 'UrsaFont',
		atascii: 'ATASCII',
		bescii: 'BESCII',
		c64ProMono: 'C64 Pro Mono',
		unscii8: 'UNSCII 8',
		unscii8Alt: 'UNSCII 8 Alt',
		unscii8Mcr: 'UNSCII 8 MCR',
		unscii8Thin: 'UNSCII 8 Thin',
		unscii8Fantasy: 'UNSCII 8 Fantasy',
		cpc464: 'CPC464',
		rook: 'Rook',
		dungeonmode: 'DUNGEON.mode',
		publicPixel: 'Public Pixel',
		myceliumOG: 'Mycelium OG',
		t64: 'T64',
	};
	return displayNames[id];
}

export function getFontEntry(fontId: BundledFontId): BundledFontEntry | null {
	return fontRegistry.getFontEntry(fontId);
}

export function getPreferredFontEntry(fontId: BundledFontId): BundledFontEntry | null {
	return fontRegistry.getPreferredFontEntry(fontId);
}

export function getAvailableFonts(): readonly BundledFontEntry[] {
	return fontRegistry.getAvailableFonts();
}

export function resolveFontId(fontId: BundledFontId): BundledFontId | null {
	return fontRegistry.resolveFontId(fontId);
}

export function getFontAssetUrl(fontId: BundledFontId): string | null {
	return fontRegistry.getFontAssetUrl(fontId);
}

export { isBundledFontId } from '../overlay/overlay-settings';
