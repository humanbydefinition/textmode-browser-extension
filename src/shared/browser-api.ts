import type { RuntimeMessage } from './messages';

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	return tabs[0];
}

export async function injectContentRuntime(tabId: number): Promise<void> {
	await chrome.scripting.executeScript({
		target: { tabId },
		files: ['content-bootstrap.js'],
	});
}

export async function sendMessageToTab<TResponse>(tabId: number, message: RuntimeMessage): Promise<TResponse> {
	return chrome.tabs.sendMessage(tabId, message);
}

export async function sendMessageToRuntime<TResponse>(message: RuntimeMessage): Promise<TResponse> {
	return chrome.runtime.sendMessage(message);
}
