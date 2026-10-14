// Keep the usual tab scrollers unless the fixed controls leave too little room.
const MIN_TAB_VIEWPORT_HEIGHT = 48;

export class PanelScrollController {
	private readonly resizeObserver: ResizeObserver | null;
	private readonly mutationObserver: MutationObserver;
	private frame: number | undefined;

	public constructor(private readonly panel: HTMLElement) {
		this.resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(this.schedule);
		this.mutationObserver = new MutationObserver((records) => {
			const contentChanged = records.some((record) => record.type === 'childList');
			const layoutChanged = records.some(
				(record) =>
					record.attributeName === 'hidden' ||
					(record.attributeName === 'data-state' &&
						record.target instanceof HTMLElement &&
						['tab', 'tabpanel'].includes(record.target.getAttribute('role') ?? ''))
			);
			if (!contentChanged && !layoutChanged) return;
			if (contentChanged) this.observeFixedContent();
			this.schedule();
		});
		this.mutationObserver.observe(panel, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['hidden', 'data-state'],
		});
		window.addEventListener('resize', this.schedule);
		this.observeFixedContent();
		this.schedule();
	}

	public dispose(): void {
		this.resizeObserver?.disconnect();
		this.mutationObserver.disconnect();
		window.removeEventListener('resize', this.schedule);
		if (this.frame !== undefined) cancelAnimationFrame(this.frame);
	}

	private observeFixedContent(): void {
		this.resizeObserver?.disconnect();
		this.resizeObserver?.observe(this.panel);
		for (const node of this.panel.querySelectorAll<HTMLElement>(
			'.tm-panel__header, .tm-select-row, .tm-panel__footer, .tm-error, .tm-settings-form > .tm-control-group, .tm-tabs-list, .tm-converter-tabs-list'
		))
			this.resizeObserver?.observe(node);
	}

	private schedule = (): void => {
		if (typeof requestAnimationFrame === 'undefined') {
			this.update();
			return;
		}
		if (this.frame !== undefined) return;
		this.frame = requestAnimationFrame(() => {
			this.frame = undefined;
			this.update();
		});
	};

	private update(): void {
		if (!this.panel.isConnected || !this.panel.getBoundingClientRect().width) return;
		const query = (selector: string): HTMLElement | null => this.panel.querySelector(selector);
		const form = query('.tm-settings-form');
		const tabs = query('.tm-settings-tabs');
		const advanced = query('.tm-tabs-body > .tm-tabs-content[data-state="active"] .tm-converter-tabs');
		const fixed =
			boxHeight(query('.tm-panel__header')) +
			boxHeight(query('.tm-select-row')) +
			boxHeight(query('.tm-panel__footer')) +
			verticalEdges(this.panel) +
			gap(this.panel) * 3 +
			boxHeight(query('.tm-panel-scroll-area__content > .tm-error')) +
			verticalEdges(query('.tm-overlay-card')) +
			boxHeight(query('.tm-overlay-card > .tm-error')) +
			boxHeight(query('.tm-settings-form > .tm-control-group')) +
			gap(form) +
			boxHeight(query('.tm-tabs-list')) +
			verticalEdges(tabs) +
			gap(tabs) +
			(advanced ? boxHeight(query('.tm-converter-tabs-list')) + gap(advanced) : 0);
		const exportGrid = query('.tm-tabs-content[data-state="active"] .tm-export-grid');
		const minimum = exportGrid ? boxHeight(exportGrid) : MIN_TAB_VIEWPORT_HEIGHT;
		const mode = form && Math.min(540, window.innerHeight - 60) - fixed < minimum ? 'panel' : 'tabs';
		if (this.panel.dataset.scrollMode !== mode) this.panel.dataset.scrollMode = mode;
		for (const viewport of this.panel.querySelectorAll<HTMLElement>('[data-slot="scroll-area-viewport"]')) {
			const outer = viewport.classList.contains('tm-panel-scroll-area__viewport');
			const tabIndex = (mode === 'panel') === outer ? 0 : -1;
			if (viewport.tabIndex !== tabIndex) viewport.tabIndex = tabIndex;
		}
	}
}

function boxHeight(node: HTMLElement | null): number {
	if (!node || node.hidden || getComputedStyle(node).display === 'none') return 0;
	const style = getComputedStyle(node);
	return (
		node.getBoundingClientRect().height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
	);
}

function verticalEdges(node: HTMLElement | null): number {
	if (!node) return 0;
	const style = getComputedStyle(node);
	return [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth].reduce(
		(total, value) => total + (parseFloat(value) || 0),
		0
	);
}

function gap(node: HTMLElement | null): number {
	return node ? parseFloat(getComputedStyle(node).rowGap) || 0 : 0;
}
