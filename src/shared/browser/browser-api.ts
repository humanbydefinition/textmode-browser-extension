import { browser, type Browser } from 'wxt/browser';
import type { RuntimeMessage } from '../messaging/messages';

const CONTENT_SCRIPT_FILE = '/content-runtime.js';
const OVERLAY_HOST_FILE = '/overlay-host.js';

export type RuntimeMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0];
export type ActionClickedListener = Parameters<typeof browser.action.onClicked.addListener>[0];
type ToolbarActionApi = typeof browser.action | typeof browser.browserAction;
type StorageLocalApi = Pick<typeof browser.storage.local, 'get' | 'set' | 'remove'>;
export type StorageChangedListener = Parameters<typeof browser.storage.onChanged.addListener>[0];
type BrowserWithOptionalToolbarApis = typeof browser & {
	action?: typeof browser.action;
	browserAction?: typeof browser.browserAction;
};

export interface BrowserPort {
	getActiveTab(): Promise<Browser.tabs.Tab | undefined>;
	getExtensionAssetUrl(path: string): string;
	injectContentRuntime(tabId: number): Promise<void>;
	injectOverlayHost(tabId: number, frameId: number): Promise<void>;
	sendMessageToTab<TResponse>(tabId: number, message: RuntimeMessage): Promise<TResponse>;
	sendMessageToFrame<TResponse>(tabId: number, frameId: number, message: RuntimeMessage): Promise<TResponse>;
	broadcastMessageToTab(tabId: number, message: RuntimeMessage): Promise<void>;
	sendMessageToRuntime<TResponse>(message: RuntimeMessage): Promise<TResponse>;
	addRuntimeMessageListener(listener: RuntimeMessageListener): void;
	addInstalledListener(listener: () => void): void;
	addActionClickedListener(listener: ActionClickedListener): void;
	storageLocalGet<TValue>(key: string): Promise<TValue | undefined>;
	storageLocalGetAll(): Promise<Record<string, unknown>>;
	storageLocalSet(record: Record<string, unknown>): Promise<void>;
	storageLocalRemove(key: string): Promise<void>;
	addStorageChangedListener(listener: StorageChangedListener): () => void;
}

export function createStorageLocalPort(
	storageArea: StorageLocalApi
): Pick<BrowserPort, 'storageLocalGet' | 'storageLocalGetAll' | 'storageLocalSet' | 'storageLocalRemove'> {
	return {
		async storageLocalGet<TValue>(key: string) {
			const record = (await storageArea.get(key)) as Record<string, TValue | undefined>;
			return record[key];
		},
		async storageLocalGetAll() {
			return (await storageArea.get(null)) as Record<string, unknown>;
		},
		async storageLocalSet(record) {
			await storageArea.set(record);
		},
		async storageLocalRemove(key) {
			await storageArea.remove(key);
		},
	};
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
		await executeScriptFile(tabId, CONTENT_SCRIPT_FILE, { allFrames: true });
	},
	async injectOverlayHost(tabId, frameId) {
		await executeScriptFile(tabId, OVERLAY_HOST_FILE, { frameId });
	},
	async sendMessageToTab<TResponse>(tabId: number, message: RuntimeMessage) {
		return browser.tabs.sendMessage(tabId, message, { frameId: 0 }) as Promise<TResponse>;
	},
	async sendMessageToFrame<TResponse>(tabId: number, frameId: number, message: RuntimeMessage) {
		return browser.tabs.sendMessage(tabId, message, { frameId }) as Promise<TResponse>;
	},
	async broadcastMessageToTab(tabId, message) {
		await browser.tabs.sendMessage(tabId, message).then(
			() => undefined,
			(error: unknown) => {
				if (!isMissingReceiverError(error)) throw error;
			}
		);
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
	storageLocalGet(key) {
		return createStorageLocalPort(browser.storage.local).storageLocalGet(key);
	},
	storageLocalGetAll() {
		return createStorageLocalPort(browser.storage.local).storageLocalGetAll();
	},
	storageLocalSet(record) {
		return createStorageLocalPort(browser.storage.local).storageLocalSet(record);
	},
	storageLocalRemove(key) {
		return createStorageLocalPort(browser.storage.local).storageLocalRemove(key);
	},
	addStorageChangedListener(listener) {
		browser.storage.onChanged.addListener(listener);
		return () => browser.storage.onChanged.removeListener(listener);
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
export const injectOverlayHost = browserPort.injectOverlayHost;
export const sendMessageToTab = browserPort.sendMessageToTab;
export const sendMessageToFrame = browserPort.sendMessageToFrame;
export const broadcastMessageToTab = browserPort.broadcastMessageToTab;
export const sendMessageToRuntime = browserPort.sendMessageToRuntime;
export const addRuntimeMessageListener = browserPort.addRuntimeMessageListener;
export const addInstalledListener = browserPort.addInstalledListener;
export const addActionClickedListener = browserPort.addActionClickedListener;
export const storageLocalGet = browserPort.storageLocalGet;
export const storageLocalGetAll = browserPort.storageLocalGetAll;
export const storageLocalSet = browserPort.storageLocalSet;
export const storageLocalRemove = browserPort.storageLocalRemove;
export const addStorageChangedListener = browserPort.addStorageChangedListener;

interface ScriptTarget {
	allFrames?: boolean;
	frameId?: number;
}

type LegacyTabsApi = typeof browser.tabs & {
	executeScript?: (
		tabId: number,
		details: { file: string; allFrames?: boolean; frameId?: number }
	) => Promise<unknown>;
};

async function executeScriptFile(tabId: number, file: string, target: ScriptTarget): Promise<void> {
	if (browser.scripting?.executeScript) {
		if (target.allFrames) {
			await browser.scripting.executeScript({ target: { tabId, allFrames: true }, files: [file] });
		} else {
			await browser.scripting.executeScript({
				target: { tabId, ...(target.frameId !== undefined ? { frameIds: [target.frameId] } : {}) },
				files: [file],
			});
		}
		return;
	}

	const legacyTabs = browser.tabs as LegacyTabsApi;
	if (!legacyTabs.executeScript) {
		throw new Error('This browser does not support frame script injection.');
	}
	await legacyTabs.executeScript(tabId, {
		file,
		...(target.allFrames ? { allFrames: true } : {}),
		...(target.frameId !== undefined ? { frameId: target.frameId } : {}),
	});
}

function isMissingReceiverError(error: unknown): boolean {
	return error instanceof Error && error.message.includes('Receiving end does not exist');
}
