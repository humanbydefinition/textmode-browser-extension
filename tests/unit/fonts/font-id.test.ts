import { describe, expect, it } from 'vitest';
import { isCustomFontId, isFontId } from '@/domain/fonts/font-id';

describe('font-id', () => {
	it('identifies custom font ids', () => {
		expect(isCustomFontId('custom:abc')).toBe(true);
		expect(isCustomFontId('custom:')).toBe(false);
		expect(isCustomFontId('bescii')).toBe(false);
		expect(isCustomFontId(null)).toBe(false);
	});

	it('identifies bundled and custom font ids', () => {
		expect(isFontId('bescii')).toBe(true);
		expect(isFontId('chunky')).toBe(false);
		expect(isFontId('custom:abc')).toBe(true);
		expect(isFontId('not-a-font')).toBe(false);
		expect(isFontId('custom:')).toBe(false);
	});
});
