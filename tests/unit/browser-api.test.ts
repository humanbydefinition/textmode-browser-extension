import { describe, expect, it, vi } from 'vitest';
import {
	createContextMenuPort,
	createStorageLocalPort,
	resolveToolbarActionApi,
} from '../../src/shared/browser/browser-api';

describe('browser API adapter', () => {
	it('uses the MV3 action API when it is available', () => {
		const action = { onClicked: { addListener: vi.fn() } };
		const browserAction = { onClicked: { addListener: vi.fn() } };

		expect(resolveToolbarActionApi({ action, browserAction } as never)).toBe(action);
	});

	it('falls back to the MV2 browserAction API for Firefox MV2 builds', () => {
		const browserAction = { onClicked: { addListener: vi.fn() } };

		expect(resolveToolbarActionApi({ browserAction } as never)).toBe(browserAction);
	});

	it('throws a clear error if no toolbar action API exists', () => {
		expect(() => resolveToolbarActionApi({} as never)).toThrow('No browser toolbar action API is available.');
	});
});

describe('storage local adapter', () => {
	it('reads, writes, and removes typed storage records', async () => {
		const storage = {
			get: vi.fn(async (key: string) => ({ [key]: { saved: true } })),
			set: vi.fn(async () => undefined),
			remove: vi.fn(async () => undefined),
		};
		const port = createStorageLocalPort(storage as never);

		await expect(port.storageLocalGet<{ saved: boolean }>('preset')).resolves.toEqual({ saved: true });
		await expect(port.storageLocalGetAll()).resolves.toEqual({ null: { saved: true } });
		await port.storageLocalSet({ preset: { saved: false } });
		await port.storageLocalRemove('preset');

		expect(storage.get).toHaveBeenCalledWith('preset');
		expect(storage.get).toHaveBeenCalledWith(null);
		expect(storage.set).toHaveBeenCalledWith({ preset: { saved: false } });
		expect(storage.remove).toHaveBeenCalledWith('preset');
	});
});

describe('context menu adapter', () => {
	it('replaces the extension menu and listens for clicks', async () => {
		const contextMenus = {
			removeAll: vi.fn(async () => undefined),
			create: vi.fn(),
			onClicked: { addListener: vi.fn() },
		};
		const port = createContextMenuPort(contextMenus as never);
		const listener = vi.fn();

		await port.replaceContextMenu({
			id: 'textmode.apply-overlay',
			title: 'Apply Textmode Overlay',
			contexts: ['page', 'video'],
		});
		port.addContextMenuClickedListener(listener);

		expect(contextMenus.removeAll).toHaveBeenCalledOnce();
		expect(contextMenus.create).toHaveBeenCalledWith({
			id: 'textmode.apply-overlay',
			title: 'Apply Textmode Overlay',
			contexts: ['page', 'video'],
		});
		expect(contextMenus.onClicked.addListener).toHaveBeenCalledWith(listener);
	});

	it('is a no-op when a target browser does not expose context menus', async () => {
		const port = createContextMenuPort(undefined);

		await expect(
			port.replaceContextMenu({
				id: 'textmode.apply-overlay',
				title: 'Apply Textmode Overlay',
				contexts: ['page', 'video'],
			})
		).resolves.toBeUndefined();
		expect(() => port.addContextMenuClickedListener(vi.fn())).not.toThrow();
	});
});
