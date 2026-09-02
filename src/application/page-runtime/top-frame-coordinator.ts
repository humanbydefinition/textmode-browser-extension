import { DEFAULT_FONT_ID } from '../../domain/fonts/font-metadata';
import type { PanelPlacement } from '../../domain/presets/panel-placement';
import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { toUserMessage } from '../../shared/errors/errors';
import { addRuntimeMessageListener, sendMessageToRuntime } from '../../shared/browser/browser-api';
import * as runtimeFontRegistry from '../../shared/fonts/runtime-font-registry';
import {
	isPopupToContentMessage,
	isRoutedFrameEventMessage,
	type FrameAddress,
	type FrameCommand,
	type FrameRoutingMessage,
	type PopupToContentMessage,
	type RoutedFrameEventMessage,
	type RuntimeAck,
} from '../../shared/messaging/messages';
import type { ControlPanel } from '../../widgets/overlay-panel/control-panel';
import { broadcastError, broadcastOverlayList, broadcastPickingCancelled, broadcastPickingStarted } from './page-state';
import { createPanelPlacementStore, type PanelPlacementStore } from './panel-placement-store';
import { createSitePresetStore, type SitePresetStore } from './site-preset-store';

declare global {
	interface Window {
		__textmodeTopFrameCoordinator?: TopFrameCoordinator;
	}
}

export interface TopFrameCoordinatorOptions {
	pageUrl?: URL;
	presetStore?: SitePresetStore;
	panelPlacementStore?: PanelPlacementStore;
}

interface RoutedOverlay {
	owner: FrameAddress;
	descriptor: OverlayDescriptor;
}

type OwnerFrameCommand =
	| { type: 'FRAME_UPDATE_OVERLAY'; overlayId: string; settings: Partial<OverlaySettings> }
	| { type: 'FRAME_EXPORT_OVERLAY'; overlayId: string; format: OverlayExportFormat }
	| { type: 'FRAME_REMOVE_OVERLAY'; overlayId: string }
	| { type: 'FRAME_PAUSE_ALL' }
	| { type: 'FRAME_RESUME_ALL' }
	| { type: 'FRAME_REMOVE_ALL' };

export class TopFrameCoordinator {
	private controlPanel?: ControlPanel;
	private readonly headerFontUrl = runtimeFontRegistry.getFontAssetUrl(DEFAULT_FONT_ID);
	private readonly pageUrl: URL;
	private readonly presetStore: SitePresetStore;
	private readonly panelPlacementStore: PanelPlacementStore;
	private readonly runtimeReady: Promise<void>;
	private sitePreset: OverlaySettings | null = null;
	private panelPlacement: PanelPlacement | null = null;
	private activeOverlay?: RoutedOverlay;
	private activePickSessionId?: string;
	private pickResolved = false;

	public constructor(options: TopFrameCoordinatorOptions = {}) {
		this.pageUrl = options.pageUrl ?? new URL(window.location.href);
		this.presetStore = options.presetStore ?? createSitePresetStore();
		this.panelPlacementStore = options.panelPlacementStore ?? createPanelPlacementStore();
		this.runtimeReady = Promise.all([
			runtimeFontRegistry.initialize(),
			this.loadSitePreset(),
			this.loadPanelPlacement(),
		]).then(() => undefined);

		runtimeFontRegistry.subscribe((change) => {
			if (change.removedIds.includes(this.sitePreset?.fontId as `custom:${string}`)) {
				this.sitePreset = this.sitePreset ? { ...this.sitePreset, fontId: DEFAULT_FONT_ID } : null;
				if (this.sitePreset) {
					void this.presetStore
						.saveForUrl(this.pageUrl, this.sitePreset)
						.catch((error) => broadcastError(toUserMessage(error)));
				}
			}
			this.sync();
		});

		addRuntimeMessageListener((message: unknown, _sender, sendResponse) => {
			if (isPopupToContentMessage(message)) {
				void this.handleUiCommand(message).then(sendResponse);
				return true;
			}
			if (isRoutedFrameEventMessage(message)) {
				void this.handleFrameEvent(message).then(sendResponse);
				return true;
			}
		});

		this.sync();
		void this.runtimeReady.then(() => this.sync());
	}

	private async handleUiCommand(message: PopupToContentMessage): Promise<RuntimeAck> {
		try {
			switch (message.type) {
				case 'TOGGLE_OVERLAY':
					await this.toggleControlPanel();
					break;
				case 'APPLY_CONTEXT_TARGET':
					await this.applyContextTarget(message);
					break;
				case 'SHOW_CONTEXT_TARGET_ERROR':
					await this.runtimeReady;
					await this.ensureControlPanel();
					this.controlPanel?.setNotice(message.message);
					break;
				case 'START_PICKING':
					await this.startPicking();
					break;
				case 'LIST_OVERLAYS':
					break;
				case 'UPDATE_OVERLAY':
					await this.updateOverlay(message.id, message.settings);
					break;
				case 'EXPORT_OVERLAY':
					await this.exportOverlay(message.id, message.format);
					break;
				case 'REMOVE_OVERLAY':
					await this.removeOverlay(message.id);
					break;
				case 'PAUSE_ALL':
					this.applyOwnerResponse(await this.sendToOwner({ type: 'FRAME_PAUSE_ALL' }));
					break;
				case 'RESUME_ALL':
					this.applyOwnerResponse(await this.sendToOwner({ type: 'FRAME_RESUME_ALL' }));
					break;
				case 'REMOVE_ALL':
					await this.removeAll();
					break;
			}
			return { ok: true, overlays: this.list() };
		} catch (error) {
			const messageText = toUserMessage(error);
			broadcastError(messageText);
			return { ok: false, error: messageText, overlays: this.list() };
		}
	}

	private async handleFrameEvent(message: RoutedFrameEventMessage): Promise<RuntimeAck> {
		const { frameId, event } = message;
		switch (event.type) {
			case 'FRAME_TARGET_PICKED':
				if (event.pickSessionId === this.activePickSessionId && !this.pickResolved) {
					this.pickResolved = true;
					void this.createOverlayInFrame(frameId, event.runtimeId, event.targetToken, event.pickSessionId);
				}
				break;
			case 'FRAME_PICKING_CANCELLED':
				if (event.pickSessionId === this.activePickSessionId && !this.pickResolved) {
					this.activePickSessionId = undefined;
					await this.broadcastFrameCommand({ type: 'FRAME_END_PICKING', pickSessionId: event.pickSessionId });
					this.controlPanel?.updatePickingState(false);
					broadcastPickingCancelled();
				}
				break;
			case 'FRAME_UNAVAILABLE_IFRAME':
				if (event.pickSessionId === this.activePickSessionId) broadcastError(event.reason);
				break;
			case 'FRAME_OVERLAY_STATE':
				if (
					this.activeOverlay?.owner.frameId === frameId &&
					this.activeOverlay.owner.runtimeId === event.runtimeId
				) {
					const descriptor = event.overlays[0];
					this.activeOverlay = descriptor
						? { owner: this.activeOverlay.owner, descriptor: markEmbedded(descriptor, frameId) }
						: undefined;
					this.sync();
				}
				break;
			case 'FRAME_DISPOSING':
				if (
					this.activeOverlay?.owner.frameId === frameId &&
					this.activeOverlay.owner.runtimeId === event.runtimeId
				) {
					this.activeOverlay = undefined;
					this.sync();
				}
				break;
		}
		return { ok: true, overlays: this.list() };
	}

	private async startPicking(): Promise<void> {
		await this.runtimeReady;
		const ensured = await this.route({ type: 'ENSURE_FRAME_AGENTS' });
		if (!ensured.ok) throw new Error(ensured.error ?? 'Unable to start iframe media selection.');
		if (this.activePickSessionId) {
			await this.broadcastFrameCommand({ type: 'FRAME_END_PICKING', pickSessionId: this.activePickSessionId });
		}
		this.activePickSessionId = createId('pick');
		this.pickResolved = false;
		const response = await this.broadcastFrameCommand({
			type: 'FRAME_BEGIN_PICKING',
			pickSessionId: this.activePickSessionId,
		});
		if (!response.ok) throw new Error(response.error ?? 'Unable to start media selection.');
		this.controlPanel?.updatePickingState(true);
		broadcastPickingStarted();
	}

	private async createOverlayInFrame(
		frameId: number,
		runtimeId: string,
		targetToken: string,
		pickSessionId: string
	): Promise<void> {
		try {
			await this.broadcastFrameCommand({ type: 'FRAME_END_PICKING', pickSessionId });
			this.activePickSessionId = undefined;
			await this.createOverlayForTarget(frameId, runtimeId, targetToken);
			this.controlPanel?.updatePickingState(false);
		} catch (error) {
			this.controlPanel?.updatePickingState(false);
			this.reportTargetError(error);
		}
	}

	private async applyContextTarget(
		message: Extract<PopupToContentMessage, { type: 'APPLY_CONTEXT_TARGET' }>
	): Promise<void> {
		await this.runtimeReady;
		if (this.activePickSessionId) {
			await this.broadcastFrameCommand({ type: 'FRAME_END_PICKING', pickSessionId: this.activePickSessionId });
			this.activePickSessionId = undefined;
		}
		try {
			await this.createOverlayForTarget(message.frameId, message.runtimeId, message.targetToken);
			await this.ensureControlPanel();
			this.controlPanel?.setNotice(undefined);
		} catch (error) {
			await this.ensureControlPanel();
			this.reportTargetError(error);
		}
	}

	private async createOverlayForTarget(frameId: number, runtimeId: string, targetToken: string): Promise<void> {
		await this.broadcastFrameCommand({ type: 'FRAME_REMOVE_ALL' });
		this.activeOverlay = undefined;
		const overlayId = createId('overlay');
		const owner = { frameId, runtimeId };
		const response = await this.route({
			type: 'PREPARE_FRAME_OVERLAY',
			frameId,
			command: {
				type: 'FRAME_CREATE_OVERLAY',
				runtimeId,
				targetToken,
				overlayId,
				settings: this.sitePreset ?? {},
			},
		});
		if (!response.ok || !response.overlays?.[0]) {
			throw new Error(response.error ?? 'Unable to create an overlay in the selected frame.');
		}
		this.activeOverlay = { owner, descriptor: markEmbedded(response.overlays[0], frameId) };
		this.saveActiveOverlayPreset();
		this.sync();
	}

	private async updateOverlay(id: string, settings: Partial<OverlaySettings>): Promise<void> {
		this.assertActiveOverlay(id);
		const response = await this.sendToOwner({
			type: 'FRAME_UPDATE_OVERLAY',
			overlayId: id,
			settings,
		});
		this.applyOwnerResponse(response);
		this.saveActiveOverlayPreset();
	}

	private async exportOverlay(id: string, format: OverlayExportFormat): Promise<void> {
		this.assertActiveOverlay(id);
		const response = await this.sendToOwner({ type: 'FRAME_EXPORT_OVERLAY', overlayId: id, format });
		this.applyOwnerResponse(response);
	}

	private async removeOverlay(id: string): Promise<void> {
		this.assertActiveOverlay(id);
		await this.sendToOwner({ type: 'FRAME_REMOVE_OVERLAY', overlayId: id });
		this.activeOverlay = undefined;
		this.sync();
	}

	private async removeAll(): Promise<void> {
		await this.broadcastFrameCommand({ type: 'FRAME_REMOVE_ALL' });
		this.activeOverlay = undefined;
		this.sync();
	}

	private async sendToOwner(command: OwnerFrameCommand): Promise<RuntimeAck> {
		const active = this.activeOverlay;
		if (!active) return { ok: true, overlays: [] };
		const response = await this.route({
			type: 'SEND_FRAME_COMMAND',
			frameId: active.owner.frameId,
			command: { ...command, runtimeId: active.owner.runtimeId } as FrameCommand,
		});
		if (!response.ok) {
			this.activeOverlay = undefined;
			this.sync();
			throw new Error(response.error ?? 'The selected iframe is no longer available.');
		}
		return response;
	}

	private async broadcastFrameCommand(command: FrameCommand): Promise<RuntimeAck> {
		return this.route({ type: 'BROADCAST_FRAME_COMMAND', command });
	}

	private async route(message: FrameRoutingMessage): Promise<RuntimeAck> {
		return sendMessageToRuntime<RuntimeAck>(message);
	}

	private applyOwnerResponse(response: RuntimeAck): void {
		if (!response.ok) throw new Error(response.error ?? 'The overlay command failed.');
		if (!this.activeOverlay) return;
		const descriptor = response.overlays?.[0];
		this.activeOverlay = descriptor
			? {
					owner: this.activeOverlay.owner,
					descriptor: markEmbedded(descriptor, this.activeOverlay.owner.frameId),
				}
			: undefined;
		this.sync();
	}

	private assertActiveOverlay(id: string): void {
		if (!this.activeOverlay || this.activeOverlay.descriptor.id !== id) {
			throw new Error(`Overlay ${id} no longer exists.`);
		}
	}

	private list(): OverlayDescriptor[] {
		return this.activeOverlay ? [this.activeOverlay.descriptor] : [];
	}

	private async toggleControlPanel(): Promise<void> {
		await this.runtimeReady;
		if (this.controlPanel) {
			this.destroyControlPanel();
			return;
		}
		await this.ensureControlPanel();
	}

	private async ensureControlPanel(): Promise<void> {
		if (this.controlPanel) return;
		const { ControlPanel } = await import('../../widgets/overlay-panel/control-panel');
		this.controlPanel = new ControlPanel({
			headerFontUrl: this.headerFontUrl,
			initialPlacement: this.panelPlacement,
			allowCustomFontUpload: true,
			onStartPicking: () => void this.startPicking().catch((error) => broadcastError(toUserMessage(error))),
			onUpdateOverlay: (id, settings) => this.updateOverlay(id, settings),
			onExportOverlay: (id, format) =>
				void this.exportOverlay(id, format).catch((error) => broadcastError(toUserMessage(error))),
			onRemoveOverlay: (id) => void this.removeOverlay(id).catch((error) => broadcastError(toUserMessage(error))),
			onUploadFont: (file) => runtimeFontRegistry.addCustomFont(file),
			onRemoveCustomFont: (id) => runtimeFontRegistry.removeCustomFont(id),
			onError: broadcastError,
			onClose: () => this.destroyControlPanel(),
			onPlacementCommit: (placement) => this.savePanelPlacement(placement),
			onPlacementReset: () => this.resetPanelPlacement(),
		});
		this.controlPanel.mount();
		this.controlPanel.updateState(this.list());
	}

	private reportTargetError(error: unknown): void {
		const message = toUserMessage(error);
		this.activeOverlay = undefined;
		broadcastError(message);
		this.controlPanel?.setNotice(message);
		this.sync();
	}

	private destroyControlPanel(): void {
		this.controlPanel?.unmount();
		this.controlPanel = undefined;
	}

	private async loadSitePreset(): Promise<void> {
		try {
			this.sitePreset = await this.presetStore.loadForUrl(this.pageUrl);
		} catch (error) {
			broadcastError(toUserMessage(error));
		}
	}

	private async loadPanelPlacement(): Promise<void> {
		try {
			this.panelPlacement = await this.panelPlacementStore.loadForUrl(this.pageUrl);
		} catch (error) {
			broadcastError(toUserMessage(error));
		}
	}

	private async savePanelPlacement(placement: PanelPlacement): Promise<void> {
		this.panelPlacement = placement;
		try {
			await this.panelPlacementStore.saveForUrl(this.pageUrl, placement);
		} catch (error) {
			broadcastError(toUserMessage(error));
		}
	}

	private async resetPanelPlacement(): Promise<void> {
		this.panelPlacement = null;
		try {
			await this.panelPlacementStore.removeForUrl(this.pageUrl);
		} catch (error) {
			broadcastError(toUserMessage(error));
		}
	}

	private saveActiveOverlayPreset(): void {
		const settings = this.activeOverlay?.descriptor.settings;
		if (!settings) return;
		this.sitePreset = settings;
		void this.presetStore.saveForUrl(this.pageUrl, settings).catch((error) => broadcastError(toUserMessage(error)));
	}

	private sync(): void {
		const overlays = this.list();
		broadcastOverlayList(overlays, runtimeFontRegistry.toCustomFontSummaries());
		this.controlPanel?.updateState(overlays);
	}
}

export function startTopFrameCoordinator(): TopFrameCoordinator | undefined {
	if (window !== window.top) return undefined;
	window.__textmodeTopFrameCoordinator ??= new TopFrameCoordinator();
	return window.__textmodeTopFrameCoordinator;
}

function createId(prefix: string): string {
	const suffix = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
	return `${prefix}-${suffix}`;
}

function markEmbedded(descriptor: OverlayDescriptor, frameId: number): OverlayDescriptor {
	if (frameId === 0 || descriptor.elementLabel.includes('— iframe')) return descriptor;
	return { ...descriptor, elementLabel: `${descriptor.elementLabel} — iframe` };
}
