import { injectContentRuntime, sendMessageToTab } from '../../shared/browser/browser-api';
import { FRAME_RUNTIME_READY_PROBE, type RuntimeAck } from '../../shared/messaging/messages';

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
	let lastFailure = 'The frame runtime did not respond.';
	for (let attempt = 0; attempt < attempts; attempt++) {
		try {
			const response = await sendMessageToTab<RuntimeAck>(tabId, FRAME_RUNTIME_READY_PROBE);
			if (response?.ok === true) {
				return;
			}
			lastFailure = response?.error ?? 'The frame runtime returned an invalid readiness response.';
		} catch (error) {
			lastFailure = error instanceof Error ? error.message : String(error);
		}
		if (attempt + 1 < attempts) await delay(delayMs);
	}
	throw new Error(`Timed out while starting the page runtime. Last failure: ${lastFailure}`);
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}
