import { toUserMessage } from '../shared/errors';
import {
	isPopupToContentMessage,
	isRuntimeMessage,
	type PopupToContentMessage,
	type RuntimeAck,
} from '../shared/messages';
import type { OverlaySettings } from '../shared/overlay-settings';
import { ElementPicker, type SelectableElement } from './element-picker';
import { OverlayManager } from './overlay-manager';
import { broadcastError, broadcastOverlayList } from './page-state';

declare global {
	interface Window {
		__textmodeAsciiOverlayRuntime?: PageRuntime;
	}
}

class PageRuntime {
	private picker?: ElementPicker;
	private readonly manager = new OverlayManager(() => this.sync());

	public constructor() {
		chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
			void this.handleMessage(message)
				.then(sendResponse)
				.catch((error) => {
					const response: RuntimeAck = { ok: false, error: toUserMessage(error) };
					sendResponse(response);
				});
			return true;
		});
		this.sync();
	}

	private async handleMessage(message: unknown): Promise<RuntimeAck> {
		if (!isRuntimeMessage(message)) {
			return { ok: false, error: 'Unsupported extension message.' };
		}

		if (message.type === 'PING') {
			return { ok: true };
		}

		if (!isPopupToContentMessage(message)) {
			return { ok: false, error: 'Unsupported page-to-popup message received by content runtime.' };
		}

		return this.handlePopupMessage(message);
	}

	private async handlePopupMessage(message: PopupToContentMessage): Promise<RuntimeAck> {
		try {
			switch (message.type) {
				case 'START_PICKING':
					this.startPicking();
					return { ok: true, overlays: this.manager.list() };
				case 'LIST_OVERLAYS':
					return { ok: true, overlays: this.manager.list() };
				case 'UPDATE_OVERLAY':
					return { ok: true, overlays: this.manager.updateOverlay(message.id, message.settings) };
				case 'REMOVE_OVERLAY':
					return { ok: true, overlays: this.manager.removeOverlay(message.id) };
				case 'PAUSE_ALL':
					return { ok: true, overlays: this.manager.pauseAll() };
				case 'RESUME_ALL':
					return { ok: true, overlays: this.manager.resumeAll() };
				case 'REMOVE_ALL':
					return { ok: true, overlays: this.manager.removeAll() };
			}
		} catch (error) {
			const messageText = toUserMessage(error);
			broadcastError(messageText);
			return { ok: false, error: messageText, overlays: this.manager.list() };
		}
	}

	private startPicking(): void {
		this.picker?.stop(false);
		this.picker = new ElementPicker({
			onPick: (element) => {
				this.picker = undefined;
				this.createOverlay(element);
			},
			onCancel: () => {
				this.picker = undefined;
				void chrome.runtime.sendMessage({ type: 'PICKING_CANCELLED' });
			},
		});
		this.picker.start();
		void chrome.runtime.sendMessage({ type: 'PICKING_STARTED' });
	}

	private createOverlay(element: SelectableElement, settings?: Partial<OverlaySettings>): void {
		try {
			this.manager.createOverlay(element, settings);
		} catch (error) {
			const message = toUserMessage(error);
			broadcastError(message);
			this.sync();
		}
	}

	private sync(): void {
		const overlays = this.manager.list();
		broadcastOverlayList(overlays);
	}
}

if (!window.__textmodeAsciiOverlayRuntime) {
	window.__textmodeAsciiOverlayRuntime = new PageRuntime();
}
