import type { FontId } from '../../domain/overlay/overlay-settings';
import { CONTOUR_DEFAULT_CHARACTERS } from 'textmode.contour.js';
import { getFontAssetUrl } from '../../shared/fonts/runtime-font-registry';
import type { SelectableElement } from '../media-picker/element-picker';
import type { OverlayController } from './overlay-session';
import type { OverlayRendererPort } from './overlay-renderer';
import { applyPostFxFilters, waitForPostFxFilterRegistration } from './post-fx-runtime';

export interface OverlayInstanceAdapterOptions {
	resolveFontAssetUrl?: (fontId: FontId) => string | null;
	fontAssetUrl?: string | null;
}

export function createOverlayInstance(
	controller: OverlayController,
	renderer: OverlayRendererPort,
	options: OverlayInstanceAdapterOptions = {}
): void {
	const resolveFontAssetUrl = options.resolveFontAssetUrl ?? getFontAssetUrl;
	const fontSource = options.fontAssetUrl ?? resolveFontAssetUrl(controller.settings.fontId);
	const instance = renderer.create(controller.element, controller.settings, fontSource ? { fontSource } : undefined);
	controller.instance = instance;
	controller.loadedFontId = controller.settings.fontId;

	instance.overlay?.setTarget(controller.element);

	instance.canvas.dataset.textmodeAsciiExtensionUi = 'true';
	instance.canvas.style.pointerEvents = 'none';
	instance.canvas.style.opacity = String(controller.settings.opacity);
	instance.canvas.style.mixBlendMode = 'normal';

	instance.setup(async () => {
		instance.exportOverlay?.hide();
		configureSource(controller);
		controller.postFxFiltersReady = await waitForPostFxFilterRegistration(instance);
	});

	instance.draw(() => {
		instance.clear();
		const source = instance.overlay?.source;
		if (!controller.settings.enabled || !source) return;
		if (!canRenderElement(controller.element)) return;
		configureSource(controller);
		if (!controller.settings.brightnessEnabled && !controller.settings.contour.enabled) return;
		const grid = instance.grid;
		if (!grid) return;
		instance.image(source, grid.cols, grid.rows);
		if (controller.postFxFiltersReady) {
			applyPostFxFilters(instance, controller.settings.postFx);
		}
	});

	applyControllerSettings(controller, { resolveFontAssetUrl });
}

export async function loadControllerFont(controller: OverlayController, fontUrl: string): Promise<void> {
	if (!controller.instance) return;
	await controller.instance.loadFont(fontUrl);
	controller.loadedFontId = controller.settings.fontId;
}

export function applyControllerSettings(
	controller: OverlayController,
	options: OverlayInstanceAdapterOptions = {}
): void {
	const resolveFontAssetUrl = options.resolveFontAssetUrl ?? getFontAssetUrl;
	const { instance, settings } = controller;
	controller.element.style.opacity = controller.previousInlineOpacity;

	if (!instance) return;
	instance.canvas.style.opacity = String(settings.opacity);
	instance.canvas.style.pointerEvents = 'none';
	instance.targetFrameRate(60);

	if (!settings.enabled) {
		instance.overlay?.hide();
		instance.noLoop();
		controller.status = 'paused';
	} else {
		instance.overlay?.show();
		instance.loop();
		controller.status = 'active';
	}

	const currentFontSize = instance.fontSize();
	if (typeof currentFontSize === 'number' && currentFontSize !== settings.fontSize) {
		instance.fontSize(settings.fontSize);
	}

	if (controller.loadedFontId !== settings.fontId) {
		const fontUrl = resolveFontAssetUrl(settings.fontId);
		if (fontUrl) {
			controller.loadedFontId = settings.fontId;
			void instance.loadFont(fontUrl).catch(() => {
				controller.loadedFontId = undefined;
			});
		}
	}

	configureSource(controller);
}

export function syncControllerCanvasStyle(controller: OverlayController): void {
	if (controller.instance) {
		controller.instance.canvas.style.opacity = String(controller.settings.opacity);
		controller.instance.canvas.style.pointerEvents = 'none';
	}
}

function configureSource(controller: OverlayController): void {
	const source = controller.instance?.overlay?.source;
	if (!source) return;

	const { settings } = controller;
	source
		.characters(settings.glyphRamp)
		.invert(settings.invert)
		.charColorMode(settings.charColorMode)
		.charColor(settings.charColor)
		.cellColorMode(settings.cellColorMode)
		.cellColor(settings.cellColor)
		.background(settings.cellColor);

	if (settings.brightnessEnabled && !settings.contour.enabled) {
		source.conversionMode('brightness');
		return;
	}

	const conversions = [];
	if (settings.brightnessEnabled) {
		conversions.push({
			mode: 'brightness',
			characters: settings.glyphRamp,
			charColorMode: settings.charColorMode,
			charColor: settings.charColor,
			cellColorMode: settings.cellColorMode,
			cellColor: settings.cellColor,
		});
	}
	if (settings.contour.enabled) {
		conversions.push({
			mode: 'contour',
			characters: CONTOUR_DEFAULT_CHARACTERS,
			invert: settings.contour.invert,
			charColorMode: settings.contour.charColorMode,
			charColor: settings.contour.charColor,
			cellColorMode: settings.contour.cellColorMode,
			cellColor: settings.contour.cellColor,
			options: {
				threshold: settings.contour.threshold,
				colorSensitivity: settings.contour.colorSensitivity,
			},
		});
	}

	if (conversions.length > 0) {
		source.conversions(conversions);
	} else {
		source.conversionMode('brightness');
	}
}

function canRenderElement(element: SelectableElement): boolean {
	if (!(element instanceof HTMLVideoElement)) {
		return true;
	}

	return element.readyState >= element.HAVE_CURRENT_DATA && element.videoWidth > 0 && element.videoHeight > 0;
}
