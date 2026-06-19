import { h } from '../dom';
import { SliderView } from '../components/slider-view';
import { createSettingField, type NumericLimits } from './form-controls';

export interface RangeFieldViewOptions {
	label: string;
	value: number;
	limits: NumericLimits;
	format: (value: number) => string;
	onChange: (value: number) => void;
}

export class RangeFieldView {
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
