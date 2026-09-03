import {
	getAvailableFonts,
	getCustomFonts,
	getPreferredFontEntry,
	resolveFontId,
} from '../../shared/fonts/runtime-font-registry';
import type { CustomFontSummary } from '../../domain/fonts/custom-font-entry';
import type { CustomFontId, FontId, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { DEFAULT_FONT_ID, createDefaultOverlaySettings, isBundledFontId } from '../../domain/overlay/overlay-settings';
import { toUserMessage } from '../../shared/errors/errors';
import { h } from './dom';
import { icon } from './icons';
import { TabsView } from './components/tabs-view';
import { ConverterTabsView } from './components/converter-tabs-view';
import { FontComboboxView, type FontEntry } from './font-combobox/font-combobox-view';
import { ColorPickerView } from './color-picker/color-picker-view';
import { ColorModeFieldView } from './settings/color-mode-field-view';
import { createExportGrid } from './settings/export-grid-view';
import { createButton, createSettingField, createToggleField, createToggleInput } from './settings/form-controls';
import { GlyphRampFieldView } from './settings/glyph-ramp-field-view';
import { RangeFieldView } from './settings/range-field-view';
import { formatPercent, formatPixels, overlaySettingLimits } from './overlay-ui-model';
import { PostFxPanelView } from './post-fx-panel-view';
import { ContourPanelView } from './contour-panel-view';

interface OverlaySettingsFormViewOptions {
	settings: OverlaySettings;
	portalContainer: HTMLElement;
	customFonts?: readonly CustomFontSummary[];
	allowCustomFontUpload?: boolean;
	onChange: (settings: Partial<OverlaySettings>) => Promise<void> | void;
	onExport: (format: OverlayExportFormat) => void;
	onUploadFont?: (file: File) => Promise<{ id: CustomFontId; displayName: string }>;
	onRemoveCustomFont?: (id: CustomFontId) => Promise<void> | void;
	onError?: (message: string) => void;
}

export class OverlaySettingsFormView {
	public readonly element: HTMLDivElement;
	private readonly overlayToggle: HTMLInputElement;
	private readonly invertToggle: HTMLInputElement;
	private readonly opacityField: RangeFieldView;
	private readonly fontSizeField: RangeFieldView;
	private readonly backgroundColorPicker: ColorPickerView;
	private readonly charColorModeField: ColorModeFieldView;
	private readonly cellColorModeField: ColorModeFieldView;
	private readonly glyphRampField: GlyphRampFieldView;
	private readonly fontCombobox: FontComboboxView;
	private readonly postFxPanel: PostFxPanelView;
	private readonly contourPanel: ContourPanelView;
	private readonly converterTabs: ConverterTabsView;
	private readonly tabs: TabsView;
	private readonly resetButton: HTMLButtonElement;
	private availableFonts: readonly FontEntry[];
	private customFontSummaries: readonly CustomFontSummary[];

	public constructor(private readonly options: OverlaySettingsFormViewOptions) {
		this.customFontSummaries = options.customFonts ?? [];
		this.availableFonts = this.refreshAvailableFonts();
		this.overlayToggle = createToggleInput((enabled) => this.options.onChange({ enabled }));
		this.overlayToggle.setAttribute('aria-label', 'overlay');
		this.resetButton = createButton(
			'tm-button tm-button--ghost tm-button--subtle tm-settings-reset',
			'reset all settings to defaults'
		);
		this.resetButton.append(icon('rotate-ccw'), 'reset');
		this.resetButton.addEventListener('click', () => void this.resetSettings());
		const overlayRow = h(
			'div',
			{ className: 'tm-toggle-row tm-overlay-toggle-row' },
			h(
				'div',
				{ className: 'tm-overlay-toggle-actions' },
				h('span', { textContent: 'overlay' }),
				this.resetButton
			),
			h('label', { className: 'tm-overlay-toggle-control' }, this.overlayToggle)
		);
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
		this.backgroundColorPicker = new ColorPickerView({
			label: 'background',
			value: options.settings.background,
			portalContainer: options.portalContainer,
			onChange: (background) => this.options.onChange({ background }),
		});
		const quickControls = h(
			'section',
			{ className: 'tm-control-group', attributes: { 'aria-label': 'quick overlay controls' } },
			overlayRow,
			this.opacityField.element,
			this.fontSizeField.element
		);

		this.tabs = new TabsView();
		this.tabs.exportContent.append(createExportGrid(options.onExport));

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
			fontId: isBundledFontId(options.settings.fontId) ? options.settings.fontId : DEFAULT_FONT_ID,
			value: options.settings.glyphRamp,
			onChange: (glyphRamp) => this.options.onChange({ glyphRamp }),
		});
		this.fontCombobox = new FontComboboxView({
			fonts: this.availableFonts,
			value: options.settings.fontId,
			portalContainer: options.portalContainer,
			allowCustomFontUpload: options.allowCustomFontUpload ?? false,
			onChange: (fontId) => this.selectFont(fontId),
			onUploadFont: options.onUploadFont ? (file) => this.uploadFont(file) : undefined,
			onRemoveCustomFont: options.onRemoveCustomFont ? (id) => this.removeCustomFont(id) : undefined,
		});
		const fontField = h(
			'div',
			{ className: 'tm-field tm-main-font-field' },
			h(
				'div',
				{ className: 'tm-field__label' },
				h('span', { textContent: 'font' }),
				this.fontCombobox.cycleControls
			),
			this.fontCombobox.element
		);
		const fontRow = h(
			'div',
			{ className: 'tm-main-font-row' },
			createSettingField('background', this.backgroundColorPicker.element),
			fontField
		);
		quickControls.append(fontRow);
		const brightnessControls = h(
			'div',
			{ className: 'tm-control-group tm-converter-controls tm-brightness-controls' },
			createToggleField('invert', this.invertToggle),
			this.charColorModeField.element,
			this.cellColorModeField.element,
			this.glyphRampField.element
		);
		this.contourPanel = new ContourPanelView({
			settings: options.settings,
			portalContainer: options.portalContainer,
			onChange: (settings) => this.options.onChange(settings),
		});
		this.converterTabs = new ConverterTabsView({
			brightnessContent: brightnessControls,
			contoursContent: this.contourPanel.element,
			brightnessEnabled: options.settings.brightnessEnabled,
			contoursEnabled: options.settings.contour.enabled,
			onBrightnessEnabledChange: (brightnessEnabled) => this.options.onChange({ brightnessEnabled }),
			onContoursEnabledChange: (enabled) => this.contourPanel.setEnabled(enabled),
		});
		const advancedControls = h(
			'div',
			{ className: 'tm-control-group tm-advanced-controls' },
			this.converterTabs.element
		);
		this.tabs.advancedContent.append(advancedControls);
		this.postFxPanel = new PostFxPanelView({
			settings: options.settings,
			onChange: (settings) => this.options.onChange(settings),
		});
		this.tabs.postFxContent.append(this.postFxPanel.element);

		this.element = h('div', { className: 'tm-settings-form' }, quickControls, this.tabs.element);
		this.update(options.settings);
	}

	public update(
		settings: OverlaySettings,
		customFonts: readonly CustomFontSummary[] = this.customFontSummaries
	): void {
		this.customFontSummaries = customFonts;
		this.availableFonts = this.refreshAvailableFonts();
		this.fontCombobox.setFonts(this.availableFonts);
		const resolvedFontId = resolveFontId(settings.fontId);
		const selectedFont = getPreferredFontEntry(settings.fontId);
		const customFont = this.availableFonts.find((font) => font.id === settings.fontId);
		const activeFontId = resolvedFontId ?? settings.fontId;
		const glyphRampFontId = isBundledFontId(activeFontId) ? activeFontId : DEFAULT_FONT_ID;

		this.overlayToggle.checked = settings.enabled;
		this.opacityField.update(settings.opacity);
		this.fontSizeField.update(settings.fontSize);
		this.backgroundColorPicker.update(settings.background);
		this.invertToggle.checked = settings.invert;
		this.charColorModeField.update(settings.charColorMode, settings.charColor);
		this.cellColorModeField.update(settings.cellColorMode, settings.cellColor);
		this.glyphRampField.update(glyphRampFontId, settings.glyphRamp);
		this.fontCombobox.update(activeFontId, customFont?.displayName ?? selectedFont?.displayName ?? 'Custom font');
		this.postFxPanel.update(settings);
		this.contourPanel.update(settings);
		this.converterTabs.update(settings.brightnessEnabled, settings.contour.enabled);

		if (resolvedFontId && resolvedFontId !== settings.fontId) {
			this.options.onChange({ fontId: resolvedFontId });
		}
	}

	public dispose(): void {
		this.backgroundColorPicker.dispose();
		this.charColorModeField.dispose();
		this.cellColorModeField.dispose();
		this.fontCombobox.dispose();
		this.postFxPanel.dispose();
		this.contourPanel.dispose();
		this.converterTabs.dispose();
		this.tabs.dispose();
	}

	private refreshAvailableFonts(): readonly FontEntry[] {
		const customFontsById = new Map<CustomFontId, FontEntry>();
		for (const font of getCustomFonts()) {
			customFontsById.set(font.id, {
				kind: 'custom',
				id: font.id,
				displayName: font.displayName,
				fileName: font.fileName,
			});
		}
		for (const font of this.customFontSummaries) {
			if (!customFontsById.has(font.id)) {
				customFontsById.set(font.id, {
					kind: 'custom',
					id: font.id,
					displayName: font.displayName,
				});
			}
		}
		return [
			...customFontsById.values(),
			...getAvailableFonts().map((font): FontEntry => ({ ...font, kind: 'bundled' })),
		];
	}

	private async uploadFont(file: File): Promise<void> {
		if (!this.options.onUploadFont) return;
		try {
			const entry = await this.options.onUploadFont(file);
			this.availableFonts = this.refreshAvailableFonts();
			this.fontCombobox.setFonts(this.availableFonts);
			this.fontCombobox.update(entry.id, entry.displayName);
			await this.options.onChange({ fontId: entry.id });
		} catch (error) {
			this.options.onError?.(toUserMessage(error));
		}
	}

	private async selectFont(fontId: FontId): Promise<void> {
		try {
			await this.options.onChange({ fontId });
		} catch (error) {
			this.options.onError?.(toUserMessage(error));
			throw error;
		}
	}

	private async removeCustomFont(id: CustomFontId): Promise<void> {
		if (!this.options.onRemoveCustomFont) return;
		try {
			await this.options.onRemoveCustomFont(id);
			this.availableFonts = this.refreshAvailableFonts();
			this.fontCombobox.setFonts(this.availableFonts);
			if (this.availableFonts.every((font) => font.id !== id)) {
				this.fontCombobox.update(DEFAULT_FONT_ID, 'BESCII');
			}
		} catch (error) {
			this.options.onError?.(toUserMessage(error));
		}
	}

	private async resetSettings(): Promise<void> {
		if (this.resetButton.disabled) return;
		this.resetButton.disabled = true;
		this.resetButton.setAttribute('aria-busy', 'true');
		try {
			await this.options.onChange(createDefaultOverlaySettings());
		} catch (error) {
			this.options.onError?.(toUserMessage(error));
		} finally {
			this.resetButton.disabled = false;
			this.resetButton.removeAttribute('aria-busy');
		}
	}
}
