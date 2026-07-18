import { DEFAULT_PANEL_PLACEMENT, type PanelPlacement } from '../../domain/presets/panel-placement';

const VIEWPORT_GUTTER = 10;
const RESET_ANIMATION_DURATION_MS = 280;

interface RenderedPosition {
	left: number;
	top: number;
}

interface DragState {
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startLeft: number;
	startTop: number;
	moved: boolean;
}

export interface PanelPlacementControllerOptions {
	host: HTMLElement;
	surface: HTMLElement;
	handle: HTMLElement;
	initialPlacement?: PanelPlacement | null;
	onCommit?: (placement: PanelPlacement) => Promise<void> | void;
	onReset?: () => Promise<void> | void;
}

export class PanelPlacementController {
	private readonly host: HTMLElement;
	private readonly surface: HTMLElement;
	private readonly handle: HTMLElement;
	private readonly onCommit?: PanelPlacementControllerOptions['onCommit'];
	private readonly onReset?: PanelPlacementControllerOptions['onReset'];
	private placement: PanelPlacement;
	private renderedPosition: RenderedPosition = { left: VIEWPORT_GUTTER, top: VIEWPORT_GUTTER };
	private resizeObserver?: ResizeObserver;
	private renderFrameId: number | null = null;
	private resetAnimationFrameId: number | null = null;
	private dragState?: DragState;
	private mounted = false;

	private readonly handleWindowResize = () => {
		this.cancelResetAnimation();
		this.scheduleRender();
	};
	private readonly handlePointerDown = (event: PointerEvent) => this.onPointerDown(event);
	private readonly handlePointerMove = (event: PointerEvent) => this.onPointerMove(event);
	private readonly handlePointerUp = (event: PointerEvent) => this.onPointerUp(event);
	private readonly handleDoubleClick = (event: MouseEvent) => this.onDoubleClick(event);

	public constructor(options: PanelPlacementControllerOptions) {
		this.host = options.host;
		this.surface = options.surface;
		this.handle = options.handle;
		this.onCommit = options.onCommit;
		this.onReset = options.onReset;
		this.placement = { ...(options.initialPlacement ?? DEFAULT_PANEL_PLACEMENT) };
	}

	public mount(): void {
		if (this.mounted) return;

		this.mounted = true;
		this.host.style.right = '';
		window.addEventListener('resize', this.handleWindowResize);
		this.handle.addEventListener('pointerdown', this.handlePointerDown);
		this.handle.addEventListener('dblclick', this.handleDoubleClick);

		if (typeof ResizeObserver !== 'undefined') {
			this.resizeObserver = new ResizeObserver(() => this.scheduleRender());
			this.resizeObserver.observe(this.surface);
		}

		this.renderPlacement();
	}

	public getPlacement(): Readonly<PanelPlacement> {
		return Object.freeze({ ...this.placement });
	}

	public scheduleRender(): void {
		if (!this.mounted) return;
		if (this.renderFrameId !== null) {
			cancelAnimationFrame(this.renderFrameId);
		}

		this.renderFrameId = requestAnimationFrame(() => {
			this.renderFrameId = null;
			this.renderPlacement();
		});
	}

	private renderPlacement(): void {
		const bounds = this.getTravelBounds();
		this.setRenderedPosition({
			left: bounds.minLeft + this.placement.xRatio * bounds.availableX,
			top: bounds.minTop + this.placement.yRatio * bounds.availableY,
		});
	}

	private onPointerDown(event: PointerEvent): void {
		if (event.button !== 0 || this.dragState) return;

		event.preventDefault();
		if (this.resetAnimationFrameId !== null) {
			this.cancelResetAnimation();
			this.updatePlacementFromRenderedPosition();
		}
		this.dragState = {
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startLeft: this.renderedPosition.left,
			startTop: this.renderedPosition.top,
			moved: false,
		};
		this.surface.dataset.dragging = 'true';
		this.handle.addEventListener('pointermove', this.handlePointerMove);
		this.handle.addEventListener('pointerup', this.handlePointerUp);
		this.handle.addEventListener('pointercancel', this.handlePointerUp);

		try {
			this.handle.setPointerCapture?.(event.pointerId);
		} catch {
			// Pointer capture is a progressive enhancement.
		}
	}

	private onPointerMove(event: PointerEvent): void {
		if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

		event.preventDefault();
		this.dragState.moved =
			this.dragState.moved ||
			event.clientX !== this.dragState.startClientX ||
			event.clientY !== this.dragState.startClientY;
		this.moveToRenderedPosition({
			left: this.dragState.startLeft + event.clientX - this.dragState.startClientX,
			top: this.dragState.startTop + event.clientY - this.dragState.startClientY,
		});
	}

	private onPointerUp(event: PointerEvent): void {
		if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

		event.preventDefault();
		this.finishDrag(true);
	}

	private finishDrag(commit: boolean): void {
		if (!this.dragState) return;

		const pointerId = this.dragState.pointerId;
		const moved = this.dragState.moved;
		this.handle.removeEventListener('pointermove', this.handlePointerMove);
		this.handle.removeEventListener('pointerup', this.handlePointerUp);
		this.handle.removeEventListener('pointercancel', this.handlePointerUp);
		try {
			if (this.handle.hasPointerCapture?.(pointerId)) {
				this.handle.releasePointerCapture?.(pointerId);
			}
		} catch {
			// Ignore capture release failures during cancellation or disposal.
		}
		delete this.surface.dataset.dragging;
		this.dragState = undefined;
		if (commit && moved) this.commitPlacement();
	}

	private onDoubleClick(event: MouseEvent): void {
		if (event.button !== 0) return;
		event.preventDefault();
		this.cancelResetAnimation();
		if (this.renderFrameId !== null) {
			cancelAnimationFrame(this.renderFrameId);
			this.renderFrameId = null;
		}

		const startPosition = { ...this.renderedPosition };
		this.placement = { ...DEFAULT_PANEL_PLACEMENT };
		this.surface.dataset.resetting = 'true';
		void this.onReset?.();

		let startTime: number | null = null;
		const animate = (time: number) => {
			startTime ??= time;
			const progress = Math.min((time - startTime) / RESET_ANIMATION_DURATION_MS, 1);
			const easedProgress = easeOutCubic(progress);
			const targetPosition = this.getRenderedPosition(DEFAULT_PANEL_PLACEMENT);
			this.setRenderedPosition({
				left: interpolate(startPosition.left, targetPosition.left, easedProgress),
				top: interpolate(startPosition.top, targetPosition.top, easedProgress),
			});

			if (progress < 1) {
				this.resetAnimationFrameId = requestAnimationFrame(animate);
				return;
			}

			this.resetAnimationFrameId = null;
			delete this.surface.dataset.resetting;
			this.renderPlacement();
		};

		this.resetAnimationFrameId = requestAnimationFrame(animate);
	}

	private moveToRenderedPosition(position: RenderedPosition): void {
		const bounds = this.getTravelBounds();
		const left = clamp(position.left, bounds.minLeft, bounds.maxLeft);
		const top = clamp(position.top, bounds.minTop, bounds.maxTop);
		this.placement = {
			xRatio: bounds.availableX > 0 ? (left - bounds.minLeft) / bounds.availableX : this.placement.xRatio,
			yRatio: bounds.availableY > 0 ? (top - bounds.minTop) / bounds.availableY : this.placement.yRatio,
		};
		this.setRenderedPosition({ left, top });
	}

	private setRenderedPosition(position: RenderedPosition): void {
		this.renderedPosition = position;
		this.host.style.left = `${position.left}px`;
		this.host.style.top = `${position.top}px`;
	}

	private getRenderedPosition(placement: PanelPlacement): RenderedPosition {
		const bounds = this.getTravelBounds();
		return {
			left: bounds.minLeft + placement.xRatio * bounds.availableX,
			top: bounds.minTop + placement.yRatio * bounds.availableY,
		};
	}

	private updatePlacementFromRenderedPosition(): void {
		const bounds = this.getTravelBounds();
		this.placement = {
			xRatio:
				bounds.availableX > 0
					? (this.renderedPosition.left - bounds.minLeft) / bounds.availableX
					: this.placement.xRatio,
			yRatio:
				bounds.availableY > 0
					? (this.renderedPosition.top - bounds.minTop) / bounds.availableY
					: this.placement.yRatio,
		};
	}

	private cancelResetAnimation(): void {
		if (this.resetAnimationFrameId !== null) {
			cancelAnimationFrame(this.resetAnimationFrameId);
			this.resetAnimationFrameId = null;
		}
		delete this.surface.dataset.resetting;
	}

	private getTravelBounds(): {
		minLeft: number;
		maxLeft: number;
		minTop: number;
		maxTop: number;
		availableX: number;
		availableY: number;
	} {
		const surfaceRect = this.surface.getBoundingClientRect();
		const hostRect = this.host.getBoundingClientRect();
		const documentElement = this.host.ownerDocument.documentElement;
		const view = this.host.ownerDocument.defaultView ?? window;
		const viewportWidth = documentElement.clientWidth || view.innerWidth;
		const viewportHeight = documentElement.clientHeight || view.innerHeight;
		const width = surfaceRect.width || hostRect.width || 0;
		const height = surfaceRect.height || hostRect.height || 0;
		const minLeft = Math.min(VIEWPORT_GUTTER, Math.max(0, viewportWidth - width));
		const minTop = Math.min(VIEWPORT_GUTTER, Math.max(0, viewportHeight - height));
		const maxLeft = Math.max(minLeft, viewportWidth - width - VIEWPORT_GUTTER);
		const maxTop = Math.max(minTop, viewportHeight - height - VIEWPORT_GUTTER);

		return {
			minLeft,
			maxLeft,
			minTop,
			maxTop,
			availableX: maxLeft - minLeft,
			availableY: maxTop - minTop,
		};
	}

	private commitPlacement(): void {
		void this.onCommit?.({ ...this.placement });
	}

	public dispose(): void {
		if (!this.mounted) return;

		this.finishDrag(true);
		this.cancelResetAnimation();
		if (this.renderFrameId !== null) {
			cancelAnimationFrame(this.renderFrameId);
			this.renderFrameId = null;
		}
		window.removeEventListener('resize', this.handleWindowResize);
		this.handle.removeEventListener('pointerdown', this.handlePointerDown);
		this.handle.removeEventListener('dblclick', this.handleDoubleClick);
		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;
		this.mounted = false;
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function easeOutCubic(progress: number): number {
	return 1 - Math.pow(1 - progress, 3);
}

function interpolate(start: number, end: number, progress: number): number {
	return start + (end - start) * progress;
}
