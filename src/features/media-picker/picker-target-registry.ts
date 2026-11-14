import type { ElementKind } from '../../domain/overlay/overlay-settings';

export type SelectableElement = HTMLCanvasElement | HTMLVideoElement;
export type PickerTargetElement = SelectableElement | HTMLIFrameElement;
export type PickerAvailability = 'ready' | 'blocked';
export type PickerBlockReason = 'cross-origin' | 'sandboxed' | 'unavailable';

export interface CandidateInfo {
	element: SelectableElement;
	kind: ElementKind;
	label: string;
	targetLabel: string;
	dimensions: string;
}

export interface PickerTarget {
	id: string;
	element: PickerTargetElement;
	kind: ElementKind | 'iframe';
	availability: PickerAvailability;
	label: string;
	dimensions?: string;
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
					label: info.targetLabel,
					dimensions: info.dimensions,
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

	if (
		element instanceof HTMLVideoElement &&
		(element.error ||
			element.readyState < element.HAVE_CURRENT_DATA ||
			element.videoWidth <= 0 ||
			element.videoHeight <= 0)
	) {
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
	const { targetLabel, dimensions } = createElementDescription(element);
	return {
		element,
		kind: element instanceof HTMLVideoElement ? 'video' : 'canvas',
		label: `${targetLabel} ${dimensions}`.trim(),
		targetLabel,
		dimensions,
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

function createElementDescription(element: SelectableElement): { targetLabel: string; dimensions: string } {
	const id = element.id ? `#${element.id}` : '';
	const classes = [...element.classList]
		.slice(0, 2)
		.map((value) => `.${value}`)
		.join('');
	const rect = element.getBoundingClientRect();
	const dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
	const name = (element.getAttribute('aria-label') || element.getAttribute('title') || '').trim();
	const targetLabel = `${element.tagName.toLowerCase()}${name ? ` ${name}` : `${id}${classes}`}`.trim();
	return { targetLabel, dimensions };
}
