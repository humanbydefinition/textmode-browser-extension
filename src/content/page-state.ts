import type { OverlayDescriptor } from '../shared/overlay-settings';

export function broadcastOverlayList(overlays: OverlayDescriptor[]): void {
	void chrome.runtime.sendMessage({
		type: 'OVERLAY_LIST_CHANGED',
		overlays,
	});
}

export function broadcastError(message: string): void {
	void chrome.runtime.sendMessage({
		type: 'ERROR',
		message,
	});
}
