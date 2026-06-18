import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { h, removeChildren } from './dom';
import { icon } from './icons';
import { OverlaySettingsFormView } from './overlay-settings-form-view';

export interface OverlayPanelViewOptions {
	portalContainer: HTMLElement;
	onStartPicking: () => void;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onExportOverlay: (id: string, format: OverlayExportFormat) => void;
	onRemoveOverlay: (id: string) => void;
	onClose?: () => void;
}

export class OverlayPanelView {
	public readonly element: HTMLElement;
	private readonly selectButton: HTMLButtonElement;
	private readonly selectButtonLabel: Text;
	private readonly overlayList: HTMLElement;
	private readonly removeButton: HTMLButtonElement;
	private overlayCard: OverlayCardView | null = null;
	private overlayId: string | null = null;

	public constructor(private readonly options: OverlayPanelViewOptions) {
		const title = h(
			'div',
			{ className: 'tm-panel__title' },
			h(
				'h1',
				{ attributes: { 'aria-label': 'Textmode Overlay' } },
				h('span', { textContent: 'textmode' }),
				h('span', {}, 'overlay', h('span', { className: 'tm-panel__title-char', textContent: '' }))
			)
		);
		const supportLink = h(
			'a',
			{
				className: 'tm-button tm-button--ghost tm-support-link',
				attributes: {
					href: 'https://ko-fi.com/humanbydefinition',
					target: '_blank',
					rel: 'noreferrer',
				},
			},
			icon('heart-handshake'),
			'support'
		);
		const actions = h('div', { className: 'tm-panel__actions' }, supportLink);
		if (options.onClose) {
			const closeButton = createButton('tm-button tm-button--ghost tm-button--icon', 'close panel');
			closeButton.append(icon('x'));
			closeButton.addEventListener('click', options.onClose);
			actions.append(closeButton);
		}
		const header = h('header', { className: 'tm-panel__header' }, title, actions);

		this.selectButtonLabel = document.createTextNode('select media');
		this.selectButton = createButton('tm-button tm-button--default tm-button--default-size tm-select-button');
		this.selectButton.append(icon('mouse-pointer'), this.selectButtonLabel);
		this.selectButton.addEventListener('click', options.onStartPicking);
		this.overlayList = h('section', { className: 'tm-overlay-list', attributes: { 'aria-live': 'polite' } });

		this.removeButton = createButton('tm-button tm-button--danger tm-button--default-size tm-remove-button');
		this.removeButton.append(icon('trash'), 'remove overlay');
		this.removeButton.addEventListener('click', () => {
			if (this.overlayId) {
				options.onRemoveOverlay(this.overlayId);
			}
		});
		const footer = h(
			'footer',
			{ className: 'tm-panel__footer' },
			this.removeButton,
			h(
				'p',
				{ className: 'tm-built-with' },
				'built with ',
				h('a', {
					attributes: { href: 'https://code.textmode.art', target: '_blank', rel: 'noreferrer' },
					textContent: 'textmode.js',
				})
			)
		);

		this.element = h(
			'main',
			{ className: 'tm-panel', attributes: { 'data-testid': 'overlay-panel' } },
			header,
			this.selectButton,
			this.overlayList,
			footer
		);
	}

	public update(overlays: readonly OverlayDescriptor[]): void {
		const overlay = overlays[0];
		this.overlayId = overlay?.id ?? null;
		this.selectButtonLabel.textContent = overlay ? 'replace media' : 'select media';
		this.removeButton.disabled = !overlay;

		if (!overlay) {
			this.overlayCard?.dispose();
			this.overlayCard = null;
			removeChildren(this.overlayList);
			this.overlayList.append(h('p', { className: 'tm-empty-state', textContent: 'no media selected.' }));
			return;
		}

		if (!this.overlayCard || this.overlayCard.id !== overlay.id) {
			this.overlayCard?.dispose();
			this.overlayCard = new OverlayCardView({
				overlay,
				portalContainer: this.options.portalContainer,
				onUpdateOverlay: this.options.onUpdateOverlay,
				onExportOverlay: this.options.onExportOverlay,
			});
			removeChildren(this.overlayList);
			this.overlayList.append(this.overlayCard.element);
		}

		this.overlayCard.update(overlay);
	}

	public dispose(): void {
		this.overlayCard?.dispose();
	}
}

interface OverlayCardViewOptions {
	overlay: OverlayDescriptor;
	portalContainer: HTMLElement;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onExportOverlay: (id: string, format: OverlayExportFormat) => void;
}

class OverlayCardView {
	public readonly element: HTMLElement;
	public id: string;
	private readonly title: HTMLHeadingElement;
	private readonly elementName: HTMLParagraphElement;
	private readonly dimensions: HTMLSpanElement;
	private readonly error: HTMLParagraphElement;
	private readonly settingsForm: OverlaySettingsFormView;

	public constructor(options: OverlayCardViewOptions) {
		this.id = options.overlay.id;
		this.title = h('h2');
		this.elementName = h('p');
		this.dimensions = h('span', { className: 'tm-badge tm-dimensions', attributes: { 'data-slot': 'badge' } });
		this.settingsForm = new OverlaySettingsFormView({
			settings: options.overlay.settings,
			portalContainer: options.portalContainer,
			onChange: (settings) => options.onUpdateOverlay(this.id, settings),
			onExport: (format) => options.onExportOverlay(this.id, format),
		});
		this.error = h('p', { className: 'tm-error', attributes: { role: 'alert' } });
		this.element = h(
			'article',
			{ className: 'tm-overlay-card' },
			h(
				'header',
				{ className: 'tm-overlay-card__header' },
				h('div', { className: 'tm-overlay-card__title' }, this.title, this.elementName),
				this.dimensions
			),
			this.settingsForm.element,
			this.error
		);
		this.update(options.overlay);
	}

	public update(overlay: OverlayDescriptor): void {
		this.id = overlay.id;
		const title = overlay.elementKind === 'video' ? 'video selected' : 'canvas selected';
		const elementName = getElementName(overlay.elementLabel);
		this.title.textContent = title;
		this.elementName.textContent = elementName;
		this.elementName.title = elementName;
		this.dimensions.textContent = `${overlay.bounds.width}x${overlay.bounds.height}`;
		this.settingsForm.update(overlay.settings);

		if (overlay.latestError) {
			this.error.textContent = overlay.latestError;
			this.error.hidden = false;
		} else {
			this.error.textContent = '';
			this.error.hidden = true;
		}
	}

	public dispose(): void {
		this.settingsForm.dispose();
	}
}

function getElementName(elementLabel: string): string {
	return elementLabel.replace(/\s+\d+x\d+$/i, '');
}

function createButton(className: string, ariaLabel?: string): HTMLButtonElement {
	return h('button', {
		className,
		attributes: { type: 'button', ...(ariaLabel ? { 'aria-label': ariaLabel } : {}) },
	});
}
