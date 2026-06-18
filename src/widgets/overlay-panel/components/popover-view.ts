import { type Cleanup, on } from '../dom';

export interface PopoverViewOptions {
	trigger: HTMLElement;
	content: HTMLElement;
	portalContainer: HTMLElement;
	align?: 'start' | 'center' | 'end';
	sideOffset?: number;
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
		const align = this.options.align ?? 'center';
		const sideOffset = this.options.sideOffset ?? 4;

		let left = triggerRect.left;
		if (align === 'center') {
			left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
		} else if (align === 'end') {
			left = triggerRect.right - contentRect.width;
		}

		this.options.content.style.position = 'fixed';
		this.options.content.style.top = `${triggerRect.bottom + sideOffset}px`;
		this.options.content.style.left = `${Math.max(8, left)}px`;
		this.options.content.style.setProperty('--radix-popover-content-transform-origin', 'top center');
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
