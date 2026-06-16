import {
	SOURCE_COLOR_MODES,
	type OverlayDescriptor,
	type OverlaySettings,
	type SourceColorMode,
} from '../../domain/overlay/overlay-settings';

export type PopupToContentMessage =
	| { type: 'START_PICKING' }
	| { type: 'LIST_OVERLAYS' }
	| { type: 'UPDATE_OVERLAY'; id: string; settings: Partial<OverlaySettings> }
	| { type: 'REMOVE_OVERLAY'; id: string }
	| { type: 'PAUSE_ALL' }
	| { type: 'RESUME_ALL' }
	| { type: 'REMOVE_ALL' }
	| { type: 'TOGGLE_OVERLAY' };

export type ContentToPopupMessage =
	| { type: 'OVERLAY_LIST_CHANGED'; overlays: OverlayDescriptor[] }
	| { type: 'PICKING_STARTED' }
	| { type: 'PICKING_CANCELLED' }
	| { type: 'ERROR'; message: string };

export type RuntimeMessage = PopupToContentMessage | ContentToPopupMessage | { type: 'PING' };

export interface OverlayListResponse {
	overlays: OverlayDescriptor[];
}

export interface RuntimeAck {
	ok: boolean;
	error?: string;
	overlays?: OverlayDescriptor[];
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
	if (!isRecord(value) || typeof value.type !== 'string') {
		return false;
	}

	return isPopupToContentMessage(value) || isContentToPopupMessage(value) || value.type === 'PING';
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
		case 'REMOVE_OVERLAY':
			return typeof value.id === 'string';
		default:
			return false;
	}
}

function isContentToPopupMessage(value: Record<string, unknown>): value is ContentToPopupMessage {
	switch (value.type) {
		case 'OVERLAY_LIST_CHANGED':
			return Array.isArray(value.overlays);
		case 'PICKING_STARTED':
		case 'PICKING_CANCELLED':
			return true;
		case 'ERROR':
			return typeof value.message === 'string';
		default:
			return false;
	}
}

function isOverlaySettingsPatch(value: unknown): value is Partial<OverlaySettings> {
	if (!isRecord(value)) {
		return false;
	}

	return Object.entries(value).every(([key, patchValue]) => {
		switch (key) {
			case 'enabled':
			case 'invert':
				return typeof patchValue === 'boolean';
			case 'opacity':
			case 'fontSize':
				return typeof patchValue === 'number';
			case 'glyphRamp':
			case 'charColor':
			case 'cellColor':
				return typeof patchValue === 'string';
			case 'charColorMode':
			case 'cellColorMode':
				return isSourceColorMode(patchValue);
			default:
				return false;
		}
	});
}

function isSourceColorMode(value: unknown): value is SourceColorMode {
	return typeof value === 'string' && SOURCE_COLOR_MODES.includes(value as SourceColorMode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
