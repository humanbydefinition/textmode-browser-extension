import { h } from '../dom';

export class ToggleGroupView<TValue extends string> {
	public readonly element: HTMLDivElement;
	private readonly buttons = new Map<TValue, HTMLButtonElement>();
	private value: TValue;

	public constructor(
		values: readonly TValue[],
		value: TValue,
		private readonly onChange: (value: TValue) => void
	) {
		this.value = value;
		this.element = h('div', {
			className: 'tm-toggle-group tm-color-mode-group',
			attributes: { 'data-slot': 'toggle-group', role: 'group' },
		});

		for (const option of values) {
			const button = h('button', {
				className: 'tm-toggle-group-item tm-color-mode-item',
				textContent: option,
				attributes: { type: 'button', 'data-slot': 'toggle-group-item' },
			});
			button.addEventListener('click', () => {
				if (this.value === option) return;
				this.value = option;
				this.render();
				this.onChange(option);
			});
			this.buttons.set(option, button);
			this.element.append(button);
		}

		this.render();
	}

	public update(value: TValue): void {
		this.value = value;
		this.render();
	}

	private render(): void {
		for (const [value, button] of this.buttons) {
			const active = value === this.value;
			button.dataset.state = active ? 'on' : 'off';
			button.setAttribute('aria-pressed', String(active));
		}
	}
}
