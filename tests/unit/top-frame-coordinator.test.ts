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

const setNoticeSpy = vi.fn();
const panelEvents: string[] = [];

vi.mock('../../src/widgets/overlay-panel/control-panel', () => ({
	ControlPanel: class {
		mount() {}
		unmount() {}
		updateState(overlays: OverlayDescriptor[]) {
			panelEvents.push(
				`state:${overlays.length}:${Boolean(document.querySelector('[data-textmode-picker-list]'))}`
			);
		}
		updatePickingState(picking: boolean) {
			panelEvents.push(`picking:${picking}:${Boolean(document.querySelector('[data-textmode-picker-list]'))}`);
		}
		setNotice(message: string | undefined) {
			setNoticeSpy(message);
		}
		focusPanel() {}
		isViewportFocused() {
			return false;
		}
		getPickerMount() {
			return document.documentElement;
		}
	},
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
		panelEvents.length = 0;
		document.querySelectorAll('[data-textmode-picker-list]').forEach((node) => node.remove());
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

	it('starts discovery without direct selection and enables it on request', async () => {
		vi.mocked(sendMessageToRuntime).mockResolvedValue({ ok: true });
		new TopFrameCoordinator({ pageUrl, presetStore, panelPlacementStore: placementStore });
		const opened = vi.fn();
		listener({ type: 'TOGGLE_OVERLAY' }, {}, opened);
		await vi.waitFor(() => expect(opened).toHaveBeenCalledWith({ ok: true, overlays: [] }));
		const passive = vi
			.mocked(sendMessageToRuntime)
			.mock.calls.map(
				([message]) =>
					message as { type: string; command?: { type: string; pickSessionId: string; direct: boolean } }
			)
			.find((message) => message.command?.type === 'FRAME_BEGIN_PICKING' && message.command.direct === false);
		expect(passive).toBeDefined();
		const selected = vi.fn();
		listener({ type: 'START_PICKING' }, {}, selected);
		await vi.waitFor(() => expect(selected).toHaveBeenCalledWith({ ok: true, overlays: [] }));
		expect(sendMessageToRuntime).toHaveBeenCalledWith({
			type: 'BROADCAST_FRAME_COMMAND',
			command: { type: 'FRAME_BEGIN_PICKING', pickSessionId: passive!.command!.pickSessionId, direct: true },
		});
		const closed = vi.fn();
		listener({ type: 'TOGGLE_OVERLAY' }, {}, closed);
		await vi.waitFor(() => expect(closed).toHaveBeenCalled());
	});

	it('coordinates a child-frame pick while keeping presets in the top-page store', async () => {
		const descriptor: OverlayDescriptor = {
			id: 'overlay-child',
			elementLabel: 'video#player 640x360',
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
	it('keeps the owner after failed commands and can remove the same overlay', async () => {
		const descriptor: OverlayDescriptor = {
			id: 'overlay-1',
			elementLabel: 'canvas',
			settings: DEFAULT_OVERLAY_SETTINGS,
			status: 'active',
		};
		let transportFailure = false;
		let staleRuntime = false;
		const failures = new Set([
			'FRAME_UPDATE_OVERLAY',
			'FRAME_EXPORT_OVERLAY',
			'FRAME_REMOVE_OVERLAY',
			'FRAME_PAUSE_ALL',
			'FRAME_RESUME_ALL',
		]);
		vi.mocked(sendMessageToRuntime).mockImplementation(async (message: unknown) => {
			const request = message as { type: string; command?: { type: string } };
			if (request.type === 'PREPARE_FRAME_OVERLAY') return { ok: true, overlays: [descriptor] };
			if (request.type === 'SEND_FRAME_COMMAND' && staleRuntime)
				return { ok: false, error: 'Frame navigated', errorCategory: 'stale-runtime' };
			if (request.type === 'SEND_FRAME_COMMAND' && transportFailure)
				return { ok: false, error: 'Disconnected', errorCategory: 'transport' };
			if (request.type === 'SEND_FRAME_COMMAND' && request.command && failures.delete(request.command.type)) {
				return { ok: false, error: 'Operation failed', errorCategory: 'operation', overlays: [descriptor] };
			}
			if (request.type === 'SEND_FRAME_COMMAND' && request.command?.type === 'FRAME_REMOVE_OVERLAY')
				return { ok: true, overlays: [] };
			return { ok: true };
		});
		new TopFrameCoordinator({ pageUrl, presetStore, panelPlacementStore: placementStore });
		const started = vi.fn();
		listener({ type: 'START_PICKING' }, {}, started);
		await vi.waitFor(() => expect(started).toHaveBeenCalled());
		const begin = vi
			.mocked(sendMessageToRuntime)
			.mock.calls.map(([message]) => message as { type: string; command?: { pickSessionId: string } })
			.find((message) => message.type === 'BROADCAST_FRAME_COMMAND' && message.command?.pickSessionId)!;
		listener(
			{
				type: 'ROUTED_FRAME_EVENT',
				frameId: 0,
				event: {
					type: 'FRAME_TARGET_PICKED',
					pickSessionId: begin.command!.pickSessionId,
					runtimeId: 'runtime',
					targetToken: 'target',
				},
			},
			{},
			vi.fn()
		);
		await vi.waitFor(() => expect(presetStore.saveForUrl).toHaveBeenCalled());
		for (const command of [
			{ type: 'UPDATE_OVERLAY', id: descriptor.id, settings: { opacity: 0.5 } },
			{ type: 'EXPORT_OVERLAY', id: descriptor.id, format: 'svg' },
			{ type: 'PAUSE_ALL' },
			{ type: 'RESUME_ALL' },
			{ type: 'REMOVE_OVERLAY', id: descriptor.id },
		]) {
			const failed = vi.fn();
			listener(command, {}, failed);
			await vi.waitFor(() =>
				expect(failed).toHaveBeenCalledWith(expect.objectContaining({ ok: false, overlays: [descriptor] }))
			);
		}

		transportFailure = true;
		const disconnected = vi.fn();
		listener({ type: 'EXPORT_OVERLAY', id: descriptor.id, format: 'svg' }, {}, disconnected);
		await vi.waitFor(() =>
			expect(disconnected).toHaveBeenCalledWith(expect.objectContaining({ ok: false, overlays: [descriptor] }))
		);
		transportFailure = false;
		const newer = { ...descriptor, settings: { ...descriptor.settings, opacity: 0.75 } };
		listener(
			{
				type: 'ROUTED_FRAME_EVENT',
				frameId: 0,
				event: { type: 'FRAME_OVERLAY_STATE', runtimeId: 'runtime', revision: 2, overlays: [newer] },
			},
			{},
			vi.fn()
		);
		listener(
			{
				type: 'ROUTED_FRAME_EVENT',
				frameId: 0,
				event: { type: 'FRAME_OVERLAY_STATE', runtimeId: 'runtime', revision: 1, overlays: [descriptor] },
			},
			{},
			vi.fn()
		);
		const state = vi.fn();
		listener({ type: 'LIST_OVERLAYS' }, {}, state);
		await vi.waitFor(() => expect(state).toHaveBeenCalledWith({ ok: true, overlays: [newer] }));
		const removed = vi.fn();
		listener({ type: 'REMOVE_OVERLAY', id: descriptor.id }, {}, removed);
		await vi.waitFor(() => expect(removed).toHaveBeenCalledWith({ ok: true, overlays: [] }));
		const restarted = vi.fn();
		listener({ type: 'START_PICKING' }, {}, restarted);
		await vi.waitFor(() => expect(restarted).toHaveBeenCalled());
		const next = vi
			.mocked(sendMessageToRuntime)
			.mock.calls.map(
				([message]) => message as { type: string; command?: { type: string; pickSessionId?: string } }
			)
			.filter(
				(message) =>
					message.type === 'BROADCAST_FRAME_COMMAND' && message.command?.type === 'FRAME_BEGIN_PICKING'
			)
			.at(-1)!;
		listener(
			{
				type: 'ROUTED_FRAME_EVENT',
				frameId: 0,
				event: {
					type: 'FRAME_TARGET_PICKED',
					pickSessionId: next.command!.pickSessionId,
					runtimeId: 'runtime-2',
					targetToken: 'target-2',
				},
			},
			{},
			vi.fn()
		);
		await vi.waitFor(() => expect(presetStore.saveForUrl).toHaveBeenCalledTimes(2));
		staleRuntime = true;
		const stale = vi.fn();
		listener({ type: 'EXPORT_OVERLAY', id: descriptor.id, format: 'svg' }, {}, stale);
		await vi.waitFor(() =>
			expect(stale).toHaveBeenCalledWith(expect.objectContaining({ ok: false, overlays: [] }))
		);
	});

	it('preserves target errors in passive picker and clears them when selecting or starting direct picking', async () => {
		const descriptor: OverlayDescriptor = {
			id: 'overlay-2',
			elementLabel: 'canvas',
			settings: DEFAULT_OVERLAY_SETTINGS,
			status: 'active',
		};
		let failCreate = true;
		vi.mocked(sendMessageToRuntime).mockImplementation(async (message: unknown) => {
			const request = message as { type: string; command?: { type: string } };
			if (request.type === 'PREPARE_FRAME_OVERLAY') {
				return failCreate
					? { ok: false, error: 'Cross-origin video blocked.' }
					: { ok: true, overlays: [descriptor] };
			}
			if (request.type === 'SEND_FRAME_COMMAND' && request.command?.type === 'FRAME_REMOVE_OVERLAY') {
				return { ok: true, overlays: [] };
			}
			return { ok: true };
		});

		new TopFrameCoordinator({ pageUrl, presetStore, panelPlacementStore: placementStore });
		const opened = vi.fn();
		listener({ type: 'TOGGLE_OVERLAY' }, {}, opened);
		await vi.waitFor(() => expect(opened).toHaveBeenCalledWith({ ok: true, overlays: [] }));

		const pickSessions = () =>
			vi
				.mocked(sendMessageToRuntime)
				.mock.calls.map(([msg]) => msg as { type: string; command?: { type: string; pickSessionId?: string } })
				.filter((msg) => msg.type === 'BROADCAST_FRAME_COMMAND' && msg.command?.type === 'FRAME_BEGIN_PICKING')
				.map((msg) => msg.command!.pickSessionId!);

		await vi.waitFor(() => expect(pickSessions().length).toBeGreaterThan(0));
		const firstSession = pickSessions().at(-1)!;
		setNoticeSpy.mockClear();

		listener(
			{
				type: 'ROUTED_FRAME_EVENT',
				frameId: 0,
				event: {
					type: 'FRAME_TARGET_PICKED',
					pickSessionId: firstSession,
					runtimeId: 'runtime-1',
					targetToken: 'tainted-video',
				},
			},
			{},
			vi.fn()
		);

		await vi.waitFor(() => expect(setNoticeSpy).toHaveBeenCalledWith('Cross-origin video blocked.'));
		await vi.waitFor(() => expect(pickSessions().length).toBeGreaterThan(1));
		expect(setNoticeSpy.mock.calls.at(-1)?.[0]).toBe('Cross-origin video blocked.');

		failCreate = false;
		const secondSession = pickSessions().at(-1)!;
		listener(
			{
				type: 'ROUTED_FRAME_EVENT',
				frameId: 0,
				event: {
					type: 'FRAME_TARGET_PICKED',
					pickSessionId: secondSession,
					runtimeId: 'runtime-1',
					targetToken: 'clean-canvas',
				},
			},
			{},
			vi.fn()
		);

		await vi.waitFor(() => expect(setNoticeSpy.mock.calls.at(-1)?.[0]).toBeUndefined());

		listener({ type: 'REMOVE_OVERLAY', id: descriptor.id }, {}, vi.fn());
		await vi.waitFor(() => expect(pickSessions().length).toBeGreaterThan(2));

		setNoticeSpy.mockClear();
		const startedDirect = vi.fn();
		listener({ type: 'START_PICKING' }, {}, startedDirect);
		await vi.waitFor(() => expect(startedDirect).toHaveBeenCalled());
		expect(setNoticeSpy).toHaveBeenCalledWith(undefined);
	});

	it('keeps picker list mounted until overlay state syncs and mounts picker immediately when returning', async () => {
		const descriptor: OverlayDescriptor = {
			id: 'overlay-3',
			elementLabel: 'canvas',
			settings: DEFAULT_OVERLAY_SETTINGS,
			status: 'active',
		};
		let resolvePrepare: ((value: { ok: boolean; overlays?: OverlayDescriptor[] }) => void) | undefined;
		let resolveEnsureAgents: ((value: { ok: boolean }) => void) | undefined;
		let holdEnsureAgents = false;

		vi.mocked(sendMessageToRuntime).mockImplementation((message: unknown) => {
			const request = message as { type: string; command?: { type: string } };
			if (request.type === 'PREPARE_FRAME_OVERLAY') {
				return new Promise((resolve) => {
					resolvePrepare = resolve;
				});
			}
			if (request.type === 'SEND_FRAME_COMMAND' && request.command?.type === 'FRAME_REMOVE_OVERLAY') {
				return Promise.resolve({ ok: true, overlays: [] });
			}
			if (request.type === 'ENSURE_FRAME_AGENTS' && holdEnsureAgents) {
				return new Promise((resolve) => {
					resolveEnsureAgents = resolve;
				});
			}
			return Promise.resolve({ ok: true });
		});

		new TopFrameCoordinator({ pageUrl, presetStore, panelPlacementStore: placementStore });
		const opened = vi.fn();
		listener({ type: 'TOGGLE_OVERLAY' }, {}, opened);
		await vi.waitFor(() => expect(opened).toHaveBeenCalledWith({ ok: true, overlays: [] }));

		const pickSessionCall = () =>
			vi
				.mocked(sendMessageToRuntime)
				.mock.calls.map(([msg]) => msg as { type: string; command?: { type: string; pickSessionId?: string } })
				.find((msg) => msg.type === 'BROADCAST_FRAME_COMMAND' && msg.command?.type === 'FRAME_BEGIN_PICKING');

		await vi.waitFor(() => expect(pickSessionCall()).toBeDefined());
		const pickSessionId = pickSessionCall()!.command!.pickSessionId!;
		expect(document.querySelector('[data-textmode-picker-list]')).not.toBeNull();

		panelEvents.length = 0;
		listener(
			{
				type: 'ROUTED_FRAME_EVENT',
				frameId: 0,
				event: {
					type: 'FRAME_TARGET_PICKED',
					pickSessionId,
					runtimeId: 'runtime-1',
					targetToken: 'canvas-1',
				},
			},
			{},
			vi.fn()
		);

		await vi.waitFor(() => expect(resolvePrepare).toBeDefined());
		// Picker list must remain mounted while overlay creation IPC is still in flight.
		expect(document.querySelector('[data-textmode-picker-list]')).not.toBeNull();
		expect(panelEvents.some((event) => event.startsWith('state:1:'))).toBe(false);

		resolvePrepare!({ ok: true, overlays: [descriptor] });
		await vi.waitFor(() => expect(document.querySelector('[data-textmode-picker-list]')).toBeNull());
		expect(panelEvents).toEqual(expect.arrayContaining(['picking:false:true', 'state:1:true']));

		// Remove overlay -> transition back to select media must mount picker list before ENSURE_FRAME_AGENTS finishes.
		holdEnsureAgents = true;
		listener({ type: 'REMOVE_OVERLAY', id: descriptor.id }, {}, vi.fn());
		await vi.waitFor(() => expect(resolveEnsureAgents).toBeDefined());
		expect(document.querySelector('[data-textmode-picker-list]')).not.toBeNull();

		resolveEnsureAgents!({ ok: true });
		await vi.waitFor(() =>
			expect(
				vi
					.mocked(sendMessageToRuntime)
					.mock.calls.filter(
						([msg]) =>
							(msg as { type: string; command?: { type: string } }).type === 'BROADCAST_FRAME_COMMAND' &&
							(msg as { type: string; command?: { type: string } }).command?.type ===
								'FRAME_BEGIN_PICKING'
					).length
			).toBeGreaterThan(1)
		);
	});
});
