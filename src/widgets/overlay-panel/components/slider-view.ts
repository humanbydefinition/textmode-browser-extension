import { h, setStyleProperty } from '../dom';

export interface SliderViewOptions {
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: (value: number) => void;
}

export class SliderView {
	public readonly element: HTMLDivElement;
	private readonly range: HTMLDivElement;
	private readonly thumb: HTMLSpanElement;
	private min: number;
	private max: number;
	private step: number;
	private value: number;

	public constructor(private readonly options: SliderViewOptions) {
		this.min = options.min;
		this.max = options.max;
		this.step = options.step;
		this.value = options.value;
		this.range = h('div', { attributes: { 'data-slot': 'slider-range', 'data-orientation': 'horizontal' } });
		const track = h(
			'div',
			{ attributes: { 'data-slot': 'slider-track', 'data-orientation': 'horizontal' } },
			this.range
		);
		this.thumb = h('span', {
			attributes: {
				'data-slot': 'slider-thumb',
				'data-orientation': 'horizontal',
				role: 'slider',
				tabindex: '0',
			},
		});
		this.element = h(
			'div',
			{
				attributes: { 'data-slot': 'slider', 'data-orientation': 'horizontal' },
			},
			track,
			this.thumb
		);
		this.thumb.style.position = 'absolute';
		this.thumb.style.transform = 'translateX(-50%)';

		this.element.addEventListener('pointerdown', (event) => {
			this.element.setPointerCapture(event.pointerId);
			this.updateFromClientX(event.clientX);
		});
		this.element.addEventListener('pointermove', (event) => {
			if (this.element.hasPointerCapture(event.pointerId)) {
				this.updateFromClientX(event.clientX);
			}
		});
		this.thumb.addEventListener('keydown', (event) => {
			if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
				event.preventDefault();
				this.commit(this.value - this.step);
			} else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
				event.preventDefault();
				this.commit(this.value + this.step);
			} else if (event.key === 'Home') {
				event.preventDefault();
				this.commit(this.min);
			} else if (event.key === 'End') {
				event.preventDefault();
				this.commit(this.max);
			}
		});

		this.render();
	}

	public update(value: number): void {
		this.value = value;
		this.render();
	}

	private updateFromClientX(clientX: number): void {
		const rect = this.element.getBoundingClientRect();
		if (rect.width <= 0) return;
		const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
		this.commit(this.min + percent * (this.max - this.min));
	}

	private commit(rawValue: number): void {
		const stepped = Math.round((rawValue - this.min) / this.step) * this.step + this.min;
		const nextValue = clamp(stepped, this.min, this.max);
		if (Object.is(nextValue, this.value)) return;
		this.value = nextValue;
		this.render();
		this.options.onChange(nextValue);
	}

	private render(): void {
		const percent = this.max === this.min ? 0 : ((this.value - this.min) / (this.max - this.min)) * 100;
		setStyleProperty(this.range, 'width', `${percent}%`);
		setStyleProperty(this.thumb, 'left', `${percent}%`);
		this.thumb.setAttribute('aria-valuemin', String(this.min));
		this.thumb.setAttribute('aria-valuemax', String(this.max));
		this.thumb.setAttribute('aria-valuenow', String(this.value));
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
