import type { ElementKind } from '../shared/overlay-settings';

export type SelectableElement = HTMLCanvasElement | HTMLVideoElement;

export interface CandidateInfo {
	element: SelectableElement;
	kind: ElementKind;
	label: string;
}

export interface ElementPickerOptions {
	onPick: (element: SelectableElement) => void;
	onCancel: () => void;
}

const PICKER_CLASS = 'textmode-ascii-overlay-picker';
const PICKER_HIGHLIGHT_Z_INDEX = '2147483645';

export class ElementPicker {
	private readonly highlight = document.createElement('div');
	private active = false;
	private previousCursor = '';

	public constructor(private readonly options: ElementPickerOptions) {
		this.highlight.className = PICKER_CLASS;
		Object.assign(this.highlight.style, {
			position: 'fixed',
			zIndex: PICKER_HIGHLIGHT_Z_INDEX,
			pointerEvents: 'none',
			border: '2px solid #38bdf8',
			borderRadius: '4px',
			boxShadow: '0 0 0 1px rgba(2, 6, 23, 0.8)',
			background: 'rgba(56, 189, 248, 0.06)',
			display: 'none',
		});
	}

	public start(): void {
		if (this.active) return;
		this.active = true;
		this.previousCursor = document.documentElement.style.cursor;
		document.documentElement.style.cursor = 'crosshair';
		document.documentElement.append(this.highlight);
		window.addEventListener('pointermove', this.onPointerMove, true);
		window.addEventListener('click', this.onClick, true);
		window.addEventListener('keydown', this.onKeyDown, true);
	}

	public stop(cancelled = true): void {
		if (!this.active) return;
		this.active = false;
		document.documentElement.style.cursor = this.previousCursor;
		this.highlight.remove();
		window.removeEventListener('pointermove', this.onPointerMove, true);
		window.removeEventListener('click', this.onClick, true);
		window.removeEventListener('keydown', this.onKeyDown, true);
		if (cancelled) {
			this.options.onCancel();
		}
	}

	private readonly onPointerMove = (event: PointerEvent): void => {
		const candidate = findCandidateAtPoint(event.clientX, event.clientY);
		if (!candidate) {
			this.highlight.style.display = 'none';
			return;
		}

		const rect = candidate.getBoundingClientRect();
		Object.assign(this.highlight.style, {
			display: 'block',
			left: `${rect.left}px`,
			top: `${rect.top}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
		});
	};

	private readonly onClick = (event: MouseEvent): void => {
		const candidate = findCandidateAtPoint(event.clientX, event.clientY);
		if (!candidate) return;
		event.preventDefault();
		event.stopPropagation();
		this.stop(false);
		this.options.onPick(candidate);
	};

	private readonly onKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		event.stopPropagation();
		this.stop(true);
	};
}

export function getSelectableElements(root: ParentNode = document): SelectableElement[] {
	return Array.from(root.querySelectorAll('canvas, video')).filter(isSelectableElement);
}

export function isSelectableElement(element: Element): element is SelectableElement {
	if (!(element instanceof HTMLCanvasElement) && !(element instanceof HTMLVideoElement)) {
		return false;
	}

	if (!element.isConnected || element.closest('[data-textmode-ascii-extension-ui="true"]')) {
		return false;
	}

	const rect = element.getBoundingClientRect();
	if (rect.width < 8 || rect.height < 8) {
		return false;
	}

	const styles = window.getComputedStyle(element);
	return (
		styles.display !== 'none' &&
		styles.visibility !== 'hidden' &&
		(styles.opacity === '' || Number(styles.opacity) > 0)
	);
}

export function describeElement(element: SelectableElement): CandidateInfo {
	return {
		element,
		kind: element instanceof HTMLVideoElement ? 'video' : 'canvas',
		label: createElementLabel(element),
	};
}

function findCandidateAtPoint(clientX: number, clientY: number): SelectableElement | undefined {
	for (const element of document.elementsFromPoint(clientX, clientY)) {
		if (isSelectableElement(element)) {
			return element;
		}
	}
	return undefined;
}

function createElementLabel(element: SelectableElement): string {
	const id = element.id ? `#${element.id}` : '';
	const classes = [...element.classList]
		.slice(0, 2)
		.map((value) => `.${value}`)
		.join('');
	const rect = element.getBoundingClientRect();
	const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
	return `${element.tagName.toLowerCase()}${id}${classes} ${size}`.trim();
}
