import type { BundledFontEntry } from '../../../domain/fonts/font-registry';
import type { BundledFontId } from '../../../domain/overlay/overlay-settings';
import { classNames, h, removeChildren } from '../dom';
import { icon } from '../icons';
import { PopoverView } from '../components/popover-view';

export interface FontComboboxViewOptions {
	fonts: readonly BundledFontEntry[];
	value: BundledFontId;
	portalContainer: HTMLElement;
	onChange: (fontId: BundledFontId) => void;
}

export class FontComboboxView {
	public readonly element: HTMLButtonElement;
	private readonly valueLabel: HTMLSpanElement;
	private readonly searchInput: HTMLInputElement;
	private readonly list: HTMLDivElement;
	private readonly popover: PopoverView;
	private value: BundledFontId;
	private query = '';

	public constructor(private readonly options: FontComboboxViewOptions) {
		this.value = options.value;
		this.valueLabel = h('span', { className: 'tm-font-combobox__value' });
		this.element = h(
			'button',
			{
				className: 'tm-font-combobox__trigger',
				attributes: { type: 'button', role: 'combobox', 'aria-expanded': 'false' },
			},
			this.valueLabel,
			icon('chevron-down', 'tm-font-combobox__chevron')
		);
		this.searchInput = h('input', {
			className: 'tm-font-combobox__search tm-input',
			attributes: {
				type: 'text',
				placeholder: 'Search fonts...',
				autocomplete: 'off',
				spellcheck: 'false',
			},
		});
		this.searchInput.addEventListener('input', () => {
			this.query = this.searchInput.value;
			this.renderList();
		});
		this.searchInput.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				this.query = '';
				this.popover.setOpen(false);
			}
		});
		this.list = h('div', { className: 'tm-font-combobox__list' });
		const content = h(
			'div',
			{ className: 'tm-font-combobox-popover' },
			h(
				'div',
				{ className: 'tm-font-combobox-popover__header', attributes: { 'data-slot': 'popover-header' } },
				h('div', {
					className: 'tm-font-combobox-popover__title',
					attributes: { 'data-slot': 'popover-title' },
					textContent: 'font',
				}),
				h('p', {
					className: 'tm-font-combobox-popover__description',
					attributes: { 'data-slot': 'popover-description' },
					textContent: 'choose typeface.',
				})
			),
			this.searchInput,
			this.list
		);
		this.popover = new PopoverView({
			trigger: this.element,
			content,
			portalContainer: options.portalContainer,
			align: 'start',
			sideOffset: 8,
			onOpen: () => {
				requestAnimationFrame(() => {
					this.searchInput.focus();
					this.searchInput.select();
				});
			},
			onOpenChange: (open) => {
				if (!open) {
					this.query = '';
					this.searchInput.value = '';
					this.renderList();
				}
			},
		});
		this.render();
	}

	public update(value: BundledFontId, fallbackLabel: string): void {
		this.value = value;
		this.render(fallbackLabel);
	}

	public dispose(): void {
		this.popover.dispose();
	}

	private render(fallbackLabel?: string): void {
		const selectedFont = this.options.fonts.find((font) => font.id === this.value) ?? this.options.fonts[0] ?? null;
		const isDisabled = this.options.fonts.length === 0;
		this.element.disabled = isDisabled;
		this.valueLabel.textContent = isDisabled
			? 'No local fonts'
			: (selectedFont?.displayName ?? fallbackLabel ?? 'System default');
		this.renderList();
	}

	private renderList(): void {
		removeChildren(this.list);
		const query = this.query.trim().toLowerCase();
		const fonts = query
			? this.options.fonts.filter((font) => font.displayName.toLowerCase().includes(query))
			: this.options.fonts;

		if (fonts.length === 0) {
			this.list.append(h('p', { className: 'tm-font-combobox__empty', textContent: 'No fonts found.' }));
			return;
		}

		for (const font of fonts) {
			const option = h(
				'button',
				{
					className: classNames(
						'tm-font-combobox__option',
						font.id === this.value && 'tm-font-combobox__option--selected'
					),
					attributes: { type: 'button' },
				},
				h(
					'div',
					{ className: 'tm-font-combobox__option-main' },
					h('span', { className: 'tm-font-combobox__option-name', textContent: font.displayName }),
					createFontOptionLink(font.sourceUrl, `Open ${font.displayName} source`)
				),
				h(
					'div',
					{ className: 'tm-font-combobox__option-meta' },
					`by ${font.author}`,
					createFontOptionLink(font.authorUrl, `Open ${font.author} author page`)
				)
			);
			option.addEventListener('click', () => {
				this.options.onChange(font.id);
				this.value = font.id;
				this.query = '';
				this.searchInput.value = '';
				this.popover.setOpen(false);
				this.render();
			});
			this.list.append(option);
		}
	}
}

function createFontOptionLink(url: string, label: string): HTMLAnchorElement | null {
	if (!url) return null;
	const link = h('a', {
		className: 'tm-font-combobox__link',
		attributes: {
			href: url,
			target: '_blank',
			rel: 'noopener noreferrer',
			'aria-label': label,
		},
	});
	link.append(icon('external-link'));
	link.addEventListener('pointerdown', (event) => {
		event.preventDefault();
		event.stopPropagation();
	});
	link.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		window.open(url, '_blank', 'noopener,noreferrer');
	});
	return link;
}
