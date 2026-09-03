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
	| { type: 'TOGGLE_OVERLAY' }
	| { type: 'APPLY_CONTEXT_TARGET'; frameId: number; runtimeId: string; targetToken: string }
	| { type: 'SHOW_CONTEXT_TARGET_ERROR'; message: string };

export type ContextTargetMessage =
	{ type: 'CONTEXT_TARGET_CAPTURED'; targetToken: string } | { type: 'CONTEXT_TARGET_CLEARED' };

export interface FrameAddress {
	frameId: number;
	runtimeId: string;
}

export const FRAME_RUNTIME_READY_PROBE = { type: 'FRAME_PING' } as const satisfies FrameCommand;

export type FrameCommand =
	| { type: 'FRAME_PING'; runtimeId?: string }
	| { type: 'FRAME_BEGIN_PICKING'; pickSessionId: string }
	| { type: 'FRAME_END_PICKING'; pickSessionId: string }
	| {
			type: 'FRAME_CREATE_OVERLAY';
			runtimeId: string;
			targetToken: string;
			overlayId: string;
			settings: Partial<OverlaySettings>;
	  }
	| { type: 'FRAME_UPDATE_OVERLAY'; runtimeId: string; overlayId: string; settings: Partial<OverlaySettings> }
	| { type: 'FRAME_EXPORT_OVERLAY'; runtimeId: string; overlayId: string; format: OverlayExportFormat }
	| { type: 'FRAME_REMOVE_OVERLAY'; runtimeId?: string; overlayId: string }
	| { type: 'FRAME_PAUSE_ALL'; runtimeId?: string }
	| { type: 'FRAME_RESUME_ALL'; runtimeId?: string }
	| { type: 'FRAME_REMOVE_ALL'; runtimeId?: string };

export type FrameEvent =
	| { type: 'FRAME_TARGET_PICKED'; pickSessionId: string; runtimeId: string; targetToken: string }
	| { type: 'FRAME_PICKING_CANCELLED'; pickSessionId: string; runtimeId: string }
	| { type: 'FRAME_UNAVAILABLE_IFRAME'; pickSessionId: string; runtimeId: string; reason: string }
	| { type: 'FRAME_OVERLAY_STATE'; runtimeId: string; overlays: OverlayDescriptor[] }
	| { type: 'FRAME_DISPOSING'; runtimeId: string };

export type FrameRoutingMessage =
	| { type: 'ENSURE_FRAME_AGENTS' }
	| { type: 'BROADCAST_FRAME_COMMAND'; command: FrameCommand }
	| { type: 'SEND_FRAME_COMMAND'; frameId: number; command: FrameCommand }
	| {
			type: 'PREPARE_FRAME_OVERLAY';
			frameId: number;
			command: Extract<FrameCommand, { type: 'FRAME_CREATE_OVERLAY' }>;
	  }
	| { type: 'FRAME_EVENT'; event: FrameEvent };

export interface RoutedFrameEventMessage {
	type: 'ROUTED_FRAME_EVENT';
	frameId: number;
	event: FrameEvent;
}

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
	| PopupToContentMessage
	| ContextTargetMessage
	| ContentToPopupMessage
	| CustomFontStorageMessage
	| FrameCommand
	| FrameRoutingMessage
	| RoutedFrameEventMessage;

export interface RuntimeAck {
	ok: boolean;
	error?: string;
	overlays?: OverlayDescriptor[];
	runtimeId?: string;
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
	if (!isRecord(value) || typeof value.type !== 'string') {
		return false;
	}

	return (
		isPopupToContentMessage(value) ||
		isContextTargetMessage(value) ||
		isContentToPopupMessage(value) ||
		isCustomFontStorageMessage(value) ||
		isFrameCommand(value) ||
		isFrameRoutingMessage(value) ||
		isRoutedFrameEventMessage(value)
	);
}

export function isFrameCommand(value: unknown): value is FrameCommand {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	switch (value.type) {
		case 'FRAME_PING':
			return value.runtimeId === undefined || typeof value.runtimeId === 'string';
		case 'FRAME_BEGIN_PICKING':
		case 'FRAME_END_PICKING':
			return typeof value.pickSessionId === 'string';
		case 'FRAME_CREATE_OVERLAY':
			return (
				typeof value.runtimeId === 'string' &&
				typeof value.targetToken === 'string' &&
				typeof value.overlayId === 'string' &&
				isOverlaySettingsPatch(value.settings)
			);
		case 'FRAME_UPDATE_OVERLAY':
			return (
				typeof value.runtimeId === 'string' &&
				typeof value.overlayId === 'string' &&
				isOverlaySettingsPatch(value.settings)
			);
		case 'FRAME_EXPORT_OVERLAY':
			return (
				typeof value.runtimeId === 'string' &&
				typeof value.overlayId === 'string' &&
				isOverlayExportFormat(value.format)
			);
		case 'FRAME_REMOVE_OVERLAY':
			return (
				(value.runtimeId === undefined || typeof value.runtimeId === 'string') &&
				typeof value.overlayId === 'string'
			);
		case 'FRAME_PAUSE_ALL':
		case 'FRAME_RESUME_ALL':
		case 'FRAME_REMOVE_ALL':
			return value.runtimeId === undefined || typeof value.runtimeId === 'string';
		default:
			return false;
	}
}

export function isFrameEvent(value: unknown): value is FrameEvent {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	switch (value.type) {
		case 'FRAME_TARGET_PICKED':
			return (
				typeof value.pickSessionId === 'string' &&
				typeof value.runtimeId === 'string' &&
				typeof value.targetToken === 'string'
			);
		case 'FRAME_PICKING_CANCELLED':
			return typeof value.pickSessionId === 'string' && typeof value.runtimeId === 'string';
		case 'FRAME_UNAVAILABLE_IFRAME':
			return (
				typeof value.pickSessionId === 'string' &&
				typeof value.runtimeId === 'string' &&
				typeof value.reason === 'string'
			);
		case 'FRAME_OVERLAY_STATE':
			return typeof value.runtimeId === 'string' && Array.isArray(value.overlays);
		case 'FRAME_DISPOSING':
			return typeof value.runtimeId === 'string';
		default:
			return false;
	}
}

export function isFrameRoutingMessage(value: unknown): value is FrameRoutingMessage {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	switch (value.type) {
		case 'ENSURE_FRAME_AGENTS':
			return true;
		case 'BROADCAST_FRAME_COMMAND':
			return isFrameCommand(value.command);
		case 'SEND_FRAME_COMMAND':
			return Number.isInteger(value.frameId) && isFrameCommand(value.command);
		case 'PREPARE_FRAME_OVERLAY':
			return (
				Number.isInteger(value.frameId) &&
				isFrameCommand(value.command) &&
				value.command.type === 'FRAME_CREATE_OVERLAY'
			);
		case 'FRAME_EVENT':
			return isFrameEvent(value.event);
		default:
			return false;
	}
}

export function isRoutedFrameEventMessage(value: unknown): value is RoutedFrameEventMessage {
	return (
		isRecord(value) &&
		value.type === 'ROUTED_FRAME_EVENT' &&
		Number.isInteger(value.frameId) &&
		isFrameEvent(value.event)
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
		case 'APPLY_CONTEXT_TARGET':
			return (
				Number.isInteger(value.frameId) &&
				typeof value.runtimeId === 'string' &&
				typeof value.targetToken === 'string'
			);
		case 'SHOW_CONTEXT_TARGET_ERROR':
			return typeof value.message === 'string';
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

export function isContextTargetMessage(value: unknown): value is ContextTargetMessage {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	return (
		(value.type === 'CONTEXT_TARGET_CAPTURED' && typeof value.targetToken === 'string') ||
		value.type === 'CONTEXT_TARGET_CLEARED'
	);
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
			case 'background':
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
