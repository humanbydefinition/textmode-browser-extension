import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	APPLY_OVERLAY_CONTEXT_MENU_ID,
	APPLY_OVERLAY_CONTEXT_MENU_TITLE,
	CONTEXT_TARGET_MAX_AGE_MS,
	ContextMenuController,
} from '../../src/application/background/context-menu-controller';
import type { ContextMenuClickedListener, RuntimeMessageListener } from '../../src/shared/browser/browser-api';

describe('context menu controller', () => {
	let runtimeListener: RuntimeMessageListener;
	let menuListener: ContextMenuClickedListener;
	let now = 10_000;
	const replaceMenu = vi.fn(async () => undefined);
	const ensureRuntime = vi.fn(async () => undefined);
	const sendToFrame = vi.fn(async () => ({ ok: true, runtimeId: 'runtime-7' }));
	const sendToTab = vi.fn(async () => ({ ok: true }));

	function createController(): ContextMenuController {
		return new ContextMenuController({
			now: () => now,
			replaceMenu,
			addContextMenuListener: (listener) => {
				menuListener = listener;
			},
			addRuntimeListener: (listener) => {
				runtimeListener = listener;
			},
			ensureRuntime,
			sendToFrame,
			sendToTab,
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
		now = 10_000;
	});

	it('registers the single direct-application item', async () => {
		const controller = createController();
		await controller.install();

		expect(replaceMenu).toHaveBeenCalledWith({
			id: APPLY_OVERLAY_CONTEXT_MENU_ID,
			title: APPLY_OVERLAY_CONTEXT_MENU_TITLE,
			contexts: ['page', 'video'],
		});
	});

	it('routes a captured target to the top frame after probing its owner frame', async () => {
		const controller = createController();
		controller.attach();
		const response = vi.fn();
		runtimeListener(
			{ type: 'CONTEXT_TARGET_CAPTURED', targetToken: 'context-1' },
			{ tab: { id: 3 }, frameId: 7 } as never,
			response
		);
		await vi.waitFor(() => expect(response).toHaveBeenCalledWith({ ok: true }));

		menuListener({ menuItemId: APPLY_OVERLAY_CONTEXT_MENU_ID, frameId: 7 }, { id: 3 } as never);
		await vi.waitFor(() =>
			expect(sendToTab).toHaveBeenCalledWith(3, {
				type: 'APPLY_CONTEXT_TARGET',
				frameId: 7,
				runtimeId: 'runtime-7',
				targetToken: 'context-1',
			})
		);
		expect(ensureRuntime).toHaveBeenCalledWith(3);
		expect(sendToFrame).toHaveBeenCalledWith(3, 7, { type: 'FRAME_PING' });
	});

	it('opens an explanatory panel message for stale or missing captures', async () => {
		const controller = createController();
		controller.attach();
		runtimeListener(
			{ type: 'CONTEXT_TARGET_CAPTURED', targetToken: 'context-1' },
			{ tab: { id: 3 }, frameId: 0 } as never,
			vi.fn()
		);
		await Promise.resolve();
		now += CONTEXT_TARGET_MAX_AGE_MS + 1;

		menuListener({ menuItemId: APPLY_OVERLAY_CONTEXT_MENU_ID, frameId: 0 }, { id: 3 } as never);
		await vi.waitFor(() =>
			expect(sendToTab).toHaveBeenCalledWith(3, {
				type: 'SHOW_CONTEXT_TARGET_ERROR',
				message: 'Right-click a visible canvas or video to apply a Textmode Overlay.',
			})
		);
	});
});
