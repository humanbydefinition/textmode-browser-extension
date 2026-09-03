import { BUNDLED_FONT_IDS, DEFAULT_FONT_ID } from '../fonts/font-metadata';
import { isFontId, type FontId } from '../fonts/font-id';
import { createDefaultOverlayPostFxItems, normalizeOverlayPostFxItems, type OverlayPostFxItem } from './post-fx';

export type ElementKind = 'canvas' | 'video';
export type OverlayStatus = 'active' | 'paused' | 'error';
export type SourceColorMode = 'sampled' | 'fixed';

export const SOURCE_COLOR_MODES = ['sampled', 'fixed'] as const;

export const OVERLAY_SETTING_LIMITS = {
	opacity: { min: 0, max: 1, step: 0.05 },
	fontSize: { min: 1, max: 64, step: 1 },
	contourThreshold: { min: 0, max: 1, step: 0.01 },
	contourColorSensitivity: { min: 0, max: 1, step: 0.01 },
} as const;

export interface OverlayContourSettings {
	enabled: boolean;
	invert: boolean;
	threshold: number;
	colorSensitivity: number;
	charColorMode: SourceColorMode;
	charColor: string;
	cellColorMode: SourceColorMode;
	cellColor: string;
}

export interface OverlaySettings {
	enabled: boolean;
	opacity: number;
	fontSize: number;
	fontId: FontId;
	background: string;
	glyphRamp: string;
	brightnessEnabled: boolean;
	invert: boolean;
	charColorMode: SourceColorMode;
	charColor: string;
	cellColorMode: SourceColorMode;
	cellColor: string;
	contour: OverlayContourSettings;
	postFx: OverlayPostFxItem[];
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

export function createDefaultOverlaySettings(): OverlaySettings {
	return {
		enabled: true,
		opacity: 1,
		fontSize: 8,
		fontId: DEFAULT_FONT_ID,
		background: '#000000',
		glyphRamp: ' .:-=+*#%@',
		brightnessEnabled: true,
		invert: false,
		charColorMode: 'sampled',
		charColor: '#ffffff',
		cellColorMode: 'fixed',
		cellColor: '#000000',
		contour: createDefaultOverlayContourSettings(),
		postFx: createDefaultOverlayPostFxItems(),
	};
}

export function createDefaultOverlayContourSettings(): OverlayContourSettings {
	return {
		enabled: false,
		invert: false,
		threshold: 0.12,
		colorSensitivity: 0.75,
		charColorMode: 'sampled',
		charColor: '#ffffff',
		cellColorMode: 'fixed',
		cellColor: '#000000',
	};
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = createDefaultOverlaySettings();

export function mergeOverlaySettings(base: OverlaySettings, patch: Partial<OverlaySettings>): OverlaySettings {
	const next: OverlaySettings = {
		...base,
		...patch,
		contour: normalizeOverlayContourSettings(patch.contour, base.contour),
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

	if (!isOverlayColor(next.background)) {
		next.background = DEFAULT_OVERLAY_SETTINGS.background;
	}

	if (!isFontId(next.fontId)) {
		next.fontId = DEFAULT_FONT_ID;
	}

	next.postFx = normalizeOverlayPostFxItems(next.postFx);

	return next;
}

export function normalizeOverlayContourSettings(
	value: unknown,
	fallback: OverlayContourSettings = createDefaultOverlayContourSettings()
): OverlayContourSettings {
	const contour = isRecord(value) ? value : {};
	return {
		enabled: typeof contour.enabled === 'boolean' ? contour.enabled : fallback.enabled,
		invert: typeof contour.invert === 'boolean' ? contour.invert : fallback.invert,
		threshold: clampNumber(
			contour.threshold,
			fallback.threshold,
			OVERLAY_SETTING_LIMITS.contourThreshold.min,
			OVERLAY_SETTING_LIMITS.contourThreshold.max
		),
		colorSensitivity: clampNumber(
			contour.colorSensitivity,
			fallback.colorSensitivity,
			OVERLAY_SETTING_LIMITS.contourColorSensitivity.min,
			OVERLAY_SETTING_LIMITS.contourColorSensitivity.max
		),
		charColorMode: isSourceColorMode(contour.charColorMode) ? contour.charColorMode : fallback.charColorMode,
		charColor: isOverlayColor(contour.charColor) ? contour.charColor : fallback.charColor,
		cellColorMode: isSourceColorMode(contour.cellColorMode) ? contour.cellColorMode : fallback.cellColorMode,
		cellColor: isOverlayColor(contour.cellColor) ? contour.cellColor : fallback.cellColor,
	};
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

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function isOverlayColor(value: unknown): value is string {
	return typeof value === 'string' && /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value);
}

function isSourceColorMode(value: unknown): value is SourceColorMode {
	return typeof value === 'string' && SOURCE_COLOR_MODES.includes(value as SourceColorMode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export { BUNDLED_FONT_IDS, DEFAULT_FONT_ID };
export { isBundledFontId, isCustomFontId, isFontId } from '../fonts/font-id';
export { OVERLAY_EXPORT_FORMATS, isOverlayExportFormat } from './export-formats';
export {
	OVERLAY_POST_FX_DEFINITIONS,
	OVERLAY_POST_FX_FILTER_IDS,
	OVERLAY_POST_FX_GROUP_LABELS,
	createDefaultPostFxParams,
	createDefaultOverlayPostFxItems,
	createOverlayPostFxItem,
	getOverlayPostFxDefinition,
	isOverlayPostFxFilterId,
	normalizeOverlayPostFxItems,
	normalizeOverlayPostFxParams,
} from './post-fx';
export type { BundledFontId, CustomFontId, FontId } from '../fonts/font-id';
export type { OverlayExportFormat } from './export-formats';
export type {
	OverlayPostFxDefinition,
	OverlayPostFxFilterId,
	OverlayPostFxGroup,
	OverlayPostFxItem,
	OverlayPostFxParamDefinition,
} from './post-fx';
