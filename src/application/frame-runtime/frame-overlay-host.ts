import type { OverlayDescriptor } from '../../domain/overlay/overlay-settings';
import { toUserMessage } from '../../shared/errors/errors';
import * as runtimeFontRegistry from '../../shared/fonts/runtime-font-registry';
import type { FrameCommand, RuntimeAck } from '../../shared/messaging/messages';
import { OverlayManager } from '../../features/textmode-overlay/overlay-manager';
import { getFrameAgent, type FrameAgent } from './frame-agent';
import type { FrameOverlayPort } from './frame-overlay-port';

declare global {
	interface Window {
		__textmodeFrameOverlayHost?: FrameOverlayHost;
	}
}

export class FrameOverlayHost implements FrameOverlayPort {
	private readonly manager = new OverlayManager(() => this.agent.emitOverlayState(this.list()));
	private readonly ready = runtimeFontRegistry.initialize();

	public constructor(private readonly agent: FrameAgent) {
		runtimeFontRegistry.subscribe((change) => {
			for (const id of change.removedIds) {
				void this.manager.revertOverlaysUsingFont(id).catch(() => undefined);
			}
		});
	}

	public list(): OverlayDescriptor[] {
		return this.manager.list();
	}

	public async handle(command: FrameCommand): Promise<RuntimeAck> {
		try {
			switch (command.type) {
				case 'FRAME_CREATE_OVERLAY': {
					await this.ready;
					const element = this.agent.consumePendingTarget(command.targetToken);
					if (!element) {
						return { ok: false, error: 'The selected media target is no longer available.' };
					}
					await this.manager.createOverlay(element, command.settings, command.overlayId);
					return { ok: true, overlays: this.list() };
				}
				case 'FRAME_UPDATE_OVERLAY':
					return {
						ok: true,
						overlays: await this.manager.updateOverlay(command.overlayId, command.settings),
					};
				case 'FRAME_EXPORT_OVERLAY':
					return { ok: true, overlays: await this.manager.exportOverlay(command.overlayId, command.format) };
				case 'FRAME_REMOVE_OVERLAY':
					return { ok: true, overlays: this.manager.removeOverlay(command.overlayId) };
				case 'FRAME_PAUSE_ALL':
					return { ok: true, overlays: this.manager.pauseAll() };
				case 'FRAME_RESUME_ALL':
					return { ok: true, overlays: this.manager.resumeAll() };
				case 'FRAME_REMOVE_ALL':
					return { ok: true, overlays: this.manager.removeAll() };
				case 'FRAME_PING':
				case 'FRAME_BEGIN_PICKING':
				case 'FRAME_END_PICKING':
					return { ok: true, overlays: this.list() };
			}
		} catch (error) {
			return { ok: false, error: toUserMessage(error), overlays: this.list() };
		}
	}
}

export function startFrameOverlayHost(): FrameOverlayHost {
	if (window.__textmodeFrameOverlayHost) return window.__textmodeFrameOverlayHost;
	const agent = getFrameAgent();
	if (!agent) {
		throw new Error('The frame agent must be started before the overlay renderer.');
	}
	const host = new FrameOverlayHost(agent);
	window.__textmodeFrameOverlayHost = host;
	agent.attachOverlayHost(host);
	return host;
}
