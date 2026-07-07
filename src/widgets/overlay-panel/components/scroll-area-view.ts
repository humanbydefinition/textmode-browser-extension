import { type Cleanup, classNames, h, on } from '../dom';

export type ScrollAreaOrientation = 'vertical' | 'horizontal';

export interface ScrollAreaViewOptions {
	orientation?: ScrollAreaOrientation;
	rootClassName?: string;
	viewportTag?: keyof HTMLElementTagNameMap;
	viewportClassName?: string;
	contentClassName?: string;
}

const MIN_THUMB_SIZE = 24;

export class ScrollAreaView {
	public readonly element: HTMLElement;
	public readonly viewport: HTMLElement;
	public readonly content: HTMLElement;
	private readonly scrollbar: HTMLElement;
	private readonly thumb: HTMLElement;
	private readonly cleanups: Cleanup[] = [];
	private readonly resizeObserver: ResizeObserver | null;
	private readonly mutationObserver: MutationObserver | null;
	private thumbOffset = 0;

	public constructor(options: ScrollAreaViewOptions = {}) {
		const orientation = options.orientation ?? 'vertical';
		this.content = h('div', {
			className: options.contentClassName,
			attributes: { 'data-slot': 'scroll-area-content' },
		});
		this.viewport = h(
			options.viewportTag ?? 'div',
			{
				className: options.viewportClassName,
				attributes: { 'data-slot': 'scroll-area-viewport' },
			},
			this.content
		);
		this.thumb = h('div', {
			className: 'tm-scroll-area__thumb',
			attributes: { 'data-slot': 'scroll-area-thumb', 'data-state': 'hidden' },
		});
		this.scrollbar = h(
			'div',
			{
				className: classNames(
					'tm-scroll-area__scrollbar',
					options.orientation === 'horizontal' && 'tm-scroll-area__scrollbar--horizontal'
				),
				attributes: {
					'data-slot': 'scroll-area-scrollbar',
					'data-orientation': orientation,
					'data-state': 'hidden',
				},
			},
			this.thumb
		);
		this.element = h(
			'div',
			{
				className: classNames('tm-scroll-area', options.rootClassName),
				attributes: { 'data-slot': 'scroll-area', 'data-orientation': orientation },
			},
			this.viewport,
			this.scrollbar
		);

		this.cleanups.push(on(this.viewport, 'scroll', () => this.updateThumb(), { passive: true }));
		this.cleanups.push(on(this.thumb, 'pointerdown', this.handleThumbPointerDown));
		this.cleanups.push(on(this.scrollbar, 'pointerdown', this.handleScrollbarPointerDown));

		this.resizeObserver =
			typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.updateThumb());
		this.resizeObserver?.observe(this.content);

		this.mutationObserver =
			typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.syncObservers());
		this.mutationObserver?.observe(this.content, { childList: true, subtree: true });

		scheduleFrame(() => this.updateThumb());
	}

	public update(): void {
		this.updateThumb();
	}

	public dispose(): void {
		this.resizeObserver?.disconnect();
		this.mutationObserver?.disconnect();
		for (const cleanup of this.cleanups) {
			cleanup();
		}
		this.cleanups.length = 0;
	}

	private syncObservers(): void {
		this.resizeObserver?.unobserve(this.content);
		this.resizeObserver?.observe(this.content);
		this.updateThumb();
	}

	private updateThumb(): void {
		const viewport = this.viewport;
		const overflow = viewport.scrollHeight - viewport.clientHeight;
		if (overflow <= 0) {
			this.scrollbar.dataset.state = 'hidden';
			this.thumb.dataset.state = 'hidden';
			this.thumb.style.height = '0px';
			this.thumb.style.transform = '';
			this.thumbOffset = 0;
			return;
		}

		this.scrollbar.dataset.state = 'visible';
		this.thumb.dataset.state = 'visible';
		const trackSize = this.scrollbar.clientHeight;
		const visibleRatio = viewport.clientHeight / viewport.scrollHeight;
		const thumbSize = Math.max(Math.round(visibleRatio * trackSize), MIN_THUMB_SIZE);
		const maxOffset = Math.max(0, trackSize - thumbSize);
		const scrollRatio = viewport.scrollTop / overflow;
		const offset = Math.max(0, Math.min(maxOffset, scrollRatio * maxOffset));

		this.thumb.style.height = `${thumbSize}px`;
		this.thumb.style.transform = `translateY(${offset}px)`;
		this.thumbOffset = offset;
	}

	private handleThumbPointerDown = (event: PointerEvent): void => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		this.thumb.setPointerCapture(event.pointerId);

		const startY = event.clientY;
		const startScrollTop = this.viewport.scrollTop;
		const trackSize = this.scrollbar.clientHeight;
		const thumbSize = this.thumb.getBoundingClientRect().height;
		const maxOffset = Math.max(1, trackSize - thumbSize);
		const scrollRange = this.viewport.scrollHeight - this.viewport.clientHeight;

		const onMove = (moveEvent: PointerEvent): void => {
			const delta = moveEvent.clientY - startY;
			const ratio = delta / maxOffset;
			this.viewport.scrollTop = startScrollTop + ratio * scrollRange;
		};
		const onUp = (upEvent: PointerEvent): void => {
			this.thumb.releasePointerCapture(upEvent.pointerId);
			this.thumb.removeEventListener('pointermove', onMove);
			this.thumb.removeEventListener('pointerup', onUp);
			this.thumb.removeEventListener('pointercancel', onUp);
		};
		this.thumb.addEventListener('pointermove', onMove);
		this.thumb.addEventListener('pointerup', onUp);
		this.thumb.addEventListener('pointercancel', onUp);
	};

	private handleScrollbarPointerDown = (event: PointerEvent): void => {
		if (event.button !== 0 || event.target !== this.scrollbar) return;
		event.preventDefault();
		const rect = this.scrollbar.getBoundingClientRect();
		const clickY = event.clientY - rect.top;
		const thumbSize = this.thumb.getBoundingClientRect().height;
		const thumbCenter = this.thumbOffset + thumbSize / 2;
		const direction = clickY < thumbCenter ? -1 : 1;
		this.viewport.scrollTop += direction * this.viewport.clientHeight * 0.9;
	};
}

function scheduleFrame(callback: () => void): void {
	if (typeof requestAnimationFrame === 'function') {
		requestAnimationFrame(callback);
		return;
	}
	callback();
}
