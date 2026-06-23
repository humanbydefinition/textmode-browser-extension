import { h } from '../dom';
import { ScrollAreaView } from './scroll-area-view';

export class TabsView {
	public readonly element: HTMLDivElement;
	public readonly exportContent: HTMLDivElement;
	public readonly advancedContent: HTMLDivElement;
	private readonly scrollArea: ScrollAreaView;
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
		this.scrollArea = new ScrollAreaView({
			rootClassName: 'tm-tabs-scroll-area',
			viewportClassName: 'tm-tabs-scroll-area__viewport',
			contentClassName: 'tm-tabs-scroll-area__content',
		});
		this.scrollArea.content.append(this.exportContent, this.advancedContent);
		this.element = h(
			'div',
			{ className: 'tm-settings-tabs', attributes: { 'data-slot': 'tabs' } },
			list,
			this.scrollArea.element
		);

		this.exportTrigger.addEventListener('click', () => this.setValue('export'));
		this.advancedTrigger.addEventListener('click', () => this.setValue('advanced'));
		this.render();
	}

	public setValue(value: 'export' | 'advanced'): void {
		this.value = value;
		this.render();
	}

	public dispose(): void {
		this.scrollArea.dispose();
	}

	private render(): void {
		updateTab(this.exportTrigger, this.exportContent, this.value === 'export');
		updateTab(this.advancedTrigger, this.advancedContent, this.value === 'advanced');
		this.scrollArea.update();
	}
}

function updateTab(trigger: HTMLButtonElement, content: HTMLDivElement, active: boolean): void {
	trigger.dataset.state = active ? 'active' : 'inactive';
	trigger.setAttribute('aria-selected', String(active));
	content.dataset.state = active ? 'active' : 'inactive';
	content.hidden = !active;
}
