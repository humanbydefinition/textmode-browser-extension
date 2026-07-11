import { h } from '../dom';
import { createToggleInput } from '../settings/form-controls';

type ConverterTab = 'brightness' | 'contours';

let converterTabsId = 0;

export class ConverterTabsView {
	public readonly element: HTMLDivElement;
	private readonly brightnessTrigger: HTMLButtonElement;
	private readonly contoursTrigger: HTMLButtonElement;
	private readonly brightnessContent: HTMLElement;
	private readonly contoursContent: HTMLElement;
	private readonly brightnessEnabledInput: HTMLInputElement;
	private readonly contoursEnabledInput: HTMLInputElement;
	private value: ConverterTab = 'brightness';

	public constructor(options: {
		brightnessContent: HTMLElement;
		contoursContent: HTMLElement;
		brightnessEnabled: boolean;
		contoursEnabled: boolean;
		onBrightnessEnabledChange: (enabled: boolean) => void;
		onContoursEnabledChange: (enabled: boolean) => void;
	}) {
		const id = `converter-tabs-${++converterTabsId}`;
		this.brightnessContent = options.brightnessContent;
		this.contoursContent = options.contoursContent;
		this.brightnessContent.id = `${id}-brightness-panel`;
		this.contoursContent.id = `${id}-contours-panel`;
		this.brightnessContent.classList.add('tm-converter-tabs-content');
		this.contoursContent.classList.add('tm-converter-tabs-content');
		this.brightnessContent.setAttribute('role', 'tabpanel');
		this.contoursContent.setAttribute('role', 'tabpanel');

		this.brightnessTrigger = this.createTrigger('brightness', this.brightnessContent.id);
		this.contoursTrigger = this.createTrigger('contours', this.contoursContent.id);
		this.brightnessTrigger.id = `${id}-brightness-tab`;
		this.contoursTrigger.id = `${id}-contours-tab`;
		this.brightnessContent.setAttribute('aria-labelledby', this.brightnessTrigger.id);
		this.contoursContent.setAttribute('aria-labelledby', this.contoursTrigger.id);
		this.brightnessEnabledInput = createToggleInput(options.onBrightnessEnabledChange);
		this.brightnessEnabledInput.setAttribute('aria-label', 'brightness on');
		this.contoursEnabledInput = createToggleInput(options.onContoursEnabledChange);
		this.contoursEnabledInput.setAttribute('aria-label', 'contours on');
		this.brightnessTrigger.addEventListener('click', () => this.setValue('brightness'));
		this.contoursTrigger.addEventListener('click', () => this.setValue('contours'));

		const list = h(
			'div',
			{
				className: 'tm-converter-tabs-list',
				attributes: { role: 'tablist', 'aria-label': 'conversion settings' },
			},
			this.createHeader(this.brightnessTrigger, this.brightnessEnabledInput),
			this.createHeader(this.contoursTrigger, this.contoursEnabledInput)
		);
		this.element = h(
			'div',
			{ className: 'tm-converter-tabs', attributes: { 'data-slot': 'converter-tabs' } },
			list,
			this.brightnessContent,
			this.contoursContent
		);
		this.render();
		this.update(options.brightnessEnabled, options.contoursEnabled);
	}

	public update(brightnessEnabled: boolean, contoursEnabled: boolean): void {
		this.brightnessEnabledInput.checked = brightnessEnabled;
		this.contoursEnabledInput.checked = contoursEnabled;
	}

	private createTrigger(value: ConverterTab, controls: string): HTMLButtonElement {
		return h('button', {
			className: 'tm-converter-tabs-trigger',
			textContent: value,
			attributes: { type: 'button', role: 'tab', 'aria-controls': controls },
		});
	}

	private createHeader(trigger: HTMLButtonElement, input: HTMLInputElement): HTMLDivElement {
		return h(
			'div',
			{ className: 'tm-converter-tab-header' },
			trigger,
			h('label', { className: 'tm-toggle-row' }, input)
		);
	}

	private setValue(value: ConverterTab): void {
		this.value = value;
		this.render();
	}

	private render(): void {
		updateTab(this.brightnessTrigger, this.brightnessContent, this.value === 'brightness');
		updateTab(this.contoursTrigger, this.contoursContent, this.value === 'contours');
	}
}

function updateTab(trigger: HTMLButtonElement, content: HTMLElement, active: boolean): void {
	trigger.dataset.state = active ? 'active' : 'inactive';
	trigger.setAttribute('aria-selected', String(active));
	content.dataset.state = active ? 'active' : 'inactive';
	content.hidden = !active;
}
