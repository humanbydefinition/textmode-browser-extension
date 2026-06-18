export type ElementKind = 'canvas' | 'video';
export type OverlayStatus = 'active' | 'paused' | 'error';
export type SourceColorMode = 'sampled' | 'fixed';
export type OverlayExportFormat = 'txt' | 'svg' | 'png' | 'jpg';

export const SOURCE_COLOR_MODES = ['sampled', 'fixed'] as const;
export const OVERLAY_EXPORT_FORMATS = ['txt', 'svg', 'png', 'jpg'] as const;

export const BUNDLED_FONT_IDS = [
	'chunky',
	'cultistScript',
	'frogblock',
	'ursafont',
	'atascii',
	'bescii',
	'c64ProMono',
	'unscii8',
	'unscii8Alt',
	'unscii8Mcr',
	'unscii8Thin',
	'unscii8Fantasy',
	'cpc464',
	'rook',
	'dungeonmode',
	'publicPixel',
	'myceliumOG',
	't64',
	'kitchenSink',
] as const;

export type BundledFontId = (typeof BUNDLED_FONT_IDS)[number];
export const DEFAULT_FONT_ID: BundledFontId = 'bescii';

export const OVERLAY_SETTING_LIMITS = {
	opacity: { min: 0, max: 1, step: 0.05 },
	fontSize: { min: 1, max: 64, step: 1 },
} as const;

export interface OverlaySettings {
	enabled: boolean;
	opacity: number;
	fontSize: number;
	fontId: BundledFontId;
	glyphRamp: string;
	invert: boolean;
	charColorMode: SourceColorMode;
	charColor: string;
	cellColorMode: SourceColorMode;
	cellColor: string;
}

export interface ElementBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface OverlayDescriptor {
	id: string;
	elementKind: ElementKind;
	elementLabel: string;
	bounds: ElementBounds;
	settings: OverlaySettings;
	status: OverlayStatus;
	latestError?: string;
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
	enabled: true,
	opacity: 1,
	fontSize: 8,
	fontId: DEFAULT_FONT_ID,
	glyphRamp: ' .:-=+*#%@',
	invert: false,
	charColorMode: 'sampled',
	charColor: '#ffffff',
	cellColorMode: 'fixed',
	cellColor: '#000000',
};

export function mergeOverlaySettings(base: OverlaySettings, patch: Partial<OverlaySettings>): OverlaySettings {
	const next: OverlaySettings = {
		...base,
		...patch,
	};

	next.opacity = clamp(next.opacity, OVERLAY_SETTING_LIMITS.opacity.min, OVERLAY_SETTING_LIMITS.opacity.max);
	next.fontSize = Math.round(
		clamp(next.fontSize, OVERLAY_SETTING_LIMITS.fontSize.min, OVERLAY_SETTING_LIMITS.fontSize.max)
	);

	if (!next.glyphRamp.trim()) {
		next.glyphRamp = DEFAULT_OVERLAY_SETTINGS.glyphRamp;
	}

	if (!isOverlayColor(next.charColor)) {
		next.charColor = DEFAULT_OVERLAY_SETTINGS.charColor;
	}

	if (!isOverlayColor(next.cellColor)) {
		next.cellColor = DEFAULT_OVERLAY_SETTINGS.cellColor;
	}

	if (!isBundledFontId(next.fontId)) {
		next.fontId = DEFAULT_FONT_ID;
	}

	return next;
}

export function isBundledFontId(value: unknown): value is BundledFontId {
	return typeof value === 'string' && (BUNDLED_FONT_IDS as readonly string[]).includes(value);
}

export function getElementBounds(element: Element): ElementBounds {
	const rect = element.getBoundingClientRect();
	return {
		x: Math.round(rect.left + window.scrollX),
		y: Math.round(rect.top + window.scrollY),
		width: Math.round(rect.width),
		height: Math.round(rect.height),
	};
}

function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) {
		return min;
	}
	return Math.min(max, Math.max(min, value));
}

function isOverlayColor(value: string): boolean {
	return /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value);
}
