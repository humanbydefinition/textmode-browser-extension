import './popup.css';
import { createRoot } from 'react-dom/client';
import { getActiveTab, injectContentRuntime, sendMessageToTab } from '../shared/browser-api';
import type { ContentToPopupMessage, RuntimeAck, RuntimeMessage } from '../shared/messages';
import type { OverlayDescriptor, OverlaySettings } from '../shared/overlay-settings';
import { OverlayPanelApp } from '../ui/OverlayPanelApp';

const root = createRoot(getElement('root'));
let overlays: OverlayDescriptor[] = [];

chrome.runtime.onMessage.addListener((message: ContentToPopupMessage) => {
	if (message.type === 'OVERLAY_LIST_CHANGED') {
		overlays = message.overlays;
		render();
	} else if (message.type === 'PICKING_STARTED') {
		render();
	} else if (message.type === 'PICKING_CANCELLED') {
		render();
	} else if (message.type === 'ERROR') {
		render();
	}
});

render();
void refresh();

async function refresh(): Promise<void> {
	await execute({ type: 'LIST_OVERLAYS' });
}

function render(): void {
	root.render(
		<OverlayPanelApp
			overlays={overlays}
			onStartPicking={() => void execute({ type: 'START_PICKING' })}
			onUpdateOverlay={(id, settings) => updateOverlay(id, settings)}
			onRemoveOverlay={(id) => void execute({ type: 'REMOVE_OVERLAY', id })}
		/>
	);
}

async function execute(message: RuntimeMessage): Promise<void> {
	try {
		const tab = await getActiveTab();
		if (!tab?.id) {
			return;
		}

		await ensureContentRuntime(tab.id);
		const response = await sendMessageToTab<RuntimeAck>(tab.id, message);
		if (!response.ok) {
			return;
		}

		if (response.overlays) {
			overlays = response.overlays;
			render();
		}
	} catch {
		// Silently handle error - state already reflects it via async response
	}
}

async function ensureContentRuntime(tabId: number): Promise<void> {
	await injectContentRuntime(tabId);
	for (let attempt = 0; attempt < 20; attempt++) {
		try {
			const response = await sendMessageToTab<RuntimeAck>(tabId, { type: 'PING' });
			if (response.ok) {
				return;
			}
		} catch {
			await delay(50);
		}
	}
	throw new Error('Timed out while starting the page runtime.');
}

function updateOverlay(id: string, settings: Partial<OverlaySettings>): void {
	void execute({ type: 'UPDATE_OVERLAY', id, settings });
}

function getElement(id: string): HTMLElement {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing popup element #${id}.`);
	}
	return element;
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => window.setTimeout(resolve, ms));
}
