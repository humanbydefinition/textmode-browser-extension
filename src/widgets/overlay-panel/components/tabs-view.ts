import { h } from '../dom';

export class TabsView {
	public readonly element: HTMLDivElement;
	public readonly exportContent: HTMLDivElement;
	public readonly advancedContent: HTMLDivElement;
	private readonly exportTrigger: HTMLButtonElement;
	private readonly advancedTrigger: HTMLButtonElement;
	private value: 'export' | 'advanced' = 'export';

	public constructor() {
		this.exportTrigger = h('button', {
			className: 'tm-tabs-trigger',
			textContent: 'export',
			attributes: { type: 'button', role: 'tab', 'data-slot': 'tabs-trigger' },
		});
		this.advancedTrigger = h('button', {
			className: 'tm-tabs-trigger',
			textContent: 'advanced',
			attributes: { type: 'button', role: 'tab', 'data-slot': 'tabs-trigger' },
		});
		const list = h(
			'div',
			{
				className: 'tm-tabs-list',
				attributes: { role: 'tablist', 'aria-label': 'overlay controls', 'data-slot': 'tabs-list' },
			},
			this.exportTrigger,
			this.advancedTrigger
		);
		this.exportContent = h('div', {
			className: 'tm-tabs-content',
			attributes: { role: 'tabpanel', 'data-slot': 'tabs-content' },
		});
		this.advancedContent = h('div', {
			className: 'tm-tabs-content',
			attributes: { role: 'tabpanel', 'data-slot': 'tabs-content' },
		});
		this.element = h(
			'div',
			{ className: 'tm-settings-tabs', attributes: { 'data-slot': 'tabs' } },
			list,
			this.exportContent,
			this.advancedContent
		);

		this.exportTrigger.addEventListener('click', () => this.setValue('export'));
		this.advancedTrigger.addEventListener('click', () => this.setValue('advanced'));
		this.render();
	}

	public setValue(value: 'export' | 'advanced'): void {
		this.value = value;
		this.render();
	}

	private render(): void {
		updateTab(this.exportTrigger, this.exportContent, this.value === 'export');
		updateTab(this.advancedTrigger, this.advancedContent, this.value === 'advanced');
	}
}

function updateTab(trigger: HTMLButtonElement, content: HTMLDivElement, active: boolean): void {
	trigger.dataset.state = active ? 'active' : 'inactive';
	trigger.setAttribute('aria-selected', String(active));
	content.dataset.state = active ? 'active' : 'inactive';
	content.hidden = !active;
}
