import '../../widgets/overlay-panel/popup.css';
import { ensureContentRuntime } from '../background/runtime-injection';
import { addRuntimeMessageListener, getActiveTab, sendMessageToTab } from '../../shared/browser/browser-api';
import type { ContentToPopupMessage, RuntimeAck, RuntimeMessage } from '../../shared/messaging/messages';
import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { OverlayPanelView } from '../../widgets/overlay-panel/overlay-panel-view';

const root = getElement('root');
const portalRoot = document.createElement('div');
portalRoot.className = 'tm-extension-root tm-popover-layer';
portalRoot.dataset.textmodeOverlayPortalRoot = 'true';
document.body.append(portalRoot);

let overlays: OverlayDescriptor[] = [];

const view = new OverlayPanelView({
	portalContainer: portalRoot,
	onStartPicking: () => void execute({ type: 'START_PICKING' }),
	onUpdateOverlay: (id, settings) => updateOverlay(id, settings),
	onExportOverlay: (id, format) => exportOverlay(id, format),
	onRemoveOverlay: (id) => void execute({ type: 'REMOVE_OVERLAY', id }),
});
root.append(view.element);

addRuntimeMessageListener((message: ContentToPopupMessage) => {
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
	view.update(overlays);
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

function updateOverlay(id: string, settings: Partial<OverlaySettings>): void {
	void execute({ type: 'UPDATE_OVERLAY', id, settings });
}

function exportOverlay(id: string, format: OverlayExportFormat): void {
	void execute({ type: 'EXPORT_OVERLAY', id, format });
}

function getElement(id: string): HTMLElement {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing popup element #${id}.`);
	}
	return element;
}
