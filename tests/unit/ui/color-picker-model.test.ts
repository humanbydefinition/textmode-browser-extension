import { describe, expect, it } from 'vitest';
import {
	FALLBACK_COLOR,
	getColorPickerSupportText,
	getDisplayColor,
	getHsvaFromHex,
	getPopoverPortalContainer,
	normalizeHexColor,
	parseHexColor,
} from '../../../src/widgets/overlay-panel/color-picker-model';

describe('color picker model', () => {
	it('normalizes six- and three-digit hex colors', () => {
		expect(normalizeHexColor('#FF77AA')).toBe('#ff77aa');
		expect(normalizeHexColor('0F8')).toBe('#00ff88');
		expect(normalizeHexColor(' #ABC ')).toBe('#aabbcc');
		expect(normalizeHexColor('#ff77aa80')).toBe('#ff77aa80');
	});

	it('rejects unsupported color strings', () => {
		expect(normalizeHexColor('red')).toBeNull();
		expect(normalizeHexColor('#12345')).toBeNull();
		expect(normalizeHexColor('transparent')).toBeNull();
	});

	it('parses alpha channels for transparency controls', () => {
		expect(parseHexColor('#00000080')?.a).toBeCloseTo(0.5, 2);
		expect(getHsvaFromHex('#ff000080')).toMatchObject({ h: 0, s: 1, v: 1 });
	});

	it('uses a stable display fallback for malformed stored colors', () => {
		expect(getDisplayColor('not-a-color')).toBe(FALLBACK_COLOR);
	});

	it('returns user-facing support text based on validity', () => {
		expect(getColorPickerSupportText('#ff77aa')).toBe('use #rrggbb or #rrggbbaa');
		expect(getColorPickerSupportText('nope')).toBe('enter a hex color like #ff77aa');
	});

	it('keeps popovers inside Shadow DOM when available', () => {
		const host = document.createElement('div');
		const shadowRoot = host.attachShadow({ mode: 'open' });
		const portalRoot = document.createElement('div');
		portalRoot.dataset.textmodeOverlayPortalRoot = 'true';
		shadowRoot.append(portalRoot);
		const fallback = document.createElement('div');

		expect(getPopoverPortalContainer(shadowRoot, fallback)).toBe(portalRoot);
		expect(getPopoverPortalContainer(document, fallback)).toBe(fallback);
	});
});
