import {
	SOURCE_COLOR_MODES,
	isOverlayPostFxFilterId,
	isOverlayExportFormat,
	type OverlayDescriptor,
	type OverlayExportFormat,
	type OverlayPostFxItem,
	type OverlayContourSettings,
	type OverlaySettings,
	type SourceColorMode,
} from '../../domain/overlay/overlay-settings';
import type { CustomFontSummary } from '../../domain/fonts/custom-font-entry';
import { isCustomFontId } from '../../domain/fonts/font-id';
import {
	normalizeCustomFontUploadDescriptor,
	type CustomFontUploadDescriptor,
	type StoredCustomFontMetadata,
} from '../../domain/fonts/custom-font-storage';
import type { FontUploadErrorCode } from '../errors/errors';

export type PopupToContentMessage =
	| { type: 'START_PICKING' }
	| { type: 'LIST_OVERLAYS' }
	| { type: 'UPDATE_OVERLAY'; id: string; settings: Partial<OverlaySettings> }
	| { type: 'EXPORT_OVERLAY'; id: string; format: OverlayExportFormat }
	| { type: 'REMOVE_OVERLAY'; id: string }
	| { type: 'PAUSE_ALL' }
	| { type: 'RESUME_ALL' }
	| { type: 'REMOVE_ALL' }
	| { type: 'TOGGLE_OVERLAY' };

export type ContentToPopupMessage =
	| { type: 'OVERLAY_LIST_CHANGED'; overlays: OverlayDescriptor[]; customFonts?: CustomFontSummary[] }
	| { type: 'PICKING_STARTED' }
	| { type: 'PICKING_CANCELLED' }
	| { type: 'ERROR'; message: string };

export type CustomFontStorageMessage =
	| { type: 'BEGIN_CUSTOM_FONT_UPLOAD'; descriptor: CustomFontUploadDescriptor }
	| { type: 'COMMIT_CUSTOM_FONT_UPLOAD'; id: `custom:${string}` }
	| { type: 'ABORT_CUSTOM_FONT_UPLOAD'; id: `custom:${string}` }
	| { type: 'REMOVE_CUSTOM_FONT'; id: `custom:${string}` };

export interface CustomFontStorageResponse extends RuntimeAck {
	font?: StoredCustomFontMetadata;
	errorCode?: FontUploadErrorCode;
}

export type RuntimeMessage =
	PopupToContentMessage | ContentToPopupMessage | CustomFontStorageMessage | { type: 'PING' };

export interface RuntimeAck {
	ok: boolean;
	error?: string;
	overlays?: OverlayDescriptor[];
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
	if (!isRecord(value) || typeof value.type !== 'string') {
		return false;
	}

	return (
		isPopupToContentMessage(value) ||
		isContentToPopupMessage(value) ||
		isCustomFontStorageMessage(value) ||
		value.type === 'PING'
	);
}

export function isCustomFontStorageMessage(value: unknown): value is CustomFontStorageMessage {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	switch (value.type) {
		case 'BEGIN_CUSTOM_FONT_UPLOAD':
			return normalizeCustomFontUploadDescriptor(value.descriptor) !== null;
		case 'COMMIT_CUSTOM_FONT_UPLOAD':
		case 'ABORT_CUSTOM_FONT_UPLOAD':
		case 'REMOVE_CUSTOM_FONT':
			return isCustomFontId(value.id);
		default:
			return false;
	}
}

export function isPopupToContentMessage(value: unknown): value is PopupToContentMessage {
	if (!isRecord(value) || typeof value.type !== 'string') {
		return false;
	}

	switch (value.type) {
		case 'START_PICKING':
		case 'LIST_OVERLAYS':
		case 'PAUSE_ALL':
		case 'RESUME_ALL':
		case 'REMOVE_ALL':
		case 'TOGGLE_OVERLAY':
			return true;
		case 'UPDATE_OVERLAY':
			return typeof value.id === 'string' && isOverlaySettingsPatch(value.settings);
		case 'EXPORT_OVERLAY':
			return typeof value.id === 'string' && isOverlayExportFormat(value.format);
		case 'REMOVE_OVERLAY':
			return typeof value.id === 'string';
		default:
			return false;
	}
}

function isContentToPopupMessage(value: Record<string, unknown>): value is ContentToPopupMessage {
	switch (value.type) {
		case 'OVERLAY_LIST_CHANGED':
			return (
				Array.isArray(value.overlays) &&
				(value.customFonts === undefined ||
					(Array.isArray(value.customFonts) && value.customFonts.every(isCustomFontSummary)))
			);
		case 'PICKING_STARTED':
		case 'PICKING_CANCELLED':
			return true;
		case 'ERROR':
			return typeof value.message === 'string';
		default:
			return false;
	}
}

function isCustomFontSummary(value: unknown): value is CustomFontSummary {
	return (
		isRecord(value) &&
		isCustomFontId(value.id) &&
		typeof value.displayName === 'string' &&
		value.displayName.trim().length > 0
	);
}

function isOverlaySettingsPatch(value: unknown): value is Partial<OverlaySettings> {
	if (!isRecord(value)) {
		return false;
	}

	return Object.entries(value).every(([key, patchValue]) => {
		switch (key) {
			case 'enabled':
			case 'brightnessEnabled':
			case 'invert':
				return typeof patchValue === 'boolean';
			case 'opacity':
			case 'fontSize':
				return typeof patchValue === 'number';
			case 'glyphRamp':
			case 'charColor':
			case 'cellColor':
			case 'fontId':
				return typeof patchValue === 'string';
			case 'charColorMode':
			case 'cellColorMode':
				return isSourceColorMode(patchValue);
			case 'postFx':
				return Array.isArray(patchValue) && patchValue.every(isOverlayPostFxItem);
			case 'contour':
				return isOverlayContourSettings(patchValue);
			default:
				return false;
		}
	});
}

function isOverlayContourSettings(value: unknown): value is OverlayContourSettings {
	return (
		isRecord(value) &&
		typeof value.enabled === 'boolean' &&
		typeof value.invert === 'boolean' &&
		typeof value.threshold === 'number' &&
		Number.isFinite(value.threshold) &&
		value.threshold >= 0 &&
		value.threshold <= 1 &&
		typeof value.colorSensitivity === 'number' &&
		Number.isFinite(value.colorSensitivity) &&
		value.colorSensitivity >= 0 &&
		value.colorSensitivity <= 1 &&
		isSourceColorMode(value.charColorMode) &&
		isOverlayRgbColor(value.charColor) &&
		isSourceColorMode(value.cellColorMode) &&
		isOverlayRgbColor(value.cellColor)
	);
}

function isOverlayPostFxItem(value: unknown): value is OverlayPostFxItem {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.filter === 'string' &&
		isOverlayPostFxFilterId(value.filter) &&
		typeof value.enabled === 'boolean' &&
		isRecord(value.params) &&
		Object.values(value.params).every((paramValue) => typeof paramValue === 'number')
	);
}

function isSourceColorMode(value: unknown): value is SourceColorMode {
	return typeof value === 'string' && SOURCE_COLOR_MODES.includes(value as SourceColorMode);
}

function isOverlayRgbColor(value: unknown): value is string {
	return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
