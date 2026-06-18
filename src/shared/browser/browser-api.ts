import { browser, type Browser } from 'wxt/browser';
import type { RuntimeMessage } from '../messaging/messages';

const CONTENT_SCRIPT_FILE = '/content-runtime.js';

export type RuntimeMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0];
export type ActionClickedListener = Parameters<typeof browser.action.onClicked.addListener>[0];
type ToolbarActionApi = typeof browser.action | typeof browser.browserAction;
type BrowserWithOptionalToolbarApis = typeof browser & {
	action?: typeof browser.action;
	browserAction?: typeof browser.browserAction;
};

export interface BrowserPort {
	getActiveTab(): Promise<Browser.tabs.Tab | undefined>;
	getExtensionAssetUrl(path: string): string;
	injectContentRuntime(tabId: number): Promise<void>;
	sendMessageToTab<TResponse>(tabId: number, message: RuntimeMessage): Promise<TResponse>;
	sendMessageToRuntime<TResponse>(message: RuntimeMessage): Promise<TResponse>;
	addRuntimeMessageListener(listener: RuntimeMessageListener): void;
	addInstalledListener(listener: () => void): void;
	addActionClickedListener(listener: ActionClickedListener): void;
}

export const browserPort: BrowserPort = {
	async getActiveTab() {
		const tabs = await browser.tabs.query({ active: true, currentWindow: true });
		return tabs[0];
	},
	getExtensionAssetUrl(path) {
		return chrome.runtime.getURL(path);
	},
	async injectContentRuntime(tabId) {
		await browser.scripting.executeScript({
			target: { tabId },
			files: [CONTENT_SCRIPT_FILE],
		});
	},
	async sendMessageToTab<TResponse>(tabId: number, message: RuntimeMessage) {
		return browser.tabs.sendMessage(tabId, message) as Promise<TResponse>;
	},
	async sendMessageToRuntime<TResponse>(message: RuntimeMessage) {
		return browser.runtime.sendMessage(message) as Promise<TResponse>;
	},
	addRuntimeMessageListener(listener) {
		browser.runtime.onMessage.addListener(listener);
	},
	addInstalledListener(listener) {
		browser.runtime.onInstalled.addListener(listener);
	},
	addActionClickedListener(listener) {
		resolveToolbarActionApi(browser).onClicked.addListener(listener);
	},
};

export function resolveToolbarActionApi(api: BrowserWithOptionalToolbarApis): ToolbarActionApi {
	const toolbarAction = api.action ?? api.browserAction;
	if (!toolbarAction) {
		throw new Error('No browser toolbar action API is available.');
	}
	return toolbarAction;
}

export const getActiveTab = browserPort.getActiveTab;
export const getExtensionAssetUrl = browserPort.getExtensionAssetUrl;
export const injectContentRuntime = browserPort.injectContentRuntime;
export const sendMessageToTab = browserPort.sendMessageToTab;
export const sendMessageToRuntime = browserPort.sendMessageToRuntime;
export const addRuntimeMessageListener = browserPort.addRuntimeMessageListener;
export const addInstalledListener = browserPort.addInstalledListener;
export const addActionClickedListener = browserPort.addActionClickedListener;
