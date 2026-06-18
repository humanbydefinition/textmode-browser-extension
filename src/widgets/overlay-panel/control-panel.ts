import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { TEXTMODE_HEADER_FONT_FAMILY } from '../../shared/config/extension-assets';
import { OverlayPanelView } from './overlay-panel-view';
import panelStyles from './popup.css?inline';

export interface ControlPanelOptions {
	headerFontUrl?: string | null;
	onStartPicking: () => void;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onExportOverlay: (id: string, format: OverlayExportFormat) => void;
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
	private readonly portalRoot: HTMLDivElement;
	private readonly view: OverlayPanelView;
	private overlays: OverlayDescriptor[] = [];
	private readonly onShadowKeyDown: EventListener;

	public constructor(private readonly options: ControlPanelOptions) {
		if (options.headerFontUrl) {
			installHeaderFont(options.headerFontUrl);
		}
		this.container = document.createElement('div');
		this.container.id = PANEL_HOST_ID;
		this.container.dataset.textmodeAsciiExtensionUi = 'true';
		Object.assign(this.container.style, {
			position: 'fixed',
			top: '10px',
			right: '10px',
			zIndex: '2147483646',
			width: '300px',
			maxWidth: 'calc(100vw - 32px)',
		});

		this.shadowRoot = this.container.attachShadow({ mode: 'open' });

		this.onShadowKeyDown = (event) => {
			if (!(event instanceof KeyboardEvent) || event.key !== ' ') return;
			const target = event.target;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				(target instanceof HTMLElement && target.isContentEditable)
			) {
				event.stopPropagation();
			}
		};
		const styleEl = document.createElement('style');
		styleEl.textContent = `
			${this.options.headerFontUrl ? createHeaderFontFaceCss(this.options.headerFontUrl) : ''}

			:host {
				all: initial;
				display: block;
				width: min(300px, calc(100vw - 32px));
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

		this.portalRoot = document.createElement('div');
		this.portalRoot.className = 'tm-extension-root tm-popover-layer';
		this.portalRoot.dataset.textmodeOverlayPortalRoot = 'true';
		this.shadowRoot.appendChild(this.portalRoot);

		this.view = new OverlayPanelView({
			portalContainer: this.portalRoot,
			onStartPicking: this.options.onStartPicking,
			onUpdateOverlay: this.options.onUpdateOverlay,
			onExportOverlay: this.options.onExportOverlay,
			onRemoveOverlay: this.options.onRemoveOverlay,
			onClose: this.options.onClose,
		});
		this.mountPoint.append(this.view.element);
		this.render();
	}

	public mount(): void {
		if (!this.container.isConnected) {
			document.documentElement.appendChild(this.container);
		}
		this.shadowRoot.addEventListener('keydown', this.onShadowKeyDown, true);
		this.render();
	}

	public unmount(): void {
		this.shadowRoot.removeEventListener('keydown', this.onShadowKeyDown, true);
		this.view.dispose();
		this.container.remove();
	}

	public updateState(overlays: OverlayDescriptor[]): void {
		this.overlays = overlays;
		this.render();
	}

	private render(): void {
		this.view.update(this.overlays);
	}
}

function createHeaderFontFaceCss(fontUrl: string): string {
	return `
		@font-face {
			font-family: '${TEXTMODE_HEADER_FONT_FAMILY}';
			src: url(${JSON.stringify(fontUrl)}) format('truetype');
			font-weight: 400;
			font-style: normal;
			font-display: swap;
		}
	`;
}

function installHeaderFont(fontUrl: string): void {
	if (typeof FontFace === 'undefined' || !document.fonts || hasHeaderFontFace()) {
		return;
	}

	const fontFace = new FontFace(TEXTMODE_HEADER_FONT_FAMILY, `url(${JSON.stringify(fontUrl)})`, {
		display: 'swap',
		style: 'normal',
		weight: '400',
	});

	document.fonts.add(fontFace);
	void fontFace.load().catch(() => {
		document.fonts.delete(fontFace);
	});
}

function hasHeaderFontFace(): boolean {
	return [...document.fonts].some(
		(fontFace) => fontFace.family === TEXTMODE_HEADER_FONT_FAMILY && fontFace.status !== 'error'
	);
}
