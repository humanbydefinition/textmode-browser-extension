import type { OverlayDescriptor, OverlaySettings } from './overlay-settings';

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
	if (!value || typeof value !== 'object') {
		return false;
	}

	const type = (value as { type?: unknown }).type;
	return typeof type === 'string';
}

export function isPopupToContentMessage(value: RuntimeMessage): value is PopupToContentMessage {
	return (
		value.type === 'START_PICKING' ||
		value.type === 'LIST_OVERLAYS' ||
		value.type === 'UPDATE_OVERLAY' ||
		value.type === 'REMOVE_OVERLAY' ||
		value.type === 'PAUSE_ALL' ||
		value.type === 'RESUME_ALL' ||
		value.type === 'REMOVE_ALL' ||
		value.type === 'TOGGLE_OVERLAY'
	);
}
