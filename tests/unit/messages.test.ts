import { describe, expect, it } from 'vitest';
import { isRuntimeMessage } from '../../src/shared/messaging/messages';

describe('isRuntimeMessage', () => {
	it('accepts supported messages with valid payloads', () => {
		expect(isRuntimeMessage({ type: 'PING' })).toBe(true);
		expect(isRuntimeMessage({ type: 'REMOVE_OVERLAY', id: 'overlay-1' })).toBe(true);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { fontSize: 16 } })).toBe(true);
	});

	it('rejects missing or non-string types', () => {
		expect(isRuntimeMessage(null)).toBe(false);
		expect(isRuntimeMessage({})).toBe(false);
		expect(isRuntimeMessage({ type: 1 })).toBe(false);
	});

	it('rejects unknown message types', () => {
		expect(isRuntimeMessage({ type: 'OPEN_PORTAL' })).toBe(false);
	});

	it('rejects malformed overlay mutation messages', () => {
		expect(isRuntimeMessage({ type: 'REMOVE_OVERLAY' })).toBe(false);
		expect(isRuntimeMessage({ type: 'REMOVE_OVERLAY', id: 1 })).toBe(false);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1' })).toBe(false);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: null })).toBe(false);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { enabled: 'yes' } })).toBe(false);
		expect(
			isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { charColorMode: 'rainbow' } })
		).toBe(false);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { mystery: true } })).toBe(false);
	});
});
