import { describe, expect, it, vi } from 'vitest';
import { resolveToolbarActionApi } from '../../src/shared/browser/browser-api';

describe('browser API adapter', () => {
	it('uses the MV3 action API when it is available', () => {
		const action = { onClicked: { addListener: vi.fn() } };
		const browserAction = { onClicked: { addListener: vi.fn() } };

		expect(resolveToolbarActionApi({ action, browserAction } as never)).toBe(action);
	});

	it('falls back to the MV2 browserAction API for Firefox MV2 builds', () => {
		const browserAction = { onClicked: { addListener: vi.fn() } };

		expect(resolveToolbarActionApi({ browserAction } as never)).toBe(browserAction);
	});

	it('throws a clear error if no toolbar action API exists', () => {
		expect(() => resolveToolbarActionApi({} as never)).toThrow('No browser toolbar action API is available.');
	});
});
