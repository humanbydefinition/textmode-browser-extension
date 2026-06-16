import { injectContentRuntime, sendMessageToTab } from '../../shared/browser-api';
import type { RuntimeAck } from '../../shared/messages';

export interface EnsureContentRuntimeOptions {
	attempts?: number;
	delayMs?: number;
}

const DEFAULT_ATTEMPTS = 20;
const DEFAULT_DELAY_MS = 50;

export async function ensureContentRuntime(tabId: number, options: EnsureContentRuntimeOptions = {}): Promise<void> {
	const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
	const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;

	await injectContentRuntime(tabId);
	for (let attempt = 0; attempt < attempts; attempt++) {
		try {
			const response = await sendMessageToTab<RuntimeAck>(tabId, { type: 'PING' });
			if (response.ok) {
				return;
			}
		} catch {
			await delay(delayMs);
		}
	}
	throw new Error('Timed out while starting the page runtime.');
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}
