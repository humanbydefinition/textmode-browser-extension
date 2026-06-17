import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ElementPicker,
	getSelectableElements,
	isSelectableElement,
} from '../../src/features/media-picker/element-picker';

describe('element-picker', () => {
	beforeEach(() => {
		document.body.replaceChildren();
	});

	it('includes visible canvas and video elements', () => {
		const canvas = document.createElement('canvas');
		const video = document.createElement('video');
		mockRect(canvas, 320, 180);
		mockRect(video, 640, 360);
		document.body.append(canvas, video);

		expect(getSelectableElements()).toEqual([canvas, video]);
	});

	it('excludes zero-size elements and extension UI', () => {
		const canvas = document.createElement('canvas');
		const ui = document.createElement('div');
		const nested = document.createElement('canvas');
		ui.dataset.textmodeAsciiExtensionUi = 'true';
		ui.append(nested);
		mockRect(canvas, 0, 0);
		mockRect(nested, 320, 180);
		document.body.append(canvas, ui);

		expect(isSelectableElement(canvas)).toBe(false);
		expect(isSelectableElement(nested)).toBe(false);
		expect(getSelectableElements()).toEqual([]);
	});

	it('uses only a temporary highlight and cursor while picking', () => {
		const picker = new ElementPicker({
			onPick: vi.fn(),
			onCancel: vi.fn(),
		});

		picker.start();

		const highlight = document.querySelector<HTMLElement>('.textmode-ascii-overlay-picker');
		expect(highlight).not.toBeNull();
		expect(highlight?.dataset.textmodeAsciiExtensionUi).toBeUndefined();
		expect(document.documentElement.style.cursor).toBe('crosshair');
		expect(highlight?.style.zIndex).toBe('2147483645');

		picker.stop(false);

		expect(document.querySelector('.textmode-ascii-overlay-picker')).toBeNull();
		expect(document.documentElement.style.cursor).toBe('');
	});
});

function mockRect(element: Element, width: number, height: number): void {
	element.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			right: width,
			bottom: height,
			width,
			height,
			toJSON: () => undefined,
		}) as DOMRect;
}
