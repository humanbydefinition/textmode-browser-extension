import type { CustomFontSummary } from '../../domain/fonts/custom-font-entry';
import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import type { CustomFontId } from '../../domain/overlay/overlay-settings';
import { h, removeChildren } from './dom';
import { icon } from './icons';
import { OverlayCardView } from './panel/overlay-card-view';
import { createButton } from './settings/form-controls';
import { rateExtensionUrl as defaultRateExtensionUrl } from '../../shared/config/store-links';

export interface OverlayPanelViewOptions {
	portalContainer: HTMLElement;
	mode?: 'popup' | 'in-page';
	customFonts?: readonly CustomFontSummary[];
	allowCustomFontUpload?: boolean;
	onStartPicking: () => void;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => Promise<void> | void;
	onExportOverlay: (id: string, format: OverlayExportFormat) => void;
	onRemoveOverlay: (id: string) => void;
	onUploadFont?: (file: File) => Promise<{ id: CustomFontId; displayName: string }>;
	onRemoveCustomFont?: (id: CustomFontId) => Promise<void> | void;
	onError?: (message: string) => void;
	onClose?: () => void;
	rateExtensionUrl?: string | null;
}

export class OverlayPanelView {
	public readonly element: HTMLElement;
	public readonly moveHandleElement: HTMLButtonElement | null;
	private readonly selectButton: HTMLButtonElement;
	private readonly selectButtonLabel: Text;
	private readonly overlayList: HTMLElement;
	private readonly removeButton: HTMLButtonElement;
	private overlayCard: OverlayCardView | null = null;
	private overlayId: string | null = null;
	private picking = false;

	public constructor(private readonly options: OverlayPanelViewOptions) {
		const mode = options.mode ?? 'popup';
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
		this.moveHandleElement =
			mode === 'in-page'
				? createButton('tm-button--subtle tm-panel__header-action tm-panel__move-handle', 'move panel')
				: null;
		if (this.moveHandleElement) {
			const moveInstructions = 'Move panel. Drag to move or double-click to reset its position.';
			this.moveHandleElement.setAttribute('aria-label', moveInstructions);
			this.moveHandleElement.setAttribute('title', moveInstructions);
			this.moveHandleElement.append(icon('grip-vertical'));
		}
		const supportLink = h(
			'a',
			{
				className:
					mode === 'in-page'
						? 'tm-button tm-button--ghost tm-button--subtle tm-button--icon tm-panel__header-action tm-support-link'
						: 'tm-button tm-button--ghost tm-button--subtle tm-panel__header-action tm-support-link',
				attributes: {
					href: 'https://ko-fi.com/humanbydefinition',
					target: '_blank',
					rel: 'noreferrer',
					...(mode === 'in-page' ? { title: 'Support textmode', 'aria-label': 'Support textmode' } : {}),
				},
			},
			icon('heart-handshake'),
			mode === 'popup' ? 'support' : null
		);
		const githubLink = h(
			'a',
			{
				className:
					'tm-button tm-button--ghost tm-button--subtle tm-button--icon tm-panel__header-action tm-github-link',
				attributes: {
					href: 'https://github.com/humanbydefinition/textmode-browser-extension',
					target: '_blank',
					rel: 'noreferrer',
					title: 'GitHub repository',
					'aria-label': 'GitHub repository',
				},
			},
			icon('github')
		);
		const actions = h('div', { className: 'tm-panel__actions' }, supportLink, githubLink, this.moveHandleElement);
		if (options.onClose) {
			const closeButton = createButton(
				'tm-button tm-button--ghost tm-button--subtle tm-button--icon tm-panel__header-action',
				'close panel'
			);
			closeButton.append(icon('x'));
			closeButton.addEventListener('click', options.onClose);
			actions.append(closeButton);
		}
		const header = h('header', { className: 'tm-panel__header' }, title, actions);

		this.selectButtonLabel = document.createTextNode('select media');
		this.selectButton = createButton('tm-button tm-button--default tm-button--default-size tm-select-button');
		this.selectButton.append(icon('mouse-pointer'), this.selectButtonLabel);
		this.selectButton.addEventListener('click', () => {
			if (!this.picking) options.onStartPicking();
		});
		this.overlayList = h('section', { className: 'tm-overlay-list', attributes: { 'aria-live': 'polite' } });

		this.removeButton = createButton('tm-button tm-button--danger tm-button--default-size tm-remove-button');
		this.removeButton.append(icon('trash'), 'remove overlay');
		this.removeButton.addEventListener('click', () => {
			if (this.overlayId) {
				options.onRemoveOverlay(this.overlayId);
			}
		});
		const ratingUrl = options.rateExtensionUrl === undefined ? defaultRateExtensionUrl : options.rateExtensionUrl;
		const rateLink = ratingUrl
			? h('a', {
					className: 'tm-rate-link',
					attributes: { href: ratingUrl, target: '_blank', rel: 'noreferrer' },
					textContent: 'rate extension',
				})
			: null;
		const footerMeta = h(
			'div',
			{
				className: rateLink ? 'tm-panel__footer-meta' : 'tm-panel__footer-meta tm-panel__footer-meta--single',
			},
			rateLink,
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
		const footer = h('footer', { className: 'tm-panel__footer' }, this.removeButton, footerMeta);

		this.element = h(
			'main',
			{
				className: 'tm-panel',
				attributes: { 'data-testid': 'overlay-panel' },
				dataset: { mode },
			},
			header,
			this.selectButton,
			this.overlayList,
			footer
		);
	}

	public update(
		overlays: readonly OverlayDescriptor[],
		customFonts: readonly CustomFontSummary[] = this.options.customFonts ?? []
	): void {
		const overlay = overlays[0];
		this.overlayId = overlay?.id ?? null;
		this.updateSelectButtonLabel();
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
				customFonts,
				allowCustomFontUpload: this.options.allowCustomFontUpload,
				onUpdateOverlay: this.options.onUpdateOverlay,
				onExportOverlay: this.options.onExportOverlay,
				onUploadFont: this.options.onUploadFont,
				onRemoveCustomFont: this.options.onRemoveCustomFont,
				onError: this.options.onError,
			});
			removeChildren(this.overlayList);
			this.overlayList.append(this.overlayCard.element);
		}

		this.overlayCard.update(overlay, customFonts);
	}

	public setPicking(picking: boolean): void {
		this.picking = picking;
		this.selectButton.setAttribute('aria-pressed', String(picking));
		this.selectButton.setAttribute('aria-disabled', String(picking));
		this.updateSelectButtonLabel();
	}

	public dispose(): void {
		this.overlayCard?.dispose();
	}

	private updateSelectButtonLabel(): void {
		this.selectButtonLabel.textContent = this.picking
			? 'selecting…'
			: this.overlayId
				? 'replace media'
				: 'select media';
	}
}
