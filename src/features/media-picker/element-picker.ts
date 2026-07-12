import type { ElementKind } from '../../domain/overlay/overlay-settings';

export type SelectableElement = HTMLCanvasElement | HTMLVideoElement;

export interface CandidateInfo {
	element: SelectableElement;
	kind: ElementKind;
	label: string;
}

export interface ElementPickerOptions {
	onPick: (element: SelectableElement) => void;
	onCancel: () => void;
	onUnavailableFrame?: (reason: string) => void;
}

const PICKER_CLASS = 'textmode-ascii-overlay-picker';
const PICKER_HIGHLIGHT_Z_INDEX = '2147483645';
const PICKER_BLOCKER_Z_INDEX = '2147483644';
const IFRAME_BLOCKER_CLASS = 'textmode-ascii-overlay-iframe-blocker';

export class ElementPicker {
	private readonly highlight = document.createElement('div');
	private active = false;
	private previousCursor = '';
	private readonly iframeBlockers = new Map<HTMLIFrameElement, HTMLDivElement>();

	public constructor(private readonly options: ElementPickerOptions) {
		this.highlight.className = PICKER_CLASS;
		Object.assign(this.highlight.style, {
			position: 'fixed',
			zIndex: PICKER_HIGHLIGHT_Z_INDEX,
			pointerEvents: 'none',
			borderRadius: '4px',
			boxShadow: 'inset 0 0 0 2px #38bdf8',
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
		this.mountUnavailableFrameBlockers();
		window.addEventListener('pointermove', this.onPointerMove, true);
		window.addEventListener('click', this.onClick, true);
		window.addEventListener('keydown', this.onKeyDown, true);
		window.addEventListener('scroll', this.onViewportChange, true);
		window.addEventListener('resize', this.onViewportChange, true);
	}

	public stop(cancelled = true): void {
		if (!this.active) return;
		this.active = false;
		document.documentElement.style.cursor = this.previousCursor;
		this.highlight.remove();
		this.removeUnavailableFrameBlockers();
		window.removeEventListener('pointermove', this.onPointerMove, true);
		window.removeEventListener('click', this.onClick, true);
		window.removeEventListener('keydown', this.onKeyDown, true);
		window.removeEventListener('scroll', this.onViewportChange, true);
		window.removeEventListener('resize', this.onViewportChange, true);
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
		const blocker = findUnavailableFrameBlocker(event.target);
		if (blocker) {
			event.preventDefault();
			event.stopPropagation();
			this.options.onUnavailableFrame?.(
				blocker.dataset.textmodeUnavailableReason ??
					'This iframe is unavailable because it does not share the page origin.'
			);
			return;
		}
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

	private readonly onViewportChange = (): void => {
		this.syncUnavailableFrameBlockers();
	};

	private mountUnavailableFrameBlockers(): void {
		for (const iframe of document.querySelectorAll('iframe')) {
			if (iframe.closest('[data-textmode-ascii-extension-ui="true"]') || isSameOriginFrame(iframe)) continue;
			const blocker = document.createElement('div');
			blocker.className = IFRAME_BLOCKER_CLASS;
			blocker.dataset.textmodeAsciiExtensionUi = 'true';
			blocker.dataset.textmodeUnavailableReason =
				'This iframe is cross-origin or sandboxed. Textmode Overlay is limited to same-origin frames.';
			blocker.title = blocker.dataset.textmodeUnavailableReason;
			blocker.textContent = 'iframe unavailable';
			Object.assign(blocker.style, {
				position: 'fixed',
				zIndex: PICKER_BLOCKER_Z_INDEX,
				boxSizing: 'border-box',
				cursor: 'not-allowed',
				pointerEvents: 'auto',
				border: '2px dashed rgba(248, 113, 113, 0.9)',
				borderRadius: '4px',
				background: 'rgba(127, 29, 29, 0.16)',
				color: '#fecaca',
				font: '600 11px/1.2 system-ui, sans-serif',
				padding: '6px',
			});
			document.documentElement.append(blocker);
			this.iframeBlockers.set(iframe, blocker);
		}
		this.syncUnavailableFrameBlockers();
	}

	private syncUnavailableFrameBlockers(): void {
		for (const [iframe, blocker] of this.iframeBlockers) {
			if (!iframe.isConnected) {
				blocker.remove();
				this.iframeBlockers.delete(iframe);
				continue;
			}
			const rect = iframe.getBoundingClientRect();
			Object.assign(blocker.style, {
				display: rect.width > 0 && rect.height > 0 ? 'block' : 'none',
				left: `${rect.left}px`,
				top: `${rect.top}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
			});
		}
	}

	private removeUnavailableFrameBlockers(): void {
		for (const blocker of this.iframeBlockers.values()) blocker.remove();
		this.iframeBlockers.clear();
	}
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

function isSameOriginFrame(iframe: HTMLIFrameElement): boolean {
	try {
		return Boolean(iframe.contentDocument?.documentElement);
	} catch {
		return false;
	}
}

function findUnavailableFrameBlocker(target: EventTarget | null): HTMLElement | null {
	return target instanceof Element ? target.closest<HTMLElement>(`.${IFRAME_BLOCKER_CLASS}`) : null;
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
