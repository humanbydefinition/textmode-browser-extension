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
import { PickerTargetList, type FrameTargets } from '../../features/media-picker/picker-target-list';
import type { PickerTargetSummary } from '../../shared/messaging/messages';
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
	private directPicking = false;
	private passiveStartup?: Promise<void>;
	private pickerList?: PickerTargetList;
	private readonly pickerFrames = new Map<number, FrameTargets>();
	private ownerCommandQueue: Promise<void> = Promise.resolve();
	private ownerVersion = 0;
	private ownerStateRevision = -1;
	private readonly retiredPickerRuntimes = new Set<string>();
	private frameRefreshTimer?: ReturnType<typeof setTimeout>;

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
			case 'FRAME_PICKER_CLOSED':
				if (
					event.pickSessionId === this.activePickSessionId &&
					this.pickerFrames.get(frameId)?.runtimeId === event.runtimeId
				) {
					this.pickerFrames.delete(frameId);
					this.pickerList?.update([...this.pickerFrames.values()]);
				}
				break;
			case 'FRAME_STRUCTURE_CHANGED':
				if (event.pickSessionId === this.activePickSessionId) this.scheduleFrameRefresh(event.pickSessionId);
				break;
			case 'FRAME_PICKER_TARGETS':
				if (
					event.pickSessionId === this.activePickSessionId &&
					!this.pickResolved &&
					!this.retiredPickerRuntimes.has(`${frameId}:${event.runtimeId}`)
				) {
					const previous = this.pickerFrames.get(frameId);
					if (previous?.runtimeId === event.runtimeId && (previous.revision ?? -1) >= event.revision) break;
					if (previous && previous.runtimeId !== event.runtimeId)
						this.retiredPickerRuntimes.add(`${frameId}:${previous.runtimeId}`);
					this.pickerFrames.set(frameId, {
						frameId,
						runtimeId: event.runtimeId,
						frameTitle: event.frameTitle,
						revision: event.revision,
						targets: event.targets,
					});
					this.pickerList?.update([...this.pickerFrames.values()]);
				}
				break;
			case 'FRAME_TARGET_PICKED':
				if (event.pickSessionId === this.activePickSessionId && !this.pickResolved) {
					this.pickResolved = true;
					void this.createOverlayInFrame(frameId, event.runtimeId, event.targetToken, event.pickSessionId);
				}
				break;
			case 'FRAME_PICKING_CANCELLED':
				if (event.pickSessionId === this.activePickSessionId && !this.pickResolved) {
					await this.cancelPicking();
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
					if (event.revision <= this.ownerStateRevision) break;
					this.ownerStateRevision = event.revision;
					this.ownerVersion++;
					const descriptor = event.overlays[0];
					this.activeOverlay = descriptor
						? { owner: this.activeOverlay.owner, descriptor: markEmbedded(descriptor, frameId) }
						: undefined;
					this.sync();
				}
				break;
			case 'FRAME_DISPOSING':
				this.retiredPickerRuntimes.add(`${frameId}:${event.runtimeId}`);
				if (this.pickerFrames.get(frameId)?.runtimeId === event.runtimeId) {
					this.pickerFrames.delete(frameId);
					this.pickerList?.update([...this.pickerFrames.values()]);
				}
				if (
					this.activeOverlay?.owner.frameId === frameId &&
					this.activeOverlay.owner.runtimeId === event.runtimeId
				) {
					this.ownerVersion++;
					this.activeOverlay = undefined;
					this.sync();
				}
				break;
		}
		return { ok: true, overlays: this.list() };
	}

	private async startPicking(direct = true): Promise<void> {
		await this.runtimeReady;
		if (direct) await this.ensureControlPanel();
		if (direct && this.passiveStartup) await this.passiveStartup;
		if (!this.controlPanel || (!direct && this.activeOverlay)) return;
		if (this.activePickSessionId) {
			if (!direct) return;
			this.directPicking = true;
			this.controlPanel.updatePickingState(true);
			this.pickerList?.setDirectMode(true);
			try {
				const response = await this.broadcastFrameCommand({
					type: 'FRAME_BEGIN_PICKING',
					pickSessionId: this.activePickSessionId,
					direct: true,
				});
				if (!response.ok) throw new Error(response.error ?? 'Unable to start media selection.');
			} catch (error) {
				this.directPicking = false;
				this.controlPanel?.updatePickingState(false);
				this.pickerList?.setDirectMode(false);
				throw error;
			}
			broadcastPickingStarted();
			return;
		}
		const ensured = await this.route({ type: 'ENSURE_FRAME_AGENTS' });
		if (!ensured.ok) throw new Error(ensured.error ?? 'Unable to start iframe media selection.');
		if (!this.controlPanel || (!direct && this.activeOverlay)) return;
		this.closePickerList();
		this.activePickSessionId = createId('pick');
		this.pickResolved = false;
		this.directPicking = direct;
		this.pickerList = new PickerTargetList(
			(frame, target) => void this.selectPickerTarget(frame, target),
			(frame, target) => void this.highlightPickerTarget(frame, target),
			() => void this.cancelPicking(),
			() => this.controlPanel?.focusPanel(),
			() => {
				const session = this.activePickSessionId;
				if (!session) return;
				this.controlPanel?.setNotice(undefined);
				void this.refreshPickerTargets(session).catch((error) => {
					if (this.activePickSessionId !== session) return;
					const message = toUserMessage(error);
					this.controlPanel?.setNotice(message);
					broadcastError(message);
				});
			},
			() => void this.startPicking(true).catch((error) => broadcastError(toUserMessage(error)))
		);
		this.controlPanel.updatePickingState(direct);
		this.pickerList.mount(this.controlPanel.getPickerMount(), this.controlPanel.isViewportFocused());
		if (direct) this.pickerList.setDirectMode(true);
		this.pickerList.update([]);
		const session = this.activePickSessionId;
		try {
			const response = await this.broadcastFrameCommand({
				type: 'FRAME_BEGIN_PICKING',
				pickSessionId: session,
				direct,
			});
			if (!response.ok) throw new Error(response.error ?? 'Unable to start media selection.');
			if (direct && this.activePickSessionId === session) broadcastPickingStarted();
		} catch (error) {
			if (this.activePickSessionId === session) {
				this.activePickSessionId = undefined;
				this.closePickerList();
				this.controlPanel?.updatePickingState(false);
				void this.broadcastFrameCommand({ type: 'FRAME_END_PICKING', pickSessionId: session }).catch(
					() => undefined
				);
			}
			throw error;
		}
	}

	private scheduleFrameRefresh(session: string): void {
		if (this.frameRefreshTimer) clearTimeout(this.frameRefreshTimer);
		this.frameRefreshTimer = setTimeout(() => {
			this.frameRefreshTimer = undefined;
			void this.refreshPickerTargets(session).catch((error) => broadcastError(toUserMessage(error)));
		}, 100);
	}

	private async refreshPickerTargets(session: string): Promise<void> {
		const response = await this.route({ type: 'ENSURE_FRAME_AGENTS' });
		if (!response.ok) throw new Error(response.error ?? 'Unable to refresh the media list.');
		if (this.activePickSessionId !== session || this.pickResolved) return;
		const refreshed = await this.broadcastFrameCommand({
			type: 'FRAME_BEGIN_PICKING',
			pickSessionId: session,
			direct: this.directPicking,
		});
		if (!refreshed.ok) throw new Error(refreshed.error ?? 'Unable to refresh the media list.');
	}

	private closePickerList(): void {
		if (this.frameRefreshTimer) clearTimeout(this.frameRefreshTimer);
		this.frameRefreshTimer = undefined;
		this.pickerList?.dispose();
		this.pickerList = undefined;
		this.pickerFrames.clear();
		this.retiredPickerRuntimes.clear();
	}

	private async cancelPicking(): Promise<void> {
		const session = this.activePickSessionId;
		if (!session) return;
		this.directPicking = false;
		if (!this.activeOverlay && this.controlPanel) {
			this.controlPanel.updatePickingState(false);
			this.pickerList?.setDirectMode(false);
			broadcastPickingCancelled();
			try {
				const response = await this.broadcastFrameCommand({
					type: 'FRAME_BEGIN_PICKING',
					pickSessionId: session,
					direct: false,
				});
				if (!response.ok) throw new Error(response.error ?? 'Unable to stop direct selection.');
			} catch (error) {
				broadcastError(toUserMessage(error));
			}
			return;
		}
		this.activePickSessionId = undefined;
		this.closePickerList();
		this.controlPanel?.updatePickingState(false);
		broadcastPickingCancelled();
		try {
			await this.broadcastFrameCommand({ type: 'FRAME_END_PICKING', pickSessionId: session });
		} catch (error) {
			broadcastError(toUserMessage(error));
		}
	}

	private async selectPickerTarget(frame: FrameTargets, target: PickerTargetSummary): Promise<void> {
		const session = this.activePickSessionId;
		if (!session || this.pickResolved || this.pickerFrames.get(frame.frameId)?.runtimeId !== frame.runtimeId)
			return;
		const response = await this.route({
			type: 'SEND_FRAME_COMMAND',
			frameId: frame.frameId,
			command: {
				type: 'FRAME_SELECT_TARGET',
				runtimeId: frame.runtimeId,
				pickSessionId: session,
				targetId: target.id,
			},
		}).catch((error: unknown): RuntimeAck => ({
			ok: false,
			error: toUserMessage(error),
			errorCategory: 'transport',
		}));
		if (!response.ok && this.activePickSessionId === session) {
			if (
				(response.errorCategory === 'stale-runtime' || response.errorCategory === 'transport') &&
				this.pickerFrames.get(frame.frameId)?.runtimeId === frame.runtimeId
			) {
				this.pickerFrames.delete(frame.frameId);
				this.pickerList?.update([...this.pickerFrames.values()]);
			}
			this.controlPanel?.setNotice(response.error ?? 'The selected media is unavailable.');
			broadcastError(response.error ?? 'The selected media is unavailable.');
		}
	}

	private async highlightPickerTarget(frame: FrameTargets, target?: PickerTargetSummary): Promise<void> {
		const session = this.activePickSessionId;
		if (!session) return;
		await this.route({
			type: 'SEND_FRAME_COMMAND',
			frameId: frame.frameId,
			command: {
				type: 'FRAME_HIGHLIGHT_TARGET',
				runtimeId: frame.runtimeId,
				pickSessionId: session,
				targetId: target?.id,
			},
		}).catch(() => undefined);
	}

	private async createOverlayInFrame(
		frameId: number,
		runtimeId: string,
		targetToken: string,
		pickSessionId: string
	): Promise<void> {
		try {
			if (this.activePickSessionId === pickSessionId) {
				this.activePickSessionId = undefined;
				this.closePickerList();
			}
			const ended = await this.broadcastFrameCommand({ type: 'FRAME_END_PICKING', pickSessionId });
			if (!ended.ok) throw new Error(ended.error ?? 'Unable to finish media selection.');
			await this.createOverlayForTarget(frameId, runtimeId, targetToken);
			this.pickResolved = false;
			this.controlPanel?.updatePickingState(false);
		} catch (error) {
			this.controlPanel?.updatePickingState(false);
			this.pickResolved = false;
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
		this.ownerVersion++;
		this.ownerStateRevision = response.stateRevision ?? -1;
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
		this.applyOwnerResponse(await this.sendToOwner({ type: 'FRAME_REMOVE_OVERLAY', overlayId: id }));
	}

	private async removeAll(): Promise<void> {
		if (this.activeOverlay) this.applyOwnerResponse(await this.sendToOwner({ type: 'FRAME_REMOVE_ALL' }));
	}

	private async sendToOwner(command: OwnerFrameCommand): Promise<RuntimeAck> {
		const active = this.activeOverlay;
		if (!active) return { ok: true, overlays: [] };
		const operation = this.ownerCommandQueue.then(async () => {
			if (this.activeOverlay?.owner !== active.owner) throw new Error('The overlay is no longer available.');
			const version = this.ownerVersion;
			let response: RuntimeAck;
			try {
				response = await this.route({
					type: 'SEND_FRAME_COMMAND',
					frameId: active.owner.frameId,
					command: { ...command, runtimeId: active.owner.runtimeId } as FrameCommand,
				});
			} catch (error) {
				response = { ok: false, error: toUserMessage(error), errorCategory: 'transport' };
			}
			if (this.activeOverlay?.owner !== active.owner) return response;
			if (response.errorCategory === 'transport') {
				try {
					const probe = await this.route({
						type: 'SEND_FRAME_COMMAND',
						frameId: active.owner.frameId,
						command: { type: 'FRAME_PING', runtimeId: active.owner.runtimeId },
					});
					if (probe.errorCategory === 'stale-runtime') response.errorCategory = 'stale-runtime';
				} catch {
					/* Preserve ownership when the frame cannot be reached. */
				}
			}
			if (this.activeOverlay?.owner === active.owner && this.ownerVersion === version) {
				if (response.errorCategory === 'stale-runtime') {
					this.activeOverlay = undefined;
					this.ownerVersion++;
				} else if (
					response.overlays &&
					(response.stateRevision === undefined || response.stateRevision >= this.ownerStateRevision)
				) {
					this.ownerStateRevision = response.stateRevision ?? this.ownerStateRevision;
					const descriptor = response.overlays.find((item) => item.id === active.descriptor.id);
					this.activeOverlay = descriptor
						? { owner: active.owner, descriptor: markEmbedded(descriptor, active.owner.frameId) }
						: undefined;
					this.ownerVersion++;
				}
				this.sync();
			}
			if (!response.ok) {
				const message = response.error ?? 'The overlay command failed. Try again.';
				this.controlPanel?.setNotice(message);
				throw new Error(message);
			}
			return response;
		});
		this.ownerCommandQueue = operation.then(
			() => undefined,
			() => undefined
		);
		return operation;
	}

	private async broadcastFrameCommand(command: FrameCommand): Promise<RuntimeAck> {
		return this.route({ type: 'BROADCAST_FRAME_COMMAND', command });
	}

	private async route(message: FrameRoutingMessage): Promise<RuntimeAck> {
		return sendMessageToRuntime<RuntimeAck>(message);
	}

	private applyOwnerResponse(response: RuntimeAck): void {
		if (!response.ok) throw new Error(response.error ?? 'The overlay command failed.');
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
		if (!this.activeOverlay) await this.ensurePassivePicker();
	}

	private async ensureControlPanel(): Promise<void> {
		if (this.controlPanel) return;
		const { ControlPanel } = await import('../../widgets/overlay-panel/control-panel');
		this.controlPanel = new ControlPanel({
			headerFontUrl: this.headerFontUrl,
			initialPlacement: this.panelPlacement,
			allowCustomFontUpload: true,
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
		const session = this.activePickSessionId;
		this.activePickSessionId = undefined;
		this.directPicking = false;
		this.closePickerList();
		if (session)
			void this.broadcastFrameCommand({ type: 'FRAME_END_PICKING', pickSessionId: session }).catch(
				() => undefined
			);
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
		if (this.controlPanel && !this.activeOverlay && !this.activePickSessionId && !this.pickResolved)
			void this.ensurePassivePicker();
	}

	private ensurePassivePicker(): Promise<void> {
		if (!this.passiveStartup) {
			this.passiveStartup = this.startPicking(false)
				.catch((error) => {
					const message = toUserMessage(error);
					this.controlPanel?.setNotice(message);
					broadcastError(message);
				})
				.finally(() => {
					this.passiveStartup = undefined;
				});
		}
		return this.passiveStartup;
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
