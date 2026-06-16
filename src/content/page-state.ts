import type { OverlayDescriptor } from '../shared/overlay-settings';
import { sendMessageToRuntime } from '../shared/browser-api';

export function broadcastOverlayList(overlays: OverlayDescriptor[]): void {
	void sendMessageToRuntime({
		type: 'OVERLAY_LIST_CHANGED',
		overlays,
	});
}

export function broadcastError(message: string): void {
	void sendMessageToRuntime({
		type: 'ERROR',
		message,
	});
}
