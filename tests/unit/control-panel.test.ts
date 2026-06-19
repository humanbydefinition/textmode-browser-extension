import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '../../src/domain/overlay/overlay-settings';
import { ControlPanel } from '../../src/widgets/overlay-panel/control-panel';
import { MockResizeObserver } from './test-helpers';

const HEADER_FONT_URL = 'chrome-extension://extension-id/fonts/Bescii-Mono.ttf';

describe('ControlPanel', () => {
	beforeEach(() => {
		document.body.replaceChildren();
		document.documentElement.querySelector('#textmode-ascii-overlay-control-panel-root')?.remove();
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
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

	it('registers the header font from binary data', async () => {
		const fontBytes = new Uint8Array([0, 1, 2, 3]).buffer;
		const fontFaces = new Set<MockFontFace>();
		const fontSet = {
			add: vi.fn((fontFace: MockFontFace) => {
				fontFaces.add(fontFace);
				return fontSet;
			}),
			delete: vi.fn((fontFace: MockFontFace) => fontFaces.delete(fontFace)),
			[Symbol.iterator]: function* () {
				yield* fontFaces;
			},
		};

		vi.stubGlobal('FontFace', MockFontFace);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				arrayBuffer: async () => fontBytes,
			}))
		);
		Object.defineProperty(document, 'fonts', {
			value: fontSet,
			configurable: true,
		});

		const panel = new ControlPanel({
			headerFontUrl: HEADER_FONT_URL,
			onStartPicking: vi.fn(),
			onUpdateOverlay: vi.fn(),
			onExportOverlay: vi.fn(),
			onRemoveOverlay: vi.fn(),
			onClose: vi.fn(),
		});

		await vi.waitFor(() => {
			expect(fontSet.add).toHaveBeenCalled();
		});
		expect(fetch).toHaveBeenCalledWith(HEADER_FONT_URL);
		expect([...fontFaces][0]).toMatchObject({
			family: 'Bescii Mono',
			source: fontBytes,
			descriptors: { display: 'block', style: 'normal', weight: '400' },
			status: 'loaded',
		});

		panel.unmount();
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

class MockFontFace {
	public status = 'unloaded';

	public constructor(
		public readonly family: string,
		public readonly source: BufferSource,
		public readonly descriptors: FontFaceDescriptors
	) {}

	public async load(): Promise<this> {
		this.status = 'loaded';
		return this;
	}
}
