import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '../../src/domain/overlay/overlay-settings';
import { ControlPanel } from '../../src/widgets/overlay-panel/control-panel';

const HEADER_FONT_URL = 'chrome-extension://extension-id/fonts/Bescii-Mono.woff';

describe('ControlPanel', () => {
	beforeEach(() => {
		document.body.replaceChildren();
		document.documentElement.querySelector('#textmode-ascii-overlay-control-panel-root')?.remove();
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
	});

	it('mounts once in Shadow DOM and does not portal UI into the page', () => {
		const panel = new ControlPanel({
			headerFontUrl: HEADER_FONT_URL,
			onStartPicking: vi.fn(),
			onUpdateOverlay: vi.fn(),
			onExportOverlay: vi.fn(),
			onRemoveOverlay: vi.fn(),
			onClose: vi.fn(),
		});
		panel.mount();
		panel.updateState([
			{
				id: 'overlay-1',
				elementKind: 'video',
				elementLabel: 'video#demo-video 640x360',
				bounds: { x: 0, y: 0, width: 640, height: 360 },
				settings: DEFAULT_OVERLAY_SETTINGS,
				status: 'active',
			},
		]);

		const host = document.querySelector<HTMLElement>('#textmode-ascii-overlay-control-panel-root');
		expect(host).not.toBeNull();
		expect(host?.dataset.textmodeAsciiExtensionUi).toBe('true');
		expect(host?.shadowRoot?.querySelector('[data-testid="overlay-panel"]')).not.toBeNull();
		expect(document.querySelector('[data-testid="overlay-panel"]')).toBeNull();

		panel.unmount();
		expect(document.querySelector('#textmode-ascii-overlay-control-panel-root')).toBeNull();
	});

	it('keeps color popovers inside the panel Shadow DOM', () => {
		const panel = new ControlPanel({
			headerFontUrl: HEADER_FONT_URL,
			onStartPicking: vi.fn(),
			onUpdateOverlay: vi.fn(),
			onExportOverlay: vi.fn(),
			onRemoveOverlay: vi.fn(),
			onClose: vi.fn(),
		});
		panel.mount();
		panel.updateState([
			{
				id: 'overlay-1',
				elementKind: 'canvas',
				elementLabel: 'canvas#demo-canvas 320x180',
				bounds: { x: 0, y: 0, width: 320, height: 180 },
				settings: DEFAULT_OVERLAY_SETTINGS,
				status: 'active',
			},
		]);

		const host = document.querySelector<HTMLElement>('#textmode-ascii-overlay-control-panel-root');
		host?.shadowRoot?.querySelector<HTMLButtonElement>('button[role="tab"][data-state="inactive"]')?.click();
		const colorTrigger = host?.shadowRoot?.querySelector<HTMLButtonElement>(
			'button[aria-label="characters color"]'
		);
		expect(colorTrigger).not.toBeNull();

		colorTrigger?.click();

		expect(host?.shadowRoot?.querySelector('[data-slot="popover-content"]')).not.toBeNull();
		expect(document.body.querySelector('[data-slot="popover-content"]')).toBeNull();

		panel.unmount();
	});
});

class MockResizeObserver {
	public observe = vi.fn();
	public unobserve = vi.fn();
	public disconnect = vi.fn();
}
