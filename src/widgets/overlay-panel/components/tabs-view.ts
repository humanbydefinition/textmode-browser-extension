import { h } from '../dom';
import { ScrollAreaView } from './scroll-area-view';

export class TabsView {
	public readonly element: HTMLDivElement;
	public readonly exportContent: HTMLDivElement;
	public readonly advancedContent: HTMLDivElement;
	public readonly postFxContent: HTMLDivElement;
	private readonly exportTrigger: HTMLButtonElement;
	private readonly advancedTrigger: HTMLButtonElement;
	private readonly postFxTrigger: HTMLButtonElement;
	private readonly postFxPanel: HTMLDivElement;
	private readonly postFxScrollArea: ScrollAreaView;
	private value: 'export' | 'advanced' | 'postFx' = 'export';

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
		this.postFxTrigger = h('button', {
			className: 'tm-tabs-trigger',
			textContent: 'post fx',
			attributes: { type: 'button', role: 'tab', 'data-slot': 'tabs-trigger' },
		});
		const list = h(
			'div',
			{
				className: 'tm-tabs-list',
				attributes: { role: 'tablist', 'aria-label': 'overlay controls', 'data-slot': 'tabs-list' },
			},
			this.exportTrigger,
			this.advancedTrigger,
			this.postFxTrigger
		);
		this.exportContent = h('div', {
			className: 'tm-tabs-content',
			attributes: { role: 'tabpanel', 'data-slot': 'tabs-content' },
		});
		this.advancedContent = h('div', {
			className: 'tm-tabs-content',
			attributes: { role: 'tabpanel', 'data-slot': 'tabs-content' },
		});
		this.postFxPanel = h('div', {
			className: 'tm-tabs-content',
			attributes: { role: 'tabpanel', 'data-slot': 'tabs-content' },
		});
		this.postFxScrollArea = new ScrollAreaView({
			rootClassName: 'tm-post-fx-scroll-area',
			viewportClassName: 'tm-post-fx-scroll-area__viewport',
			contentClassName: 'tm-post-fx-scroll-area__content',
		});
		this.postFxContent = this.postFxScrollArea.content as HTMLDivElement;
		this.postFxPanel.append(this.postFxScrollArea.element);
		const contentHost = h(
			'div',
			{ className: 'tm-tabs-body' },
			this.exportContent,
			this.advancedContent,
			this.postFxPanel
		);
		this.element = h(
			'div',
			{ className: 'tm-settings-tabs', attributes: { 'data-slot': 'tabs' } },
			list,
			contentHost
		);

		this.exportTrigger.addEventListener('click', () => this.setValue('export'));
		this.advancedTrigger.addEventListener('click', () => this.setValue('advanced'));
		this.postFxTrigger.addEventListener('click', () => this.setValue('postFx'));
		this.render();
	}

	public setValue(value: 'export' | 'advanced' | 'postFx'): void {
		this.value = value;
		this.render();
	}

	public dispose(): void {
		this.postFxScrollArea.dispose();
	}

	private render(): void {
		updateTab(this.exportTrigger, this.exportContent, this.value === 'export');
		updateTab(this.advancedTrigger, this.advancedContent, this.value === 'advanced');
		updateTab(this.postFxTrigger, this.postFxPanel, this.value === 'postFx');
		this.postFxScrollArea.update();
	}
}

function updateTab(trigger: HTMLButtonElement, content: HTMLDivElement, active: boolean): void {
	trigger.dataset.state = active ? 'active' : 'inactive';
	trigger.setAttribute('aria-selected', String(active));
	content.dataset.state = active ? 'active' : 'inactive';
	content.hidden = !active;
}
