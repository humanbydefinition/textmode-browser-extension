import type { OverlayDescriptor } from '../../domain/overlay/overlay-settings';
import { sendMessageToRuntime } from '../../shared/browser/browser-api';

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
