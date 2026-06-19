import type { OverlaySettings } from '../../../domain/overlay/overlay-settings';
import { h } from '../dom';
import { ToggleGroupView } from '../components/toggle-group-view';
import { ColorPickerView } from '../color-picker/color-picker-view';
import { labelFromValue, sourceColorModeOptions } from '../overlay-ui-model';
import { createSettingField } from './form-controls';

export interface ColorModeFieldViewOptions {
	label: string;
	mode: OverlaySettings['charColorMode'];
	color: string;
	portalContainer: HTMLElement;
	onModeChange: (mode: OverlaySettings['charColorMode']) => void;
	onColorChange: (color: string) => void;
}

export class ColorModeFieldView {
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
