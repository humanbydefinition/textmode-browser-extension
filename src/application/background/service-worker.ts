import { addActionClickedListener, addInstalledListener, sendMessageToTab } from '../../shared/browser/browser-api';
import { ensureContentRuntime } from './runtime-injection';

export function startBackgroundServiceWorker(): void {
	addInstalledListener(() => {
		console.info('textmode installed.');
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
