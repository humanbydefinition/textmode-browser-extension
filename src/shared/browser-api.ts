import { browser, type Browser } from 'wxt/browser';
import type { RuntimeMessage } from './messages';

const CONTENT_SCRIPT_FILE = '/content-runtime.js';

export type RuntimeMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0];
export type ActionClickedListener = Parameters<typeof browser.action.onClicked.addListener>[0];

export async function getActiveTab(): Promise<Browser.tabs.Tab | undefined> {
	const tabs = await browser.tabs.query({ active: true, currentWindow: true });
	return tabs[0];
}

export async function injectContentRuntime(tabId: number): Promise<void> {
	await browser.scripting.executeScript({
		target: { tabId },
		files: [CONTENT_SCRIPT_FILE],
	});
}

export async function sendMessageToTab<TResponse>(tabId: number, message: RuntimeMessage): Promise<TResponse> {
	return browser.tabs.sendMessage(tabId, message);
}

export async function sendMessageToRuntime<TResponse>(message: RuntimeMessage): Promise<TResponse> {
	return browser.runtime.sendMessage(message);
}

export function addRuntimeMessageListener(listener: RuntimeMessageListener): void {
	browser.runtime.onMessage.addListener(listener);
}

export function addInstalledListener(listener: () => void): void {
	browser.runtime.onInstalled.addListener(listener);
}

export function addActionClickedListener(listener: ActionClickedListener): void {
	browser.action.onClicked.addListener(listener);
}

export async function readLocalStorageKey<TValue>(key: string): Promise<Record<string, TValue | undefined>> {
	return browser.storage.local.get(key) as Promise<Record<string, TValue | undefined>>;
}

export async function writeLocalStorage(values: Record<string, unknown>): Promise<void> {
	await browser.storage.local.set(values);
}
