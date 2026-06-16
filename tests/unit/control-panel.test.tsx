import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS } from '../../src/domain/overlay/overlay-settings';
import { ControlPanel } from '../../src/widgets/overlay-panel/control-panel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ControlPanel', () => {
	beforeEach(() => {
		document.body.replaceChildren();
	});

	it('mounts once in Shadow DOM and does not portal UI into the page', () => {
		let panel!: ControlPanel;

		act(() => {
			panel = new ControlPanel({
				onStartPicking: vi.fn(),
				onUpdateOverlay: vi.fn(),
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
		});

		const host = document.querySelector<HTMLElement>('#textmode-ascii-overlay-control-panel-root');
		expect(host).not.toBeNull();
		expect(host?.dataset.textmodeAsciiExtensionUi).toBe('true');
		expect(host?.shadowRoot?.textContent).toContain('video selected');
		expect(document.body.textContent).not.toContain('video selected');

		act(() => panel.unmount());
		expect(document.querySelector('#textmode-ascii-overlay-control-panel-root')).toBeNull();
	});
});
