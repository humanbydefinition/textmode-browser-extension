import { describe, expect, it } from 'vitest';
import {
	FALLBACK_COLOR,
	getDisplayColor,
	normalizeHexColor,
	parseHexColor,
} from '../../../src/widgets/overlay-panel/color-picker-model';

describe('color picker model', () => {
	it('normalizes six- and three-digit hex colors', () => {
		expect(normalizeHexColor('#FF77AA')).toBe('#ff77aa');
		expect(normalizeHexColor('0F8')).toBe('#00ff88');
		expect(normalizeHexColor(' #ABC ')).toBe('#aabbcc');
	});

	it('rejects unsupported color strings', () => {
		expect(normalizeHexColor('red')).toBeNull();
		expect(normalizeHexColor('#12345')).toBeNull();
		expect(normalizeHexColor('transparent')).toBeNull();
	});

	it('always sets alpha to 1 and rejects extended hex formats', () => {
		expect(parseHexColor('#00000080')).toBeNull();
		expect(parseHexColor('#000')).not.toBeNull();
		expect(parseHexColor('#000')?.a).toBe(1);
		expect(parseHexColor('#ff0000')?.a).toBe(1);
	});

	it('uses a stable display fallback for malformed stored colors', () => {
		expect(getDisplayColor('not-a-color')).toBe(FALLBACK_COLOR);
	});
});
