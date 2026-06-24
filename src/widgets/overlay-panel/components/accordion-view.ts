import { type Cleanup, h, on } from '../dom';

export interface AccordionItemViewOptions {
	id: string;
	trigger: HTMLElement;
	content: HTMLElement;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export class AccordionItemView {
	public readonly id: string;
	public readonly element: HTMLDivElement;
	public readonly triggerButton: HTMLButtonElement;
	public readonly contentElement: HTMLDivElement;
	private readonly cleanups: Cleanup[] = [];
	private open: boolean;

	public constructor(private readonly options: AccordionItemViewOptions) {
		this.id = options.id;
		this.open = options.open ?? false;
		this.triggerButton = h(
			'button',
			{
				className: 'tm-accordion-trigger',
				attributes: {
					type: 'button',
					'aria-controls': `${options.id}-content`,
					'aria-expanded': String(this.open),
					id: `${options.id}-trigger`,
					'data-slot': 'accordion-trigger',
				},
			},
			options.trigger
		);
		this.contentElement = h(
			'div',
			{
				className: 'tm-accordion-content',
				attributes: {
					id: `${options.id}-content`,
					role: 'region',
					'aria-labelledby': `${options.id}-trigger`,
					'data-slot': 'accordion-content',
				},
			},
			options.content
		);
		this.element = h(
			'div',
			{
				className: 'tm-accordion-item',
				attributes: { id: options.id, 'data-slot': 'accordion-item' },
			},
			this.triggerButton,
			this.contentElement
		);

		this.cleanups.push(on(this.triggerButton, 'click', () => this.setOpen(!this.open)));
		this.render();
	}

	public setOpen(open: boolean): void {
		if (this.open === open) return;
		this.open = open;
		this.options.onOpenChange?.(this.open);
		this.render();
	}

	public dispose(): void {
		for (const cleanup of this.cleanups) {
			cleanup();
		}
		this.cleanups.length = 0;
	}

	private render(): void {
		const state = this.open ? 'open' : 'closed';
		this.element.dataset.state = state;
		this.triggerButton.dataset.state = state;
		this.triggerButton.setAttribute('aria-expanded', String(this.open));
		this.contentElement.dataset.state = state;
		this.contentElement.hidden = !this.open;
	}
}

export class AccordionView {
	public readonly element: HTMLDivElement;
	private readonly items = new Map<string, AccordionItemView>();

	public constructor() {
		this.element = h('div', {
			className: 'tm-accordion',
			attributes: { 'data-slot': 'accordion', 'data-orientation': 'vertical' },
		});
	}

	public setItems(items: readonly AccordionItemView[]): void {
		for (const item of this.items.values()) {
			if (!items.includes(item)) {
				item.dispose();
			}
		}
		this.items.clear();
		this.element.replaceChildren(...items.map((item) => item.element));
		for (const item of items) {
			this.items.set(item.id, item);
		}
	}

	public dispose(): void {
		for (const item of this.items.values()) {
			item.dispose();
		}
		this.items.clear();
	}
}
