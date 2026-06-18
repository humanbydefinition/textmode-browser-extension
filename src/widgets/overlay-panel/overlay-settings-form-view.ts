import type { BundledFontEntry } from '../../domain/fonts/font-registry';
import { getAvailableFonts, getPreferredFontEntry, resolveFontId } from '../../domain/fonts/font-registry';
import type { BundledFontId, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { getAdjacentGlyphRampPreset, getGlyphRampPresetName } from '../../domain/overlay/glyph-ramp-registry';
import {
	formatHexColor,
	getDisplayColor,
	getHsvaFromHex,
	hsvaToRgba,
	normalizeHexColor,
	type HsvaColor,
} from './color-picker-model';
import { classNames, h, removeChildren, setStyleProperty } from './dom';
import { icon } from './icons';
import { SliderView } from './components/slider-view';
import { TabsView } from './components/tabs-view';
import { ToggleGroupView } from './components/toggle-group-view';
import { PopoverView } from './components/popover-view';
import {
	formatPercent,
	formatPixels,
	labelFromValue,
	overlaySettingLimits,
	sourceColorModeOptions,
} from './overlay-ui-model';

interface OverlaySettingsFormViewOptions {
	settings: OverlaySettings;
	portalContainer: HTMLElement;
	onChange: (settings: Partial<OverlaySettings>) => void;
	onExport: (format: OverlayExportFormat) => void;
}

export class OverlaySettingsFormView {
	public readonly element: HTMLDivElement;
	private readonly overlayToggle: HTMLInputElement;
	private readonly invertToggle: HTMLInputElement;
	private readonly opacityField: RangeFieldView;
	private readonly fontSizeField: RangeFieldView;
	private readonly charColorModeField: ColorModeFieldView;
	private readonly cellColorModeField: ColorModeFieldView;
	private readonly glyphRampField: GlyphRampFieldView;
	private readonly fontCombobox: FontComboboxView;
	private readonly availableFonts = getAvailableFonts();

	public constructor(private readonly options: OverlaySettingsFormViewOptions) {
		this.overlayToggle = createToggleInput((enabled) => this.options.onChange({ enabled }));
		this.opacityField = new RangeFieldView({
			label: 'opacity',
			value: options.settings.opacity,
			limits: overlaySettingLimits.opacity,
			format: formatPercent,
			onChange: (opacity) => this.options.onChange({ opacity }),
		});
		this.fontSizeField = new RangeFieldView({
			label: 'font size',
			value: options.settings.fontSize,
			limits: overlaySettingLimits.fontSize,
			format: formatPixels,
			onChange: (fontSize) => this.options.onChange({ fontSize }),
		});
		const quickControls = h(
			'section',
			{ className: 'tm-control-group', attributes: { 'aria-label': 'quick overlay controls' } },
			createToggleField('overlay', this.overlayToggle),
			this.opacityField.element,
			this.fontSizeField.element
		);

		const tabs = new TabsView();
		tabs.exportContent.append(createExportGrid(options.onExport));

		this.invertToggle = createToggleInput((invert) => this.options.onChange({ invert }));
		this.charColorModeField = new ColorModeFieldView({
			label: 'characters',
			mode: options.settings.charColorMode,
			color: options.settings.charColor,
			portalContainer: options.portalContainer,
			onModeChange: (charColorMode) => this.options.onChange({ charColorMode }),
			onColorChange: (charColor) => this.options.onChange({ charColor }),
		});
		this.cellColorModeField = new ColorModeFieldView({
			label: 'cells',
			mode: options.settings.cellColorMode,
			color: options.settings.cellColor,
			portalContainer: options.portalContainer,
			onModeChange: (cellColorMode) => this.options.onChange({ cellColorMode }),
			onColorChange: (cellColor) => this.options.onChange({ cellColor }),
		});
		this.glyphRampField = new GlyphRampFieldView({
			fontId: options.settings.fontId,
			value: options.settings.glyphRamp,
			onChange: (glyphRamp) => this.options.onChange({ glyphRamp }),
		});
		this.fontCombobox = new FontComboboxView({
			fonts: this.availableFonts,
			value: options.settings.fontId,
			portalContainer: options.portalContainer,
			onChange: (fontId) => this.options.onChange({ fontId }),
		});
		const advancedControls = h(
			'div',
			{ className: 'tm-control-group tm-control-group--advanced' },
			createToggleField('invert', this.invertToggle),
			this.charColorModeField.element,
			this.cellColorModeField.element,
			this.glyphRampField.element,
			createSettingField('font', this.fontCombobox.element)
		);
		tabs.advancedContent.append(advancedControls);

		this.element = h('div', { className: 'tm-settings-form' }, quickControls, tabs.element);
		this.update(options.settings);
	}

	public update(settings: OverlaySettings): void {
		const resolvedFontId = resolveFontId(settings.fontId);
		const selectedFont = getPreferredFontEntry(settings.fontId);
		const glyphRampFontId = resolvedFontId ?? settings.fontId;

		this.overlayToggle.checked = settings.enabled;
		this.opacityField.update(settings.opacity);
		this.fontSizeField.update(settings.fontSize);
		this.invertToggle.checked = settings.invert;
		this.charColorModeField.update(settings.charColorMode, settings.charColor);
		this.cellColorModeField.update(settings.cellColorMode, settings.cellColor);
		this.glyphRampField.update(glyphRampFontId, settings.glyphRamp);
		this.fontCombobox.update(resolvedFontId ?? settings.fontId, selectedFont?.displayName ?? 'System default');

		if (resolvedFontId && resolvedFontId !== settings.fontId) {
			this.options.onChange({ fontId: resolvedFontId });
		}
	}

	public dispose(): void {
		this.charColorModeField.dispose();
		this.cellColorModeField.dispose();
		this.fontCombobox.dispose();
	}
}

interface NumericLimits {
	min: number;
	max: number;
	step: number;
}

interface RangeFieldViewOptions {
	label: string;
	value: number;
	limits: NumericLimits;
	format: (value: number) => string;
	onChange: (value: number) => void;
}

class RangeFieldView {
	public readonly element: HTMLLabelElement;
	private readonly output: HTMLOutputElement;
	private readonly slider: SliderView;
	private value: number;

	public constructor(private readonly options: RangeFieldViewOptions) {
		this.value = options.value;
		this.output = h('output');
		this.slider = new SliderView({
			min: options.limits.min,
			max: options.limits.max,
			step: options.limits.step,
			value: options.value,
			onChange: options.onChange,
		});
		this.element = createSettingField(options.label, this.slider.element, 'tm-field--range', this.output);
		this.update(options.value);
	}

	public update(value: number): void {
		this.value = value;
		this.output.textContent = this.options.format(this.value);
		this.slider.update(value);
	}
}

interface GlyphRampFieldViewOptions {
	fontId: BundledFontId;
	value: string;
	onChange: (glyphRamp: string) => void;
}

class GlyphRampFieldView {
	public readonly element: HTMLDivElement;
	private readonly input: HTMLInputElement;
	private readonly presetName: HTMLOutputElement;
	private fontId: BundledFontId;
	private value: string;

	public constructor(private readonly options: GlyphRampFieldViewOptions) {
		this.fontId = options.fontId;
		this.value = options.value;
		this.input = h('input', {
			className: 'tm-input',
			attributes: { type: 'text' },
		});
		this.input.addEventListener('input', () => {
			this.value = this.input.value;
			this.options.onChange(this.value);
		});
		this.presetName = h('output', { className: 'tm-glyph-ramp-name' });
		const previousButton = createButton('tm-button tm-button--ghost tm-button--glyph-nav', 'previous glyph ramp');
		previousButton.title = 'previous glyph ramp';
		previousButton.append(icon('arrow-left'));
		previousButton.addEventListener('click', () => this.selectAdjacentPreset(-1));
		const nextButton = createButton('tm-button tm-button--ghost tm-button--glyph-nav', 'next glyph ramp');
		nextButton.title = 'next glyph ramp';
		nextButton.append(icon('arrow-right'));
		nextButton.addEventListener('click', () => this.selectAdjacentPreset(1));
		const actions = h('div', { className: 'tm-glyph-ramp-actions' }, this.presetName, previousButton, nextButton);
		const inputId = `tm-glyph-ramp-${Math.random().toString(36).slice(2)}`;
		this.input.id = inputId;
		const label = h(
			'div',
			{ className: 'tm-field__label' },
			h('label', { attributes: { for: inputId }, textContent: 'glyph ramp' }),
			actions
		);
		this.element = h('div', { className: 'tm-field' }, label, this.input);
		this.update(options.fontId, options.value);
	}

	public update(fontId: BundledFontId, value: string): void {
		this.fontId = fontId;
		this.value = value;
		if (document.activeElement !== this.input) {
			this.input.value = value;
		}
		this.presetName.textContent = getGlyphRampPresetName(fontId, value);
	}

	private selectAdjacentPreset(direction: -1 | 1): void {
		this.options.onChange(getAdjacentGlyphRampPreset(this.fontId, this.value, direction).glyphRamp);
	}
}

interface ColorModeFieldViewOptions {
	label: string;
	mode: OverlaySettings['charColorMode'];
	color: string;
	portalContainer: HTMLElement;
	onModeChange: (mode: OverlaySettings['charColorMode']) => void;
	onColorChange: (color: string) => void;
}

class ColorModeFieldView {
	public readonly element: HTMLLabelElement;
	private readonly toggleGroup: ToggleGroupView<OverlaySettings['charColorMode']>;
	private readonly colorPicker: ColorPickerView;

	public constructor(private readonly options: ColorModeFieldViewOptions) {
		this.toggleGroup = new ToggleGroupView(sourceColorModeOptions, options.mode, (mode) =>
			this.options.onModeChange(mode)
		);
		for (const button of this.toggleGroup.element.querySelectorAll<HTMLButtonElement>('button')) {
			button.textContent = labelFromValue(button.textContent ?? '');
			button.setAttribute('aria-label', `${options.label} ${button.textContent}`);
		}
		this.colorPicker = new ColorPickerView({
			label: options.label,
			value: options.color,
			portalContainer: options.portalContainer,
			onChange: options.onColorChange,
		});
		const row = h('div', { className: 'tm-color-row' }, this.toggleGroup.element, this.colorPicker.element);
		this.element = createSettingField(options.label, row);
	}

	public update(mode: OverlaySettings['charColorMode'], color: string): void {
		this.toggleGroup.update(mode);
		this.colorPicker.update(color);
	}

	public dispose(): void {
		this.colorPicker.dispose();
	}
}

interface ColorPickerViewOptions {
	label: string;
	value: string;
	portalContainer: HTMLElement;
	onChange: (color: string) => void;
}

class ColorPickerView {
	public readonly element: HTMLButtonElement;
	private readonly valueLabel: HTMLSpanElement;
	private readonly swatch: HTMLSpanElement;
	private readonly previewSwatch: HTMLSpanElement;
	private readonly colorSpace: HTMLDivElement;
	private readonly hueInput: HTMLInputElement;
	private readonly hueOutput: HTMLOutputElement;
	private readonly hexInput: HTMLInputElement;
	private readonly popover: PopoverView;
	private color: HsvaColor;
	private draftValue: string;
	private lastPropValue: string;

	public constructor(private readonly options: ColorPickerViewOptions) {
		this.lastPropValue = options.value;
		this.color = getHsvaFromHex(options.value);
		this.draftValue = options.value.toLowerCase();
		this.swatch = createColorSwatch(getDisplayColor(options.value));
		this.valueLabel = h('span', {
			className: 'tm-color-trigger__value',
			textContent: getDisplayColor(options.value),
		});
		this.element = h(
			'button',
			{
				className: 'tm-color-trigger',
				attributes: { type: 'button', 'aria-label': `${options.label} color` },
			},
			this.swatch,
			this.valueLabel
		);

		const content = h('div', { className: 'tm-color-popover' });
		content.append(
			h(
				'div',
				{ className: 'tm-color-popover__header', attributes: { 'data-slot': 'popover-header' } },
				h('div', {
					className: 'tm-color-popover__title',
					attributes: { 'data-slot': 'popover-title' },
					textContent: `${options.label} color`,
				}),
				h('p', {
					className: 'tm-color-popover__description',
					attributes: { 'data-slot': 'popover-description' },
					textContent: 'adjust color.',
				})
			)
		);
		this.colorSpace = h(
			'div',
			{
				className: 'tm-color-space',
				attributes: {
					role: 'slider',
					tabindex: '0',
					'aria-label': `${options.label} saturation and brightness`,
				},
			},
			h('span', { className: 'tm-color-space__pointer', attributes: { 'aria-hidden': 'true' } })
		);
		this.colorSpace.addEventListener('pointerdown', (event) => {
			this.colorSpace.setPointerCapture(event.pointerId);
			this.updateColorSpace(event.clientX, event.clientY);
		});
		this.colorSpace.addEventListener('pointermove', (event) => {
			if (this.colorSpace.hasPointerCapture(event.pointerId)) {
				this.updateColorSpace(event.clientX, event.clientY);
			}
		});
		this.colorSpace.addEventListener('keydown', (event) => this.onColorSpaceKeyDown(event));
		content.append(this.colorSpace);

		this.hueOutput = h('output');
		this.hueInput = h('input', {
			className: 'tm-color-range__input tm-color-range--hue',
			attributes: { type: 'range', min: '0', max: '359', step: '1', 'aria-label': 'hue' },
		});
		this.hueInput.addEventListener('input', () => {
			this.commitColor({ ...this.color, h: Number(this.hueInput.value) });
		});
		content.append(
			h(
				'div',
				{ className: 'tm-color-slider-list' },
				h(
					'label',
					{ className: 'tm-color-range' },
					h(
						'span',
						{ className: 'tm-color-range__label' },
						h('span', { textContent: 'hue' }),
						this.hueOutput
					),
					this.hueInput
				)
			)
		);

		this.previewSwatch = createColorSwatch(this.currentHexColor(), 'tm-color-swatch--preview');
		this.hexInput = h('input', {
			className: 'tm-input tm-color-popover__input',
			attributes: {
				type: 'text',
				maxlength: '7',
				'aria-label': `${options.label} color value`,
				autocomplete: 'off',
				autocapitalize: 'off',
				spellcheck: 'false',
			},
		});
		this.hexInput.addEventListener('input', () => this.onHexInput());
		this.hexInput.addEventListener('blur', () => this.onHexBlur());
		content.append(
			h(
				'label',
				{ className: 'tm-color-popover__field' },
				h('span', { className: 'tm-color-popover__field-label', textContent: 'hex value' }),
				h(
					'div',
					{ className: 'tm-color-popover__input-row' },
					this.previewSwatch,
					icon('pipette'),
					this.hexInput
				)
			)
		);

		this.popover = new PopoverView({
			trigger: this.element,
			content,
			portalContainer: options.portalContainer,
			align: 'end',
			sideOffset: 8,
			onOpenChange: (open) => {
				if (open) {
					this.resetDraftFromValue(this.lastPropValue);
					this.render();
				}
			},
		});
		this.render();
	}

	public update(value: string): void {
		if (value === this.lastPropValue) return;
		this.lastPropValue = value;
		this.resetDraftFromValue(value);
		this.render();
	}

	public dispose(): void {
		this.popover.dispose();
	}

	private updateColorSpace(clientX: number, clientY: number): void {
		const rect = this.colorSpace.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return;
		this.commitColor({
			...this.color,
			s: clamp01((clientX - rect.left) / rect.width),
			v: clamp01(1 - (clientY - rect.top) / rect.height),
		});
	}

	private onColorSpaceKeyDown(event: KeyboardEvent): void {
		const step = event.shiftKey ? 0.1 : 0.02;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			this.commitColor({ ...this.color, s: clamp01(this.color.s - step) });
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			this.commitColor({ ...this.color, s: clamp01(this.color.s + step) });
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.commitColor({ ...this.color, v: clamp01(this.color.v - step) });
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.commitColor({ ...this.color, v: clamp01(this.color.v + step) });
		}
	}

	private onHexInput(): void {
		const raw = this.hexInput.value.toLowerCase();
		const hex = raw
			.replace(/^#/, '')
			.replace(/[^0-9a-f]/g, '')
			.slice(0, 6);
		const nextValue = hex ? `#${hex}` : '#';
		this.draftValue = nextValue;
		this.hexInput.value = nextValue;
		if (hex.length === 3 || hex.length === 6) {
			const normalized = normalizeHexColor(nextValue);
			if (normalized) {
				this.color = getHsvaFromHex(normalized);
				this.lastPropValue = normalized;
				this.draftValue = normalized;
				this.options.onChange(normalized);
				this.render();
			}
		}
	}

	private onHexBlur(): void {
		const hex = this.draftValue.replace(/^#/, '').replace(/[^0-9a-f]/g, '');
		if (hex.length !== 3 && hex.length !== 6) {
			this.draftValue = this.currentHexColor();
			this.render();
		}
	}

	private commitColor(nextColor: HsvaColor): void {
		this.color = nextColor;
		const nextHexColor = this.currentHexColor();
		this.lastPropValue = nextHexColor;
		this.draftValue = nextHexColor;
		this.options.onChange(nextHexColor);
		this.render();
	}

	private resetDraftFromValue(value: string): void {
		this.color = getHsvaFromHex(value);
		this.draftValue = value.toLowerCase();
	}

	private currentHexColor(): string {
		return formatHexColor(hsvaToRgba(this.color));
	}

	private render(): void {
		const normalizedValue = getDisplayColor(this.lastPropValue);
		const currentHexColor = this.currentHexColor();
		setStyleProperty(this.swatch, '--tm-color-swatch-color', normalizedValue);
		setStyleProperty(this.previewSwatch, '--tm-color-swatch-color', currentHexColor);
		this.valueLabel.textContent = normalizedValue;
		this.hexInput.value = this.draftValue;
		this.hueInput.value = String(this.color.h);
		this.hueOutput.textContent = String(Math.round(this.color.h));
		setStyleProperty(this.colorSpace, '--tm-color-picker-hue', `hsl(${this.color.h} 100% 50%)`);
		setStyleProperty(this.colorSpace, '--tm-color-space-pointer-x', `${this.color.s * 100}%`);
		setStyleProperty(this.colorSpace, '--tm-color-space-pointer-y', `${(1 - this.color.v) * 100}%`);
		setStyleProperty(this.colorSpace, '--tm-color-space-pointer-color', currentHexColor);
		this.colorSpace.setAttribute(
			'aria-valuetext',
			`saturation ${Math.round(this.color.s * 100)}%, brightness ${Math.round(this.color.v * 100)}%`
		);
		this.popover.updatePosition();
	}
}

interface FontComboboxViewOptions {
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

function createExportGrid(onExport: (format: OverlayExportFormat) => void): HTMLDivElement {
	return h(
		'div',
		{ className: 'tm-export-grid' },
		createExportButton('txt', 'TXT', onExport),
		createExportButton('svg', 'SVG', onExport),
		createExportButton('png', 'PNG', onExport),
		createExportButton('jpg', 'JPG', onExport)
	);
}

function createExportButton(
	format: OverlayExportFormat,
	label: string,
	onExport: (format: OverlayExportFormat) => void
): HTMLButtonElement {
	const button = createButton('tm-button tm-button--outline tm-button--sm tm-export-button', `export ${label}`);
	button.append(
		icon(getExportIconName(format)),
		h('span', { textContent: label }),
		icon('download', 'tm-export-button__download')
	);
	button.addEventListener('click', () => onExport(format));
	return button;
}

function getExportIconName(format: OverlayExportFormat): 'file-text' | 'file-code' | 'image-down' {
	switch (format) {
		case 'txt':
			return 'file-text';
		case 'svg':
			return 'file-code';
		case 'png':
		case 'jpg':
			return 'image-down';
	}
}

function createToggleInput(onChange: (checked: boolean) => void): HTMLInputElement {
	const input = h('input', { attributes: { type: 'checkbox' } });
	input.addEventListener('change', () => onChange(input.checked));
	return input;
}

function createToggleField(label: string, input: HTMLInputElement): HTMLLabelElement {
	return h('label', { className: 'tm-toggle-row' }, h('span', { textContent: label }), input);
}

function createSettingField(
	label: string,
	child: HTMLElement,
	className?: string,
	output?: HTMLOutputElement
): HTMLLabelElement {
	return h(
		'label',
		{ className: classNames('tm-field', className) },
		h('span', { className: 'tm-field__label' }, h('span', { textContent: label }), output ?? null),
		child
	);
}

function createButton(className: string, ariaLabel?: string): HTMLButtonElement {
	return h('button', {
		className,
		attributes: { type: 'button', ...(ariaLabel ? { 'aria-label': ariaLabel } : {}) },
	});
}

function createColorSwatch(color: string, className?: string): HTMLSpanElement {
	const swatch = h('span', {
		className: classNames('tm-color-swatch', className),
		attributes: { 'data-slot': 'color-swatch', 'aria-hidden': 'true' },
	});
	setStyleProperty(swatch, '--tm-color-swatch-color', color);
	return swatch;
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

function clamp01(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}
