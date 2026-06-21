import type { CustomFontSummary } from '../../domain/fonts/custom-font-entry';
import type { OverlayDescriptor } from '../../domain/overlay/overlay-settings';
import { sendMessageToRuntime } from '../../shared/browser/browser-api';
import type { ContentToPopupMessage } from '../../shared/messaging/messages';

export function broadcastOverlayList(overlays: OverlayDescriptor[], customFonts?: readonly CustomFontSummary[]): void {
	broadcastToPopup({
		type: 'OVERLAY_LIST_CHANGED',
		overlays,
		customFonts: customFonts ? [...customFonts] : undefined,
	});
}

export function broadcastPickingStarted(): void {
	broadcastToPopup({ type: 'PICKING_STARTED' });
}

export function broadcastPickingCancelled(): void {
	broadcastToPopup({ type: 'PICKING_CANCELLED' });
}

export function broadcastError(message: string): void {
	broadcastToPopup({
		type: 'ERROR',
		message,
	});
}

function broadcastToPopup(message: ContentToPopupMessage): void {
	void sendMessageToRuntime(message).catch((error: unknown) => {
		if (!isMissingReceiverError(error)) {
			console.warn('Failed to broadcast textmode overlay state:', error);
		}
	});
}

function isMissingReceiverError(error: unknown): boolean {
	return error instanceof Error && error.message.includes('Receiving end does not exist');
}
