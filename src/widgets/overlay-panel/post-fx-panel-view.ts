import type { OverlaySettings } from '../../domain/overlay/overlay-settings';
import {
	getOverlayPostFxDefinition,
	normalizeOverlayPostFxParams,
	type OverlayPostFxItem,
	type OverlayPostFxParamDefinition,
} from '../../domain/overlay/overlay-settings';
import { type Cleanup, h, on } from './dom';
import { icon } from './icons';
import { createButton, createToggleInput } from './settings/form-controls';
import { RangeFieldView } from './settings/range-field-view';

interface PostFxPanelViewOptions {
	settings: OverlaySettings;
	onChange: (settings: Partial<OverlaySettings>) => void;
}

type DragState = {
	itemId: string;
	pointerId: number;
	overId: string | null;
	cleanup: Cleanup[];
};

export class PostFxPanelView {
	public readonly element: HTMLElement;
	private readonly list: HTMLDivElement;
	private readonly rowCleanups: Cleanup[] = [];
	private readonly rowFieldsByItemId = new Map<string, RangeFieldView[]>();
	private readonly expandedIds = new Set<string>();
	private postFx: OverlayPostFxItem[];
	private dragState: DragState | null = null;

	public constructor(private readonly options: PostFxPanelViewOptions) {
		this.postFx = options.settings.postFx;
		this.list = h('div', {
			className: 'tm-post-fx-list',
			attributes: { role: 'list', 'aria-label': 'post effects' },
		});
		this.element = h('section', { className: 'tm-post-fx-panel' }, this.list);
		this.render();
	}

	public update(settings: OverlaySettings): void {
		const prevPostFx = this.postFx;
		this.postFx = settings.postFx;
		this.pruneExpandedIds();

		if (this.canUpdateInPlace(prevPostFx, settings.postFx)) {
			this.updateFieldValues(settings.postFx);
		} else {
			this.render();
		}
	}

	private canUpdateInPlace(prev: readonly OverlayPostFxItem[], next: readonly OverlayPostFxItem[]): boolean {
		if (prev.length !== next.length) return false;
		for (let i = 0; i < prev.length; i++) {
			if (prev[i].id !== next[i].id) return false;
			if (prev[i].enabled !== next[i].enabled) return false;
		}
		return true;
	}

	private updateFieldValues(postFx: readonly OverlayPostFxItem[]): void {
		for (const item of postFx) {
			const definition = getOverlayPostFxDefinition(item.filter);
			const fields = this.rowFieldsByItemId.get(item.id);
			if (!definition || !fields) continue;
			for (let i = 0; i < definition.params.length; i++) {
				const paramDef = definition.params[i];
				fields[i]?.update(item.params[paramDef.id]);
			}
		}
	}

	public dispose(): void {
		this.clearRows();
		this.endDrag();
	}

	private render(): void {
		this.clearRows();
		const rows = this.postFx.map((item) => this.createRow(item));
		this.list.replaceChildren(...rows);
	}

	private createRow(item: OverlayPostFxItem): HTMLDivElement {
		const definition = getOverlayPostFxDefinition(item.filter);
		const label = definition?.label ?? item.filter;
		const contentId = `post-fx-${item.id}-content`;
		const triggerId = `post-fx-${item.id}-trigger`;
		const isExpanded = this.expandedIds.has(item.id);
		const enabledInput = createToggleInput((enabled) => this.patchItem(item.id, { enabled }));
		enabledInput.checked = item.enabled;
		enabledInput.addEventListener('click', (event) => event.stopPropagation());

		const gripButton = createButton('tm-post-fx-grip', `Reorder ${label}`);
		gripButton.append(icon('grip-vertical'));
		const triggerButton = createButton('tm-post-fx-main', isExpanded ? `Collapse ${label}` : `Expand ${label}`);
		triggerButton.setAttribute('id', triggerId);
		triggerButton.setAttribute('aria-controls', contentId);
		triggerButton.setAttribute('aria-expanded', String(isExpanded));
		triggerButton.dataset.slot = 'accordion-trigger';
		triggerButton.append(h('span', { className: 'tm-post-fx-name', textContent: label }));
		const disclosureButton = createButton(
			'tm-post-fx-disclosure',
			isExpanded ? `Collapse ${label}` : `Expand ${label}`
		);
		disclosureButton.setAttribute('aria-controls', contentId);
		disclosureButton.setAttribute('aria-expanded', String(isExpanded));
		disclosureButton.append(icon('chevron-down'));
		const header = h(
			'div',
			{ className: 'tm-post-fx-header' },
			gripButton,
			triggerButton,
			h(
				'label',
				{ className: 'tm-toggle-row tm-post-fx-toggle' },
				h('span', { textContent: 'on' }),
				enabledInput
			),
			disclosureButton
		);
		const content = h('div', {
			className: 'tm-post-fx-content',
			attributes: {
				id: contentId,
				role: 'region',
				'aria-labelledby': triggerId,
				'data-slot': 'accordion-content',
			},
		});
		const itemFields: RangeFieldView[] = [];
		for (const paramDefinition of definition?.params ?? []) {
			const field = this.createParamField(item, paramDefinition);
			itemFields.push(field);
			content.append(field.element);
		}
		this.rowFieldsByItemId.set(item.id, itemFields);
		if (!definition?.params.length) {
			content.append(h('p', { className: 'tm-post-fx-static', textContent: 'this effect has no controls.' }));
		}
		const row = h(
			'div',
			{
				className: 'tm-post-fx-row tm-accordion-item',
				attributes: { role: 'listitem', 'data-slot': 'accordion-item' },
			},
			header,
			content
		);
		this.updateRowState(row, triggerButton, disclosureButton, content, isExpanded, item.enabled);

		this.rowCleanups.push(on(triggerButton, 'click', () => this.toggleExpanded(item.id)));
		this.rowCleanups.push(on(disclosureButton, 'click', () => this.toggleExpanded(item.id)));
		this.rowCleanups.push(on(gripButton, 'pointerdown', (event) => this.startDrag(event, item.id, row)));
		return row;
	}

	private createParamField(item: OverlayPostFxItem, paramDefinition: OverlayPostFxParamDefinition): RangeFieldView {
		return new RangeFieldView({
			label: paramDefinition.label,
			value: item.params[paramDefinition.id],
			limits: {
				min: paramDefinition.min,
				max: paramDefinition.max,
				step: paramDefinition.step,
			},
			format: (value) => formatPostFxParam(value, paramDefinition),
			onChange: (value) => this.updateParam(item.id, paramDefinition.id, value),
		});
	}

	private toggleExpanded(itemId: string): void {
		if (this.expandedIds.has(itemId)) {
			this.expandedIds.delete(itemId);
		} else {
			this.expandedIds.add(itemId);
		}
		this.render();
	}

	private updateParam(itemId: string, paramId: string, value: number): void {
		this.emit(
			this.postFx.map((item) =>
				item.id === itemId
					? {
							...item,
							params: normalizeOverlayPostFxParams(item.filter, {
								...item.params,
								[paramId]: value,
							}),
						}
					: item
			)
		);
	}

	private patchItem(itemId: string, patch: Partial<OverlayPostFxItem>): void {
		this.emit(this.postFx.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
	}

	private startDrag(event: PointerEvent, itemId: string, row: HTMLDivElement): void {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		this.endDrag();
		row.setPointerCapture?.(event.pointerId);
		row.dataset.dragging = 'true';
		this.list.dataset.dragging = itemId;

		const cleanup: Cleanup[] = [];
		const onMove = (moveEvent: PointerEvent): void => this.updateDragOver(itemId, moveEvent.clientY);
		const onEnd = (endEvent: PointerEvent): void => {
			if (row.hasPointerCapture?.(endEvent.pointerId)) {
				row.releasePointerCapture(endEvent.pointerId);
			}
			this.finishDrag();
		};
		cleanup.push(on(row, 'pointermove', onMove));
		cleanup.push(on(row, 'pointerup', onEnd));
		cleanup.push(on(row, 'pointercancel', onEnd));
		this.dragState = { itemId, pointerId: event.pointerId, overId: itemId, cleanup };
	}

	private updateDragOver(itemId: string, clientY: number): void {
		const state = this.dragState;
		if (!state || state.itemId !== itemId) return;

		const rows = [...this.list.querySelectorAll<HTMLElement>('.tm-post-fx-row')];
		const over = rows.find((row) => {
			const rect = row.getBoundingClientRect();
			return clientY >= rect.top && clientY <= rect.bottom;
		});
		const overId = over ? (this.postFx[rows.indexOf(over)]?.id ?? null) : null;
		state.overId = overId ?? state.overId;

		for (const row of rows) {
			if (row === over && overId !== itemId) {
				row.dataset.sorting = 'true';
			} else {
				delete row.dataset.sorting;
			}
		}
	}

	private finishDrag(): void {
		const state = this.dragState;
		if (!state) return;
		const { itemId, overId } = state;
		this.endDrag();
		if (!overId || itemId === overId) {
			this.render();
			return;
		}

		const fromIndex = this.postFx.findIndex((item) => item.id === itemId);
		const toIndex = this.postFx.findIndex((item) => item.id === overId);
		if (fromIndex < 0 || toIndex < 0) return;
		const next = [...this.postFx];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		this.emit(next);
	}

	private endDrag(): void {
		if (!this.dragState) return;
		for (const cleanup of this.dragState.cleanup) {
			cleanup();
		}
		this.dragState = null;
		delete this.list.dataset.dragging;
		for (const row of this.list.querySelectorAll<HTMLElement>('.tm-post-fx-row')) {
			delete row.dataset.dragging;
			delete row.dataset.sorting;
		}
	}

	private updateRowState(
		row: HTMLElement,
		triggerButton: HTMLButtonElement,
		disclosureButton: HTMLButtonElement,
		content: HTMLElement,
		open: boolean,
		enabled: boolean
	): void {
		const state = open ? 'open' : 'closed';
		row.dataset.state = state;
		if (enabled) {
			row.dataset.enabled = 'true';
		} else {
			delete row.dataset.enabled;
		}
		triggerButton.dataset.state = state;
		triggerButton.setAttribute('aria-expanded', String(open));
		disclosureButton.dataset.state = state;
		disclosureButton.setAttribute('aria-expanded', String(open));
		content.dataset.state = state;
		content.hidden = !open;
	}

	private clearRows(): void {
		for (const cleanup of this.rowCleanups) {
			cleanup();
		}
		this.rowCleanups.length = 0;
		this.rowFieldsByItemId.clear();
		this.list.replaceChildren();
	}

	private pruneExpandedIds(): void {
		for (const id of this.expandedIds) {
			if (this.postFx.every((item) => item.id !== id)) {
				this.expandedIds.delete(id);
			}
		}
	}

	private emit(postFx: OverlayPostFxItem[]): void {
		this.options.onChange({ postFx });
	}
}

function formatPostFxParam(value: number, definition: OverlayPostFxParamDefinition): string {
	switch (definition.format) {
		case 'percent':
			return `${Math.round(value * 100)}%`;
		case 'pixels':
			return `${Number.isInteger(value) ? value : value.toFixed(1)}px`;
		case 'degrees':
			return `${Math.round(value)}deg`;
		default:
			return Number.isInteger(value) ? String(value) : value.toFixed(2);
	}
}
