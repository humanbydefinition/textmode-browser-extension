import pickerStyles from './picker-list.css?inline';
import type { PickerTargetSummary } from '../../shared/messaging/messages';
import { icon } from '../../widgets/overlay-panel/icons';

export interface FrameTargets {
	frameId: number;
	runtimeId: string;
	frameTitle: string;
	revision?: number;
	targets: PickerTargetSummary[];
}

interface PreviewTarget {
	key: string;
	frame: FrameTargets;
	target: PickerTargetSummary;
}

export class PickerTargetList {
	private readonly host = document.createElement('div');
	private readonly root = this.host.attachShadow({ mode: 'open' });
	private readonly heading = document.createElement('h2');
	private readonly list = document.createElement('ul');
	private readonly status = document.createElement('p');
	private readonly region = document.createElement('section');
	private readonly cancel = document.createElement('button');
	private previousFocus?: HTMLElement;
	private readonly items = new Map<string, HTMLLIElement>();
	private resizeObserver?: ResizeObserver;
	private measureFrame?: number;
	private hovered?: PreviewTarget;
	private focused?: PreviewTarget;
	private highlighted?: PreviewTarget;

	public constructor(
		private readonly onSelect: (frame: FrameTargets, target: PickerTargetSummary) => void,
		private readonly onHighlight: (frame: FrameTargets, target?: PickerTargetSummary) => void,
		onCancel: () => void,
		private readonly onFocusFallback: () => void = () => undefined,
		onRefresh: () => void = () => undefined
	) {
		this.host.dataset.textmodeAsciiExtensionUi = 'true';
		this.host.dataset.textmodePickerList = 'true';
		Object.assign(this.host.style, { display: 'block', height: '100%', minHeight: '0' });
		const style = document.createElement('style');
		style.textContent = pickerStyles;
		const region = this.region;
		region.className = 'tm-picker-list';
		region.setAttribute('aria-labelledby', 'tm-picker-list-heading');
		this.heading.id = 'tm-picker-list-heading';
		this.heading.tabIndex = -1;
		this.heading.textContent = 'Select media';
		this.status.className = 'tm-picker-list__status';
		this.status.setAttribute('role', 'status');
		this.list.className = 'tm-picker-list__items';
		this.list.setAttribute('role', 'list');
		const cancel = this.cancel;
		cancel.type = 'button';
		cancel.className = 'tm-picker-list__cancel';
		cancel.textContent = 'Cancel';
		cancel.hidden = true;
		cancel.addEventListener('click', onCancel);
		region.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && !cancel.hidden) {
				event.preventDefault();
				event.stopPropagation();
				onCancel();
			}
		});
		const header = document.createElement('div');
		header.className = 'tm-picker-list__header';
		const refresh = document.createElement('button');
		refresh.type = 'button';
		refresh.className = 'tm-picker-list__refresh';
		refresh.setAttribute('aria-label', 'Refresh media list');
		refresh.title = 'Refresh media list';
		refresh.append(icon('rotate-ccw'));
		refresh.addEventListener('click', onRefresh);
		header.append(this.heading, refresh);
		const footer = document.createElement('div');
		footer.className = 'tm-picker-list__footer';
		footer.append(this.status, cancel);
		region.append(header, this.list, footer);
		this.root.append(style, region);
	}

	public mount(root: ShadowRoot | HTMLElement = document.documentElement, focus = true): void {
		root.append(this.host);
		if (typeof ResizeObserver !== 'undefined') {
			this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
			this.resizeObserver.observe(this.list);
		}
		if (focus) {
			this.previousFocus = deepActiveElement();
			this.heading.focus({ preventScroll: true });
		}
	}

	public setDirectMode(direct: boolean): void {
		this.cancel.hidden = !direct;
		if (direct) {
			this.previousFocus = deepActiveElement();
			this.heading.focus({ preventScroll: true });
		}
	}

	public update(frames: readonly FrameTargets[]): void {
		const wanted = new Set<string>();
		const focused = this.root.activeElement as HTMLElement | null;
		const focusedKey = focused?.dataset.key;
		const oldButtons = [...this.list.querySelectorAll('button')];
		const focusedIndex = focused ? oldButtons.indexOf(focused as HTMLButtonElement) : -1;
		const labelCounts = new Map<string, number>();
		const labelOrdinals = new Map<string, number>();
		for (const frame of frames) {
			for (const target of frame.targets) {
				if (target.availability === 'ready')
					labelCounts.set(target.label, (labelCounts.get(target.label) ?? 0) + 1);
			}
		}
		let ready = 0;
		let position = 0;
		for (const frame of [...frames].sort((a, b) => a.frameId - b.frameId)) {
			for (const target of frame.targets) {
				if (target.availability !== 'ready') continue;
				const key = `${frame.frameId}:${frame.runtimeId}:${target.id}`;
				wanted.add(key);
				let item = this.items.get(key);
				if (!item) {
					item = document.createElement('li');
					const button = document.createElement('button');
					button.type = 'button';
					button.dataset.key = key;
					button.className = 'tm-picker-list__item';
					button.addEventListener('click', () => this.onSelect(frame, target));
					const preview = { key, frame, target };
					button.addEventListener('pointerenter', () => {
						this.hovered = preview;
						this.syncHighlight();
					});
					button.addEventListener('pointerleave', () => {
						if (this.hovered?.key === key) this.hovered = undefined;
						this.syncHighlight();
					});
					button.addEventListener('focus', () => {
						this.focused = preview;
						this.syncHighlight();
					});
					button.addEventListener('blur', () => {
						if (this.focused?.key === key) this.focused = undefined;
						this.syncHighlight();
					});
					item.append(button);
					const label = document.createElement('span');
					label.className = 'tm-picker-list__label';
					const text = document.createElement('span');
					text.className = 'tm-picker-list__label-text';
					label.append(text);
					item.firstElementChild!.append(label);
					this.items.set(key, item);
				}
				const control = item.firstElementChild!;
				const text = control.querySelector('.tm-picker-list__label-text')!;
				const ordinal = (labelOrdinals.get(target.label) ?? 0) + 1;
				labelOrdinals.set(target.label, ordinal);
				const labelText =
					(labelCounts.get(target.label) ?? 0) > 1 ? `${target.label} (${ordinal})` : target.label;
				text.textContent = labelText;
				control.setAttribute('title', labelText);
				ready++;
				const current = this.list.children[position++];
				if (current !== item) this.list.insertBefore(item, current ?? null);
			}
		}
		for (const [key, item] of this.items) {
			if (!wanted.has(key)) {
				item.remove();
				this.items.delete(key);
			}
		}
		if (this.hovered && !wanted.has(this.hovered.key)) this.hovered = undefined;
		if (this.focused && !wanted.has(this.focused.key)) this.focused = undefined;
		this.syncHighlight();
		if (focusedKey && !wanted.has(focusedKey)) {
			const buttons = [...this.list.querySelectorAll('button')];
			(buttons[Math.min(Math.max(focusedIndex, 0), buttons.length - 1)] ?? this.heading).focus({
				preventScroll: true,
			});
			this.status.textContent = 'The focused media is no longer available.';
		} else {
			if (focusedKey && focused?.isConnected && this.root.activeElement !== focused)
				focused.focus({ preventScroll: true });
			const message = ready
				? `${ready} selectable ${ready === 1 ? 'element' : 'elements'}.`
				: 'No selectable media found.';
			if (this.status.textContent !== message) this.status.textContent = message;
		}
		this.scheduleMeasure();
	}

	private syncHighlight(): void {
		const next = this.hovered ?? this.focused;
		if (this.highlighted?.key === next?.key) return;
		if (
			this.highlighted &&
			(!next ||
				this.highlighted.frame.frameId !== next.frame.frameId ||
				this.highlighted.frame.runtimeId !== next.frame.runtimeId)
		)
			this.onHighlight(this.highlighted.frame);
		this.highlighted = next;
		if (next) this.onHighlight(next.frame, next.target);
	}

	private scheduleMeasure(): void {
		if (this.measureFrame !== undefined) return;
		this.measureFrame = requestAnimationFrame(() => {
			this.measureFrame = undefined;
			for (const label of this.list.querySelectorAll<HTMLElement>('.tm-picker-list__label')) {
				const item = label.parentElement;
				if (!item) continue;
				const distance = Math.max(0, label.scrollWidth - label.clientWidth);
				item.dataset.overflow = String(distance > 1);
				item.style.setProperty('--tm-scroll-distance', `${-distance}px`);
				item.style.setProperty('--tm-scroll-duration', `${Math.max(2.5, Math.min(12, distance / 30 + 2))}s`);
			}
		});
	}

	public dispose(): void {
		const hadFocus = Boolean(this.root.activeElement);
		this.hovered = undefined;
		this.focused = undefined;
		this.syncHighlight();
		this.resizeObserver?.disconnect();
		if (this.measureFrame !== undefined) cancelAnimationFrame(this.measureFrame);
		this.host.remove();
		if (hadFocus) {
			if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
			if (!this.previousFocus?.isConnected || deepActiveElement() !== this.previousFocus) this.onFocusFallback();
		}
	}
}

function deepActiveElement(): HTMLElement | undefined {
	let element: Element | null = document.activeElement;
	while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
	return element instanceof HTMLElement ? element : undefined;
}
