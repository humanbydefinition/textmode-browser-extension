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
	});

	it('includes visible canvas and video elements', () => {
		const canvas = document.createElement('canvas');
		const video = document.createElement('video');
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
		mockRect(canvas, { left: 12, top: 24, width: 320, height: 180 });
		mockRect(video, { left: 12, top: 228, width: 640, height: 360 });
		document.body.append(canvas, video);

		const picker = createPicker();
		picker.start();

		await vi.waitFor(() => expect(getMarkers()).toHaveLength(2));
		const markers = getMarkers();
		expect(markers.map((marker) => marker.dataset.availability)).toEqual(['ready', 'ready']);
		await vi.waitFor(() => expect(markers[0].style.getPropertyValue('--tm-picker-x')).toBe('12px'));
		expect(markers[0].textContent).toBe('');
		const status = getPickerHost().shadowRoot?.querySelector('.tm-picker-status');
		expect(status?.textContent).toContain('Select a <canvas> or <video> element');
		expect(status?.textContent).toContain('2 selectable elements');
		expect(status?.textContent).toContain('0 non-selectable elements');
		expect([...(status?.querySelectorAll('code') ?? [])].map((code) => code.textContent)).toEqual([
			'<canvas>',
			'<video>',
			'2',
			'0',
			'Esc',
		]);
		expect(status?.querySelectorAll('.tm-picker-status__metric')).toHaveLength(3);
	});

	it('ignores a larger ambient canvas and selects the overlapping video', async () => {
		const ambientCanvas = document.createElement('canvas');
		ambientCanvas.style.pointerEvents = 'none';
		const video = document.createElement('video');
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

	it('blocks inaccessible iframes, exposes the reason, and keeps picking active', async () => {
		const iframe = document.createElement('iframe');
		iframe.src = 'https://cross-origin.test/embed';
		Object.defineProperty(iframe, 'contentDocument', { value: null });
		mockRect(iframe, { left: 12, top: 24, width: 320, height: 180 });
		document.body.append(iframe);
		const onUnavailableFrame = vi.fn();
		const picker = createPicker({ onUnavailableFrame });

		picker.start();
		const blocker = await getBlocker();
		await vi.waitFor(() => expect(blocker.style.getPropertyValue('--tm-picker-x')).toBe('12px'));
		expect(blocker.style.getPropertyValue('--tm-picker-width')).toBe('320px');
		expect(blocker.getAttribute('aria-label')).toContain('share the page origin');
		blocker.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));

		expect(onUnavailableFrame).toHaveBeenCalledWith(expect.stringContaining('share the page origin'));
		expect(document.querySelector('.textmode-ascii-overlay-picker')).not.toBeNull();
	});

	it('distinguishes opaque sandboxed iframes from cross-origin frames', async () => {
		const iframe = document.createElement('iframe');
		iframe.setAttribute('sandbox', 'allow-scripts');
		Object.defineProperty(iframe, 'contentDocument', { value: null });
		mockRect(iframe, { width: 320, height: 180 });
		document.body.append(iframe);
		const picker = createPicker();

		picker.start();

		const blocker = await getBlocker();
		expect(blocker.getAttribute('aria-label')).toContain('Sandboxed iframe');
		expect(blocker.textContent).toBe('');
	});

	it('discovers dynamically added unavailable iframes during an active session', async () => {
		const picker = createPicker();
		picker.start();
		expect(getMarkers()).toHaveLength(0);

		const iframe = document.createElement('iframe');
		iframe.src = 'https://cross-origin.test/dynamic';
		Object.defineProperty(iframe, 'contentDocument', { value: null });
		mockRect(iframe, { width: 320, height: 180 });
		document.body.append(iframe);

		await vi.waitFor(() => expect(getMarkers()).toHaveLength(1));
		expect(getMarkers()[0].dataset.availability).toBe('blocked');
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
		expect(styles).toMatch(/\.tm-picker-status\s*{[^}]*z-index:\s*2/s);
		expect(styles).toMatch(/\.tm-picker-marker\s*{[^}]*z-index:\s*1/s);
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

async function getBlocker(): Promise<HTMLButtonElement> {
	let blocker: HTMLButtonElement | null = null;
	await vi.waitFor(() => {
		blocker =
			getPickerHost().shadowRoot?.querySelector<HTMLButtonElement>('.textmode-ascii-overlay-iframe-blocker') ??
			null;
		expect(blocker).not.toBeNull();
	});
	return blocker as unknown as HTMLButtonElement;
}
