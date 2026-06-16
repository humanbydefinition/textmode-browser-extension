import { toUserMessage } from '../shared/errors';
import {
	isPopupToContentMessage,
	isRuntimeMessage,
	type PopupToContentMessage,
	type RuntimeAck,
} from '../shared/messages';
import { addRuntimeMessageListener, sendMessageToRuntime } from '../shared/browser-api';
import type { OverlaySettings } from '../shared/overlay-settings';
import { ElementPicker, type SelectableElement } from './element-picker';
import { OverlayManager } from './overlay-manager';
import { broadcastError, broadcastOverlayList } from './page-state';
import type { ControlPanel } from './control-panel';

declare global {
	interface Window {
		__textmodeAsciiOverlayRuntime?: PageRuntime;
	}
}

export class PageRuntime {
	private picker?: ElementPicker;
	private controlPanel?: ControlPanel;
	private readonly manager = new OverlayManager(() => this.sync());

	public constructor() {
		addRuntimeMessageListener((message: unknown, _sender, sendResponse) => {
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
				case 'TOGGLE_OVERLAY':
					await this.toggleControlPanel();
					return { ok: true, overlays: this.manager.list() };
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

	private async toggleControlPanel(): Promise<void> {
		if (this.controlPanel) {
			this.destroyControlPanel();
		} else {
			const { ControlPanel } = await import('./control-panel');
			this.controlPanel = new ControlPanel({
				onStartPicking: () => this.startPicking(),
				onUpdateOverlay: (id, settings) => {
					this.manager.updateOverlay(id, settings);
				},
				onRemoveOverlay: (id) => {
					this.manager.removeOverlay(id);
				},
				onClose: () => this.destroyControlPanel(),
			});
			this.controlPanel.mount();
			this.controlPanel.updateState(this.manager.list());
		}
	}

	private destroyControlPanel(): void {
		if (this.controlPanel) {
			this.controlPanel.unmount();
			this.controlPanel = undefined;
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
				void sendMessageToRuntime({ type: 'PICKING_CANCELLED' });
			},
		});
		this.picker.start();
		void sendMessageToRuntime({ type: 'PICKING_STARTED' });
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
		this.controlPanel?.updateState(overlays);
	}
}

export function startPageRuntime(): PageRuntime {
	if (!window.__textmodeAsciiOverlayRuntime) {
		window.__textmodeAsciiOverlayRuntime = new PageRuntime();
	}
	return window.__textmodeAsciiOverlayRuntime;
}
