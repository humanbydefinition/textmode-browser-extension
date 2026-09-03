import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorPickerView } from '../../../src/widgets/overlay-panel/color-picker/color-picker-view';

describe('ColorPickerView', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('renders an alpha slider and emits colors with the selected alpha', () => {
		const onChange = vi.fn();
		const view = new ColorPickerView({
			label: 'background',
			value: '#ff000080',
			portalContainer: document.body,
			onChange,
		});
		document.body.append(view.element);

		view.element.click();

		const alphaInput = document.body.querySelector<HTMLInputElement>('input[aria-label="background alpha"]');
		const alphaOutput = alphaInput?.closest('.tm-color-range')?.querySelector('output');
		expect(alphaInput?.value).toBe(String(128 / 255));
		expect(alphaOutput?.textContent).toBe('50%');

		alphaInput!.value = '0.25';
		alphaInput!.dispatchEvent(new Event('input', { bubbles: true }));

		expect(onChange).toHaveBeenLastCalledWith('#ff000040');
		expect(alphaOutput?.textContent).toBe('25%');
		expect(document.body.querySelector<HTMLInputElement>('.tm-color-popover__input')?.maxLength).toBe(9);

		view.dispose();
	});
});
