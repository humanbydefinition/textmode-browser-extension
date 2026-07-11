import { h } from '../dom';
import { createToggleInput } from '../settings/form-controls';
import { ScrollAreaView } from './scroll-area-view';

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
	private readonly brightnessScrollArea: ScrollAreaView;
	private readonly contourScrollArea: ScrollAreaView;
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
		this.brightnessScrollArea = this.createScrollArea();
		this.contourScrollArea = this.createScrollArea();
		this.brightnessScrollArea.content.append(this.brightnessContent);
		this.contourScrollArea.content.append(this.contourContent);
		const brightnessPanel = this.brightnessScrollArea.element;
		const contourPanel = this.contourScrollArea.element;
		brightnessPanel.id = `${id}-brightness-panel`;
		contourPanel.id = `${id}-contour-panel`;
		brightnessPanel.classList.add('tm-converter-tabs-content');
		contourPanel.classList.add('tm-converter-tabs-content');
		brightnessPanel.setAttribute('role', 'tabpanel');
		contourPanel.setAttribute('role', 'tabpanel');

		this.brightnessTrigger = this.createTrigger('brightness', brightnessPanel.id);
		this.contourTrigger = this.createTrigger('contour', contourPanel.id);
		this.brightnessTrigger.id = `${id}-brightness-tab`;
		this.contourTrigger.id = `${id}-contour-tab`;
		brightnessPanel.setAttribute('aria-labelledby', this.brightnessTrigger.id);
		contourPanel.setAttribute('aria-labelledby', this.contourTrigger.id);
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
			brightnessPanel,
			contourPanel
		);
		this.render();
		this.update(options.brightnessEnabled, options.contoursEnabled);
	}

	public update(brightnessEnabled: boolean, contoursEnabled: boolean): void {
		this.brightnessEnabledInput.checked = brightnessEnabled;
		this.contourEnabledInput.checked = contoursEnabled;
	}

	public dispose(): void {
		this.brightnessScrollArea.dispose();
		this.contourScrollArea.dispose();
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

	private createScrollArea(): ScrollAreaView {
		return new ScrollAreaView({
			rootClassName: 'tm-converter-scroll-area',
			viewportClassName: 'tm-converter-scroll-area__viewport',
			contentClassName: 'tm-converter-scroll-area__content',
		});
	}

	private setValue(value: ConverterTab): void {
		this.value = value;
		this.render();
	}

	private render(): void {
		updateTab(
			this.brightnessHeader,
			this.brightnessTrigger,
			this.brightnessScrollArea.element,
			this.value === 'brightness'
		);
		updateTab(this.contourHeader, this.contourTrigger, this.contourScrollArea.element, this.value === 'contour');
		this.brightnessScrollArea.update();
		this.contourScrollArea.update();
	}
}

function updateTab(header: HTMLElement, trigger: HTMLButtonElement, content: HTMLElement, active: boolean): void {
	header.dataset.state = active ? 'active' : 'inactive';
	trigger.dataset.state = active ? 'active' : 'inactive';
	trigger.setAttribute('aria-selected', String(active));
	content.dataset.state = active ? 'active' : 'inactive';
	content.hidden = !active;
}
