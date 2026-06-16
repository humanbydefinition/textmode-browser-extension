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
					onExportOverlay={vi.fn()}
					onRemoveOverlay={vi.fn()}
				/>
			);
		});

		expect(host.textContent).toContain('no media selected.');
		expect(host.querySelector('.tm-panel__title h1')?.getAttribute('aria-label')).toBe('textmode overlay');
		expect(
			[...host.querySelectorAll<HTMLSpanElement>('.tm-panel__title h1 > span')].map((span) =>
				span.textContent?.replace(/[^\x20-\x7e]/g, '')
			)
		).toEqual(['textmode', 'overlay']);
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

		for (const label of ['overlay', 'opacity', 'font size', 'invert', 'characters', 'cells', 'glyph ramp']) {
			expect(host.textContent).toContain(label);
		}
		expect(host.querySelector('details')).toBeNull();
		expect(host.textContent).not.toContain('advanced settings');
		expect([...host.querySelectorAll('[data-slot="tabs-trigger"]')].map((tab) => tab.textContent)).toEqual([
			'export',
			'advanced',
		]);
		expect(host.querySelector('.tm-dimensions')?.textContent).toBe('320x180');
		expect(host.querySelector('.tm-overlay-card__title p')?.textContent).toBe(
			'canvas#demo-canvas.really-long-class'
		);
		expect(host.querySelector('.tm-status')).toBeNull();
		expect(host.querySelector<HTMLButtonElement>('button[aria-label="characters color"]')?.disabled).toBe(false);
		expect(host.querySelector<HTMLButtonElement>('button[aria-label="cells color"]')?.disabled).toBe(false);
		expect(host.querySelector<HTMLDivElement>('.tm-color-mode-group')).not.toBeNull();

		const overlayToggle = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
		expect(overlayToggle).not.toBeNull();
		act(() => {
			overlayToggle!.click();
		});

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { enabled: false });

		const charactersFixedMode = host.querySelector<HTMLButtonElement>('button[aria-label="characters fixed"]');
		expect(charactersFixedMode).not.toBeNull();
		act(() => {
			charactersFixedMode!.click();
		});

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { charColorMode: 'fixed' });

		const exportTab = [...host.querySelectorAll<HTMLButtonElement>('[data-slot="tabs-trigger"]')].find(
			(tab) => tab.textContent === 'export'
		);
		expect(exportTab).not.toBeUndefined();
		act(() => {
			exportTab?.click();
		});

		for (const [label, format] of [
			['TXT', 'txt'],
			['SVG', 'svg'],
			['PNG', 'png'],
			['JPG', 'jpg'],
		] as const) {
			const button = host.querySelector<HTMLButtonElement>(`button[aria-label="export ${label}"]`);
			expect(button).not.toBeNull();
			act(() => {
				button?.click();
			});
			expect(onExportOverlay).toHaveBeenLastCalledWith('overlay-1', format);
		}

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
