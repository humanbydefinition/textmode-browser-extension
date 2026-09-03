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
			overlays: markEmbeddedDescriptors(overlays),
		});
	}

	private async handleCommand(command: FrameCommand): Promise<RuntimeAck> {
		if ('runtimeId' in command && command.runtimeId && command.runtimeId !== this.runtimeId) {
			return { ok: false, error: 'The target iframe navigated and is no longer available.' };
		}

		switch (command.type) {
			case 'FRAME_PING':
				return { ok: true, runtimeId: this.runtimeId };
			case 'FRAME_BEGIN_PICKING':
				this.beginPicking(command.pickSessionId);
				return { ok: true };
			case 'FRAME_END_PICKING':
				if (this.activePickSessionId === command.pickSessionId) this.stopPicking(false);
				return { ok: true };
			default:
				if (!this.overlayHost) {
					return { ok: false, error: 'The textmode renderer is not ready in the selected frame.' };
				}
				return this.overlayHost.handle(command);
		}
	}

	private beginPicking(pickSessionId: string): void {
		this.stopPicking(false);
		this.pendingTarget = undefined;
		this.activePickSessionId = pickSessionId;
		this.picker = new ElementPicker({
			restoreFocus: window === window.top,
			onPick: (element) => {
				if (this.activePickSessionId !== pickSessionId) return;
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
		this.picker.start();
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
		this.stopPicking(false);
		if (!event.persisted) {
			void this.overlayHost?.handle({ type: 'FRAME_REMOVE_ALL', runtimeId: this.runtimeId });
			this.emit({ type: 'FRAME_DISPOSING', runtimeId: this.runtimeId });
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
