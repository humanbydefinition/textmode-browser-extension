import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS, type OverlayDescriptor } from '../../src/domain/overlay/overlay-settings';
import {
	createRuntimeActionHandler,
	type RuntimeActionDependencies,
} from '../../src/application/page-runtime/runtime-actions';

const overlays: OverlayDescriptor[] = [
	{
		id: 'overlay-1',
		elementKind: 'canvas',
		elementLabel: 'canvas#fixture',
		bounds: { x: 0, y: 0, width: 320, height: 180 },
		settings: DEFAULT_OVERLAY_SETTINGS,
		status: 'active',
	},
];

describe('createRuntimeActionHandler', () => {
	let deps: RuntimeActionDependencies;

	beforeEach(() => {
		deps = {
			toggleControlPanel: vi.fn(),
			startPicking: vi.fn(),
			listOverlays: vi.fn(() => overlays),
			updateOverlay: vi.fn(() => overlays),
			removeOverlay: vi.fn(() => []),
			pauseAll: vi.fn(() => overlays),
			resumeAll: vi.fn(() => overlays),
			removeAll: vi.fn(() => []),
			broadcastError: vi.fn(),
		};
	});

	it('delegates overlay updates to the overlay manager boundary', async () => {
		const handler = createRuntimeActionHandler(deps);

		const response = await handler.handle({
			type: 'UPDATE_OVERLAY',
			id: 'overlay-1',
			settings: { opacity: 0.5 },
		});

		expect(deps.updateOverlay).toHaveBeenCalledWith('overlay-1', { opacity: 0.5 });
		expect(response).toEqual({ ok: true, overlays });
	});

	it('starts picking through the picker boundary and returns current overlays', async () => {
		const handler = createRuntimeActionHandler(deps);

		const response = await handler.handle({ type: 'START_PICKING' });

		expect(deps.startPicking).toHaveBeenCalledTimes(1);
		expect(response).toEqual({ ok: true, overlays });
	});

	it('broadcasts user-readable errors without throwing', async () => {
		vi.mocked(deps.updateOverlay).mockImplementation(() => {
			throw new Error('Overlay overlay-1 no longer exists.');
		});
		const handler = createRuntimeActionHandler(deps);

		const response = await handler.handle({
			type: 'UPDATE_OVERLAY',
			id: 'overlay-1',
			settings: { opacity: 0.5 },
		});

		expect(deps.broadcastError).toHaveBeenCalledWith('Overlay overlay-1 no longer exists.');
		expect(response).toEqual({
			ok: false,
			error: 'Overlay overlay-1 no longer exists.',
			overlays,
		});
	});
});
