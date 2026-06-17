import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('textmode.js', () => ({
	textmode: {
		create: vi.fn(),
	},
}));

describe('content runtime', () => {
	beforeEach(() => {
		vi.resetModules();
		document.body.replaceChildren();
		document.documentElement.removeAttribute('style');
		delete (window as typeof window & { __textmodeAsciiOverlayRuntime?: unknown }).__textmodeAsciiOverlayRuntime;
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
		vi.stubGlobal('chrome', {
			runtime: {
				onMessage: {
					addListener: vi.fn(),
				},
				sendMessage: vi.fn(),
			},
		});
	});

	it('does not create a sticky in-page settings panel on startup', async () => {
		await import('../../src/application/page-runtime/page-runtime');

		expect(document.querySelector('[data-textmode-ascii-extension-ui="true"]')).toBeNull();
		expect(document.querySelector('aside')).toBeNull();
	});
});

class MockResizeObserver {
	public observe = vi.fn();
	public unobserve = vi.fn();
	public disconnect = vi.fn();
}
