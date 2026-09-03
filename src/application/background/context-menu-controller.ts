import {
	addContextMenuClickedListener,
	replaceContextMenu,
	sendMessageToTab,
	type ContextMenuClickData,
	type ContextMenuClickedListener,
} from '../../shared/browser/browser-api';
import { ensureContentRuntime } from './runtime-injection';

export const APPLY_OVERLAY_CONTEXT_MENU_ID = 'textmode.apply-overlay';
export const APPLY_OVERLAY_CONTEXT_MENU_TITLE = 'Open Textmode Overlay';

export interface ContextMenuControllerDependencies {
	replaceMenu(item: { id: string; title: string; contexts: ['page', 'video'] }): Promise<void>;
	addContextMenuListener(listener: ContextMenuClickedListener): void;
	ensureRuntime(tabId: number): Promise<void>;
	sendToTab(tabId: number, message: { type: 'TOGGLE_OVERLAY' }): Promise<unknown>;
}

export class ContextMenuController {
	private installQueue = Promise.resolve();

	public constructor(private readonly deps: ContextMenuControllerDependencies) {}

	public attach(): void {
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

	private async handleMenuClick(info: ContextMenuClickData, tabId: number | undefined): Promise<void> {
		if (info.menuItemId !== APPLY_OVERLAY_CONTEXT_MENU_ID || tabId === undefined) return;
		try {
			await this.deps.ensureRuntime(tabId);
			await this.deps.sendToTab(tabId, { type: 'TOGGLE_OVERLAY' });
		} catch (error) {
			console.error('Failed to open Textmode Overlay from the context menu:', error);
		}
	}
}

export function createContextMenuController(
	deps: Partial<ContextMenuControllerDependencies> = {}
): ContextMenuController {
	return new ContextMenuController({
		replaceMenu: deps.replaceMenu ?? replaceContextMenu,
		addContextMenuListener: deps.addContextMenuListener ?? addContextMenuClickedListener,
		ensureRuntime: deps.ensureRuntime ?? ensureContentRuntime,
		sendToTab: deps.sendToTab ?? sendMessageToTab,
	});
}
