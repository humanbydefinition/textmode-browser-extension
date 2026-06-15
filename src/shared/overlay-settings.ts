export type ElementKind = 'canvas' | 'video';
export type OverlayStatus = 'active' | 'paused' | 'error';
export type SourceColorMode = 'sampled' | 'fixed';
export type ConversionMode = 'brightness' | 'accurate' | 'color' | 'contour';

export interface OverlaySettings {
	enabled: boolean;
	opacity: number;
	fontSize: number;
	frameRate: number;
	glyphRamp: string;
	conversionMode: ConversionMode;
	invert: boolean;
	brightnessStart: number;
	brightnessEnd: number;
	charColorMode: SourceColorMode;
	charColor: string;
	cellColorMode: SourceColorMode;
	cellColor: string;
	hideOriginal: boolean;
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
	frameRate: 60,
	glyphRamp: ' .:-=+*#%@',
	conversionMode: 'brightness',
	invert: false,
	brightnessStart: 0,
	brightnessEnd: 255,
	charColorMode: 'sampled',
	charColor: '#ffffff',
	cellColorMode: 'fixed',
	cellColor: '#000000',
	hideOriginal: false,
};

export function mergeOverlaySettings(base: OverlaySettings, patch: Partial<OverlaySettings>): OverlaySettings {
	const next: OverlaySettings = {
		...base,
		...patch,
	};

	next.opacity = clamp(next.opacity, 0, 1);
	next.fontSize = Math.round(clamp(next.fontSize, 8, 64));
	next.frameRate = Math.round(clamp(next.frameRate, 1, 60));
	next.brightnessStart = Math.round(clamp(next.brightnessStart, 0, 255));
	next.brightnessEnd = Math.round(clamp(next.brightnessEnd, 0, 255));

	if (next.brightnessStart > next.brightnessEnd) {
		const start = next.brightnessEnd;
		next.brightnessEnd = next.brightnessStart;
		next.brightnessStart = start;
	}

	if (!next.glyphRamp.trim()) {
		next.glyphRamp = DEFAULT_OVERLAY_SETTINGS.glyphRamp;
	}

	if (!/^#[0-9a-f]{6}$/i.test(next.charColor)) {
		next.charColor = DEFAULT_OVERLAY_SETTINGS.charColor;
	}

	if (!/^#[0-9a-f]{6}$/i.test(next.cellColor)) {
		next.cellColor = DEFAULT_OVERLAY_SETTINGS.cellColor;
	}

	return next;
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
