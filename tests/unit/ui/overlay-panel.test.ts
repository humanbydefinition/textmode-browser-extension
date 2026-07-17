import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_FONT_ID,
	DEFAULT_OVERLAY_SETTINGS,
	OVERLAY_POST_FX_FILTER_IDS,
	createDefaultOverlaySettings,
	type OverlayDescriptor,
} from '../../../src/domain/overlay/overlay-settings';
import { getAdjacentGlyphRampPreset } from '../../../src/domain/overlay/glyph-ramp-registry';
import { getAvailableFonts } from '../../../src/shared/fonts/runtime-font-registry';
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

	it('keeps the popup header unchanged and compacts only the in-page header', () => {
		const popupView = createView();
		popupView.update([]);
		host.append(popupView.element);

		expect(popupView.moveHandleElement).toBeNull();
		expect(popupView.element.dataset.mode).toBe('popup');
		expect(popupView.element.querySelector('.tm-support-link')?.textContent).toContain('support');

		const inPageView = createView({ mode: 'in-page', onClose: vi.fn() });
		inPageView.update([]);
		host.append(inPageView.element);

		expect(inPageView.moveHandleElement).not.toBeNull();
		expect(inPageView.element.dataset.mode).toBe('in-page');
		expect(
			inPageView.element
				.querySelector('.tm-panel__header')
				?.firstElementChild?.classList.contains('tm-panel__title')
		).toBe(true);
		const headerActions = [...inPageView.element.querySelectorAll('.tm-panel__actions > *')];
		expect(headerActions.at(-2)).toBe(inPageView.moveHandleElement);
		expect(headerActions.at(-1)?.getAttribute('aria-label')).toBe('close panel');
		expect(inPageView.moveHandleElement?.getAttribute('aria-keyshortcuts')).toBeNull();
		expect(inPageView.moveHandleElement?.getAttribute('title')).toContain('double-click');
		expect(inPageView.moveHandleElement?.classList.contains('tm-button')).toBe(false);
		expect(headerActions.every((action) => action.classList.contains('tm-panel__header-action'))).toBe(true);
		expect(headerActions.every((action) => action.classList.contains('tm-button--subtle'))).toBe(true);
		expect(inPageView.element.querySelector('.tm-support-link')?.textContent).not.toContain('support');
		expect(inPageView.element.querySelector('.tm-support-link')?.getAttribute('aria-label')).toBe(
			'Support textmode'
		);
	});

	it('renders the store rating link when a rating URL is available', () => {
		const rateExtensionUrl = 'https://example.com/rate';
		const view = createView({ rateExtensionUrl });
		view.update([]);
		host.append(view.element);

		const rateLink = host.querySelector<HTMLAnchorElement>('.tm-rate-link');
		expect(rateLink?.textContent).toBe('rate extension');
		expect(rateLink?.getAttribute('href')).toBe(rateExtensionUrl);
		expect(rateLink?.target).toBe('_blank');
		expect(rateLink?.getAttribute('rel')).toBe('noreferrer');

		const textmodeLink = host.querySelector<HTMLAnchorElement>('.tm-built-with a');
		expect(textmodeLink?.getAttribute('href')).toBe('https://code.textmode.art');
		expect(textmodeLink?.target).toBe('_blank');
		expect(textmodeLink?.getAttribute('rel')).toBe('noreferrer');
	});

	it('omits the store rating link when no rating URL is available', () => {
		const view = createView({ rateExtensionUrl: null });
		view.update([]);
		host.append(view.element);

		expect(host.querySelector('.tm-rate-link')).toBeNull();
		expect(host.querySelector('.tm-built-with')).not.toBeNull();
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

	it('keeps the selected media card chrome outside the tab scroll area', () => {
		const overlay = createOverlay();
		const view = createView();
		view.update([overlay]);
		host.append(view.element);

		const card = host.querySelector<HTMLElement>('.tm-overlay-card');
		expect(card).not.toBeNull();
		expect(card?.parentElement).toBe(host.querySelector('.tm-overlay-list'));
		expect(host.querySelector('[data-slot="scroll-area"] .tm-overlay-card')).toBeNull();
		expect(card?.querySelector('.tm-overlay-card__header')?.closest('[data-slot="scroll-area"]')).toBeNull();
		expect(
			card?.querySelector('.tm-settings-form > .tm-control-group')?.closest('[data-slot="scroll-area"]')
		).toBeNull();
		expect(card?.querySelector('[data-slot="tabs-list"]')?.closest('[data-slot="scroll-area"]')).toBeNull();
		expect(card?.querySelector('.tm-tabs-content')?.closest('[data-slot="scroll-area"]')).not.toBeNull();
	});

	it('cycles glyph ramp presets from the advanced controls', () => {
		const onUpdateOverlay = vi.fn();
		const overlay = createOverlay();
		const expectedPreset = getAdjacentGlyphRampPreset(DEFAULT_FONT_ID, overlay.settings.glyphRamp, 1);
		const view = createView({ onUpdateOverlay });
		view.update([overlay]);
		host.append(view.element);

		expect(host.textContent).toContain('classic');

		const nextGlyphRampButton = host.querySelector<HTMLButtonElement>('button[aria-label="next glyph ramp"]');
		expect(nextGlyphRampButton).not.toBeNull();
		nextGlyphRampButton!.click();

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { glyphRamp: expectedPreset.glyphRamp });
	});

	it('cycles fonts from the advanced controls', () => {
		const onUpdateOverlay = vi.fn();
		const overlay = createOverlay();
		const fonts = getAvailableFonts();
		const currentIndex = fonts.findIndex((font) => font.id === overlay.settings.fontId);
		const expectedFontId = fonts[(currentIndex + 1) % fonts.length]!.id;
		const view = createView({ onUpdateOverlay });
		view.update([overlay]);
		host.append(view.element);

		const nextFontButton = host.querySelector<HTMLButtonElement>('button[aria-label="next font"]');
		expect(nextFontButton).not.toBeNull();
		nextFontButton!.click();

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', { fontId: expectedFontId });
	});

	it('groups converter settings into brightness and contour tabs after the font selector', () => {
		const onUpdateOverlay = vi.fn();
		const overlay = createOverlay();
		const view = createView({ onUpdateOverlay });
		view.update([overlay]);
		host.append(view.element);

		host.querySelectorAll<HTMLButtonElement>('button[role="tab"]')[1]?.click();
		const advanced = host.querySelector<HTMLElement>('.tm-advanced-controls');
		const converterTabs = advanced?.querySelector<HTMLElement>('.tm-converter-tabs');
		const quickControls = host.querySelector<HTMLElement>('.tm-settings-form > .tm-control-group');
		expect(quickControls?.children[0]).toBe(host.querySelector('.tm-overlay-toggle-row'));
		expect(quickControls?.children[1]?.textContent).toContain('opacity');
		expect(quickControls?.children[2]?.textContent).toContain('font size');
		expect(quickControls?.children[3]).toBe(host.querySelector('.tm-main-font-field'));
		expect(advanced?.firstElementChild).toBe(converterTabs);
		expect(
			converterTabs?.querySelector('.tm-converter-tabs-list')?.closest('[data-slot="scroll-area"]')
		).toBeNull();

		const brightnessControls = converterTabs?.querySelector<HTMLElement>('.tm-brightness-controls');
		expect(brightnessControls?.closest('[data-slot="scroll-area"]')).not.toBeNull();
		expect(brightnessControls?.hidden).toBe(false);
		expect(brightnessControls?.children[0]?.textContent).toContain('invert');
		expect(brightnessControls?.children[1]?.textContent).toContain('characters');
		expect(brightnessControls?.children[2]?.textContent).toContain('cells');
		expect(brightnessControls?.children[3]?.textContent).toContain('glyph ramp');

		const brightnessEnabledInput = converterTabs?.querySelector<HTMLInputElement>(
			'input[aria-label="brightness on"]'
		);
		expect(brightnessEnabledInput?.closest<HTMLElement>('.tm-converter-tab-header')?.dataset.state).toBe('active');
		brightnessEnabledInput?.click();
		expect(onUpdateOverlay).toHaveBeenLastCalledWith('overlay-1', { brightnessEnabled: false });

		const contoursTrigger = [...(converterTabs?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])].find(
			(button) => button.textContent === 'contour'
		);
		contoursTrigger?.click();
		expect(
			converterTabs
				?.querySelector<HTMLInputElement>('input[aria-label="contour on"]')
				?.closest<HTMLElement>('.tm-converter-tab-header')?.dataset.state
		).toBe('active');
		const contourControls = converterTabs?.querySelector<HTMLElement>('.tm-contour-controls');
		expect(contourControls?.closest('[data-slot="scroll-area"]')).not.toBeNull();
		expect(contourControls?.hidden).toBe(false);
		expect(contourControls?.children[0]?.textContent).toContain('invert');
		expect(contourControls?.children[1]?.textContent).toContain('characters');
		expect(contourControls?.children[2]?.textContent).toContain('cells');
		expect(contourControls?.children[3]?.textContent).toContain('threshold');
		expect(contourControls?.children[4]?.textContent).toContain('color sensitivity');
		expect(contourControls?.querySelector('button[aria-label="next glyph ramp"]')).toBeNull();

		converterTabs?.querySelector<HTMLInputElement>('input[aria-label="contour on"]')?.click();
		expect(onUpdateOverlay).toHaveBeenLastCalledWith('overlay-1', {
			contour: { ...overlay.settings.contour, enabled: true },
		});

		const invertToggle = [...(contourControls?.querySelectorAll<HTMLLabelElement>('.tm-toggle-row') ?? [])]
			.find((field) => field.textContent?.includes('invert'))
			?.querySelector<HTMLInputElement>('input');
		invertToggle?.click();
		expect(onUpdateOverlay).toHaveBeenLastCalledWith('overlay-1', {
			contour: { ...overlay.settings.contour, invert: true },
		});

		const thresholdField = [...(contourControls?.querySelectorAll<HTMLElement>('.tm-field') ?? [])].find((field) =>
			field.textContent?.includes('threshold')
		);
		thresholdField
			?.querySelector<HTMLElement>('[data-slot="slider-thumb"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		expect(onUpdateOverlay).toHaveBeenLastCalledWith('overlay-1', {
			contour: { ...overlay.settings.contour, threshold: 0.13 },
		});
	});

	it('resets all overlay settings without removing persisted custom fonts', () => {
		const onUpdateOverlay = vi.fn();
		const onRemoveCustomFont = vi.fn();
		const customFontId = 'custom:123e4567-e89b-12d3-a456-426614174000' as const;
		const overlay = createOverlay({
			...DEFAULT_OVERLAY_SETTINGS,
			opacity: 0.25,
			fontSize: 24,
			fontId: customFontId,
			invert: true,
			postFx: DEFAULT_OVERLAY_SETTINGS.postFx.map((item, index) => ({
				...item,
				enabled: index === 0,
			})),
		});
		const view = createView({
			onUpdateOverlay,
			onRemoveCustomFont,
			customFonts: [{ id: customFontId, displayName: 'Stored Grid' }],
		});
		view.update([overlay], [{ id: customFontId, displayName: 'Stored Grid' }]);
		host.append(view.element);

		const resetButton = host.querySelector<HTMLButtonElement>('.tm-settings-reset');
		expect(resetButton?.textContent).toContain('reset');
		expect(resetButton?.classList.contains('tm-button--subtle')).toBe(true);
		expect(resetButton?.closest('.tm-overlay-toggle-row')).not.toBeNull();
		expect(host.querySelector('.tm-settings-form > .tm-settings-reset-row')).toBeNull();
		resetButton?.click();

		expect(onUpdateOverlay).toHaveBeenCalledWith('overlay-1', createDefaultOverlaySettings());
		expect(onRemoveCustomFont).not.toHaveBeenCalled();
	});

	it('renders fixed post-fx accordion rows and toggles filters', () => {
		const onUpdateOverlay = vi.fn();
		const overlay = createOverlay();
		const view = createView({ onUpdateOverlay });
		view.update([overlay]);
		host.append(view.element);

		host.querySelectorAll<HTMLButtonElement>('button[role="tab"]')[2]?.click();
		expect(host.querySelector('.tm-post-fx-add-select')).toBeNull();
		expect(host.querySelector('.tm-post-fx-add-button')).toBeNull();
		expect(host.querySelector('.tm-post-fx-icon-button')).toBeNull();
		expect(host.querySelectorAll('.tm-post-fx-row')).toHaveLength(OVERLAY_POST_FX_FILTER_IDS.length);
		expect([...host.querySelectorAll('.tm-post-fx-name')].map((node) => node.textContent)).toContain('invert');

		const rowTrigger = host.querySelector<HTMLButtonElement>('.tm-post-fx-main');
		expect(rowTrigger?.getAttribute('aria-expanded')).toBe('false');
		rowTrigger?.click();
		expect(host.querySelector<HTMLElement>('.tm-post-fx-content')?.hidden).toBe(false);
		const disclosureButton = host.querySelector<HTMLButtonElement>('.tm-post-fx-disclosure');
		expect(disclosureButton?.getAttribute('aria-expanded')).toBe('true');
		disclosureButton?.click();
		expect(host.querySelector<HTMLElement>('.tm-post-fx-content')?.hidden).toBe(true);

		host.querySelector<HTMLInputElement>('.tm-post-fx-toggle input')?.click();
		const patch = onUpdateOverlay.mock.calls.at(-1)?.[1];
		expect(patch.postFx).toHaveLength(OVERLAY_POST_FX_FILTER_IDS.length);
		expect(patch.postFx[0]).toMatchObject({ filter: 'invert', enabled: true });
	});

	it('reorders fixed post-fx rows', () => {
		const onUpdateOverlay = vi.fn();
		const overlay = createOverlay();
		const view = createView({ onUpdateOverlay });
		view.update([overlay]);
		host.append(view.element);
		host.querySelectorAll<HTMLButtonElement>('button[role="tab"]')[2]?.click();
		const rows = [...host.querySelectorAll<HTMLElement>('.tm-post-fx-row')];
		rows[0]!.getBoundingClientRect = () => rectAt(0, 36);
		rows[1]!.getBoundingClientRect = () => rectAt(36, 72);
		const grip = host.querySelector<HTMLButtonElement>('.tm-post-fx-grip')!;
		grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientY: 10 }));
		rows[0]!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientY: 50 }));
		rows[0]!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientY: 50 }));

		expect(onUpdateOverlay.mock.calls.at(-1)?.[1].postFx).toHaveLength(OVERLAY_POST_FX_FILTER_IDS.length);
		expect(
			onUpdateOverlay.mock.calls
				.at(-1)?.[1]
				.postFx.slice(0, 2)
				.map((item: { filter: string }) => item.filter)
		).toEqual(['grayscale', 'invert']);
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

function createOverlay(settings = DEFAULT_OVERLAY_SETTINGS): OverlayDescriptor {
	return {
		id: 'overlay-1',
		elementKind: 'canvas',
		elementLabel: 'canvas#demo-canvas.really-long-class 320x180',
		bounds: { x: 0, y: 0, width: 320, height: 180 },
		settings,
		status: 'active',
	};
}

function rectAt(top: number, bottom: number): DOMRect {
	return {
		x: 0,
		y: top,
		left: 0,
		top,
		right: 280,
		bottom,
		width: 280,
		height: bottom - top,
		toJSON: () => undefined,
	} as DOMRect;
}
