import {
	addContextMenuClickedListener,
	addRuntimeMessageListener,
	replaceContextMenu,
	sendMessageToFrame,
	sendMessageToTab,
	type ContextMenuClickData,
	type ContextMenuClickedListener,
	type RuntimeMessageListener,
} from '../../shared/browser/browser-api';
import {
	FRAME_RUNTIME_READY_PROBE,
	isContextTargetMessage,
	type ContextTargetMessage,
	type RuntimeAck,
} from '../../shared/messaging/messages';
import { ensureContentRuntime } from './runtime-injection';

export const APPLY_OVERLAY_CONTEXT_MENU_ID = 'textmode.apply-overlay';
export const APPLY_OVERLAY_CONTEXT_MENU_TITLE = 'Apply Textmode Overlay';
export const CONTEXT_TARGET_MAX_AGE_MS = 30_000;

interface ContextTargetRecord {
	tabId: number;
	frameId: number;
	targetToken: string;
	capturedAt: number;
}

export interface ContextMenuControllerDependencies {
	now(): number;
	replaceMenu(item: { id: string; title: string; contexts: ['page', 'video'] }): Promise<void>;
	addContextMenuListener(listener: ContextMenuClickedListener): void;
	addRuntimeListener(listener: RuntimeMessageListener): void;
	ensureRuntime(tabId: number): Promise<void>;
	sendToFrame(tabId: number, frameId: number, message: typeof FRAME_RUNTIME_READY_PROBE): Promise<RuntimeAck>;
	sendToTab(tabId: number, message: import('../../shared/messaging/messages').RuntimeMessage): Promise<RuntimeAck>;
}

export class ContextMenuController {
	private readonly targets = new Map<string, ContextTargetRecord>();
	private installQueue = Promise.resolve();

	public constructor(private readonly deps: ContextMenuControllerDependencies) {}

	public attach(): void {
		this.deps.addRuntimeListener((message, sender, sendResponse) => {
			if (!isContextTargetMessage(message)) return;
			this.handleTargetMessage(message, sender).then(sendResponse);
			return true;
		});
		this.deps.addContextMenuListener((info, tab) => {
			void this.handleMenuClick(info, tab?.id);
		});
	}

	public async install(): Promise<void> {
		const installation = this.installQueue.then(() =>
			this.deps.replaceMenu({
				id: APPLY_OVERLAY_CONTEXT_MENU_ID,
				title: APPLY_OVERLAY_CONTEXT_MENU_TITLE,
				contexts: ['page', 'video'],
			})
		);
		this.installQueue = installation.catch(() => undefined);
		await installation;
	}

	private async handleTargetMessage(
		message: ContextTargetMessage,
		sender: Parameters<RuntimeMessageListener>[1]
	): Promise<RuntimeAck> {
		const tabId = sender.tab?.id;
		if (tabId === undefined) return { ok: false, error: 'Context target capture requires a browser tab.' };
		const frameId = sender.frameId ?? 0;
		const key = getTargetKey(tabId, frameId);
		if (message.type === 'CONTEXT_TARGET_CLEARED') {
			this.targets.delete(key);
			return { ok: true };
		}
		this.targets.set(key, { tabId, frameId, targetToken: message.targetToken, capturedAt: this.deps.now() });
		return { ok: true };
	}

	private async handleMenuClick(info: ContextMenuClickData, tabId: number | undefined): Promise<void> {
		if (info.menuItemId !== APPLY_OVERLAY_CONTEXT_MENU_ID || tabId === undefined) return;
		const frameId = info.frameId ?? 0;
		const target = this.consumeTarget(tabId, frameId);
		try {
			await this.deps.ensureRuntime(tabId);
			if (!target) {
				await this.deps.sendToTab(tabId, {
					type: 'SHOW_CONTEXT_TARGET_ERROR',
					message: 'Right-click a visible canvas or video to apply a Textmode Overlay.',
				});
				return;
			}
			const probe = await this.deps.sendToFrame(tabId, frameId, FRAME_RUNTIME_READY_PROBE);
			if (!probe.ok || !probe.runtimeId) {
				throw new Error(probe.error ?? 'The selected frame is no longer available.');
			}
			await this.deps.sendToTab(tabId, {
				type: 'APPLY_CONTEXT_TARGET',
				frameId,
				runtimeId: probe.runtimeId,
				targetToken: target.targetToken,
			});
		} catch (error) {
			console.error('Failed to apply Textmode Overlay from the context menu:', error);
		}
	}

	private consumeTarget(tabId: number, frameId: number): ContextTargetRecord | undefined {
		const key = getTargetKey(tabId, frameId);
		const target = this.targets.get(key);
		this.targets.delete(key);
		if (!target || this.deps.now() - target.capturedAt > CONTEXT_TARGET_MAX_AGE_MS) return undefined;
		return target;
	}
}

export function createContextMenuController(
	deps: Partial<ContextMenuControllerDependencies> = {}
): ContextMenuController {
	return new ContextMenuController({
		now: deps.now ?? Date.now,
		replaceMenu: deps.replaceMenu ?? replaceContextMenu,
		addContextMenuListener: deps.addContextMenuListener ?? addContextMenuClickedListener,
		addRuntimeListener: deps.addRuntimeListener ?? addRuntimeMessageListener,
		ensureRuntime: deps.ensureRuntime ?? ensureContentRuntime,
		sendToFrame: deps.sendToFrame ?? sendMessageToFrame,
		sendToTab: deps.sendToTab ?? sendMessageToTab,
	});
}

function getTargetKey(tabId: number, frameId: number): string {
	return `${tabId}:${frameId}`;
}
