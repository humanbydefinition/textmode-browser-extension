import { DEFAULT_OVERLAY_SETTINGS, type BundledFontId } from './overlay-settings';

export interface GlyphRampPreset {
	id: string;
	name: string;
	glyphRamp: string;
}

const GLOBAL_GLYPH_RAMP_PRESETS: readonly GlyphRampPreset[] = [
	{
		id: 'classic',
		name: 'classic',
		glyphRamp: DEFAULT_OVERLAY_SETTINGS.glyphRamp,
	},
	{
		id: 'minimal',
		name: 'minimal',
		glyphRamp: ' .#',
	},
	{
		id: 'soft',
		name: 'soft',
		glyphRamp: ' .,:;irsXA253hMHGS#9B&@',
	},
	{
		id: 'dense',
		name: 'dense',
		glyphRamp: ' .\'`^",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
	},
];

const FONT_GLYPH_RAMP_PRESETS: Partial<Record<BundledFontId, readonly GlyphRampPreset[]>> = {};

export function getGlyphRampPresets(fontId: BundledFontId): readonly GlyphRampPreset[] {
	return [...GLOBAL_GLYPH_RAMP_PRESETS, ...(FONT_GLYPH_RAMP_PRESETS[fontId] ?? [])];
}

export function getGlyphRampPresetName(fontId: BundledFontId, glyphRamp: string): string {
	return getMatchingGlyphRampPreset(fontId, glyphRamp)?.name ?? 'custom';
}

export function getAdjacentGlyphRampPreset(
	fontId: BundledFontId,
	glyphRamp: string,
	direction: -1 | 1
): GlyphRampPreset {
	const presets = getGlyphRampPresets(fontId);
	const currentIndex = presets.findIndex((preset) => preset.glyphRamp === glyphRamp);
	const nextIndex =
		currentIndex === -1
			? direction > 0
				? 0
				: presets.length - 1
			: (currentIndex + direction + presets.length) % presets.length;

	return presets[nextIndex] ?? GLOBAL_GLYPH_RAMP_PRESETS[0];
}

function getMatchingGlyphRampPreset(fontId: BundledFontId, glyphRamp: string): GlyphRampPreset | undefined {
	return getGlyphRampPresets(fontId).find((preset) => preset.glyphRamp === glyphRamp);
}
