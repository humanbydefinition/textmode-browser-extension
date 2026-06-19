type FontMeta = {
	displayName: string;
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

export const BUNDLED_FONT_METADATA = {
	chunky: {
		displayName: 'CHUNKY',
		assetPath: 'fonts/CHUNKY.ttf',
		cssFontFamily: 'Font-Chunky',
		author: 'batfeula',
		authorUrl: 'https://batfeula.neocities.org/',
		sourceUrl: 'https://batfeula.itch.io/chunky',
	},
	cultistScript: {
		displayName: 'Cultist Script',
		assetPath: 'fonts/CultistScript.ttf',
		cssFontFamily: 'Font-CultistScript',
		author: 'littlebitspace',
		authorUrl: 'https://littlebitspace.com/',
		sourceUrl: 'https://littlebitspace.com/resources/',
	},
	frogblock: {
		displayName: 'FROGBLOCK',
		assetPath: 'fonts/FROGBLOCK-V2.1.ttf',
		cssFontFamily: 'Font-Frogblock',
		author: 'Polyducks',
		authorUrl: 'https://polyducks.co.uk/',
		sourceUrl: 'https://polyducks.itch.io/frogblock',
	},
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
	c64ProMono: {
		displayName: 'C64 Pro Mono',
		assetPath: 'fonts/C64_Pro_Mono-STYLE.ttf',
		cssFontFamily: 'Font-C64-Pro-Mono',
		author: 'Style',
		authorUrl: 'https://style64.org/',
		sourceUrl: 'https://style64.org/c64-truetype',
	},
	unscii8: {
		displayName: 'UNSCII 8',
		assetPath: 'fonts/unscii-8.ttf',
		cssFontFamily: 'Font-Unscii-8',
		...UNSCII_META,
	},
	unscii8Alt: {
		displayName: 'UNSCII 8 Alt',
		assetPath: 'fonts/unscii-8-alt.ttf',
		cssFontFamily: 'Font-Unscii-8-Alt',
		...UNSCII_META,
	},
	unscii8Mcr: {
		displayName: 'UNSCII 8 MCR',
		assetPath: 'fonts/unscii-8-mcr.ttf',
		cssFontFamily: 'Font-Unscii-8-Mcr',
		...UNSCII_META,
	},
	unscii8Thin: {
		displayName: 'UNSCII 8 Thin',
		assetPath: 'fonts/unscii-8-thin.ttf',
		cssFontFamily: 'Font-Unscii-8-Thin',
		...UNSCII_META,
	},
	unscii8Fantasy: {
		displayName: 'UNSCII 8 Fantasy',
		assetPath: 'fonts/unscii-8-fantasy.ttf',
		cssFontFamily: 'Font-Unscii-8-Fantasy',
		...UNSCII_META,
	},
	cpc464: {
		displayName: 'CPC464',
		assetPath: 'fonts/cpc464.ttf',
		cssFontFamily: 'Font-CPC464',
		author: 'Damian Vila',
		authorUrl: 'https://codeberg.org/Dmian/font-cpc464',
		sourceUrl: 'https://damianvila.com/',
	},
	rook: {
		displayName: 'Rook',
		assetPath: 'fonts/Rook.ttf',
		cssFontFamily: 'Font-Rook',
		author: 'Funky Tiger Highsaturn',
		authorUrl: 'https://autojunkio.itch.io/',
		sourceUrl: 'https://outer-spec.itch.io/rook',
	},
	dungeonmode: {
		displayName: 'DUNGEON.mode',
		assetPath: 'fonts/dungeonmode.ttf',
		cssFontFamily: 'Font-Dungeonmode',
		author: 'datagoblin',
		authorUrl: 'https://datagoblin.itch.io/',
		sourceUrl: 'https://datagoblin.itch.io/dungeonmode',
	},
	publicPixel: {
		displayName: 'Public Pixel',
		assetPath: 'fonts/PublicPixel.ttf',
		cssFontFamily: 'Font-PublicPixel',
		author: 'GGBotNet',
		authorUrl: 'https://ggbot.itch.io/',
		sourceUrl: 'https://ggbot.itch.io/public-pixel-font',
	},
	myceliumOG: {
		displayName: 'Mycelium OG',
		assetPath: 'fonts/MyceliumOG.ttf',
		cssFontFamily: 'Font-MyceliumOG',
		author: 'littlebitspace',
		authorUrl: 'https://littlebitspace.com/',
		sourceUrl: 'https://littlebitspace.com/resources/',
	},
	t64: {
		displayName: 'T64',
		assetPath: 'fonts/T64.ttf',
		cssFontFamily: 'Font-T64',
		author: 'littlebitspace',
		authorUrl: 'https://littlebitspace.com/',
		sourceUrl: 'https://littlebitspace.com/resources/',
	},
	kitchenSink: {
		displayName: 'Kitchen Sink',
		assetPath: 'fonts/KitchenSink.ttf',
		cssFontFamily: 'Font-Kitchen-Sink',
		author: 'Polyducks',
		authorUrl: 'https://polyducks.co.uk/',
		sourceUrl: 'https://polyducks.itch.io/kitchen-sink-textmode-font',
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
