import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopFrameCoordinator } from '../../src/application/page-runtime/top-frame-coordinator';
import { DEFAULT_OVERLAY_SETTINGS, type OverlayDescriptor } from '../../src/domain/overlay/overlay-settings';
import type { SitePresetStore } from '../../src/application/page-runtime/site-preset-store';
import type { PanelPlacementStore } from '../../src/application/page-runtime/panel-placement-store';
import { addRuntimeMessageListener, sendMessageToRuntime } from '../../src/shared/browser/browser-api';
import { broadcastOverlayList, broadcastPickingStarted } from '../../src/application/page-runtime/page-state';

vi.mock('../../src/shared/browser/browser-api', () => ({
	addRuntimeMessageListener: vi.fn(),
	sendMessageToRuntime: vi.fn(),
	storageLocalGet: vi.fn(),
	storageLocalSet: vi.fn(),
	storageLocalRemove: vi.fn(),
}));

vi.mock('../../src/shared/fonts/runtime-font-registry', () => ({
	initialize: vi.fn(async () => undefined),
	subscribe: vi.fn(() => vi.fn()),
	getFontAssetUrl: vi.fn(() => 'chrome-extension://test/font.ttf'),
	toCustomFontSummaries: vi.fn(() => []),
	addCustomFont: vi.fn(),
	removeCustomFont: vi.fn(),
}));

vi.mock('../../src/application/page-runtime/page-state', () => ({
	broadcastError: vi.fn(),
	broadcastOverlayList: vi.fn(),
	broadcastPickingCancelled: vi.fn(),
	broadcastPickingStarted: vi.fn(),
}));

describe('top frame coordinator', () => {
	let listener: Parameters<typeof addRuntimeMessageListener>[0];
	let presetStore: SitePresetStore;
	let placementStore: PanelPlacementStore;
	const pageUrl = new URL('https://example.test/watch');

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(addRuntimeMessageListener).mockImplementation((next) => {
			listener = next;
		});
		presetStore = {
			loadForUrl: vi.fn(async () => ({ ...DEFAULT_OVERLAY_SETTINGS, fontSize: 18 })),
			saveForUrl: vi.fn(async () => undefined),
			removeForUrl: vi.fn(async () => undefined),
		};
		placementStore = {
			loadForUrl: vi.fn(async () => null),
			saveForUrl: vi.fn(async () => undefined),
			removeForUrl: vi.fn(async () => undefined),
		};
	});

	it('coordinates a child-frame pick while keeping presets in the top-page store', async () => {
		const descriptor: OverlayDescriptor = {
			id: 'overlay-child',
			elementKind: 'video',
			elementLabel: 'video#player 640x360',
			bounds: { x: 0, y: 0, width: 640, height: 360 },
			settings: { ...DEFAULT_OVERLAY_SETTINGS, fontSize: 18 },
			status: 'active',
		};
		vi.mocked(sendMessageToRuntime).mockImplementation(async (message: unknown) => {
			if ((message as { type?: string }).type === 'PREPARE_FRAME_OVERLAY') {
				return { ok: true, overlays: [descriptor] };
			}
			return { ok: true };
		});
		new TopFrameCoordinator({ pageUrl, presetStore, panelPlacementStore: placementStore });
		const startResponse = vi.fn();
		listener({ type: 'START_PICKING' }, {}, startResponse);
		await vi.waitFor(() => expect(broadcastPickingStarted).toHaveBeenCalled());

		const beginRequest = vi
			.mocked(sendMessageToRuntime)
			.mock.calls.map(([message]) => message)
			.find((message) => (message as { type?: string }).type === 'BROADCAST_FRAME_COMMAND') as {
			command: { pickSessionId: string };
		};
		const frameResponse = vi.fn();
		listener(
			{
				type: 'ROUTED_FRAME_EVENT',
				frameId: 7,
				event: {
					type: 'FRAME_TARGET_PICKED',
					pickSessionId: beginRequest.command.pickSessionId,
					runtimeId: 'runtime-child',
					targetToken: 'target-child',
				},
			},
			{},
			frameResponse
		);

		await vi.waitFor(() =>
			expect(sendMessageToRuntime).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'PREPARE_FRAME_OVERLAY',
					frameId: 7,
					command: expect.objectContaining({
						type: 'FRAME_CREATE_OVERLAY',
						runtimeId: 'runtime-child',
						targetToken: 'target-child',
						settings: expect.objectContaining({ fontSize: 18 }),
					}),
				})
			)
		);
		await vi.waitFor(() => expect(presetStore.saveForUrl).toHaveBeenCalledWith(pageUrl, descriptor.settings));
		expect(broadcastOverlayList).toHaveBeenLastCalledWith(
			[expect.objectContaining({ elementLabel: expect.stringContaining('— iframe') })],
			[]
		);
	});

	it('applies a context target with the saved preset and keeps the editor open', async () => {
		const descriptor: OverlayDescriptor = {
			id: 'overlay-context',
			elementKind: 'canvas',
			elementLabel: 'canvas#direct 640x360',
			bounds: { x: 0, y: 0, width: 640, height: 360 },
			settings: { ...DEFAULT_OVERLAY_SETTINGS, fontSize: 18 },
			status: 'active',
		};
		vi.mocked(sendMessageToRuntime).mockImplementation(async (message: unknown) => {
			if ((message as { type?: string }).type === 'PREPARE_FRAME_OVERLAY') {
				return { ok: true, overlays: [descriptor] };
			}
			return { ok: true };
		});
		new TopFrameCoordinator({ pageUrl, presetStore, panelPlacementStore: placementStore });
		const response = vi.fn();

		listener(
			{
				type: 'APPLY_CONTEXT_TARGET',
				frameId: 4,
				runtimeId: 'runtime-frame-4',
				targetToken: 'context-target-1',
			},
			{},
			response
		);

		await vi.waitFor(() =>
			expect(sendMessageToRuntime).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'PREPARE_FRAME_OVERLAY',
					frameId: 4,
					command: expect.objectContaining({
						targetToken: 'context-target-1',
						runtimeId: 'runtime-frame-4',
						settings: expect.objectContaining({ fontSize: 18 }),
					}),
				})
			)
		);
		await vi.waitFor(() => expect(response).toHaveBeenCalledWith(expect.objectContaining({ ok: true })));
		expect(document.querySelector('#textmode-ascii-overlay-control-panel-root')).not.toBeNull();
		expect(presetStore.saveForUrl).toHaveBeenCalledWith(pageUrl, descriptor.settings);
	});
});
