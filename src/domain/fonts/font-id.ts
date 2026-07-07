import { BUNDLED_FONT_IDS, type BundledFontId } from './font-metadata';

export const CUSTOM_FONT_ID_PREFIX = 'custom:';

export type { BundledFontId } from './font-metadata';
export type CustomFontId = `${typeof CUSTOM_FONT_ID_PREFIX}${string}`;
export type FontId = BundledFontId | CustomFontId;

export function isBundledFontId(value: unknown): value is BundledFontId {
	return typeof value === 'string' && (BUNDLED_FONT_IDS as readonly string[]).includes(value);
}

export function isCustomFontId(value: unknown): value is CustomFontId {
	return (
		typeof value === 'string' &&
		value.startsWith(CUSTOM_FONT_ID_PREFIX) &&
		value.length > CUSTOM_FONT_ID_PREFIX.length
	);
}

export function isFontId(value: unknown): value is FontId {
	return isBundledFontId(value) || isCustomFontId(value);
}

export function createCustomFontId(): CustomFontId {
	return `${CUSTOM_FONT_ID_PREFIX}${crypto.randomUUID()}`;
}
