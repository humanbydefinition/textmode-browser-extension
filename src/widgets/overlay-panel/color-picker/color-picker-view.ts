import {
	formatHexColor,
	getDisplayColor,
	getHsvaFromHex,
	hsvaToRgba,
	normalizeHexColor,
	type HsvaColor,
} from '../color-picker-model';
import { classNames, h, setStyleProperty } from '../dom';
import { icon } from '../icons';
import { PopoverView } from '../components/popover-view';

export interface ColorPickerViewOptions {
	label: string;
	value: string;
	portalContainer: HTMLElement;
	onChange: (color: string) => void;
}

export class ColorPickerView {
	public readonly element: HTMLButtonElement;
	private readonly valueLabel: HTMLSpanElement;
	private readonly swatch: HTMLSpanElement;
	private previewSwatch!: HTMLSpanElement;
	private colorSpace!: HTMLDivElement;
	private hueInput!: HTMLInputElement;
	private hueOutput!: HTMLOutputElement;
	private hexInput!: HTMLInputElement;
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

		const content = this.createPopoverContent(options.label);
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

	private createPopoverContent(label: string): HTMLDivElement {
		const content = h('div', { className: 'tm-color-popover' });
		content.append(
			h(
				'div',
				{ className: 'tm-color-popover__header', attributes: { 'data-slot': 'popover-header' } },
				h('div', {
					className: 'tm-color-popover__title',
					attributes: { 'data-slot': 'popover-title' },
					textContent: `${label} color`,
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
					'aria-label': `${label} saturation and brightness`,
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
				'aria-label': `${label} color value`,
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
		return content;
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

function createColorSwatch(color: string, className?: string): HTMLSpanElement {
	const swatch = h('span', {
		className: classNames('tm-color-swatch', className),
		attributes: { 'data-slot': 'color-swatch', 'aria-hidden': 'true' },
	});
	setStyleProperty(swatch, '--tm-color-swatch-color', color);
	return swatch;
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}
