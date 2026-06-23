import { describe, expect, it } from 'vitest';
import { isCustomFontId, isFontId } from '@/domain/fonts/font-id';

describe('font-id', () => {
	it('identifies custom font ids', () => {
		expect(isCustomFontId('custom:abc')).toBe(true);
		expect(isCustomFontId('custom:')).toBe(false);
		expect(isCustomFontId('chunky')).toBe(false);
		expect(isCustomFontId(null)).toBe(false);
	});

	it('identifies bundled and custom font ids', () => {
		expect(isFontId('chunky')).toBe(true);
		expect(isFontId('custom:abc')).toBe(true);
		expect(isFontId('not-a-font')).toBe(false);
		expect(isFontId('custom:')).toBe(false);
	});
});
