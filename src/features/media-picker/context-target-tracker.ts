import { sendMessageToRuntime } from '../../shared/browser/browser-api';
import type { RuntimeAck } from '../../shared/messaging/messages';
import { getContextTargetRegistry } from './context-target-registry';
import { isSelectableElement, type SelectableElement } from './picker-target-registry';

export class ContextTargetTracker {
	public start(): void {
		window.addEventListener('contextmenu', this.onContextMenu, true);
	}

	private readonly onContextMenu = (event: MouseEvent): void => {
		if (!event.isTrusted || !isSameOriginFrame()) return;
		const target = findSelectableTarget(event);
		const registry = getContextTargetRegistry();
		if (!target) {
			registry.clear();
			void sendMessageToRuntime<RuntimeAck>({ type: 'CONTEXT_TARGET_CLEARED' }).catch(() => undefined);
			return;
		}

		const targetToken = registry.reserve(target);
		void sendMessageToRuntime<RuntimeAck>({ type: 'CONTEXT_TARGET_CAPTURED', targetToken }).catch(() => undefined);
	};
}

export function startContextTargetTracker(): ContextTargetTracker {
	const tracker = new ContextTargetTracker();
	tracker.start();
	return tracker;
}

function findSelectableTarget(event: Event): SelectableElement | undefined {
	return event
		.composedPath()
		.find((item): item is SelectableElement => item instanceof Element && isSelectableElement(item));
}

function isSameOriginFrame(): boolean {
	const top = window.top;
	if (!top) return false;
	if (window === top) return true;
	try {
		return top.location.origin === window.location.origin;
	} catch {
		return false;
	}
}
