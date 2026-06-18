import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS, type OverlayDescriptor } from '../../../src/domain/overlay/overlay-settings';
import { getAdjacentGlyphRampPreset } from '../../../src/domain/overlay/glyph-ramp-registry';
import { OverlayPanelApp } from '../../../src/widgets/overlay-panel/OverlayPanelApp';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('OverlayPanelApp', () => {
	let host: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
		host = document.createElement('div');
		document.body.append(host);
		root = createRoot(host);
	});

	afterEach(() => {
		act(() => root.unmount());
		host.remove();
	});

	it('renders the empty state and starts picking', () => {
		const onStartPicking = vi.fn();

		act(() => {
			root.render(
				<OverlayPanelApp
					overlays={[]}
					onStartPicking={onStartPicking}
					onUpdateOverlay={vi.fn()}
					onExportOverlay={vi.fn()}
					onRemoveOverlay={vi.fn()}
				/>
			);
		});

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

		act(() => {
			root.render(
				<OverlayPanelApp
					overlays={[overlay]}
					onStartPicking={vi.fn()}
					onUpdateOverlay={onUpdateOverlay}
					onExportOverlay={onExportOverlay}
					onRemoveOverlay={onRemoveOverlay}
				/>
			);
		});

		expect(host.querySelector('.tm-overlay-card')).not.toBeNull();

		const overlayToggle = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
		expect(overlayToggle).not.toBeNull();
		act(() => {
			overlayToggle!.click();
		});

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { enabled: false });

		const exportButton = host.querySelector<HTMLButtonElement>('button[aria-label="export PNG"]');
		expect(exportButton).not.toBeNull();
		act(() => {
			exportButton!.click();
		});

		expect(onExportOverlay).toHaveBeenCalledWith('overlay-1', 'png');

		const removeButton = host.querySelector<HTMLButtonElement>('.tm-panel__footer .tm-remove-button');
		expect(removeButton?.disabled).toBe(false);
		act(() => {
			removeButton?.click();
		});
		expect(onRemoveOverlay).toHaveBeenCalledWith('overlay-1');
	});

	it('cycles glyph ramp presets from the advanced controls', () => {
		const onUpdateOverlay = vi.fn();
		const overlay = createOverlay();
		const expectedPreset = getAdjacentGlyphRampPreset(overlay.settings.fontId, overlay.settings.glyphRamp, 1);

		act(() => {
			root.render(
				<OverlayPanelApp
					overlays={[overlay]}
					onStartPicking={vi.fn()}
					onUpdateOverlay={onUpdateOverlay}
					onExportOverlay={vi.fn()}
					onRemoveOverlay={vi.fn()}
				/>
			);
		});

		expect(host.textContent).toContain('classic');

		const nextGlyphRampButton = host.querySelector<HTMLButtonElement>('button[aria-label="next glyph ramp"]');
		expect(nextGlyphRampButton).not.toBeNull();
		act(() => {
			nextGlyphRampButton!.click();
		});

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { glyphRamp: expectedPreset.glyphRamp });
	});
});

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

class MockResizeObserver {
	public observe = vi.fn();
	public unobserve = vi.fn();
	public disconnect = vi.fn();
}
