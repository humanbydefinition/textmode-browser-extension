import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const popupCss = readFileSync(resolve(import.meta.dirname, '../../src/popup/popup.css'), 'utf8');

describe('popup layout CSS', () => {
	it('contains nested controls instead of allowing horizontal overflow', () => {
		expect(popupCss).toContain('overflow-x: hidden');
		expect(popupCss).toContain('grid-template-columns: minmax(0, 1fr) max-content');
		expect(popupCss).toContain(".field--slider input[type='range']");
		expect(popupCss).toContain('max-width: 100%');
	});

	it('keeps long selected-media labels inside the card', () => {
		expect(popupCss).toContain('overflow-wrap: anywhere');
		expect(popupCss).toContain('-webkit-line-clamp: 2');
	});
});
