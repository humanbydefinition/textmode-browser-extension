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
	cpc464: {
		displayName: 'CPC464',
		assetPath: 'fonts/cpc464.ttf',
		cssFontFamily: 'Font-CPC464',
		author: 'Damian Vila',
		authorUrl: 'https://codeberg.org/Dmian/font-cpc464',
		sourceUrl: 'https://damianvila.com/',
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
