import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_FONT_ID, DEFAULT_OVERLAY_SETTINGS } from '@/domain/overlay/overlay-settings';
import { createExportGrid } from '@/widgets/overlay-panel/settings/export-grid-view';
import { GlyphRampFieldView } from '@/widgets/overlay-panel/settings/glyph-ramp-field-view';
import { RangeFieldView } from '@/widgets/overlay-panel/settings/range-field-view';

describe('settings field views', () => {
	it('renders formatted range output and forwards slider changes', () => {
		const onChange = vi.fn();
		const field = new RangeFieldView({
			label: 'opacity',
			value: 0.5,
			limits: { min: 0, max: 1, step: 0.25 },
			format: (value) => `${value * 100}%`,
			onChange,
		});
		document.body.append(field.element);

		expect(field.element.textContent).toContain('50%');
		field.element
			.querySelector<HTMLElement>('[data-slot="slider-thumb"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

		expect(onChange).toHaveBeenCalledWith(0.75);
		field.element.remove();
	});

	it('keeps glyph ramp input text and preset navigation wired', () => {
		const onChange = vi.fn();
		const field = new GlyphRampFieldView({
			fontId: DEFAULT_FONT_ID,
			value: DEFAULT_OVERLAY_SETTINGS.glyphRamp,
			onChange,
		});
		document.body.append(field.element);

		expect(field.element.textContent).toContain('classic');
		field.element.querySelector<HTMLButtonElement>('button[aria-label="next glyph ramp"]')?.click();

		expect(onChange).toHaveBeenCalledWith(expect.any(String));
		field.element.remove();
	});

	it('renders export buttons with fixed format callbacks', () => {
		const onExport = vi.fn();
		const grid = createExportGrid(onExport);
		document.body.append(grid);

		grid.querySelector<HTMLButtonElement>('button[aria-label="export SVG"]')?.click();

		expect(onExport).toHaveBeenCalledWith('svg');
		grid.remove();
	});
});
