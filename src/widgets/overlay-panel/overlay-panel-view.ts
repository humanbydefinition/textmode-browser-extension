import type { CustomFontSummary } from '../../domain/fonts/custom-font-entry';
import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import type { CustomFontId } from '../../domain/overlay/overlay-settings';
import { h, removeChildren } from './dom';
import { icon } from './icons';
import { OverlayCardView } from './panel/overlay-card-view';
import { createButton } from './settings/form-controls';
import { ScrollAreaView } from './components/scroll-area-view';
import { PanelScrollController } from './panel-scroll-controller';
import { rateExtensionUrl as defaultRateExtensionUrl } from '../../shared/config/store-links';

export interface OverlayPanelViewOptions {
	portalContainer: HTMLElement;
	mode?: 'popup' | 'in-page';
	customFonts?: readonly CustomFontSummary[];
	allowCustomFontUpload?: boolean;
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
	private readonly overlayList: HTMLElement;
	private readonly pickerMount: HTMLElement;
	private readonly notice: HTMLParagraphElement;
	private readonly scrollArea: ScrollAreaView;
	private readonly scrollController: PanelScrollController;
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
		const discordLink = h(
			'a',
			{
				className:
					mode === 'in-page'
						? 'tm-button tm-button--ghost tm-button--subtle tm-button--icon tm-panel__header-action tm-discord-link'
						: 'tm-button tm-button--ghost tm-button--subtle tm-button--icon tm-panel__header-action tm-discord-link',
				attributes: {
					href: 'https://discord.gg/sjrw8QXNks',
					target: '_blank',
					rel: 'noreferrer noopener',
					title: 'Join the textmode.art Discord server',
					'aria-label': 'Join the textmode.art Discord server',
				},
			},
			icon('discord'),
			mode === 'popup' ? 'discord' : null
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
		const actions = h('div', { className: 'tm-panel__actions' }, discordLink, githubLink, this.moveHandleElement);
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

		this.overlayList = h('section', { className: 'tm-overlay-list' });
		this.pickerMount = h('div', { className: 'tm-picker-mount' });
		this.pickerMount.hidden = true;
		this.notice = h('p', { className: 'tm-error', attributes: { role: 'alert' } });
		this.notice.hidden = true;
		this.scrollArea = new ScrollAreaView({
			rootClassName: 'tm-panel-scroll-area',
			viewportClassName: 'tm-panel-scroll-area__viewport',
			contentClassName: 'tm-panel-scroll-area__content',
		});
		this.scrollArea.viewport.setAttribute('role', 'region');
		this.scrollArea.viewport.setAttribute('aria-label', 'overlay settings');
		this.scrollArea.viewport.tabIndex = -1;
		this.scrollArea.content.append(this.notice, this.overlayList, this.pickerMount);

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
		const footer = h('footer', { className: 'tm-panel__footer' }, footerMeta);

		this.element = h(
			'main',
			{
				className: 'tm-panel',
				attributes: { 'data-testid': 'overlay-panel' },
				dataset: { mode, scrollMode: 'tabs' },
			},
			header,
			this.scrollArea.element,
			footer
		);
		this.scrollController = new PanelScrollController(this.element);
	}

	public update(
		overlays: readonly OverlayDescriptor[],
		customFonts: readonly CustomFontSummary[] = this.options.customFonts ?? []
	): void {
		const overlay = overlays[0];
		const activeElement = getRootActiveElement(this.element);
		const returningFocusFromOverlay = Boolean(
			!overlay && activeElement && this.overlayList.contains(activeElement)
		);
		this.overlayId = overlay?.id ?? null;
		this.updateContentVisibility();

		if (!overlay) {
			this.overlayCard?.dispose();
			this.overlayCard = null;
			removeChildren(this.overlayList);
			if (this.options.mode !== 'in-page')
				this.overlayList.append(h('p', { className: 'tm-empty-state', textContent: 'no media selected.' }));
			if (returningFocusFromOverlay) this.focusPanel();
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
				onRemoveOverlay: this.options.onRemoveOverlay,
				onUploadFont: this.options.onUploadFont,
				onRemoveCustomFont: this.options.onRemoveCustomFont,
				onError: this.options.onError,
			});
			removeChildren(this.overlayList);
			this.overlayList.append(this.overlayCard.element);
		}

		this.overlayCard.update(overlay, customFonts);
	}

	public focusPanel(): void {
		this.scrollArea.viewport.focus({ preventScroll: true });
	}

	public isViewportFocused(): boolean {
		return getRootActiveElement(this.element) === this.scrollArea.viewport;
	}

	public getPickerMount(): HTMLElement {
		return this.pickerMount;
	}

	public setPicking(picking: boolean): void {
		this.picking = picking;
		this.element.dataset.picking = String(picking);
		this.updateContentVisibility();
	}

	public setNotice(message: string | undefined): void {
		this.notice.textContent = message ?? '';
		this.notice.hidden = !message;
	}

	public dispose(): void {
		this.scrollController.dispose();
		this.overlayCard?.dispose();
		this.scrollArea.dispose();
	}

	private updateContentVisibility(): void {
		const showPicker = this.picking || (this.options.mode === 'in-page' && !this.overlayId);
		this.overlayList.hidden = showPicker;
		this.pickerMount.hidden = !showPicker;
	}
}

function getRootActiveElement(element: HTMLElement): Element | null {
	const root = element.getRootNode();
	if (root instanceof Document || root instanceof ShadowRoot) return root.activeElement;
	return element.ownerDocument.activeElement;
}
