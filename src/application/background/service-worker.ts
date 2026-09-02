import {
	addActionClickedListener,
	addInstalledListener,
	addRuntimeMessageListener,
	sendMessageToTab,
	storageLocalGet,
	storageLocalRemove,
	storageLocalSet,
} from '../../shared/browser/browser-api';
import { ensureContentRuntime } from './runtime-injection';
import { attachCustomFontCoordinatorListener, createCustomFontCoordinator } from './custom-font-coordinator';
import { attachFrameRouterListener } from './frame-router';
import { createContextMenuController } from './context-menu-controller';

export function startBackgroundServiceWorker(): void {
	const coordinator = createCustomFontCoordinator({
		get: storageLocalGet,
		set: storageLocalSet,
		remove: storageLocalRemove,
	});
	attachCustomFontCoordinatorListener(coordinator, addRuntimeMessageListener);
	attachFrameRouterListener();
	const contextMenu = createContextMenuController();
	contextMenu.attach();
	void contextMenu.install().catch((error) => console.warn('Unable to install the textmode context menu:', error));
	void coordinator.cleanup().catch((error) => console.warn('Unable to clean custom font storage:', error));
	addInstalledListener(() => {
		console.info('textmode installed.');
		void contextMenu
			.install()
			.catch((error) => console.warn('Unable to install the textmode context menu:', error));
	});

	addActionClickedListener((tab) => {
		void toggleOverlayForTab(tab.id);
	});
}

async function toggleOverlayForTab(tabId: number | undefined): Promise<void> {
	if (!tabId) return;
	try {
		await ensureContentRuntime(tabId);
		await sendMessageToTab(tabId, { type: 'TOGGLE_OVERLAY' });
	} catch (error) {
		console.error('Failed to toggle textmode overlay:', error);
	}
}
