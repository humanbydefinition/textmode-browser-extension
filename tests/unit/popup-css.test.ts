import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const popupCss = readFileSync(resolve(import.meta.dirname, '../../src/popup/popup.css'), 'utf8');

describe('popup layout CSS', () => {
	it('contains nested controls instead of allowing horizontal overflow', () => {
		expect(popupCss).toContain('overflow-x: hidden');
		expect(popupCss).toContain('grid-template-columns: minmax(0, 1fr) 42px');
		expect(popupCss).toContain('.tm-slider::-webkit-slider-runnable-track');
		expect(popupCss).toContain('max-width: var(--tm-panel-width)');
	});

	it('keeps long selected-media labels inside the card', () => {
		expect(popupCss).toContain('overflow-wrap: anywhere');
		expect(popupCss).toContain('-webkit-line-clamp: 2');
	});

	it('uses textmode art neutral tokens instead of the old slate palette', () => {
		expect(popupCss).toContain('--tm-neutral-09: #090909');
		expect(popupCss).toContain('--tm-accent-blue: #29adff');
		expect(popupCss).not.toContain('#0b1020');
	});
});
