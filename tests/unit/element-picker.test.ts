import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ElementPicker,
	getSelectableElements,
	isSelectableElement,
} from '../../src/features/media-picker/element-picker';
import { mockRect } from './test-helpers';

describe('element-picker', () => {
	beforeEach(() => {
		document.body.replaceChildren();
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
