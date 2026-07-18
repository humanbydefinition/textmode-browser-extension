import type { OverlayDescriptor } from '../../domain/overlay/overlay-settings';
import type { FrameCommand, RuntimeAck } from '../../shared/messaging/messages';

export interface FrameOverlayPort {
	handle(command: FrameCommand): Promise<RuntimeAck>;
	list(): OverlayDescriptor[];
}
