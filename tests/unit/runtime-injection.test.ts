import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureContentRuntime } from '../../src/application/background/runtime-injection';
import { injectContentRuntime, sendMessageToTab } from '../../src/shared/browser/browser-api';

vi.mock('../../src/shared/browser/browser-api', () => ({
	injectContentRuntime: vi.fn(),
	sendMessageToTab: vi.fn(),
}));

describe('ensureContentRuntime', () => {
	beforeEach(() => {
		vi.mocked(injectContentRuntime).mockReset();
		vi.mocked(sendMessageToTab).mockReset();
	});

	it('injects the runtime and resolves once ping succeeds', async () => {
		vi.mocked(sendMessageToTab).mockRejectedValueOnce(new Error('not ready')).mockResolvedValueOnce({ ok: true });

		await ensureContentRuntime(42, { attempts: 3, delayMs: 0 });

		expect(injectContentRuntime).toHaveBeenCalledWith(42);
		expect(sendMessageToTab).toHaveBeenCalledWith(42, { type: 'PING' });
		expect(sendMessageToTab).toHaveBeenCalledTimes(2);
	});

	it('throws when the runtime never responds successfully', async () => {
		vi.mocked(sendMessageToTab).mockResolvedValue({ ok: false });

		await expect(ensureContentRuntime(42, { attempts: 2, delayMs: 0 })).rejects.toThrow(
			'Timed out while starting the page runtime.'
		);

		expect(injectContentRuntime).toHaveBeenCalledWith(42);
		expect(sendMessageToTab).toHaveBeenCalledTimes(2);
	});
});
