import {
	CONVERSION_MODES,
	OVERLAY_SETTING_LIMITS,
	SOURCE_COLOR_MODES,
	type ConversionMode,
	type SourceColorMode,
} from '../shared/overlay-settings';

export const conversionModeOptions: readonly ConversionMode[] = CONVERSION_MODES;
export const sourceColorModeOptions: readonly SourceColorMode[] = SOURCE_COLOR_MODES;
export const overlaySettingLimits = OVERLAY_SETTING_LIMITS;

export function formatPercent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

export function formatPixels(value: number): string {
	return `${Math.round(value)}px`;
}

export function formatFps(value: number): string {
	return `${Math.round(value)} fps`;
}

export function formatBrightness(value: number): string {
	return String(Math.round(value));
}

export function labelFromValue(value: string): string {
	return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, (letter) => letter.toUpperCase());
}
