import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { toUserMessage } from '../../shared/errors/errors';
import type { PopupToContentMessage, RuntimeAck } from '../../shared/messaging/messages';

export interface RuntimeActionDependencies {
	toggleControlPanel(): Promise<void>;
	startPicking(): void;
	listOverlays(): OverlayDescriptor[];
	updateOverlay(id: string, settings: Partial<OverlaySettings>): OverlayDescriptor[];
	exportOverlay(id: string, format: OverlayExportFormat): Promise<OverlayDescriptor[]>;
	removeOverlay(id: string): OverlayDescriptor[];
	pauseAll(): OverlayDescriptor[];
	resumeAll(): OverlayDescriptor[];
	removeAll(): OverlayDescriptor[];
	broadcastError(message: string): void;
}

export interface RuntimeActionHandler {
	handle(message: PopupToContentMessage): Promise<RuntimeAck>;
}

export function createRuntimeActionHandler(deps: RuntimeActionDependencies): RuntimeActionHandler {
	return {
		async handle(message) {
			try {
				switch (message.type) {
					case 'TOGGLE_OVERLAY':
						await deps.toggleControlPanel();
						return { ok: true, overlays: deps.listOverlays() };
					case 'START_PICKING':
						deps.startPicking();
						return { ok: true, overlays: deps.listOverlays() };
					case 'LIST_OVERLAYS':
						return { ok: true, overlays: deps.listOverlays() };
					case 'UPDATE_OVERLAY':
						return { ok: true, overlays: deps.updateOverlay(message.id, message.settings) };
					case 'EXPORT_OVERLAY':
						return { ok: true, overlays: await deps.exportOverlay(message.id, message.format) };
					case 'REMOVE_OVERLAY':
						return { ok: true, overlays: deps.removeOverlay(message.id) };
					case 'PAUSE_ALL':
						return { ok: true, overlays: deps.pauseAll() };
					case 'RESUME_ALL':
						return { ok: true, overlays: deps.resumeAll() };
					case 'REMOVE_ALL':
						return { ok: true, overlays: deps.removeAll() };
				}
			} catch (error) {
				const messageText = toUserMessage(error);
				deps.broadcastError(messageText);
				return { ok: false, error: messageText, overlays: deps.listOverlays() };
			}
		},
	};
}
