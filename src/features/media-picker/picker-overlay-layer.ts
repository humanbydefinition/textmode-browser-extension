import pickerStyles from './picker-overlay.css?inline';
import type { PickerTarget } from './picker-target-registry';

export interface PickerOverlayLayerOptions {
	showStatus: boolean;
	onActivate: (targetId: string) => void;
}

const PICKER_HOST_CLASS = 'textmode-ascii-overlay-picker';
const PICKER_BLOCKER_CLASS = 'textmode-ascii-overlay-iframe-blocker';
const PICKER_Z_INDEX = '2147483645';

export class PickerOverlayLayer {
	public readonly host = document.createElement('div');
	private readonly shadowRoot: ShadowRoot;
	private readonly layer = document.createElement('div');
	private readonly status = document.createElement('div');
	private readonly markers = new Map<string, HTMLButtonElement>();
	private activeTargetId?: string;

	public constructor(private readonly options: PickerOverlayLayerOptions) {
		this.host.className = PICKER_HOST_CLASS;
		this.host.dataset.textmodeAsciiExtensionUi = 'true';
		setImportantStyles(this.host, {
			position: 'fixed',
			inset: '0',
			width: '100vw',
			height: '100vh',
			margin: '0',
			padding: '0',
			border: '0',
			pointerEvents: 'none',
			zIndex: PICKER_Z_INDEX,
		});

		this.shadowRoot = this.host.attachShadow({ mode: 'open' });
		const style = document.createElement('style');
		style.textContent = pickerStyles;
		this.layer.className = 'tm-picker-layer';
		this.status.className = 'tm-picker-status';
		this.status.setAttribute('role', 'status');
		this.status.setAttribute('aria-live', 'polite');
		this.status.hidden = !options.showStatus;
		this.layer.append(this.status);
		this.shadowRoot.append(style, this.layer);
	}

	public mount(): void {
		if (!this.host.isConnected) document.documentElement.append(this.host);
	}

	public updateTargets(targets: readonly PickerTarget[]): void {
		const currentIds = new Set(targets.map((target) => target.id));
		for (const [id, marker] of this.markers) {
			if (currentIds.has(id)) continue;
			marker.remove();
			this.markers.delete(id);
		}

		for (const target of targets) {
			const marker = this.markers.get(target.id) ?? this.createMarker(target);
			this.updateMarker(marker, target);
		}
	}

	public updateStatus(readyCount: number, blockedCount: number): void {
		const instruction = document.createElement('span');
		instruction.className = 'tm-picker-status__instruction';
		instruction.append(
			document.createTextNode('Select a '),
			createCodeToken('<canvas>'),
			document.createTextNode(' or '),
			createCodeToken('<video>'),
			document.createTextNode(' element')
		);
		const metrics = document.createElement('span');
		metrics.className = 'tm-picker-status__metrics';
		metrics.append(
			createMetric(createCodeToken(String(readyCount)), ` selectable ${pluralize(readyCount, 'element')}`),
			createMetric(
				createCodeToken(String(blockedCount)),
				` non-selectable ${pluralize(blockedCount, 'element')}`
			),
			createMetric(createCodeToken('Esc'), ' to cancel')
		);
		this.status.replaceChildren(instruction, metrics);
	}

	public setGeometry(targetId: string, rect: DOMRect): void {
		const marker = this.markers.get(targetId);
		if (!marker) return;
		const left = Math.max(0, rect.left);
		const top = Math.max(0, rect.top);
		const right = Math.min(window.innerWidth, rect.right);
		const bottom = Math.min(window.innerHeight, rect.bottom);
		const width = Math.max(0, right - left);
		const height = Math.max(0, bottom - top);
		marker.hidden = width < 1 || height < 1;
		marker.style.setProperty('--tm-picker-x', `${left}px`);
		marker.style.setProperty('--tm-picker-y', `${top}px`);
		marker.style.setProperty('--tm-picker-width', `${width}px`);
		marker.style.setProperty('--tm-picker-height', `${height}px`);
	}

	public setActive(targetId: string | undefined): void {
		if (this.activeTargetId === targetId) return;
		if (this.activeTargetId) {
			const previous = this.markers.get(this.activeTargetId);
			if (previous) previous.dataset.active = 'false';
		}
		this.activeTargetId = targetId;
		if (targetId) {
			const marker = this.markers.get(targetId);
			if (marker) marker.dataset.active = 'true';
		}
	}

	public unmount(): void {
		this.markers.clear();
		this.host.remove();
	}

	private createMarker(target: PickerTarget): HTMLButtonElement {
		const marker = document.createElement('button');
		marker.type = 'button';
		marker.className = 'tm-picker-marker';
		marker.tabIndex = -1;
		marker.dataset.pickerTargetId = target.id;
		marker.setAttribute('aria-hidden', target.availability === 'ready' ? 'true' : 'false');
		marker.addEventListener('click', (event) => {
			event.preventDefault();
			this.options.onActivate(target.id);
		});
		this.layer.append(marker);
		this.markers.set(target.id, marker);
		return marker;
	}

	private updateMarker(marker: HTMLButtonElement, target: PickerTarget): void {
		marker.dataset.availability = target.availability;
		marker.dataset.kind = target.kind;
		marker.classList.toggle(PICKER_BLOCKER_CLASS, target.availability === 'blocked');
		marker.setAttribute('aria-hidden', target.availability === 'ready' ? 'true' : 'false');
		if (target.availability === 'blocked') marker.setAttribute('aria-label', formatAccessibleLabel(target));
		else marker.removeAttribute('aria-label');
		marker.title = target.reasonText ?? target.label;
	}
}

function formatAccessibleLabel(target: PickerTarget): string {
	return target.reasonText ?? 'Iframe unavailable';
}

function createCodeToken(value: string): HTMLElement {
	const code = document.createElement('code');
	code.textContent = value;
	return code;
}

function pluralize(count: number, noun: string): string {
	return `${noun}${count === 1 ? '' : 's'}`;
}

function createMetric(content: Node | string, suffix = ''): HTMLElement {
	const metric = document.createElement('span');
	metric.className = 'tm-picker-status__metric';
	metric.append(content, suffix);
	return metric;
}

function setImportantStyles(element: HTMLElement, declarations: Record<string, string>): void {
	for (const [property, value] of Object.entries(declarations)) {
		const cssProperty = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
		element.style.setProperty(cssProperty, value, 'important');
	}
}
