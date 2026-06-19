import { type Cleanup, on } from '../dom';
import { computePopoverPosition, type PopoverAlign, type PopoverSide } from './popover-position';

export interface PopoverViewOptions {
	trigger: HTMLElement;
	content: HTMLElement;
	portalContainer: HTMLElement;
	align?: PopoverAlign;
	preferredSide?: PopoverSide;
	sideOffset?: number;
	collisionPadding?: number;
	onOpenChange?: (open: boolean) => void;
	onOpen?: () => void;
}

export class PopoverView {
	private open = false;
	private readonly cleanups: Cleanup[] = [];
	private readonly contentCleanups: Cleanup[] = [];

	public constructor(private readonly options: PopoverViewOptions) {
		this.options.trigger.setAttribute('data-slot', 'popover-trigger');
		this.cleanups.push(
			on(this.options.trigger, 'click', (event) => {
				event.preventDefault();
				this.setOpen(!this.open);
			})
		);
	}

	public isOpen(): boolean {
		return this.open;
	}

	public setOpen(open: boolean): void {
		if (this.open === open) return;
		this.open = open;
		this.options.onOpenChange?.(open);

		if (open) {
			this.mountContent();
			this.options.onOpen?.();
		} else {
			this.cleanupMountedContent();
			this.options.content.remove();
			this.options.trigger.setAttribute('aria-expanded', 'false');
		}
	}

	public updatePosition(): void {
		if (!this.open) return;
		const triggerRect = this.options.trigger.getBoundingClientRect();
		const contentRect = this.options.content.getBoundingClientRect();
		const position = computePopoverPosition({
			triggerRect,
			contentRect,
			viewportWidth: window.innerWidth,
			viewportHeight: window.innerHeight,
			align: this.options.align,
			preferredSide: this.options.preferredSide,
			sideOffset: this.options.sideOffset,
			collisionPadding: this.options.collisionPadding,
		});

		this.options.content.style.position = 'fixed';
		this.options.content.style.top = `${position.top}px`;
		this.options.content.style.left = `${position.left}px`;
		this.options.content.dataset.side = position.side;
		this.options.content.dataset.align = position.align;
		this.options.content.style.setProperty('--radix-popover-content-transform-origin', position.transformOrigin);
	}

	public dispose(): void {
		for (const cleanup of this.cleanups) {
			cleanup();
		}
		this.cleanups.length = 0;
		this.cleanupMountedContent();
		this.options.content.remove();
	}

	private mountContent(): void {
		this.options.content.setAttribute('data-slot', 'popover-content');
		this.options.content.dataset.state = 'open';
		this.options.trigger.setAttribute('aria-expanded', 'true');
		this.options.portalContainer.append(this.options.content);
		this.updatePosition();

		const rootNode = this.options.portalContainer.getRootNode();
		const eventTarget = rootNode instanceof ShadowRoot ? rootNode : document;
		const closeOnPointerDown = (event: Event): void => {
			const target = event.composedPath()[0];
			if (
				target instanceof Node &&
				(this.options.content.contains(target) || this.options.trigger.contains(target))
			) {
				return;
			}
			this.setOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') {
				event.preventDefault();
				this.setOpen(false);
				this.options.trigger.focus();
			}
		};

		const cleanupPointer = on(eventTarget, 'pointerdown', closeOnPointerDown, true);
		const cleanupKey = on(eventTarget, 'keydown', closeOnEscape, true);
		const cleanupScroll = on(window, 'scroll', () => this.updatePosition(), true);
		const cleanupResize = on(window, 'resize', () => this.updatePosition());

		this.contentCleanups.push(cleanupPointer, cleanupKey, cleanupScroll, cleanupResize);
	}

	private cleanupMountedContent(): void {
		for (const cleanup of this.contentCleanups) {
			cleanup();
		}
		this.contentCleanups.length = 0;
	}
}
