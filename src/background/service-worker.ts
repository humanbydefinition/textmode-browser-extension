import { injectContentRuntime, sendMessageToTab } from '../shared/browser-api';
import type { RuntimeAck } from '../shared/messages';

chrome.runtime.onInstalled.addListener(() => {
	console.info('textmode installed.');
});

chrome.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;
	try {
		await ensureContentRuntime(tab.id);
		await sendMessageToTab(tab.id, { type: 'TOGGLE_OVERLAY' });
	} catch (error) {
		console.error('Failed to toggle textmode overlay:', error);
	}
});

async function ensureContentRuntime(tabId: number): Promise<void> {
	await injectContentRuntime(tabId);
	for (let attempt = 0; attempt < 20; attempt++) {
		try {
			const response = await sendMessageToTab<RuntimeAck>(tabId, { type: 'PING' });
			if (response.ok) {
				return;
			}
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}
	throw new Error('Timed out while starting the page runtime.');
}
