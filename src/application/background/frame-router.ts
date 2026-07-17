import {
	addRuntimeMessageListener,
	broadcastMessageToTab,
	injectContentRuntime,
	injectOverlayHost,
	sendMessageToFrame,
} from '../../shared/browser/browser-api';
import {
	isFrameRoutingMessage,
	type FrameCommand,
	type FrameRoutingMessage,
	type RoutedFrameEventMessage,
	type RuntimeAck,
} from '../../shared/messaging/messages';
import { toUserMessage } from '../../shared/errors/errors';

export function attachFrameRouterListener(): void {
	addRuntimeMessageListener((message: unknown, sender, sendResponse) => {
		if (!isFrameRoutingMessage(message)) return;

		void handleFrameRoutingMessage(message, sender)
			.then(sendResponse)
			.catch((error) => {
				const response: RuntimeAck = { ok: false, error: toUserMessage(error) };
				sendResponse(response);
			});
		return true;
	});
}

async function handleFrameRoutingMessage(
	message: FrameRoutingMessage,
	sender: Parameters<Parameters<typeof addRuntimeMessageListener>[0]>[1]
): Promise<RuntimeAck> {
	const tabId = sender.tab?.id;
	if (tabId === undefined) {
		return { ok: false, error: 'Frame routing requires a sender in a browser tab.' };
	}

	switch (message.type) {
		case 'ENSURE_FRAME_AGENTS':
			await injectContentRuntime(tabId);
			return { ok: true };
		case 'BROADCAST_FRAME_COMMAND':
			await broadcastMessageToTab(tabId, message.command);
			return { ok: true };
		case 'SEND_FRAME_COMMAND':
			return sendFrameCommand(tabId, message.frameId, message.command);
		case 'PREPARE_FRAME_OVERLAY':
			await injectOverlayHost(tabId, message.frameId);
			return sendFrameCommand(tabId, message.frameId, message.command);
		case 'FRAME_EVENT': {
			const frameId = sender.frameId ?? 0;
			const routed: RoutedFrameEventMessage = {
				type: 'ROUTED_FRAME_EVENT',
				frameId,
				event: message.event,
			};
			await sendMessageToFrame<RuntimeAck>(tabId, 0, routed);
			return { ok: true };
		}
	}
}

async function sendFrameCommand(tabId: number, frameId: number, command: FrameCommand): Promise<RuntimeAck> {
	return sendMessageToFrame<RuntimeAck>(tabId, frameId, command);
}
