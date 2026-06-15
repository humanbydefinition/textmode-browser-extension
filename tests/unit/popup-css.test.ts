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
		expect(popupCss).toContain('grid-template-rows: auto auto minmax(0, 1fr) auto');
	});

	it('keeps long selected-media labels inside the card', () => {
		expect(popupCss).toContain('text-overflow: ellipsis');
		expect(popupCss).toContain('white-space: nowrap');
		expect(popupCss).not.toContain('-webkit-line-clamp: 2');
	});

	it('uses textmode art neutral tokens instead of the old slate palette', () => {
		expect(popupCss).toContain('--tm-neutral-09: #090909');
		expect(popupCss).toContain('--tm-accent-blue: #29adff');
		expect(popupCss).not.toContain('#0b1020');
	});

	it('keeps the header centered and footer outside the scroll area', () => {
		expect(popupCss).toContain('align-items: center');
		expect(popupCss).toContain('.tm-panel__footer');
		expect(popupCss).toContain('.tm-built-with a');
		expect(popupCss).toContain('text-align: right');
		expect(popupCss).toContain('.tm-built-with {\n\tmargin: 0;\n\tborder-top: 1px solid var(--tm-neutral-26);');
	});

	it('styles support and dimensions controls', () => {
		expect(popupCss).toContain('.tm-panel__actions');
		expect(popupCss).toContain('.tm-support-link');
		expect(popupCss).toContain('.tm-dimensions');
		expect(popupCss).not.toContain('.tm-status--active');
	});
});
