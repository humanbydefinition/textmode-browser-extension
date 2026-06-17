import { describe, expect, it } from 'vitest';
import { OVERLAY_SETTING_LIMITS } from '../../../src/domain/overlay/overlay-settings';
import { formatPercent, formatPixels, overlaySettingLimits } from '../../../src/widgets/overlay-panel/overlay-ui-model';

describe('overlay UI model', () => {
	it('reuses runtime overlay setting limits', () => {
		expect(overlaySettingLimits).toBe(OVERLAY_SETTING_LIMITS);
		expect(overlaySettingLimits.fontSize).toEqual({ min: 1, max: 64, step: 1 });
	});

	it('formats compact control values', () => {
		expect(formatPercent(0.75)).toBe('75%');
		expect(formatPixels(12)).toBe('12px');
	});
});
