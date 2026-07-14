import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUSTOM_FONT_MAX_COUNT, CUSTOM_FONT_MAX_TOTAL_BYTES } from '../../src/domain/fonts/custom-font-storage';
import { DEFAULT_FONT_ID } from '../../src/domain/fonts/font-metadata';
import { getGlyphRampPresets } from '../../src/domain/overlay/glyph-ramp-registry';
import { OVERLAY_EXPORT_FORMAT_DEFINITIONS } from '../../src/domain/overlay/export-formats';
import { OVERLAY_POST_FX_DEFINITIONS } from '../../src/domain/overlay/post-fx';
import { CUSTOM_FONT_MAX_BYTES } from '../../src/shared/fonts/runtime-font-registry-constants';

interface ProductManifest {
	schemaVersion: number;
	name: string;
	version: string;
	repositoryUrl: string;
	supportUrl: string;
	browserListings: Array<{
		target: string;
		installUrl: string;
		availability: string;
	}>;
	capabilities: {
		exportFormats: string[];
		glyphRampPresetIds: string[];
		postFxCount: number;
		customFonts: {
			maxCount: number;
			maxFileBytes: number;
			maxTotalBytes: number;
		};
	};
}

const root = resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'product-manifest.json'), 'utf8')) as ProductManifest;
const packageMetadata = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
	name: string;
	version: string;
	repository: { url: string };
};

describe('public product manifest', () => {
	it('matches release identity and exposes install destinations', () => {
		expect(manifest.schemaVersion).toBe(1);
		expect(manifest.name).toBe('Textmode Overlay');
		expect(manifest.version).toBe(packageMetadata.version);
		expect(manifest.repositoryUrl).toBe(packageMetadata.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''));
		expect(manifest.browserListings.map(({ target }) => target)).toEqual([
			'chrome',
			'edge',
			'firefox',
			'opera',
			'safari',
		]);
		for (const listing of manifest.browserListings) {
			expect(listing.installUrl).toMatch(/^https:\/\//);
			expect(['store', 'source']).toContain(listing.availability);
		}
	});

	it('matches extension capability registries and limits', () => {
		expect(manifest.capabilities.exportFormats).toEqual(
			Object.values(OVERLAY_EXPORT_FORMAT_DEFINITIONS).map(({ label }) => label)
		);
		expect(manifest.capabilities.glyphRampPresetIds).toEqual(
			getGlyphRampPresets(DEFAULT_FONT_ID).map(({ id }) => id)
		);
		expect(manifest.capabilities.postFxCount).toBe(OVERLAY_POST_FX_DEFINITIONS.length);
		expect(manifest.capabilities.customFonts).toEqual({
			maxCount: CUSTOM_FONT_MAX_COUNT,
			maxFileBytes: CUSTOM_FONT_MAX_BYTES,
			maxTotalBytes: CUSTOM_FONT_MAX_TOTAL_BYTES,
		});
	});
});
