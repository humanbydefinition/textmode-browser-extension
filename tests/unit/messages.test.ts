import { describe, expect, it } from 'vitest';
import { isRuntimeMessage } from '../../src/shared/messages';

describe('isRuntimeMessage', () => {
	it('accepts objects with a string type', () => {
		expect(isRuntimeMessage({ type: 'PING' })).toBe(true);
	});

	it('rejects missing or non-string types', () => {
		expect(isRuntimeMessage(null)).toBe(false);
		expect(isRuntimeMessage({})).toBe(false);
		expect(isRuntimeMessage({ type: 1 })).toBe(false);
	});
});
