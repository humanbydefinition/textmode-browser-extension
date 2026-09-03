import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_FONT_ID, DEFAULT_OVERLAY_SETTINGS } from '@/domain/overlay/overlay-settings';
import { OverlaySettingsFormView } from '@/widgets/overlay-panel/overlay-settings-form-view';
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

	it('renders font arrow controls outside the label element', () => {
		const form = new OverlaySettingsFormView({
			settings: DEFAULT_OVERLAY_SETTINGS,
			portalContainer: document.body,
			onChange: vi.fn(),
			onExport: vi.fn(),
		});
		document.body.append(form.element);

		const fontField = Array.from(form.element.querySelectorAll('.tm-field')).find((field) =>
			field.querySelector('.tm-font-combobox__actions')
		);

		expect(fontField?.firstElementChild?.tagName).toBe('DIV');
		expect(fontField?.querySelector('.tm-font-combobox__actions')?.closest('label')).toBeNull();

		const fontRow = form.element.querySelector('.tm-main-font-row');
		const backgroundField = fontRow?.children.item(0);
		const fontFieldElement = fontRow?.children.item(1);
		expect(fontRow?.children).toHaveLength(2);
		expect(backgroundField?.textContent).toContain('background');
		expect(backgroundField?.querySelector('[aria-label="background color"]')).not.toBeNull();
		expect(fontFieldElement).toBe(fontField);

		fontField?.querySelector<HTMLButtonElement>('[role="combobox"]')?.click();
		expect(document.body.querySelector<HTMLElement>('.tm-font-combobox-popover')?.dataset.align).toBe('end');

		form.dispose();
		form.element.remove();
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
