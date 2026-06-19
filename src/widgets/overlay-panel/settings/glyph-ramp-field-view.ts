import type { BundledFontId } from '../../../domain/overlay/overlay-settings';
import { getAdjacentGlyphRampPreset, getGlyphRampPresetName } from '../../../domain/overlay/glyph-ramp-registry';
import { h } from '../dom';
import { icon } from '../icons';
import { createButton } from './form-controls';

export interface GlyphRampFieldViewOptions {
	fontId: BundledFontId;
	value: string;
	onChange: (glyphRamp: string) => void;
}

export class GlyphRampFieldView {
	public readonly element: HTMLDivElement;
	private readonly input: HTMLInputElement;
	private readonly presetName: HTMLOutputElement;
	private fontId: BundledFontId;
	private value: string;

	public constructor(private readonly options: GlyphRampFieldViewOptions) {
		this.fontId = options.fontId;
		this.value = options.value;
		this.input = h('input', {
			className: 'tm-input',
			attributes: { type: 'text' },
		});
		this.input.addEventListener('input', () => {
			this.value = this.input.value;
			this.options.onChange(this.value);
		});
		this.presetName = h('output', { className: 'tm-glyph-ramp-name' });
		const previousButton = createButton('tm-button tm-button--ghost tm-button--glyph-nav', 'previous glyph ramp');
		previousButton.title = 'previous glyph ramp';
		previousButton.append(icon('arrow-left'));
		previousButton.addEventListener('click', () => this.selectAdjacentPreset(-1));
		const nextButton = createButton('tm-button tm-button--ghost tm-button--glyph-nav', 'next glyph ramp');
		nextButton.title = 'next glyph ramp';
		nextButton.append(icon('arrow-right'));
		nextButton.addEventListener('click', () => this.selectAdjacentPreset(1));
		const actions = h('div', { className: 'tm-glyph-ramp-actions' }, this.presetName, previousButton, nextButton);
		const inputId = `tm-glyph-ramp-${Math.random().toString(36).slice(2)}`;
		this.input.id = inputId;
		const label = h(
			'div',
			{ className: 'tm-field__label' },
			h('label', { attributes: { for: inputId }, textContent: 'glyph ramp' }),
			actions
		);
		this.element = h('div', { className: 'tm-field' }, label, this.input);
		this.update(options.fontId, options.value);
	}

	public update(fontId: BundledFontId, value: string): void {
		this.fontId = fontId;
		this.value = value;
		if (document.activeElement !== this.input) {
			this.input.value = value;
		}
		this.presetName.textContent = getGlyphRampPresetName(fontId, value);
	}

	private selectAdjacentPreset(direction: -1 | 1): void {
		this.options.onChange(getAdjacentGlyphRampPreset(this.fontId, this.value, direction).glyphRamp);
	}
}
