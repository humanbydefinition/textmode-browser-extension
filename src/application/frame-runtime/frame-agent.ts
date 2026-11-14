import { ElementPicker, type SelectableElement } from '../../features/media-picker/element-picker';
import { addRuntimeMessageListener, sendMessageToRuntime } from '../../shared/browser/browser-api';
import { isFrameCommand, type FrameCommand, type FrameEvent, type RuntimeAck } from '../../shared/messaging/messages';
import type { FrameOverlayPort } from './frame-overlay-port';

declare global {
	interface Window {
		__textmodeFrameAgent?: FrameAgent;
	}
}

export class FrameAgent {
	public readonly runtimeId = createRuntimeId();
	private picker?: ElementPicker;
	private activePickSessionId?: string;
	private pendingTarget?: { token: string; element: SelectableElement };
	private overlayHost?: FrameOverlayPort;
	private stateRevision = 0;
	private pickerRevision = 0;
	private readonly endedPickSessions = new Set<string>();

	public constructor() {
		addRuntimeMessageListener((message: unknown, _sender, sendResponse) => {
			if (!isFrameCommand(message)) return;
			void this.handleCommand(message).then(sendResponse);
			return true;
		});
		window.addEventListener('pagehide', this.onPageHide);
		window.addEventListener('pageshow', this.onPageShow);
	}

	public attachOverlayHost(host: FrameOverlayPort): void {
		this.overlayHost = host;
		this.emitOverlayState(host.list());
	}

	public consumePendingTarget(token: string): SelectableElement | undefined {
		if (this.pendingTarget?.token === token) {
			const element = this.pendingTarget.element;
			this.pendingTarget = undefined;
			return element;
		}
		return undefined;
	}

	public emitOverlayState(overlays = this.overlayHost?.list() ?? []): void {
		this.emit({
			type: 'FRAME_OVERLAY_STATE',
			runtimeId: this.runtimeId,
			revision: ++this.stateRevision,
			overlays: markEmbeddedDescriptors(overlays),
		});
	}

	private async handleCommand(command: FrameCommand): Promise<RuntimeAck> {
		if ('runtimeId' in command && command.runtimeId && command.runtimeId !== this.runtimeId) {
			return {
				ok: false,
				error: 'The target iframe navigated and is no longer available.',
				errorCategory: 'stale-runtime',
			};
		}

		switch (command.type) {
			case 'FRAME_PING':
				return { ok: true, runtimeId: this.runtimeId };
			case 'FRAME_BEGIN_PICKING':
				if (this.endedPickSessions.has(command.pickSessionId)) return { ok: true };
				if (this.activePickSessionId === command.pickSessionId) {
					if (command.direct !== undefined) this.picker?.setDirectMode(command.direct);
					this.picker?.refresh();
					return { ok: true };
				}
				this.beginPicking(command.pickSessionId, command.direct ?? true);
				return { ok: true };
			case 'FRAME_SELECT_TARGET':
				if (this.activePickSessionId !== command.pickSessionId || !this.picker)
					return { ok: false, error: 'Media selection has ended.', errorCategory: 'operation' };
				return this.picker.activateTarget(command.targetId)
					? { ok: true }
					: { ok: false, error: 'The selected media is no longer available.', errorCategory: 'operation' };
			case 'FRAME_HIGHLIGHT_TARGET':
				if (this.activePickSessionId === command.pickSessionId) this.picker?.highlightTarget(command.targetId);
				return { ok: true };
			case 'FRAME_END_PICKING':
				this.rememberEndedSession(command.pickSessionId);
				if (this.activePickSessionId === command.pickSessionId) this.stopPicking(false);
				return { ok: true };
			default:
				if (!this.overlayHost) {
					return { ok: false, error: 'The textmode renderer is not ready in the selected frame.' };
				}
				return { ...(await this.overlayHost.handle(command)), stateRevision: this.stateRevision };
		}
	}

	private beginPicking(pickSessionId: string, direct: boolean): void {
		this.stopPicking(false);
		this.pendingTarget = undefined;
		this.activePickSessionId = pickSessionId;
		this.pickerRevision = 0;
		this.picker = new ElementPicker({
			restoreFocus: false,
			onDirectCancel: () =>
				this.emit({ type: 'FRAME_PICKING_CANCELLED', pickSessionId, runtimeId: this.runtimeId }),
			onFrameStructureChanged: () =>
				this.emit({ type: 'FRAME_STRUCTURE_CHANGED', pickSessionId, runtimeId: this.runtimeId }),
			onTargetsChanged: (targets) =>
				this.emit({
					type: 'FRAME_PICKER_TARGETS',
					pickSessionId,
					runtimeId: this.runtimeId,
					frameTitle: getFrameTitle(),
					revision: ++this.pickerRevision,
					targets,
				}),
			onPick: (element) => {
				if (this.activePickSessionId !== pickSessionId) return;
				this.rememberEndedSession(pickSessionId);
				const targetToken = createRuntimeId();
				this.pendingTarget = { token: targetToken, element };
				this.picker = undefined;
				this.activePickSessionId = undefined;
				this.emit({
					type: 'FRAME_TARGET_PICKED',
					pickSessionId,
					runtimeId: this.runtimeId,
					targetToken,
				});
			},
			onCancel: () => {
				if (this.activePickSessionId !== pickSessionId) return;
				this.rememberEndedSession(pickSessionId);
				this.picker = undefined;
				this.activePickSessionId = undefined;
				this.emit({ type: 'FRAME_PICKING_CANCELLED', pickSessionId, runtimeId: this.runtimeId });
			},
			onUnavailableFrame: (reason) => {
				this.emit({
					type: 'FRAME_UNAVAILABLE_IFRAME',
					pickSessionId,
					runtimeId: this.runtimeId,
					reason,
				});
			},
		});
		this.picker.start(direct);
	}

	private rememberEndedSession(session: string): void {
		this.endedPickSessions.add(session);
		if (this.endedPickSessions.size > 32)
			this.endedPickSessions.delete(this.endedPickSessions.values().next().value!);
	}

	private stopPicking(cancelled: boolean): void {
		const picker = this.picker;
		this.picker = undefined;
		this.activePickSessionId = undefined;
		picker?.stop(cancelled);
	}

	private emit(event: FrameEvent): void {
		void sendMessageToRuntime<RuntimeAck>({ type: 'FRAME_EVENT', event }).catch(() => undefined);
	}

	private readonly onPageHide = (event: PageTransitionEvent): void => {
		const session = this.activePickSessionId;
		this.stopPicking(false);
		if (session) this.emit({ type: 'FRAME_PICKER_CLOSED', pickSessionId: session, runtimeId: this.runtimeId });
		if (!event.persisted) {
			this.emit({ type: 'FRAME_DISPOSING', runtimeId: this.runtimeId });
			void this.overlayHost?.handle({ type: 'FRAME_REMOVE_ALL', runtimeId: this.runtimeId });
		}
	};

	private readonly onPageShow = (event: PageTransitionEvent): void => {
		if (event.persisted) this.emitOverlayState();
	};
}

export function startFrameAgent(): FrameAgent {
	window.__textmodeFrameAgent ??= new FrameAgent();
	return window.__textmodeFrameAgent;
}

export function getFrameAgent(): FrameAgent | undefined {
	return window.__textmodeFrameAgent;
}

function createRuntimeId(): string {
	return typeof crypto.randomUUID === 'function'
		? crypto.randomUUID()
		: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function markEmbeddedDescriptors(
	overlays: readonly import('../../domain/overlay/overlay-settings').OverlayDescriptor[]
) {
	if (window === window.top) return [...overlays];
	return overlays.map((overlay) => ({
		...overlay,
		elementLabel: overlay.elementLabel.includes('— iframe')
			? overlay.elementLabel
			: `${overlay.elementLabel} — iframe`,
	}));
}

function getFrameTitle(): string {
	try {
		return window === window.top ? '' : (window.frameElement?.getAttribute('title')?.trim() ?? '');
	} catch {
		return '';
	}
}
