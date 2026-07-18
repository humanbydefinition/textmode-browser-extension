import { describe, expect, it } from 'vitest';
import {
	DEFAULT_PANEL_PLACEMENT,
	PANEL_PLACEMENT_VERSION,
	createPanelPlacementStorageKey,
	createStoredPanelPlacement,
	normalizePanelPlacement,
	normalizeStoredPanelPlacement,
	resolvePanelPlacementKey,
} from '../../src/domain/presets/panel-placement';
import { resolveSiteKey } from '../../src/domain/presets/site-key';

describe('panel placement domain', () => {
	it('normalizes HTTP(S) hostnames independently of paths and queries', () => {
		expect(resolveSiteKey(new URL('https://WWW.Example.com./watch?id=1'))).toBe('www.example.com');
		expect(resolvePanelPlacementKey(new URL('https://www.example.com/another/path'))).toBe(
			'site-panel-position:v1:www.example.com'
		);
		expect(resolvePanelPlacementKey(new URL('file:///tmp/media.html'))).toBeNull();
	});

	it('creates stable versioned storage records', () => {
		expect(createPanelPlacementStorageKey('example.com')).toBe('site-panel-position:v1:example.com');
		expect(createStoredPanelPlacement({ xRatio: 0.25, yRatio: 0.75 }, 123)).toEqual({
			version: PANEL_PLACEMENT_VERSION,
			placement: { xRatio: 0.25, yRatio: 0.75 },
			updatedAt: 123,
		});
	});

	it('accepts only finite ratios inside the viewport range', () => {
		expect(normalizePanelPlacement(DEFAULT_PANEL_PLACEMENT)).toEqual(DEFAULT_PANEL_PLACEMENT);
		expect(normalizePanelPlacement({ xRatio: -0.1, yRatio: 0 })).toBeNull();
		expect(normalizePanelPlacement({ xRatio: 0, yRatio: 1.1 })).toBeNull();
		expect(normalizePanelPlacement({ xRatio: Number.NaN, yRatio: 0 })).toBeNull();
	});

	it('rejects malformed and future-version records', () => {
		expect(normalizeStoredPanelPlacement(null)).toBeNull();
		expect(normalizeStoredPanelPlacement({ version: 2, placement: DEFAULT_PANEL_PLACEMENT })).toBeNull();
		expect(
			normalizeStoredPanelPlacement({
				version: PANEL_PLACEMENT_VERSION,
				placement: { xRatio: 0.4, yRatio: 0.6 },
				updatedAt: 'invalid',
			})
		).toEqual({
			version: PANEL_PLACEMENT_VERSION,
			placement: { xRatio: 0.4, yRatio: 0.6 },
			updatedAt: 0,
		});
	});
});
