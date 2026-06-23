import type { BundledFontEntry } from '../../../domain/fonts/font-registry';
import type { CustomFontId, FontId } from '../../../domain/overlay/overlay-settings';
import { classNames, h, removeChildren } from '../dom';
import { icon } from '../icons';
import { PopoverView } from '../components/popover-view';

export type FontEntry =
	| (BundledFontEntry & { kind: 'bundled' })
	| {
			kind: 'custom';
			id: CustomFontId;
			displayName: string;
			fileName?: string;
	  };

export interface FontComboboxViewOptions {
	fonts: readonly FontEntry[];
	value: FontId;
	portalContainer: HTMLElement;
	allowCustomFontUpload?: boolean;
	onChange: (fontId: FontId) => void;
	onUploadFont?: (file: File) => void;
	onRemoveCustomFont?: (id: CustomFontId) => void;
}

export class FontComboboxView {
	public readonly element: HTMLButtonElement;
	private readonly valueLabel: HTMLSpanElement;
	private readonly searchInput: HTMLInputElement;
	private readonly list: HTMLDivElement;
	private readonly popover: PopoverView;
	private fileInput?: HTMLInputElement;
	private fonts: readonly FontEntry[];
	private value: FontId;
	private query = '';

	public constructor(private readonly options: FontComboboxViewOptions) {
		this.fonts = options.fonts;
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
		const uploadRow = options.allowCustomFontUpload ? this.createUploadRow() : null;
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
			this.list,
			uploadRow
		);
		this.popover = new PopoverView({
			trigger: this.element,
			content,
			portalContainer: options.portalContainer,
			align: 'start',
			sideOffset: 8,
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

	public update(value: FontId, fallbackLabel: string): void {
		this.value = value;
		this.render(fallbackLabel);
	}

	public setFonts(fonts: readonly FontEntry[]): void {
		this.fonts = fonts;
		this.render();
	}

	public dispose(): void {
		this.popover.dispose();
	}

	private render(fallbackLabel?: string): void {
		const selectedFont = this.fonts.find((font) => font.id === this.value) ?? this.fonts[0] ?? null;
		const isDisabled = this.fonts.length === 0 && !this.options.allowCustomFontUpload;
		this.element.disabled = isDisabled;
		this.valueLabel.textContent = isDisabled
			? 'No local fonts'
			: (selectedFont?.displayName ?? fallbackLabel ?? 'System default');
		this.renderList();
	}

	private renderList(): void {
		removeChildren(this.list);
		const query = this.query.trim().toLowerCase();
		const fonts = query ? this.fonts.filter((font) => matchesQuery(font, query)) : this.fonts;

		if (fonts.length === 0) {
			this.list.append(h('p', { className: 'tm-font-combobox__empty', textContent: 'No fonts found.' }));
			return;
		}

		const customFonts = fonts.filter((font) => font.kind === 'custom');
		const bundledFonts = fonts.filter((font) => font.kind === 'bundled');
		this.renderSection('Your fonts', customFonts);
		this.renderSection('Library', bundledFonts);
	}

	private renderSection(label: string, fonts: readonly FontEntry[]): void {
		if (fonts.length === 0) return;
		this.list.append(h('p', { className: 'tm-font-combobox__section-header', textContent: label }));
		for (const font of fonts) {
			this.list.append(font.kind === 'custom' ? this.createCustomOption(font) : this.createBundledOption(font));
		}
	}

	private createBundledOption(font: BundledFontEntry & { kind: 'bundled' }): HTMLButtonElement {
		const option = this.createOptionButton(
			font,
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
		return option;
	}

	private createCustomOption(font: Extract<FontEntry, { kind: 'custom' }>): HTMLElement {
		const option = this.createOptionButton(
			font,
			h(
				'div',
				{ className: 'tm-font-combobox__option-main' },
				h('span', { className: 'tm-font-combobox__custom-dot' }),
				h('span', { className: 'tm-font-combobox__option-name', textContent: font.displayName })
			),
			h('div', { className: 'tm-font-combobox__option-meta', textContent: font.fileName ?? 'uploaded font' })
		);
		option.title = font.fileName ?? font.displayName;
		if (!this.options.onRemoveCustomFont) {
			return option;
		}

		const removeButton = h(
			'button',
			{
				className: 'tm-font-combobox__option-remove',
				attributes: {
					type: 'button',
					'aria-label': `Remove ${font.displayName}`,
					title: `Remove ${font.displayName}`,
				},
			},
			icon('trash')
		);
		removeButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.options.onRemoveCustomFont?.(font.id);
		});
		return h('div', { className: 'tm-font-combobox__option-row' }, option, removeButton);
	}

	private createOptionButton(font: FontEntry, ...children: (Node | string | null)[]): HTMLButtonElement {
		const option = h(
			'button',
			{
				className: classNames(
					'tm-font-combobox__option',
					font.kind === 'custom' && 'tm-font-combobox__option--custom',
					font.id === this.value && 'tm-font-combobox__option--selected'
				),
				attributes: { type: 'button' },
			},
			...children
		);
		option.addEventListener('click', () => {
			this.options.onChange(font.id);
			this.value = font.id;
			this.query = '';
			this.searchInput.value = '';
			this.popover.setOpen(false);
			this.render();
		});
		return option;
	}

	private createUploadRow(): HTMLDivElement {
		this.fileInput = h('input', {
			className: 'tm-font-combobox__file-input',
			attributes: {
				type: 'file',
				accept: '.ttf,.otf,application/font-sfnt,font/ttf,font/otf',
			},
		});
		this.fileInput.addEventListener('change', () => {
			const file = this.fileInput?.files?.[0];
			if (this.fileInput) {
				this.fileInput.value = '';
			}
			if (file) {
				this.options.onUploadFont?.(file);
			}
		});
		const uploadButton = h(
			'button',
			{
				className: 'tm-button tm-button--ghost tm-font-combobox__upload-button',
				attributes: { type: 'button' },
			},
			icon('upload'),
			'upload font...'
		);
		uploadButton.addEventListener('click', () => this.fileInput?.click());
		return h('div', { className: 'tm-font-combobox__upload-row' }, this.fileInput, uploadButton);
	}
}

function matchesQuery(font: FontEntry, query: string): boolean {
	return (
		font.displayName.toLowerCase().includes(query) ||
		(font.kind === 'custom' && (font.fileName?.toLowerCase().includes(query) ?? false))
	);
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
