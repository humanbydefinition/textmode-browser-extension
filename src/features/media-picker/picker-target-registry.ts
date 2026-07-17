import type { ElementKind } from '../../domain/overlay/overlay-settings';

export type SelectableElement = HTMLCanvasElement | HTMLVideoElement;
export type PickerTargetElement = SelectableElement | HTMLIFrameElement;
export type PickerAvailability = 'ready' | 'blocked';
export type PickerBlockReason = 'cross-origin' | 'sandboxed' | 'unavailable';

export interface CandidateInfo {
	element: SelectableElement;
	kind: ElementKind;
	label: string;
}

export interface PickerTarget {
	id: string;
	element: PickerTargetElement;
	kind: ElementKind | 'iframe';
	availability: PickerAvailability;
	label: string;
	blockReason?: PickerBlockReason;
	reasonText?: string;
}

const EXTENSION_UI_SELECTOR = '[data-textmode-ascii-extension-ui="true"]';

export class PickerTargetRegistry {
	private readonly targetIds = new WeakMap<Element, string>();
	private nextTargetId = 0;

	public discover(root: ParentNode = document): PickerTarget[] {
		const targets: PickerTarget[] = [];
		for (const element of root.querySelectorAll('canvas, video, iframe')) {
			if (element.closest(EXTENSION_UI_SELECTOR)) continue;

			if (isSelectableElement(element)) {
				const info = describeElement(element);
				targets.push({
					id: this.getId(element),
					element,
					kind: info.kind,
					availability: 'ready',
					label: info.label,
				});
				continue;
			}

			if (element instanceof HTMLIFrameElement && isVisibleFrame(element)) {
				const blockReason = classifyUnavailableFrame(element);
				if (!blockReason) continue;
				targets.push({
					id: this.getId(element),
					element,
					kind: 'iframe',
					availability: 'blocked',
					blockReason,
					label: 'iframe unavailable',
					reasonText: getBlockReasonText(blockReason),
				});
			}
		}
		return targets;
	}

	private getId(element: Element): string {
		const current = this.targetIds.get(element);
		if (current) return current;
		this.nextTargetId += 1;
		const id = `picker-target-${this.nextTargetId}`;
		this.targetIds.set(element, id);
		return id;
	}
}

export function getSelectableElements(root: ParentNode = document): SelectableElement[] {
	return Array.from(root.querySelectorAll('canvas, video')).filter(isSelectableElement);
}

export function isSelectableElement(element: Element): element is SelectableElement {
	if (!(element instanceof HTMLCanvasElement) && !(element instanceof HTMLVideoElement)) {
		return false;
	}

	if (!element.isConnected || element.closest(EXTENSION_UI_SELECTOR)) {
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
		styles.pointerEvents !== 'none' &&
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

export function getBlockReasonText(reason: PickerBlockReason): string {
	switch (reason) {
		case 'cross-origin':
			return 'Cross-origin iframe — Textmode Overlay can only inspect frames that share the page origin.';
		case 'sandboxed':
			return 'Sandboxed iframe — this frame does not grant access to its document.';
		case 'unavailable':
			return 'Iframe unavailable — the browser did not grant access to this frame.';
	}
}

function classifyUnavailableFrame(iframe: HTMLIFrameElement): PickerBlockReason | undefined {
	if (isSameOriginFrame(iframe)) return undefined;
	const sandbox = iframe.getAttribute('sandbox');
	const sandboxTokens = sandbox?.toLowerCase().split(/\s+/) ?? [];
	if (sandbox !== null && !sandboxTokens.includes('allow-same-origin')) {
		return 'sandboxed';
	}
	try {
		const url = new URL(iframe.src, document.baseURI);
		if (url.origin !== window.location.origin) return 'cross-origin';
	} catch {
		return 'unavailable';
	}
	return 'unavailable';
}

function isSameOriginFrame(iframe: HTMLIFrameElement): boolean {
	try {
		return Boolean(iframe.contentDocument?.documentElement);
	} catch {
		return false;
	}
}

function isVisibleFrame(iframe: HTMLIFrameElement): boolean {
	if (!iframe.isConnected) return false;
	const rect = iframe.getBoundingClientRect();
	if (rect.width < 1 || rect.height < 1) return false;
	const styles = window.getComputedStyle(iframe);
	return (
		styles.display !== 'none' &&
		styles.visibility !== 'hidden' &&
		(styles.opacity === '' || Number(styles.opacity) > 0)
	);
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
