import { toUserMessage } from '../../shared/errors/errors';
import { isPopupToContentMessage, isRuntimeMessage, type RuntimeAck } from '../../shared/messaging/messages';
import { addRuntimeMessageListener } from '../../shared/browser/browser-api';
import type { OverlayDescriptor, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { DEFAULT_FONT_ID } from '../../domain/fonts/font-metadata';
import * as runtimeFontRegistry from '../../shared/fonts/runtime-font-registry';
import { ElementPicker, type SelectableElement } from '../../features/media-picker/element-picker';
import { OverlayManager } from '../../features/textmode-overlay/overlay-manager';
import { broadcastError, broadcastOverlayList, broadcastPickingCancelled, broadcastPickingStarted } from './page-state';
import { createRuntimeActionHandler, type RuntimeActionHandler } from './runtime-actions';
import type { ControlPanel } from '../../widgets/overlay-panel/control-panel';
import { createSitePresetStore, type SitePresetStore } from './site-preset-store';

declare global {
	interface Window {
		__textmodeAsciiOverlayRuntime?: PageRuntime;
	}
}

export interface PageRuntimeOptions {
	pageUrl?: URL;
	presetStore?: SitePresetStore;
}

export class PageRuntime {
	private picker?: ElementPicker;
	private controlPanel?: ControlPanel;
	private readonly headerFontUrl = runtimeFontRegistry.getFontAssetUrl(DEFAULT_FONT_ID);
	private readonly manager: OverlayManager;
	private readonly actions: RuntimeActionHandler;
	private readonly pageUrl: URL;
	private readonly presetStore: SitePresetStore;
	private readonly runtimeReady: Promise<void>;
	private sitePreset: OverlaySettings | null = null;

	public constructor(options: PageRuntimeOptions = {}) {
		this.manager = new OverlayManager(() => this.sync());
		this.pageUrl = options.pageUrl ?? new URL(window.location.href);
		this.presetStore = options.presetStore ?? createSitePresetStore();
		this.runtimeReady = Promise.all([runtimeFontRegistry.initialize(), this.loadSitePreset()]).then(
			() => undefined
		);
		runtimeFontRegistry.subscribe((change) => {
			if (change.removedIds.length > 0) {
				void this.handleRemovedCustomFonts(change.removedIds).catch((error) => {
					broadcastError(toUserMessage(error));
				});
			}
			this.sync();
		});
		this.actions = createRuntimeActionHandler({
			toggleControlPanel: () => this.toggleControlPanel(),
			startPicking: () => this.startPicking(),
			listOverlays: () => this.manager.list(),
			updateOverlay: (id, settings) => this.updateOverlay(id, settings),
			exportOverlay: (id, format) => this.manager.exportOverlay(id, format),
			removeOverlay: (id) => this.manager.removeOverlay(id),
			pauseAll: () => this.pauseAll(),
			resumeAll: () => this.resumeAll(),
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
		void this.runtimeReady.then(() => this.sync());
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
		await this.runtimeReady;
		if (this.controlPanel) {
			this.destroyControlPanel();
		} else {
			const { ControlPanel } = await import('../../widgets/overlay-panel/control-panel');
			this.controlPanel = new ControlPanel({
				headerFontUrl: this.headerFontUrl,
				allowCustomFontUpload: true,
				onStartPicking: () => this.startPicking(),
				onUpdateOverlay: (id, settings) => {
					return this.updateOverlay(id, settings).then(() => undefined);
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
				onUploadFont: (file) => runtimeFontRegistry.addCustomFont(file),
				onRemoveCustomFont: (id) => runtimeFontRegistry.removeCustomFont(id),
				onError: (message) => {
					broadcastError(message);
					this.sync();
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
				void this.createOverlay(element);
			},
			onCancel: () => {
				this.picker = undefined;
				broadcastPickingCancelled();
			},
		});
		this.picker.start();
		broadcastPickingStarted();
	}

	private async createOverlay(element: SelectableElement, settings?: Partial<OverlaySettings>): Promise<void> {
		try {
			await this.runtimeReady;
			const overlay = await this.manager.createOverlay(element, settings ?? this.sitePreset ?? {});
			this.sitePreset = overlay.settings;
		} catch (error) {
			const message = toUserMessage(error);
			broadcastError(message);
			this.sync();
		}
	}

	private async updateOverlay(id: string, settings: Partial<OverlaySettings>): Promise<OverlayDescriptor[]> {
		await this.runtimeReady;
		const overlays = await this.manager.updateOverlay(id, settings);
		this.saveActiveOverlayPreset(overlays);
		return overlays;
	}

	private async handleRemovedCustomFonts(ids: readonly `custom:${string}`[]): Promise<void> {
		for (const id of ids) {
			const overlays = await this.manager.revertOverlaysUsingFont(id);
			if (this.sitePreset?.fontId === id) {
				this.sitePreset = { ...this.sitePreset, fontId: DEFAULT_FONT_ID };
				void this.presetStore.saveForUrl(this.pageUrl, this.sitePreset).catch((error) => {
					broadcastError(toUserMessage(error));
				});
			}
			this.saveActiveOverlayPreset(overlays);
		}
		this.sync();
	}

	private pauseAll(): OverlayDescriptor[] {
		const overlays = this.manager.pauseAll();
		this.saveActiveOverlayPreset(overlays);
		return overlays;
	}

	private resumeAll(): OverlayDescriptor[] {
		const overlays = this.manager.resumeAll();
		this.saveActiveOverlayPreset(overlays);
		return overlays;
	}

	private async loadSitePreset(): Promise<void> {
		try {
			this.sitePreset = await this.presetStore.loadForUrl(this.pageUrl);
		} catch (error) {
			broadcastError(toUserMessage(error));
		}
	}

	private saveActiveOverlayPreset(overlays: readonly OverlayDescriptor[]): void {
		const settings = overlays[0]?.settings;
		if (!settings) {
			return;
		}

		this.sitePreset = settings;
		void this.presetStore.saveForUrl(this.pageUrl, settings).catch((error) => {
			broadcastError(toUserMessage(error));
			this.sync();
		});
	}

	private sync(): void {
		const overlays = this.manager.list();
		const customFonts = runtimeFontRegistry.toCustomFontSummaries();
		broadcastOverlayList(overlays, customFonts);
		this.controlPanel?.updateState(overlays);
	}
}

export function startPageRuntime(): PageRuntime {
	if (!window.__textmodeAsciiOverlayRuntime) {
		window.__textmodeAsciiOverlayRuntime = new PageRuntime();
	}
	return window.__textmodeAsciiOverlayRuntime;
}
