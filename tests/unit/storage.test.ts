import { describe, expect, it } from 'vitest';
import { getOriginDefaultsKey } from '../../src/shared/storage';

describe('getOriginDefaultsKey', () => {
	it('namespaces origin defaults', () => {
		expect(getOriginDefaultsKey('https://example.com')).toBe('origin-defaults:https://example.com');
	});
});
