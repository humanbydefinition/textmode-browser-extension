import { getAvailableFonts, getPreferredFontEntry, resolveFontId } from '../../shared/fonts/runtime-font-registry';
import type { OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { h } from './dom';
import { TabsView } from './components/tabs-view';
import { FontComboboxView } from './font-combobox/font-combobox-view';
import { ColorModeFieldView } from './settings/color-mode-field-view';
import { createExportGrid } from './settings/export-grid-view';
import { createSettingField, createToggleField, createToggleInput } from './settings/form-controls';
import { GlyphRampFieldView } from './settings/glyph-ramp-field-view';
import { RangeFieldView } from './settings/range-field-view';
import { formatPercent, formatPixels, overlaySettingLimits } from './overlay-ui-model';

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
