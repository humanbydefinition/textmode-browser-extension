import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	APPLY_OVERLAY_CONTEXT_MENU_ID,
	APPLY_OVERLAY_CONTEXT_MENU_TITLE,
	ContextMenuController,
} from '../../src/application/background/context-menu-controller';
import type { ContextMenuClickedListener } from '../../src/shared/browser/browser-api';

describe('context menu controller', () => {
	let menuListener: ContextMenuClickedListener;
	const replaceMenu = vi.fn(async () => undefined);
	const ensureRuntime = vi.fn(async () => undefined);
	const sendToTab = vi.fn(async () => ({ ok: true }));

	function createController(): ContextMenuController {
		return new ContextMenuController({
			replaceMenu,
			addContextMenuListener: (listener) => {
				menuListener = listener;
			},
			ensureRuntime,
			sendToTab,
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('registers the command that opens the overlay', async () => {
		const controller = createController();
		await controller.install();

		expect(replaceMenu).toHaveBeenCalledWith({
			id: APPLY_OVERLAY_CONTEXT_MENU_ID,
			title: APPLY_OVERLAY_CONTEXT_MENU_TITLE,
			contexts: ['page', 'video'],
		});
	});

	it('opens the overlay after the context-menu invocation grants active-tab access', async () => {
		const controller = createController();
		controller.attach();
		menuListener({ menuItemId: APPLY_OVERLAY_CONTEXT_MENU_ID }, { id: 3 } as never);
		await vi.waitFor(() =>
			expect(sendToTab).toHaveBeenCalledWith(3, {
				type: 'TOGGLE_OVERLAY',
			})
		);
		expect(ensureRuntime).toHaveBeenCalledWith(3);
	});
});
