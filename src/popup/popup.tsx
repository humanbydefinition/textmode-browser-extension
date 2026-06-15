import './popup.css';
import { createRoot } from 'react-dom/client';
import { getActiveTab, injectContentRuntime, sendMessageToTab } from '../shared/browser-api';
import type { ContentToPopupMessage, RuntimeAck, RuntimeMessage } from '../shared/messages';
import type { OverlayDescriptor, OverlaySettings } from '../shared/overlay-settings';
import { OverlayPanelApp } from '../ui/OverlayPanelApp';

const root = createRoot(getElement('root'));
let overlays: OverlayDescriptor[] = [];
let status = 'Select a canvas or video to start.';

chrome.runtime.onMessage.addListener((message: ContentToPopupMessage) => {
	if (message.type === 'OVERLAY_LIST_CHANGED') {
		overlays = message.overlays;
		status = message.overlays.length > 0 ? 'Overlay active.' : 'No media selected.';
		render();
	} else if (message.type === 'PICKING_STARTED') {
		status = 'Click a canvas or video. Press Escape to cancel.';
		render();
	} else if (message.type === 'PICKING_CANCELLED') {
		status = 'Selection cancelled.';
		render();
	} else if (message.type === 'ERROR') {
		status = message.message;
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
			status={status}
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
			setStatus('No active tab found.');
			return;
		}

		await ensureContentRuntime(tab.id);
		const response = await sendMessageToTab<RuntimeAck>(tab.id, message);
		if (!response.ok) {
			setStatus(response.error ?? 'The page runtime did not accept the request.');
			return;
		}

		if (message.type === 'START_PICKING') {
			setStatus('Click a canvas or video. Press Escape to cancel.');
		} else {
			setStatus(response.overlays?.length ? 'Overlay active.' : 'No media selected.');
		}

		if (response.overlays) {
			overlays = response.overlays;
			render();
		}
	} catch (error) {
		setStatus(error instanceof Error ? error.message : 'Unable to contact the active tab.');
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

function setStatus(message: string): void {
	status = message;
	render();
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
