import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attachFrameRouterListener } from '../../src/application/background/frame-router';
import {
	addRuntimeMessageListener,
	broadcastMessageToTab,
	injectContentRuntime,
	injectOverlayHost,
	sendMessageToFrame,
} from '../../src/shared/browser/browser-api';

vi.mock('../../src/shared/browser/browser-api', () => ({
	addRuntimeMessageListener: vi.fn(),
	broadcastMessageToTab: vi.fn(async () => undefined),
	injectContentRuntime: vi.fn(async () => undefined),
	injectOverlayHost: vi.fn(async () => undefined),
	sendMessageToFrame: vi.fn(async () => ({ ok: true, overlays: [] })),
}));

describe('frame router', () => {
	let listener: Parameters<typeof addRuntimeMessageListener>[0];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(addRuntimeMessageListener).mockImplementation((next) => {
			listener = next;
		});
		attachFrameRouterListener();
	});

	it('injects frame agents for the sender tab', async () => {
		const response = vi.fn();
		listener({ type: 'ENSURE_FRAME_AGENTS' }, { tab: { id: 17 }, frameId: 0 } as never, response);
		await vi.waitFor(() => expect(response).toHaveBeenCalledWith({ ok: true }));
		expect(injectContentRuntime).toHaveBeenCalledWith(17);
	});

	it('injects the heavy host and routes creation to the selected frame', async () => {
		const response = vi.fn();
		const command = {
			type: 'FRAME_CREATE_OVERLAY' as const,
			runtimeId: 'runtime-4',
			targetToken: 'target-4',
			overlayId: 'overlay-4',
			settings: {},
		};
		listener(
			{ type: 'PREPARE_FRAME_OVERLAY', frameId: 4, command },
			{ tab: { id: 17 }, frameId: 0 } as never,
			response
		);

		await vi.waitFor(() => expect(response).toHaveBeenCalledWith({ ok: true, overlays: [] }));
		expect(injectOverlayHost).toHaveBeenCalledWith(17, 4);
		expect(sendMessageToFrame).toHaveBeenCalledWith(17, 4, command);
	});

	it('decorates child events with sender frame metadata and forwards them only to frame zero', async () => {
		const response = vi.fn();
		const event = { type: 'FRAME_DISPOSING' as const, runtimeId: 'runtime-9' };
		listener({ type: 'FRAME_EVENT', event }, { tab: { id: 17 }, frameId: 9 } as never, response);

		await vi.waitFor(() => expect(response).toHaveBeenCalledWith({ ok: true }));
		expect(sendMessageToFrame).toHaveBeenCalledWith(17, 0, {
			type: 'ROUTED_FRAME_EVENT',
			frameId: 9,
			event,
		});
		expect(broadcastMessageToTab).not.toHaveBeenCalled();
	});
});
