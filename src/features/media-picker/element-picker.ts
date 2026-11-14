import {
	PickerTargetRegistry,
	isSelectableElement,
	type PickerTarget,
	type SelectableElement,
} from './picker-target-registry';
import { PickerOverlayLayer } from './picker-overlay-layer';

export type { CandidateInfo, SelectableElement } from './picker-target-registry';
export { describeElement, getSelectableElements, isSelectableElement } from './picker-target-registry';

export interface ElementPickerOptions {
	onPick: (element: SelectableElement) => void;
	onCancel: () => void;
	onDirectCancel?: () => void;
	onUnavailableFrame?: (reason: string) => void;
	restoreFocus?: boolean;
	onFrameStructureChanged?: () => void;
	onTargetsChanged?: (targets: import('../../shared/messaging/messages').PickerTargetSummary[]) => void;
}

export class ElementPicker {
	private readonly registry = new PickerTargetRegistry();
	private readonly overlay: PickerOverlayLayer;
	private readonly targets = new Map<string, PickerTarget>();
	private active = false;
	private direct = false;
	private previousCursor = '';
	private previousFocus?: HTMLElement;
	private activeTargetId?: string;
	private focusedTargetId?: string;
	private lastPointer?: { x: number; y: number };
	private mutationObserver?: MutationObserver;
	private resizeObserver?: ResizeObserver;
	private animationFrame?: number;
	private readonly observedTargets = new Set<Element>();
	private readonly frameLoadListeners = new Map<HTMLIFrameElement, EventListener>();

	public constructor(private readonly options: ElementPickerOptions) {
		this.overlay = new PickerOverlayLayer({
			onActivate: (targetId) => this.activateTarget(targetId),
		});
	}

	public start(direct = true): void {
		if (this.active) return;
		this.active = true;
		this.previousCursor = document.documentElement.style.cursor;
		this.previousFocus = getDeepActiveElement();
		this.setDirectMode(direct);
		this.overlay.mount();
		this.refreshTargets();
		this.mountObservers();
		window.addEventListener('pointermove', this.onPointerMove, true);
		window.addEventListener('click', this.onClick, true);
		window.addEventListener('keydown', this.onKeyDown, true);
		window.addEventListener('scroll', this.onViewportChange, true);
		window.addEventListener('resize', this.onViewportChange, true);
		for (const name of MEDIA_EVENTS) document.addEventListener(name, this.onMediaChange, true);
		window.visualViewport?.addEventListener('resize', this.onViewportChange);
		window.visualViewport?.addEventListener('scroll', this.onViewportChange);
		this.scheduleGeometryUpdate();
	}

	public stop(cancelled = true): void {
		if (!this.active) return;
		this.active = false;
		this.setDirectMode(false);
		this.disconnectObservers();
		this.overlay.unmount();
		window.removeEventListener('pointermove', this.onPointerMove, true);
		window.removeEventListener('click', this.onClick, true);
		window.removeEventListener('keydown', this.onKeyDown, true);
		window.removeEventListener('scroll', this.onViewportChange, true);
		window.removeEventListener('resize', this.onViewportChange, true);
		for (const name of MEDIA_EVENTS) document.removeEventListener(name, this.onMediaChange, true);
		window.visualViewport?.removeEventListener('resize', this.onViewportChange);
		window.visualViewport?.removeEventListener('scroll', this.onViewportChange);
		if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
		this.animationFrame = undefined;
		this.targets.clear();
		if ((this.options.restoreFocus ?? window === window.top) && this.previousFocus?.isConnected) {
			this.previousFocus.focus({ preventScroll: true });
		}
		this.previousFocus = undefined;
		if (cancelled) this.options.onCancel();
	}

	public activateTarget(targetId: string): boolean {
		if (!this.active) return false;
		const target = this.targets.get(targetId);
		if (!target) return false;
		if (target.availability === 'blocked') {
			const reason = target.reasonText ?? 'This iframe is unavailable.';
			this.options.onUnavailableFrame?.(reason);
			return false;
		}
		if (target.element instanceof HTMLCanvasElement || target.element instanceof HTMLVideoElement) {
			if (!isSelectableElement(target.element)) {
				this.refreshTargets();
				return false;
			}
			this.stop(false);
			this.options.onPick(target.element);
			return true;
		}
		return false;
	}

	public highlightTarget(targetId?: string): void {
		this.focusedTargetId = targetId && this.targets.has(targetId) ? targetId : undefined;
		this.overlay.setPreview(this.focusedTargetId);
		if (this.focusedTargetId) this.setActiveTarget(this.focusedTargetId);
		else {
			this.setActiveTarget(undefined);
			this.updatePointerTarget();
		}
	}

	public refresh(): void {
		this.refreshTargets();
	}

	public setDirectMode(direct: boolean): void {
		if (this.direct === direct) return;
		this.direct = direct;
		document.documentElement.style.cursor = direct ? 'crosshair' : this.previousCursor;
		this.overlay.setDirectMode(direct);
		if (!direct) {
			this.lastPointer = undefined;
			if (!this.focusedTargetId) this.setActiveTarget(undefined);
		}
	}

	private readonly onPointerMove = (event: PointerEvent): void => {
		if (!this.direct) return;
		this.lastPointer = { x: event.clientX, y: event.clientY };
		this.updatePointerTarget();
	};

	private readonly onClick = (event: MouseEvent): void => {
		if (!this.direct) return;
		const markerTargetId = findMarkerTargetId(event);
		if (markerTargetId) {
			event.preventDefault();
			event.stopPropagation();
			this.activateTarget(markerTargetId);
			return;
		}
		if (
			event
				.composedPath()
				.some((item) => item instanceof HTMLElement && item.dataset.textmodeAsciiExtensionUi === 'true')
		)
			return;
		const target = this.findTargetAtPoint(event.clientX, event.clientY);
		if (!target) return;
		event.preventDefault();
		event.stopPropagation();
		this.activateTarget(target.id);
	};

	private readonly onKeyDown = (event: KeyboardEvent): void => {
		if (this.direct && event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			if (this.options.onDirectCancel) {
				this.setDirectMode(false);
				this.options.onDirectCancel();
			} else this.stop(true);
			return;
		}
	};

	private readonly onViewportChange = (): void => {
		this.scheduleGeometryUpdate();
	};

	private readonly onMediaChange = (event: Event): void => {
		if (event.target instanceof HTMLVideoElement) this.refreshTargets();
	};

	private refreshTargets(): void {
		if (!this.active) return;
		const discovered = this.registry.discover();
		this.targets.clear();
		for (const target of discovered) this.targets.set(target.id, target);
		if (this.focusedTargetId && !this.targets.has(this.focusedTargetId)) {
			this.focusedTargetId = undefined;
			this.overlay.setPreview(undefined);
		}
		if (this.activeTargetId && !this.targets.has(this.activeTargetId)) this.setActiveTarget(undefined);
		this.overlay.updateTargets(discovered);
		this.options.onTargetsChanged?.(
			discovered.map(({ id, label, dimensions, availability, reasonText }) => ({
				id,
				label,
				...(dimensions ? { dimensions } : {}),
				availability,
				...(reasonText ? { reason: reasonText } : {}),
			}))
		);
		this.syncResizeObserver(discovered);
		this.syncFrameLoadListeners();
		this.scheduleGeometryUpdate();
	}

	private mountObservers(): void {
		if (typeof MutationObserver !== 'undefined') {
			this.mutationObserver = new MutationObserver(() => this.refreshTargets());
			this.mutationObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class', 'hidden', 'src', 'srcdoc', 'sandbox', 'style'],
				childList: true,
				subtree: true,
			});
		}
		if (typeof ResizeObserver !== 'undefined') {
			this.resizeObserver = new ResizeObserver(() => this.scheduleGeometryUpdate());
			this.syncResizeObserver([...this.targets.values()]);
		}
	}

	private disconnectObservers(): void {
		this.mutationObserver?.disconnect();
		this.mutationObserver = undefined;
		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;
		this.observedTargets.clear();
		for (const [iframe, listener] of this.frameLoadListeners) iframe.removeEventListener('load', listener);
		this.frameLoadListeners.clear();
	}

	private syncResizeObserver(targets: readonly PickerTarget[]): void {
		if (!this.resizeObserver) return;
		const current = new Set<Element>(targets.map((target) => target.element));
		for (const element of this.observedTargets) {
			if (current.has(element)) continue;
			this.resizeObserver.unobserve(element);
			this.observedTargets.delete(element);
		}
		for (const element of current) {
			if (this.observedTargets.has(element)) continue;
			this.resizeObserver.observe(element);
			this.observedTargets.add(element);
		}
	}

	private syncFrameLoadListeners(): void {
		let changed = false;
		const current = new Set(document.querySelectorAll('iframe'));
		for (const [iframe, listener] of this.frameLoadListeners) {
			if (current.has(iframe)) continue;
			iframe.removeEventListener('load', listener);
			this.frameLoadListeners.delete(iframe);
			changed = true;
		}
		for (const iframe of current) {
			if (this.frameLoadListeners.has(iframe)) continue;
			const listener = () => {
				this.refreshTargets();
				this.options.onFrameStructureChanged?.();
			};
			iframe.addEventListener('load', listener);
			this.frameLoadListeners.set(iframe, listener);
			changed = true;
		}
		if (changed) this.options.onFrameStructureChanged?.();
	}

	private scheduleGeometryUpdate(): void {
		if (!this.active || this.animationFrame !== undefined) return;
		this.animationFrame = requestAnimationFrame(() => {
			this.animationFrame = undefined;
			this.updateGeometry();
		});
	}

	private updateGeometry(): void {
		for (const target of this.targets.values()) {
			const rect = target.element.getBoundingClientRect();
			this.overlay.setGeometry(target.id, rect);
		}
		this.updatePointerTarget();
	}

	private updatePointerTarget(): void {
		if (this.focusedTargetId || !this.lastPointer) return;
		const target = this.findTargetAtPoint(this.lastPointer.x, this.lastPointer.y);
		this.setActiveTarget(target?.id);
	}

	private findTargetAtPoint(clientX: number, clientY: number): PickerTarget | undefined {
		for (const element of document.elementsFromPoint(clientX, clientY)) {
			const target = [...this.targets.values()].find(
				(item) => item.availability === 'ready' && item.element === element
			);
			if (target) return target;
		}
		return undefined;
	}

	private setActiveTarget(targetId: string | undefined): void {
		if (this.activeTargetId === targetId) return;
		this.activeTargetId = targetId;
		this.overlay.setActive(targetId);
	}
}

const MEDIA_EVENTS = [
	'loadstart',
	'loadedmetadata',
	'loadeddata',
	'canplay',
	'playing',
	'waiting',
	'seeking',
	'seeked',
	'emptied',
	'error',
	'resize',
] as const;

function findMarkerTargetId(event: Event): string | undefined {
	for (const item of event.composedPath()) {
		if (item instanceof HTMLElement && item.dataset.pickerTargetId) return item.dataset.pickerTargetId;
	}
	return undefined;
}

function getDeepActiveElement(): HTMLElement | undefined {
	let active: Element | null = document.activeElement;
	while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
	return active instanceof HTMLElement ? active : undefined;
}
