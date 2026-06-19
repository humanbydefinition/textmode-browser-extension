import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS, type OverlayDescriptor } from '../../../src/domain/overlay/overlay-settings';
import { getAdjacentGlyphRampPreset } from '../../../src/domain/overlay/glyph-ramp-registry';
import { OverlayPanelView } from '../../../src/widgets/overlay-panel/overlay-panel-view';

describe('OverlayPanelView', () => {
	let host: HTMLDivElement;
	let portalRoot: HTMLDivElement;

	beforeEach(() => {
		host = document.createElement('div');
		portalRoot = document.createElement('div');
		document.body.append(host, portalRoot);
	});

	afterEach(() => {
		host.remove();
		portalRoot.remove();
	});

	it('renders the empty state and starts picking', () => {
		const onStartPicking = vi.fn();
		const view = createView({ onStartPicking });
		view.update([]);
		host.append(view.element);

		expect(host.querySelector('.tm-empty-state')).not.toBeNull();
		expect(host.querySelector('.tm-overlay-card')).toBeNull();
		expect(host.querySelector<HTMLButtonElement>('.tm-remove-button')?.disabled).toBe(true);
		host.querySelector<HTMLButtonElement>('.tm-select-button')?.click();
		expect(onStartPicking).toHaveBeenCalledTimes(1);
	});

	it('wires overlay actions to the active overlay', () => {
		const onUpdateOverlay = vi.fn();
		const onExportOverlay = vi.fn();
		const onRemoveOverlay = vi.fn();
		const overlay = createOverlay();
		const view = createView({ onUpdateOverlay, onExportOverlay, onRemoveOverlay });
		view.update([overlay]);
		host.append(view.element);

		expect(host.querySelector('.tm-overlay-card')).not.toBeNull();

		const overlayToggle = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
		expect(overlayToggle).not.toBeNull();
		overlayToggle!.click();

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { enabled: false });

		const exportButton = host.querySelector<HTMLButtonElement>('button[aria-label="export PNG"]');
		expect(exportButton).not.toBeNull();
		exportButton!.click();

		expect(onExportOverlay).toHaveBeenCalledWith('overlay-1', 'png');

		const removeButton = host.querySelector<HTMLButtonElement>('.tm-panel__footer .tm-remove-button');
		expect(removeButton?.disabled).toBe(false);
		removeButton?.click();
		expect(onRemoveOverlay).toHaveBeenCalledWith('overlay-1');
	});

	it('cycles glyph ramp presets from the advanced controls', () => {
		const onUpdateOverlay = vi.fn();
		const overlay = createOverlay();
		const expectedPreset = getAdjacentGlyphRampPreset(overlay.settings.fontId, overlay.settings.glyphRamp, 1);
		const view = createView({ onUpdateOverlay });
		view.update([overlay]);
		host.append(view.element);

		expect(host.textContent).toContain('classic');

		const nextGlyphRampButton = host.querySelector<HTMLButtonElement>('button[aria-label="next glyph ramp"]');
		expect(nextGlyphRampButton).not.toBeNull();
		nextGlyphRampButton!.click();

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { glyphRamp: expectedPreset.glyphRamp });
	});
});

function createView(overrides: Partial<ConstructorParameters<typeof OverlayPanelView>[0]> = {}): OverlayPanelView {
	return new OverlayPanelView({
		portalContainer: document.querySelector<HTMLDivElement>('body > div:last-child')!,
		onStartPicking: vi.fn(),
		onUpdateOverlay: vi.fn(),
		onExportOverlay: vi.fn(),
		onRemoveOverlay: vi.fn(),
		...overrides,
	});
}

function createOverlay(): OverlayDescriptor {
	return {
		id: 'overlay-1',
		elementKind: 'canvas',
		elementLabel: 'canvas#demo-canvas.really-long-class 320x180',
		bounds: { x: 0, y: 0, width: 320, height: 180 },
		settings: DEFAULT_OVERLAY_SETTINGS,
		status: 'active',
	};
}
