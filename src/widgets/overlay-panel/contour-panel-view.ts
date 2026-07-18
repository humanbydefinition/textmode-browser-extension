import type { OverlayContourSettings, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { h } from './dom';
import { createToggleField, createToggleInput } from './settings/form-controls';
import { ColorModeFieldView } from './settings/color-mode-field-view';
import { RangeFieldView } from './settings/range-field-view';
import { formatPercent, overlaySettingLimits } from './overlay-ui-model';

interface ContourPanelViewOptions {
	settings: OverlaySettings;
	portalContainer: HTMLElement;
	onChange: (settings: Partial<OverlaySettings>) => void;
}

export class ContourPanelView {
	public readonly element: HTMLDivElement;
	private readonly invertInput: HTMLInputElement;
	private readonly thresholdField: RangeFieldView;
	private readonly colorSensitivityField: RangeFieldView;
	private readonly charColorField: ColorModeFieldView;
	private readonly cellColorField: ColorModeFieldView;
	private contour: OverlayContourSettings;

	public constructor(private readonly options: ContourPanelViewOptions) {
		this.contour = options.settings.contour;
		this.invertInput = createToggleInput((invert) => this.patch({ invert }));
		this.charColorField = new ColorModeFieldView({
			label: 'characters',
			mode: this.contour.charColorMode,
			color: this.contour.charColor,
			portalContainer: options.portalContainer,
			onModeChange: (charColorMode) => this.patch({ charColorMode }),
			onColorChange: (charColor) => this.patch({ charColor }),
		});
		this.cellColorField = new ColorModeFieldView({
			label: 'cells',
			mode: this.contour.cellColorMode,
			color: this.contour.cellColor,
			portalContainer: options.portalContainer,
			onModeChange: (cellColorMode) => this.patch({ cellColorMode }),
			onColorChange: (cellColor) => this.patch({ cellColor }),
		});
		this.thresholdField = new RangeFieldView({
			label: 'threshold',
			value: this.contour.threshold,
			limits: overlaySettingLimits.contourThreshold,
			format: formatPercent,
			onChange: (threshold) => this.patch({ threshold }),
		});
		this.colorSensitivityField = new RangeFieldView({
			label: 'color sensitivity',
			value: this.contour.colorSensitivity,
			limits: overlaySettingLimits.contourColorSensitivity,
			format: formatPercent,
			onChange: (colorSensitivity) => this.patch({ colorSensitivity }),
		});
		this.element = h(
			'div',
			{ className: 'tm-control-group tm-converter-controls tm-contour-controls' },
			createToggleField('invert', this.invertInput),
			this.charColorField.element,
			this.cellColorField.element,
			this.thresholdField.element,
			this.colorSensitivityField.element
		);
		this.update(options.settings);
	}

	public update(settings: OverlaySettings): void {
		this.contour = settings.contour;
		this.invertInput.checked = this.contour.invert;
		this.thresholdField.update(this.contour.threshold);
		this.colorSensitivityField.update(this.contour.colorSensitivity);
		this.charColorField.update(this.contour.charColorMode, this.contour.charColor);
		this.cellColorField.update(this.contour.cellColorMode, this.contour.cellColor);
	}

	public setEnabled(enabled: boolean): void {
		this.patch({ enabled });
	}

	public dispose(): void {
		this.charColorField.dispose();
		this.cellColorField.dispose();
	}

	private patch(patch: Partial<OverlayContourSettings>): void {
		this.options.onChange({ contour: { ...this.contour, ...patch } });
	}
}
