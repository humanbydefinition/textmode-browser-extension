import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	broadcastError,
	broadcastOverlayList,
	broadcastPickingCancelled,
	broadcastPickingStarted,
} from '../../src/application/page-runtime/page-state';
import { DEFAULT_OVERLAY_SETTINGS } from '../../src/domain/overlay/overlay-settings';
import { sendMessageToRuntime } from '../../src/shared/browser/browser-api';

vi.mock('../../src/shared/browser/browser-api', () => ({
	sendMessageToRuntime: vi.fn(),
}));

describe('page state broadcasts', () => {
	beforeEach(() => {
		vi.mocked(sendMessageToRuntime).mockReset();
	});

	it('ignores missing popup receivers for fire-and-forget broadcasts', async () => {
		vi.mocked(sendMessageToRuntime).mockRejectedValue(
			new Error('Could not establish connection. Receiving end does not exist.')
		);

		broadcastPickingStarted();
		await Promise.resolve();

		expect(sendMessageToRuntime).toHaveBeenCalledWith({ type: 'PICKING_STARTED' });
	});

	it('broadcasts content state messages to extension pages', async () => {
		vi.mocked(sendMessageToRuntime).mockResolvedValue(undefined);
		const overlays = [
			{
				id: 'overlay-1',
				elementKind: 'video' as const,
				elementLabel: 'video',
				bounds: { x: 0, y: 0, width: 10, height: 10 },
				settings: DEFAULT_OVERLAY_SETTINGS,
				status: 'active' as const,
			},
		];

		broadcastOverlayList(overlays);
		broadcastPickingCancelled();
		broadcastError('boom');

		expect(sendMessageToRuntime).toHaveBeenNthCalledWith(1, { type: 'OVERLAY_LIST_CHANGED', overlays });
		expect(sendMessageToRuntime).toHaveBeenNthCalledWith(2, { type: 'PICKING_CANCELLED' });
		expect(sendMessageToRuntime).toHaveBeenNthCalledWith(3, { type: 'ERROR', message: 'boom' });
	});
});
