import { h } from '../dom';
import { createToggleInput } from '../settings/form-controls';

type ConverterTab = 'brightness' | 'contour';

let converterTabsId = 0;

export class ConverterTabsView {
	public readonly element: HTMLDivElement;
	private readonly brightnessTrigger: HTMLButtonElement;
	private readonly contourTrigger: HTMLButtonElement;
	private readonly brightnessHeader: HTMLDivElement;
	private readonly contourHeader: HTMLDivElement;
	private readonly brightnessContent: HTMLElement;
	private readonly contourContent: HTMLElement;
	private readonly brightnessEnabledInput: HTMLInputElement;
	private readonly contourEnabledInput: HTMLInputElement;
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
		this.contourContent = options.contoursContent;
		this.brightnessContent.id = `${id}-brightness-panel`;
		this.contourContent.id = `${id}-contour-panel`;
		this.brightnessContent.classList.add('tm-converter-tabs-content');
		this.contourContent.classList.add('tm-converter-tabs-content');
		this.brightnessContent.setAttribute('role', 'tabpanel');
		this.contourContent.setAttribute('role', 'tabpanel');

		this.brightnessTrigger = this.createTrigger('brightness', this.brightnessContent.id);
		this.contourTrigger = this.createTrigger('contour', this.contourContent.id);
		this.brightnessTrigger.id = `${id}-brightness-tab`;
		this.contourTrigger.id = `${id}-contour-tab`;
		this.brightnessContent.setAttribute('aria-labelledby', this.brightnessTrigger.id);
		this.contourContent.setAttribute('aria-labelledby', this.contourTrigger.id);
		this.brightnessEnabledInput = createToggleInput(options.onBrightnessEnabledChange);
		this.brightnessEnabledInput.setAttribute('aria-label', 'brightness on');
		this.contourEnabledInput = createToggleInput(options.onContoursEnabledChange);
		this.contourEnabledInput.setAttribute('aria-label', 'contour on');
		this.brightnessTrigger.addEventListener('click', () => this.setValue('brightness'));
		this.contourTrigger.addEventListener('click', () => this.setValue('contour'));
		this.brightnessHeader = this.createHeader(this.brightnessTrigger, this.brightnessEnabledInput);
		this.contourHeader = this.createHeader(this.contourTrigger, this.contourEnabledInput);

		const list = h(
			'div',
			{
				className: 'tm-converter-tabs-list',
				attributes: { role: 'tablist', 'aria-label': 'conversion settings' },
			},
			this.brightnessHeader,
			this.contourHeader
		);
		this.element = h(
			'div',
			{ className: 'tm-converter-tabs', attributes: { 'data-slot': 'converter-tabs' } },
			list,
			this.brightnessContent,
			this.contourContent
		);
		this.render();
		this.update(options.brightnessEnabled, options.contoursEnabled);
	}

	public update(brightnessEnabled: boolean, contoursEnabled: boolean): void {
		this.brightnessEnabledInput.checked = brightnessEnabled;
		this.contourEnabledInput.checked = contoursEnabled;
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
		updateTab(this.brightnessHeader, this.brightnessTrigger, this.brightnessContent, this.value === 'brightness');
		updateTab(this.contourHeader, this.contourTrigger, this.contourContent, this.value === 'contour');
	}
}

function updateTab(header: HTMLElement, trigger: HTMLButtonElement, content: HTMLElement, active: boolean): void {
	header.dataset.state = active ? 'active' : 'inactive';
	trigger.dataset.state = active ? 'active' : 'inactive';
	trigger.setAttribute('aria-selected', String(active));
	content.dataset.state = active ? 'active' : 'inactive';
	content.hidden = !active;
}
