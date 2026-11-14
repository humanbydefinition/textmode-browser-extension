import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	ElementPicker,
	getSelectableElements,
	isSelectableElement,
} from '../../src/features/media-picker/element-picker';
import { mockRect } from './test-helpers';

describe('element-picker', () => {
	const activePickers: ElementPicker[] = [];

	beforeEach(() => {
		document.body.replaceChildren();
		document.querySelectorAll('.textmode-ascii-overlay-picker').forEach((element) => element.remove());
		document.documentElement.style.cursor = '';
	});

	afterEach(() => {
		for (const picker of activePickers.splice(0)) picker.stop(false);
		Reflect.deleteProperty(document, 'elementsFromPoint');
		vi.restoreAllMocks();
	});

	it('includes visible canvas and video elements', () => {
		const canvas = document.createElement('canvas');
		const video = document.createElement('video');
		makeVideoReady(video);
		mockRect(canvas, { width: 320, height: 180 });
		mockRect(video, { width: 640, height: 360 });
		document.body.append(canvas, video);

		expect(getSelectableElements()).toEqual([canvas, video]);
	});

	it('excludes zero-size elements and extension UI', () => {
		const canvas = document.createElement('canvas');
		const ui = document.createElement('div');
		const nested = document.createElement('canvas');
		ui.dataset.textmodeAsciiExtensionUi = 'true';
		ui.append(nested);
		mockRect(canvas, { width: 0, height: 0 });
		mockRect(nested, { width: 320, height: 180 });
		document.body.append(canvas, ui);

		expect(isSelectableElement(canvas)).toBe(false);
		expect(isSelectableElement(nested)).toBe(false);
		expect(getSelectableElements()).toEqual([]);
	});

	it('mounts a temporary shadow-isolated layer and restores the cursor', () => {
		const picker = createPicker();
		picker.start();

		const host = getPickerHost();
		expect(host.dataset.textmodeAsciiExtensionUi).toBe('true');
		expect(host.shadowRoot).not.toBeNull();
		expect(host.style.zIndex).toBe('2147483645');
		expect(document.documentElement.style.cursor).toBe('crosshair');

		picker.stop(false);

		expect(document.querySelector('.textmode-ascii-overlay-picker')).toBeNull();
		expect(document.documentElement.style.cursor).toBe('');
	});

	it('shows every selectable target before pointer hover', async () => {
		const canvas = document.createElement('canvas');
		const video = document.createElement('video');
		makeVideoReady(video);
		mockRect(canvas, { left: 12, top: 24, width: 320, height: 180 });
		mockRect(video, { left: 12, top: 228, width: 640, height: 360 });
		document.body.append(canvas, video);

		const picker = createPicker();
		picker.start();

		await vi.waitFor(() => expect(getMarkers()).toHaveLength(2));
		const markers = getMarkers();
		expect(markers.map((marker) => marker.dataset.availability)).toEqual(['ready', 'ready']);
		await vi.waitFor(() => expect(markers[0]!.style.getPropertyValue('--tm-picker-x')).toBe('12px'));
		expect(markers[0]!.textContent).toBe('');
		expect(getPickerHost().shadowRoot?.querySelector('.tm-picker-status')).toBeNull();
	});

	it('ignores a larger ambient canvas and selects the overlapping video', async () => {
		const ambientCanvas = document.createElement('canvas');
		ambientCanvas.style.pointerEvents = 'none';
		const video = document.createElement('video');
		makeVideoReady(video);
		mockRect(ambientCanvas, { left: 0, top: 0, width: 1250, height: 900 });
		mockRect(video, { left: 14, top: 70, width: 988, height: 555 });
		document.body.append(ambientCanvas, video);
		Object.defineProperty(document, 'elementsFromPoint', {
			configurable: true,
			value: vi.fn(() => [ambientCanvas, video]),
		});
		const onPick = vi.fn();
		const picker = createPicker({ onPick });

		expect(getSelectableElements()).toEqual([video]);
		picker.start();
		await vi.waitFor(() => expect(getMarkers()).toHaveLength(1));
		window.dispatchEvent(new MouseEvent('click', { clientX: 500, clientY: 300, bubbles: true, cancelable: true }));

		expect(onPick).toHaveBeenCalledOnce();
		expect(onPick).toHaveBeenCalledWith(video);
	});

	it('updates video targets as decoded frames become available and unavailable', () => {
		const video = document.createElement('video');
		mockRect(video, { width: 320, height: 180 });
		document.body.append(video);
		const onPick = vi.fn();
		const picker = createPicker({ onPick });
		picker.start();
		expect(getMarkers()).toHaveLength(0);

		makeVideoReady(video);
		video.dispatchEvent(new Event('loadeddata'));
		expect(getMarkers()).toHaveLength(1);
		const targetId = getMarkers()[0]!.dataset.pickerTargetId!;
		Object.defineProperty(video, 'readyState', { value: video.HAVE_METADATA, configurable: true });
		expect(picker.activateTarget(targetId)).toBe(false);
		expect(onPick).not.toHaveBeenCalled();
		expect(getMarkers()).toHaveLength(0);

		makeVideoReady(video);
		picker.refresh();
		expect(getMarkers()).toHaveLength(1);
		Object.defineProperty(video, 'readyState', { value: video.HAVE_NOTHING, configurable: true });
		video.dispatchEvent(new Event('emptied'));
		expect(getMarkers()).toHaveLength(0);
	});

	it('does not select media behind extension controls', () => {
		const canvas = document.createElement('canvas');
		const ui = document.createElement('div');
		const button = document.createElement('button');
		ui.dataset.textmodeAsciiExtensionUi = 'true';
		ui.append(button);
		mockRect(canvas, { width: 320, height: 180 });
		document.body.append(canvas, ui);
		document.elementsFromPoint = vi.fn(() => [canvas]);
		const onPick = vi.fn();
		const picker = createPicker({ onPick });
		picker.start();
		button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, clientX: 10, clientY: 10 }));
		expect(onPick).not.toHaveBeenCalled();
	});

	it('marks a list preview without selecting the media', async () => {
		const canvas = document.createElement('canvas');
		mockRect(canvas, { width: 320, height: 180 });
		document.body.append(canvas);
		const onPick = vi.fn();
		const picker = createPicker({ onPick });
		picker.start();
		const marker = getMarkers()[0]!;
		picker.highlightTarget(marker.dataset.pickerTargetId);
		expect(marker.dataset.preview).toBe('true');
		expect(onPick).not.toHaveBeenCalled();
		picker.highlightTarget(undefined);
		expect(marker.dataset.preview).toBe('false');
	});

	it('previews media without intercepting page clicks until direct selection is enabled', () => {
		const canvas = document.createElement('canvas');
		mockRect(canvas, { width: 320, height: 180 });
		document.body.append(canvas);
		document.elementsFromPoint = vi.fn(() => [canvas]);
		const onPick = vi.fn();
		const picker = createPicker({ onPick });
		picker.start(false);
		const marker = getMarkers()[0]!;
		const click = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
		canvas.dispatchEvent(click);
		expect(click.defaultPrevented).toBe(false);
		expect(onPick).not.toHaveBeenCalled();
		picker.highlightTarget(marker.dataset.pickerTargetId);
		expect(marker.dataset.preview).toBe('true');
		expect(marker.parentElement?.dataset.direct).toBe('false');
		picker.setDirectMode(true);
		canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		expect(onPick).toHaveBeenCalledWith(canvas);
	});

	it('emits separate target labels and dimensions for selectable media', () => {
		const canvas = document.createElement('canvas');
		canvas.id = 'hero';
		const video = document.createElement('video');
		makeVideoReady(video);
		mockRect(canvas, { width: 320, height: 180 });
		mockRect(video, { width: 640, height: 360 });
		document.body.append(canvas, video);
		const onTargetsChanged = vi.fn();
		const picker = createPicker({ onTargetsChanged });

		picker.start();

		expect(onTargetsChanged).toHaveBeenCalledWith([
			{ id: expect.any(String), label: 'canvas#hero', dimensions: '320x180', availability: 'ready' },
			{ id: expect.any(String), label: 'video', dimensions: '640x360', availability: 'ready' },
		]);
	});

	it('does not mark inaccessible iframes', () => {
		const iframe = document.createElement('iframe');
		iframe.src = 'https://cross-origin.test/embed';
		Object.defineProperty(iframe, 'contentDocument', { value: null });
		mockRect(iframe, { left: 12, top: 24, width: 320, height: 180 });
		document.body.append(iframe);
		const picker = createPicker();

		picker.start();
		expect(getMarkers()).toHaveLength(0);
		expect(document.querySelector('.textmode-ascii-overlay-picker')).not.toBeNull();
	});

	it('does not mark opaque sandboxed iframes', () => {
		const iframe = document.createElement('iframe');
		iframe.setAttribute('sandbox', 'allow-scripts');
		Object.defineProperty(iframe, 'contentDocument', { value: null });
		mockRect(iframe, { width: 320, height: 180 });
		document.body.append(iframe);
		const picker = createPicker();

		picker.start();

		expect(getMarkers()).toHaveLength(0);
	});

	it('discovers dynamically added unavailable iframes during an active session', async () => {
		const onTargetsChanged = vi.fn();
		const picker = createPicker({ onTargetsChanged });
		picker.start();
		expect(getMarkers()).toHaveLength(0);

		const iframe = document.createElement('iframe');
		iframe.src = 'https://cross-origin.test/dynamic';
		Object.defineProperty(iframe, 'contentDocument', { value: null });
		mockRect(iframe, { width: 320, height: 180 });
		document.body.append(iframe);

		await vi.waitFor(() =>
			expect(onTargetsChanged).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ availability: 'blocked' })])
			)
		);
		expect(getMarkers()).toHaveLength(0);
	});

	it('marks the media under the pointer as active', () => {
		const canvas = document.createElement('canvas');
		mockRect(canvas, { width: 320, height: 180 });
		document.body.append(canvas);
		document.elementsFromPoint = vi.fn(() => [canvas]);
		const picker = createPicker();
		picker.start();
		const marker = getMarkers()[0]!;

		window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }));
		expect(marker.dataset.active).toBe('true');
	});

	it('keeps Tab untouched and cancels with Escape while restoring focus', () => {
		const trigger = document.createElement('button');
		document.body.append(trigger);
		trigger.focus();
		const onCancel = vi.fn();
		const picker = createPicker({ onCancel });

		picker.start();
		const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
		window.dispatchEvent(tab);
		expect(tab.defaultPrevented).toBe(false);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

		expect(onCancel).toHaveBeenCalledOnce();
		expect(document.querySelector('.textmode-ascii-overlay-picker')).toBeNull();
		expect(document.activeElement).toBe(trigger);
	});

	it('ships square markers and reduced-motion and forced-colors fallbacks', () => {
		const styles = readFileSync(resolve(process.cwd(), 'src/features/media-picker/picker-overlay.css'), 'utf8');

		expect(styles).toContain('border-radius: 0');
		expect(styles).toContain('repeating-linear-gradient');
		expect(styles).toContain('tm-picker-stripes');
		expect(styles).toContain('prefers-reduced-motion: reduce');
		expect(styles).toContain('forced-colors: active');
		expect(styles).toMatch(/\.tm-picker-marker\s*{[^}]*z-index:\s*1/s);
	});

	it('excludes cross-origin non-CORS, DRM-protected, and tainted media elements from selection', () => {
		const crossOriginVideo = document.createElement('video');
		makeVideoReady(crossOriginVideo);
		crossOriginVideo.src = 'https://cdn.other.test/clip.mp4';
		mockRect(crossOriginVideo, { width: 320, height: 180 });

		const sourceChildVideo = document.createElement('video');
		makeVideoReady(sourceChildVideo);
		const sourceChild = document.createElement('source');
		sourceChild.src = 'https://cdn.other.test/child.mp4';
		sourceChildVideo.append(sourceChild);
		mockRect(sourceChildVideo, { width: 320, height: 180 });

		const corsVideo = document.createElement('video');
		makeVideoReady(corsVideo);
		corsVideo.crossOrigin = 'anonymous';
		corsVideo.src = 'https://cdn.other.test/cors.mp4';
		mockRect(corsVideo, { width: 320, height: 180 });

		const drmVideo = document.createElement('video');
		makeVideoReady(drmVideo);
		Object.defineProperty(drmVideo, 'mediaKeys', { value: {}, configurable: true });
		mockRect(drmVideo, { width: 320, height: 180 });

		const sameOriginVideo = document.createElement('video');
		makeVideoReady(sameOriginVideo);
		sameOriginVideo.src = `${window.location.origin}/local.mp4`;
		mockRect(sameOriginVideo, { width: 320, height: 180 });

		document.body.append(crossOriginVideo, sourceChildVideo, corsVideo, drmVideo, sameOriginVideo);

		expect(isSelectableElement(crossOriginVideo)).toBe(false);
		expect(isSelectableElement(sourceChildVideo)).toBe(false);
		expect(isSelectableElement(drmVideo)).toBe(false);
		expect(isSelectableElement(corsVideo)).toBe(true);
		expect(isSelectableElement(sameOriginVideo)).toBe(true);
		expect(getSelectableElements()).toEqual([corsVideo, sameOriginVideo]);
	});

	it('probes pixel readability and discards tainted scratch canvases between checks', () => {
		const redirectedTaintedVideo = document.createElement('video');
		makeVideoReady(redirectedTaintedVideo);
		redirectedTaintedVideo.src = `${window.location.origin}/redirect-to-cdn.mp4`;
		mockRect(redirectedTaintedVideo, { width: 320, height: 180 });

		const cleanCanvas = document.createElement('canvas');
		mockRect(cleanCanvas, { width: 320, height: 180 });

		document.body.append(redirectedTaintedVideo, cleanCanvas);

		let lastDrawn: unknown;
		let contextCreations = 0;
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => {
			contextCreations += 1;
			let tainted = false;
			return {
				clearRect: vi.fn(),
				drawImage: vi.fn((source: unknown) => {
					lastDrawn = source;
					if (source === redirectedTaintedVideo) tainted = true;
				}),
				getImageData: vi.fn(() => {
					if (tainted) {
						throw new DOMException(
							"Failed to execute 'getImageData' on 'CanvasRenderingContext2D': The canvas has been tainted by cross-origin data.",
							'SecurityError'
						);
					}
					return { data: new Uint8ClampedArray(4) };
				}),
			};
		}) as unknown as typeof HTMLCanvasElement.prototype.getContext);

		// Redirected cross-origin video throws SecurityError during probe and is excluded.
		expect(getSelectableElements()).toEqual([cleanCanvas]);
		expect(lastDrawn).toBe(cleanCanvas);
		// One initial scratch canvas, reset once after taint, then clean canvas succeeds on the fresh scratch canvas.
		expect(contextCreations).toBe(2);

		// Reset global scratch probe before restoring mocks so other tests start clean.
		expect(isSelectableElement(redirectedTaintedVideo)).toBe(false);
	});

	function createPicker(overrides: Partial<ConstructorParameters<typeof ElementPicker>[0]> = {}): ElementPicker {
		const picker = new ElementPicker({
			onPick: vi.fn(),
			onCancel: vi.fn(),
			...overrides,
		});
		activePickers.push(picker);
		return picker;
	}
});

function getPickerHost(): HTMLElement {
	const host = document.querySelector<HTMLElement>('.textmode-ascii-overlay-picker');
	if (!host) throw new Error('Expected the picker host to be mounted.');
	return host;
}

function getMarkers(): HTMLButtonElement[] {
	return [...(getPickerHost().shadowRoot?.querySelectorAll<HTMLButtonElement>('.tm-picker-marker') ?? [])];
}

function makeVideoReady(video: HTMLVideoElement): void {
	Object.defineProperty(video, 'readyState', { value: video.HAVE_CURRENT_DATA, configurable: true });
	Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true });
	Object.defineProperty(video, 'videoHeight', { value: 360, configurable: true });
}
