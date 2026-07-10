import { describe, expect, it } from 'vitest';
import {
	CUSTOM_FONT_CATALOG_KEY,
	createCustomFontDataKey,
	createEmptyCustomFontCatalog,
	normalizeStoredCustomFontCatalog,
	normalizeStoredCustomFontPayload,
} from '@/domain/fonts/custom-font-storage';

describe('custom font storage domain', () => {
	it('uses stable versioned storage keys', () => {
		expect(CUSTOM_FONT_CATALOG_KEY).toBe('custom-fonts:catalog:v1');
		expect(createCustomFontDataKey('custom:123e4567-e89b-12d3-a456-426614174000')).toBe(
			'custom-font:data:v1:123e4567-e89b-12d3-a456-426614174000'
		);
	});

	it('normalizes a valid catalog and rejects unknown versions', () => {
		const catalog = createEmptyCustomFontCatalog(123);
		expect(normalizeStoredCustomFontCatalog(catalog)).toEqual(catalog);
		expect(normalizeStoredCustomFontCatalog({ ...catalog, version: 2 })).toBeNull();
	});

	it('rejects metadata whose id and data key do not match', () => {
		const catalog = {
			...createEmptyCustomFontCatalog(1),
			fonts: [
				{
					id: 'custom:123e4567-e89b-12d3-a456-426614174000',
					displayName: 'Grid',
					fileName: 'Grid.ttf',
					format: 'truetype',
					uploadedAt: 1,
					byteLength: 4,
					sha256: '0'.repeat(64),
					dataKey: 'custom-font:data:v1:223e4567-e89b-12d3-a456-426614174000',
				},
			],
		};
		expect(normalizeStoredCustomFontCatalog(catalog)).toBeNull();
	});

	it('accepts only versioned Base64 payloads', () => {
		expect(normalizeStoredCustomFontPayload({ version: 1, encoding: 'base64', data: 'AA==' })).toEqual({
			version: 1,
			encoding: 'base64',
			data: 'AA==',
		});
		expect(normalizeStoredCustomFontPayload({ version: 1, encoding: 'binary', data: 'AA==' })).toBeNull();
	});
});
