import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OVERLAY_SETTINGS, type OverlayDescriptor } from '../../../src/domain/overlay/overlay-settings';
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
					onRemoveOverlay={vi.fn()}
				/>
			);
		});

		expect(host.textContent).toContain('no media selected.');
		expect(host.querySelector<HTMLButtonElement>('.tm-remove-button')?.disabled).toBe(true);
		expect(host.querySelector<HTMLAnchorElement>('.tm-built-with a')?.href).toBe('https://code.textmode.art/');
		expect(host.querySelector<HTMLAnchorElement>('.tm-support-link')?.href).toBe(
			'https://code.textmode.art/docs/support'
		);
		host.querySelector<HTMLButtonElement>('.tm-select-button')?.click();
		expect(onStartPicking).toHaveBeenCalledTimes(1);
	});

	it('renders every existing overlay setting and emits setting patches', () => {
		const onUpdateOverlay = vi.fn();
		const onRemoveOverlay = vi.fn();
		const overlay = createOverlay();

		act(() => {
			root.render(
				<OverlayPanelApp
					overlays={[overlay]}
					onStartPicking={vi.fn()}
					onUpdateOverlay={onUpdateOverlay}
					onRemoveOverlay={onRemoveOverlay}
				/>
			);
		});

		for (const label of ['overlay', 'opacity', 'font size', 'invert', 'characters', 'cells', 'glyph ramp']) {
			expect(host.textContent).toContain(label);
		}
		expect(host.querySelector('.tm-dimensions')?.textContent).toBe('320x180');
		expect(host.querySelector('.tm-overlay-card__title p')?.textContent).toBe(
			'canvas#demo-canvas.really-long-class'
		);
		expect(host.querySelector('.tm-status')).toBeNull();

		const overlayToggle = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
		expect(overlayToggle).not.toBeNull();
		act(() => {
			overlayToggle!.click();
		});

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { enabled: false });

		const removeButton = host.querySelector<HTMLButtonElement>('.tm-panel__footer .tm-remove-button');
		expect(removeButton?.disabled).toBe(false);
		expect(host.querySelector('.tm-overlay-card .tm-remove-button')).toBeNull();
		act(() => {
			removeButton?.click();
		});
		expect(onRemoveOverlay).toHaveBeenCalledWith('overlay-1');
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
