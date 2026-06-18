import { toUserMessage } from '../../shared/errors/errors';
import { isPopupToContentMessage, isRuntimeMessage, type RuntimeAck } from '../../shared/messaging/messages';
import { addRuntimeMessageListener, getExtensionAssetUrl } from '../../shared/browser/browser-api';
import { TEXTMODE_HEADER_FONT_RESOURCE } from '../../shared/config/extension-assets';
import type { OverlaySettings } from '../../domain/overlay/overlay-settings';
import { ElementPicker, type SelectableElement } from '../../features/media-picker/element-picker';
import { OverlayManager } from '../../features/textmode-overlay/overlay-manager';
import { broadcastError, broadcastOverlayList, broadcastPickingCancelled, broadcastPickingStarted } from './page-state';
import { createRuntimeActionHandler, type RuntimeActionHandler } from './runtime-actions';
import type { ControlPanel } from '../../widgets/overlay-panel/control-panel';

declare global {
	interface Window {
		__textmodeAsciiOverlayRuntime?: PageRuntime;
	}
}

export class PageRuntime {
	private picker?: ElementPicker;
	private controlPanel?: ControlPanel;
	private readonly fontUrl = getExtensionAssetUrl(TEXTMODE_HEADER_FONT_RESOURCE);
	private readonly manager: OverlayManager;
	private readonly actions: RuntimeActionHandler;

	public constructor() {
		this.manager = new OverlayManager(() => this.sync());
		this.actions = createRuntimeActionHandler({
			toggleControlPanel: () => this.toggleControlPanel(),
			startPicking: () => this.startPicking(),
			listOverlays: () => this.manager.list(),
			updateOverlay: (id, settings) => this.manager.updateOverlay(id, settings),
			exportOverlay: (id, format) => this.manager.exportOverlay(id, format),
			removeOverlay: (id) => this.manager.removeOverlay(id),
			pauseAll: () => this.manager.pauseAll(),
			resumeAll: () => this.manager.resumeAll(),
			removeAll: () => this.manager.removeAll(),
			broadcastError,
		});
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

		return this.actions.handle(message);
	}

	private async toggleControlPanel(): Promise<void> {
		if (this.controlPanel) {
			this.destroyControlPanel();
		} else {
			const { ControlPanel } = await import('../../widgets/overlay-panel/control-panel');
			this.controlPanel = new ControlPanel({
				headerFontUrl: this.fontUrl,
				onStartPicking: () => this.startPicking(),
				onUpdateOverlay: (id, settings) => {
					this.manager.updateOverlay(id, settings);
				},
				onExportOverlay: (id, format) => {
					void this.manager.exportOverlay(id, format).catch((error) => {
						broadcastError(toUserMessage(error));
						this.sync();
					});
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
				broadcastPickingCancelled();
			},
		});
		this.picker.start();
		broadcastPickingStarted();
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
