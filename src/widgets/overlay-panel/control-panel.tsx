import { createRoot, type Root } from 'react-dom/client';
import type { OverlayDescriptor, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { OverlayPanelApp } from './OverlayPanelApp';
import panelStyles from './popup.css?inline';

export interface ControlPanelOptions {
	onStartPicking: () => void;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onRemoveOverlay: (id: string) => void;
	onClose: () => void;
}

export interface PanelHost {
	mount(): void;
	unmount(): void;
	updateState(overlays: OverlayDescriptor[]): void;
}

const PANEL_HOST_ID = 'textmode-ascii-overlay-control-panel-root';

export class ControlPanel implements PanelHost {
	private readonly container: HTMLDivElement;
	private readonly shadowRoot: ShadowRoot;
	private readonly mountPoint: HTMLDivElement;
	private readonly reactRoot: Root;
	private overlays: OverlayDescriptor[] = [];

	public constructor(private readonly options: ControlPanelOptions) {
		this.container = document.createElement('div');
		this.container.id = PANEL_HOST_ID;
		this.container.dataset.textmodeAsciiExtensionUi = 'true';
		Object.assign(this.container.style, {
			position: 'fixed',
			top: '10px',
			right: '10px',
			zIndex: '2147483646',
			width: '340px',
			maxWidth: 'calc(100vw - 32px)',
		});

		this.shadowRoot = this.container.attachShadow({ mode: 'open' });
		const styleEl = document.createElement('style');
		styleEl.textContent = `
			:host {
				all: initial;
				display: block;
				width: min(340px, calc(100vw - 32px));
				color-scheme: dark;
				box-shadow: 0 18px 42px rgb(0 0 0 / 0.42);
			}

			:host .tm-panel {
				border: 1px solid var(--tm-neutral-26);
				border-radius: 8px;
				box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04);
			}

			${panelStyles}
		`;
		this.shadowRoot.appendChild(styleEl);

		this.mountPoint = document.createElement('div');
		this.mountPoint.className = 'tm-extension-root';
		this.shadowRoot.appendChild(this.mountPoint);
		this.reactRoot = createRoot(this.mountPoint);
		this.render();
	}

	public mount(): void {
		if (!this.container.isConnected) {
			document.documentElement.appendChild(this.container);
		}
		this.render();
	}

	public unmount(): void {
		this.reactRoot.unmount();
		this.container.remove();
	}

	public updateState(overlays: OverlayDescriptor[]): void {
		this.overlays = overlays;
		this.render();
	}

	private render(): void {
		this.reactRoot.render(
			<OverlayPanelApp
				overlays={this.overlays}
				onStartPicking={this.options.onStartPicking}
				onUpdateOverlay={this.options.onUpdateOverlay}
				onRemoveOverlay={this.options.onRemoveOverlay}
				onClose={this.options.onClose}
			/>
		);
	}
}
