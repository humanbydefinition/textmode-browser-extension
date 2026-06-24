import { describe, expect, it, vi } from 'vitest';
import { createOverlayPostFxItem } from '@/domain/overlay/overlay-settings';
import { applyPostFxFilters, resolvePostFxFilters } from '@/features/textmode-overlay/post-fx-runtime';
import type { ExportableTextmodeInstance } from '@/features/textmode-overlay/overlay-renderer';

describe('post-fx runtime', () => {
	it('applies enabled filters in settings order', () => {
		const brightness = createOverlayPostFxItem('brightness');
		brightness.enabled = true;
		brightness.params.amount = 1.5;
		const disabled = createOverlayPostFxItem('sepia');
		disabled.enabled = false;
		const invert = createOverlayPostFxItem('invert');
		invert.enabled = true;
		const instance = createInstance();

		applyPostFxFilters(instance, [brightness, disabled, invert]);

		expect(instance.filter).toHaveBeenNthCalledWith(1, 'brightness', { amount: 1.5 });
		expect(instance.filter).toHaveBeenNthCalledWith(2, 'invert', undefined);
		expect(instance.filter).toHaveBeenCalledTimes(2);
	});

	it('derives animated time params at render time', () => {
		const scanlines = createOverlayPostFxItem('scanlines');
		scanlines.enabled = true;
		const instance = createInstance({ secs: 2 });

		const resolved = resolvePostFxFilters(instance, [scanlines]);

		expect(resolved[0]).toMatchObject({
			name: 'scanlines',
			params: expect.objectContaining({ time: 2 }),
		});
	});
});

function createInstance(overrides: Record<string, unknown> = {}): ExportableTextmodeInstance & {
	filter: ReturnType<typeof vi.fn>;
} {
	return {
		canvas: document.createElement('canvas'),
		filter: vi.fn(),
		filters: {
			has: vi.fn(() => true),
		},
		secs: 0,
		...overrides,
	} as unknown as ExportableTextmodeInstance & { filter: ReturnType<typeof vi.fn> };
}
