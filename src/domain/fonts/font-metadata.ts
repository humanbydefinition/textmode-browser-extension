type FontMeta = {
	displayName: string;
	author: string;
	authorUrl: string;
	sourceUrl: string;
	assetPath: string;
	cssFontFamily: string;
};

export const BUNDLED_FONT_METADATA = {
	ursafont: {
		displayName: 'UrsaFont',
		assetPath: 'fonts/UrsaFont.ttf',
		cssFontFamily: 'Font-Ursa',
		author: 'UrsaFrank',
		authorUrl: 'https://www.stormrooster.com/',
		sourceUrl: 'https://ursafrank.itch.io/ursafont',
	},
	atascii: {
		displayName: 'ATASCII',
		assetPath: 'fonts/atascii.ttf',
		cssFontFamily: 'Font-Atascii',
		author: 'Damian Vila',
		authorUrl: 'https://codeberg.org/Dmian/font-atascii',
		sourceUrl: 'https://damianvila.com/',
	},
	bescii: {
		displayName: 'BESCII',
		assetPath: 'fonts/Bescii-Mono.ttf',
		cssFontFamily: 'Font-Bescii-Mono',
		author: 'Damian Vila',
		authorUrl: 'https://codeberg.org/Dmian/font-bescii',
		sourceUrl: 'https://damianvila.com/',
	},
	unscii8: {
		displayName: 'UNSCII 8',
		assetPath: 'fonts/unscii-8.ttf',
		cssFontFamily: 'Font-Unscii-8',
		author: 'Viznut',
		authorUrl: 'https://viznut.fi/',
		sourceUrl: 'https://viznut.fi/unscii/',
	},
	unscii8Alt: {
		displayName: 'UNSCII 8 Alt',
		assetPath: 'fonts/unscii-8-alt.ttf',
		cssFontFamily: 'Font-Unscii-8-Alt',
		author: 'Viznut',
		authorUrl: 'https://viznut.fi/',
		sourceUrl: 'https://viznut.fi/unscii/',
	},
	unscii8Mcr: {
		displayName: 'UNSCII 8 MCR',
		assetPath: 'fonts/unscii-8-mcr.ttf',
		cssFontFamily: 'Font-Unscii-8-Mcr',
		author: 'Viznut',
		authorUrl: 'https://viznut.fi/',
		sourceUrl: 'https://viznut.fi/unscii/',
	},
	unscii8Thin: {
		displayName: 'UNSCII 8 Thin',
		assetPath: 'fonts/unscii-8-thin.ttf',
		cssFontFamily: 'Font-Unscii-8-Thin',
		author: 'Viznut',
		authorUrl: 'https://viznut.fi/',
		sourceUrl: 'https://viznut.fi/unscii/',
	},
	unscii8Fantasy: {
		displayName: 'UNSCII 8 Fantasy',
		assetPath: 'fonts/unscii-8-fantasy.ttf',
		cssFontFamily: 'Font-Unscii-8-Fantasy',
		author: 'Viznut',
		authorUrl: 'https://viznut.fi/',
		sourceUrl: 'https://viznut.fi/unscii/',
	},
	cpc464: {
		displayName: 'CPC464',
		assetPath: 'fonts/cpc464.ttf',
		cssFontFamily: 'Font-CPC464',
		author: 'Damian Vila',
		authorUrl: 'https://codeberg.org/Dmian/font-cpc464',
		sourceUrl: 'https://damianvila.com/',
	},
	dungeonmode: {
		displayName: 'DUNGEON.mode',
		assetPath: 'fonts/dungeonmode.ttf',
		cssFontFamily: 'Font-Dungeonmode',
		author: 'datagoblin',
		authorUrl: 'https://datagoblin.itch.io/',
		sourceUrl: 'https://datagoblin.itch.io/dungeonmode',
	},
	rook: {
		displayName: 'Rook',
		assetPath: 'fonts/Rook.ttf',
		cssFontFamily: 'Font-Rook',
		author: 'Funky Tiger Highsaturn',
		authorUrl: 'https://autojunkio.itch.io/',
		sourceUrl: 'https://outer-spec.itch.io/rook',
	},
} as const satisfies Record<string, FontMeta>;

export type BundledFontId = keyof typeof BUNDLED_FONT_METADATA;

export const BUNDLED_FONT_IDS = Object.keys(BUNDLED_FONT_METADATA) as BundledFontId[];
export const DEFAULT_FONT_ID: BundledFontId = 'bescii';

export type BundledFontEntry = FontMeta & {
	id: BundledFontId;
};

export const BUNDLED_FONTS: readonly BundledFontEntry[] = BUNDLED_FONT_IDS.map((id) => ({
	id,
	...BUNDLED_FONT_METADATA[id],
}));
