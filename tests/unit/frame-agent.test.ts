import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameAgent } from '../../src/application/frame-runtime/frame-agent';
import { addRuntimeMessageListener, sendMessageToRuntime } from '../../src/shared/browser/browser-api';
import { mockRect } from './test-helpers';

vi.mock('../../src/shared/browser/browser-api', () => ({
	addRuntimeMessageListener: vi.fn(),
	sendMessageToRuntime: vi.fn(async () => ({ ok: true })),
}));

describe('frame agent', () => {
	let listener: Parameters<typeof addRuntimeMessageListener>[0];

	beforeEach(() => {
		document.body.replaceChildren();
		vi.clearAllMocks();
		vi.mocked(addRuntimeMessageListener).mockImplementation((next) => {
			listener = next;
		});
	});

	it('starts a frame-local picker and reports the selected target', async () => {
		const canvas = document.createElement('canvas');
		mockRect(canvas, { width: 320, height: 180 });
		document.body.append(canvas);
		document.elementsFromPoint = vi.fn(() => [canvas]);
		const agent = new FrameAgent();
		const response = vi.fn();

		listener({ type: 'FRAME_BEGIN_PICKING', pickSessionId: 'pick-1' }, {}, response);
		await vi.waitFor(() => expect(response).toHaveBeenCalledWith({ ok: true }));
		canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));

		await vi.waitFor(() =>
			expect(sendMessageToRuntime).toHaveBeenCalledWith({
				type: 'FRAME_EVENT',
				event: expect.objectContaining({
					type: 'FRAME_TARGET_PICKED',
					pickSessionId: 'pick-1',
					runtimeId: agent.runtimeId,
					targetToken: expect.any(String),
				}),
			})
		);
		const picked = vi
			.mocked(sendMessageToRuntime)
			.mock.calls.map(([message]) => message)
			.find((message) => message.type === 'FRAME_EVENT' && message.event.type === 'FRAME_TARGET_PICKED');
		if (!picked || picked.type !== 'FRAME_EVENT' || picked.event.type !== 'FRAME_TARGET_PICKED')
			throw new Error('Missing selected target');
		const repeated = vi.fn();
		listener({ type: 'FRAME_BEGIN_PICKING', pickSessionId: 'pick-1' }, {}, repeated);
		await vi.waitFor(() => expect(repeated).toHaveBeenCalledWith({ ok: true }));
		expect(document.querySelector('.textmode-ascii-overlay-picker')).toBeNull();
		expect(agent.consumePendingTarget(picked.event.targetToken)).toBe(canvas);
	});

	it('rejects commands addressed to a previous document runtime', async () => {
		const agent = new FrameAgent();
		const response = vi.fn();
		listener({ type: 'FRAME_REMOVE_ALL', runtimeId: 'stale-runtime' }, {}, response);

		await vi.waitFor(() =>
			expect(response).toHaveBeenCalledWith({
				ok: false,
				error: 'The target iframe navigated and is no longer available.',
				errorCategory: 'stale-runtime',
			})
		);
		expect(agent.runtimeId).not.toBe('stale-runtime');
	});

	it('rescans targets when the active selection session is refreshed', async () => {
		const video = document.createElement('video');
		mockRect(video, { width: 320, height: 180 });
		document.body.append(video);
		const agent = new FrameAgent();
		const start = vi.fn();
		listener({ type: 'FRAME_BEGIN_PICKING', pickSessionId: 'refresh' }, {}, start);
		await vi.waitFor(() => expect(start).toHaveBeenCalledWith({ ok: true }));
		Object.defineProperty(video, 'readyState', { value: video.HAVE_CURRENT_DATA, configurable: true });
		Object.defineProperty(video, 'videoWidth', { value: 320, configurable: true });
		Object.defineProperty(video, 'videoHeight', { value: 180, configurable: true });
		const refresh = vi.fn();
		listener({ type: 'FRAME_BEGIN_PICKING', pickSessionId: 'refresh' }, {}, refresh);
		await vi.waitFor(() => expect(refresh).toHaveBeenCalledWith({ ok: true }));
		expect(sendMessageToRuntime).toHaveBeenCalledWith({
			type: 'FRAME_EVENT',
			event: expect.objectContaining({
				type: 'FRAME_PICKER_TARGETS',
				runtimeId: agent.runtimeId,
				targets: [
					expect.objectContaining({
						availability: 'ready',
						label: 'video',
						dimensions: '320x180',
					}),
				],
			}),
		});
		listener({ type: 'FRAME_END_PICKING', pickSessionId: 'refresh' }, {}, vi.fn());
	});

	it('acknowledges the readiness probe used by toolbar startup', async () => {
		const agent = new FrameAgent();
		const response = vi.fn();
		listener({ type: 'FRAME_PING' }, {}, response);

		await vi.waitFor(() => expect(response).toHaveBeenCalledWith({ ok: true, runtimeId: agent.runtimeId }));
	});
});
