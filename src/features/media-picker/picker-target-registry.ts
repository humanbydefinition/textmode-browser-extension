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

interface VideoReadabilityEntry {
	sourceKey: string;
	crossOrigin: string | null;
	hasSrcObject: boolean;
	readable: boolean;
}

export class PickerTargetRegistry {
	private readonly targetIds = new WeakMap<Element, string>();
	private videoReadability = new WeakMap<HTMLVideoElement, VideoReadabilityEntry>();
	private taintedCanvases = new WeakSet<HTMLCanvasElement>();
	private nextTargetId = 0;

	public invalidate(element: Element): void {
		if (element instanceof HTMLVideoElement) {
			this.videoReadability.delete(element);
		}
	}

	public clearCache(): void {
		this.videoReadability = new WeakMap<HTMLVideoElement, VideoReadabilityEntry>();
		this.taintedCanvases = new WeakSet<HTMLCanvasElement>();
	}

	public discover(root: ParentNode = document): PickerTarget[] {
		const targets: PickerTarget[] = [];
		for (const element of root.querySelectorAll('canvas, video, iframe')) {
			if (element.closest(EXTENSION_UI_SELECTOR)) continue;

			if (isSelectableElementWithCache(element, this.videoReadability, this.taintedCanvases)) {
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
	return isSelectableElementWithCache(element);
}

function isSelectableElementWithCache(
	element: Element,
	videoCache?: WeakMap<HTMLVideoElement, VideoReadabilityEntry>,
	taintedCanvases?: WeakSet<HTMLCanvasElement>
): element is SelectableElement {
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
	if (
		styles.display === 'none' ||
		styles.visibility === 'hidden' ||
		styles.pointerEvents === 'none' ||
		(styles.opacity !== '' && Number(styles.opacity) <= 0)
	) {
		return false;
	}

	return isElementPixelReadable(element, videoCache, taintedCanvases);
}

let taintProbeCanvas: HTMLCanvasElement | undefined;
let taintProbeContext: CanvasRenderingContext2D | null = null;

function resetTaintProbe(): void {
	taintProbeCanvas = undefined;
	taintProbeContext = null;
}

function getTaintProbeContext(): CanvasRenderingContext2D | null {
	if (taintProbeContext) return taintProbeContext;
	if (typeof document.createElement !== 'function') return null;
	taintProbeCanvas = document.createElement('canvas');
	taintProbeCanvas.width = 1;
	taintProbeCanvas.height = 1;
	taintProbeContext = taintProbeCanvas.getContext('2d', { willReadFrequently: true });
	if (!taintProbeContext) resetTaintProbe();
	return taintProbeContext;
}

function getVideoSourceKey(video: HTMLVideoElement): string {
	return (
		video.currentSrc || video.getAttribute('src') || video.querySelector('source[src]')?.getAttribute('src') || ''
	);
}

function hasOpaqueCrossOriginVideoSource(video: HTMLVideoElement): boolean {
	if (video.crossOrigin) return false;
	const sourceUrl = getVideoSourceKey(video);
	if (!sourceUrl) return false;
	try {
		const url = new URL(sourceUrl, document.baseURI);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
		const pageOrigin = window.location.origin;
		if (!pageOrigin || pageOrigin === 'null') return false;
		return url.origin !== pageOrigin;
	} catch {
		return false;
	}
}

function probeElementWithCanvas(element: SelectableElement): boolean {
	const context = getTaintProbeContext();
	if (!context || typeof context.drawImage !== 'function' || typeof context.getImageData !== 'function') {
		return true;
	}

	try {
		context.clearRect?.(0, 0, 1, 1);
		context.drawImage(element, 0, 0, 1, 1);
		context.getImageData(0, 0, 1, 1);
		return true;
	} catch {
		// Once a probe canvas becomes origin-dirty, it stays tainted, so discard it immediately.
		resetTaintProbe();
		return false;
	}
}

function isElementPixelReadable(
	element: SelectableElement,
	videoCache?: WeakMap<HTMLVideoElement, VideoReadabilityEntry>,
	taintedCanvases?: WeakSet<HTMLCanvasElement>
): boolean {
	if (element instanceof HTMLVideoElement) {
		if ('mediaKeys' in element && element.mediaKeys != null) {
			return false;
		}
		const sourceKey = getVideoSourceKey(element);
		const crossOrigin = element.crossOrigin ?? null;
		const hasSrcObject = Boolean(element.srcObject);
		const canCache = Boolean(videoCache && (sourceKey || hasSrcObject));
		if (canCache) {
			const cached = videoCache!.get(element);
			if (
				cached &&
				cached.sourceKey === sourceKey &&
				cached.crossOrigin === crossOrigin &&
				cached.hasSrcObject === hasSrcObject
			) {
				return cached.readable;
			}
		}
		const readable = !hasOpaqueCrossOriginVideoSource(element) && probeElementWithCanvas(element);
		if (canCache) {
			videoCache!.set(element, { sourceKey, crossOrigin, hasSrcObject, readable });
		}
		return readable;
	}

	if (taintedCanvases?.has(element)) {
		return false;
	}
	const readable = probeElementWithCanvas(element);
	if (!readable) {
		taintedCanvases?.add(element);
	}
	return readable;
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
