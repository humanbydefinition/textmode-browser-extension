import { classNames, h } from '../dom';

export interface NumericLimits {
	min: number;
	max: number;
	step: number;
}

export function createButton(className: string, ariaLabel?: string): HTMLButtonElement {
	return h('button', {
		className,
		attributes: { type: 'button', ...(ariaLabel ? { 'aria-label': ariaLabel } : {}) },
	});
}

export function createToggleInput(onChange: (checked: boolean) => void): HTMLInputElement {
	const input = h('input', { attributes: { type: 'checkbox' } });
	input.addEventListener('change', () => onChange(input.checked));
	return input;
}

export function createToggleField(label: string, input: HTMLInputElement): HTMLLabelElement {
	return h('label', { className: 'tm-toggle-row' }, h('span', { textContent: label }), input);
}

export function createSettingField(
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
