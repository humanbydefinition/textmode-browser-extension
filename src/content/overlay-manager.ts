import { textmode } from 'textmode.js';
import { getMediaSecurityHint, toUserMessage } from '../shared/errors';
import {
	DEFAULT_OVERLAY_SETTINGS,
	getElementBounds,
	mergeOverlaySettings,
	type OverlayDescriptor,
	type OverlaySettings,
} from '../shared/overlay-settings';
import { describeElement, type SelectableElement } from './element-picker';

type TextmodeInstance = ReturnType<typeof textmode.create>;

interface OverlayController {
	id: string;
	element: SelectableElement;
	settings: OverlaySettings;
	instance?: TextmodeInstance;
	status: OverlayDescriptor['status'];
	latestError?: string;
	previousInlineOpacity: string;
}

export class OverlayManager {
	private readonly overlays = new Map<string, OverlayController>();
	private idCounter = 0;
	private readonly resizeObserver = new ResizeObserver(() => this.syncCanvasStyles());
	private readonly mutationObserver = new MutationObserver(() => this.removeDetachedOverlays());

	public constructor(private readonly onChange: () => void) {
		this.mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
	}

	public createOverlay(
		element: SelectableElement,
		initialSettings: Partial<OverlaySettings> = {}
	): OverlayDescriptor {
		assertCanCreateOverlay(element);
		this.clearOverlays();

		const id = `overlay-${Date.now().toString(36)}-${++this.idCounter}`;
		const settings = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, initialSettings);
		const controller: OverlayController = {
			id,
			element,
			settings,
			status: 'active',
			previousInlineOpacity: element.style.opacity,
		};

		this.overlays.set(id, controller);
		this.resizeObserver.observe(element);

		try {
			const instance = textmode.create({
				canvas: element,
				overlay: true,
				pixelDensity: 1,
				fontSize: settings.fontSize,
				frameRate: settings.frameRate,
				loadingScreen: { transition: 'none' },
			});
			controller.instance = instance;
			instance.canvas.dataset.textmodeAsciiExtensionUi = 'true';
			instance.canvas.style.pointerEvents = 'none';
			instance.canvas.style.opacity = String(settings.opacity);
			instance.canvas.style.mixBlendMode = 'normal';

			instance.setup(() => {
				this.configureSource(controller);
			});

			instance.draw(() => {
				instance.clear();
				if (!controller.settings.enabled || !instance.overlay) return;
				this.configureSource(controller);
				const grid = instance.grid;
				if (!grid) return;
				instance.image(instance.overlay, grid.cols, grid.rows);
			});

			this.applyControllerSettings(controller);
		} catch (error) {
			this.markError(controller, error);
		}

		this.onChange();
		return this.toDescriptor(controller);
	}

	public list(): OverlayDescriptor[] {
		return [...this.overlays.values()].map((controller) => this.toDescriptor(controller));
	}

	public updateOverlay(id: string, patch: Partial<OverlaySettings>): OverlayDescriptor[] {
		const controller = this.overlays.get(id);
		if (!controller) {
			throw new Error(`Overlay ${id} no longer exists.`);
		}

		controller.settings = mergeOverlaySettings(controller.settings, patch);
		try {
			this.applyControllerSettings(controller);
			controller.latestError = undefined;
			controller.status = controller.settings.enabled ? 'active' : 'paused';
		} catch (error) {
			this.markError(controller, error);
		}

		this.onChange();
		return this.list();
	}

	public removeOverlay(id: string): OverlayDescriptor[] {
		const controller = this.overlays.get(id);
		if (!controller) return this.list();
		this.disposeController(controller);
		this.overlays.delete(id);
		this.onChange();
		return this.list();
	}

	public pauseAll(): OverlayDescriptor[] {
		for (const controller of this.overlays.values()) {
			controller.settings = { ...controller.settings, enabled: false };
			this.applyControllerSettings(controller);
		}
		this.onChange();
		return this.list();
	}

	public resumeAll(): OverlayDescriptor[] {
		for (const controller of this.overlays.values()) {
			controller.settings = { ...controller.settings, enabled: true };
			this.applyControllerSettings(controller);
		}
		this.onChange();
		return this.list();
	}

	public removeAll(): OverlayDescriptor[] {
		this.clearOverlays();
		this.onChange();
		return [];
	}

	private applyControllerSettings(controller: OverlayController): void {
		const { instance, settings } = controller;
		controller.element.style.opacity = settings.hideOriginal ? '0' : controller.previousInlineOpacity;

		if (!instance) return;
		instance.canvas.style.opacity = String(settings.opacity);
		instance.canvas.style.display = settings.enabled ? '' : 'none';
		instance.targetFrameRate(60);

		if (!settings.enabled) {
			instance.noLoop();
			controller.status = 'paused';
		} else {
			instance.loop();
			controller.status = 'active';
		}

		const currentFontSize = instance.fontSize();
		if (typeof currentFontSize === 'number' && currentFontSize !== settings.fontSize) {
			instance.fontSize(settings.fontSize);
		}

		this.configureSource(controller);
	}

	private configureSource(controller: OverlayController): void {
		const source = controller.instance?.overlay;
		if (!source) return;

		const { settings } = controller;
		source
			.characters(settings.glyphRamp)
			.conversionMode(settings.conversionMode)
			.invert(settings.invert)
			.brightnessRange(settings.brightnessStart, settings.brightnessEnd)
			.charColorMode(settings.charColorMode)
			.charColor(settings.charColor)
			.cellColorMode(settings.cellColorMode)
			.cellColor(settings.cellColor)
			.background(settings.cellColor);
	}

	private syncCanvasStyles(): void {
		for (const controller of this.overlays.values()) {
			if (controller.instance) {
				controller.instance.canvas.style.opacity = String(controller.settings.opacity);
			}
		}
		this.onChange();
	}

	private removeDetachedOverlays(): void {
		let changed = false;
		for (const [id, controller] of this.overlays) {
			if (controller.element.isConnected) continue;
			this.disposeController(controller);
			this.overlays.delete(id);
			changed = true;
		}
		if (changed) {
			this.onChange();
		}
	}

	private disposeController(controller: OverlayController): void {
		this.resizeObserver.unobserve(controller.element);
		controller.element.style.opacity = controller.previousInlineOpacity;
		controller.instance?.destroy();
	}

	private clearOverlays(): void {
		for (const controller of this.overlays.values()) {
			this.disposeController(controller);
		}
		this.overlays.clear();
	}

	private markError(controller: OverlayController, error: unknown): void {
		controller.status = 'error';
		controller.latestError = getMediaSecurityHint(error) ?? toUserMessage(error);
	}

	private toDescriptor(controller: OverlayController): OverlayDescriptor {
		const info = describeElement(controller.element);
		return {
			id: controller.id,
			elementKind: info.kind,
			elementLabel: info.label,
			bounds: getElementBounds(controller.element),
			settings: controller.settings,
			status: controller.status,
			latestError: controller.latestError,
		};
	}
}

function assertCanCreateOverlay(element: SelectableElement): void {
	if (!window.WebGL2RenderingContext) {
		throw new Error('WebGL2 is not available in this browser.');
	}

	if (!element.isConnected) {
		throw new Error('The selected element is no longer attached to the page.');
	}

	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) {
		throw new Error('The selected element has no visible size.');
	}

	if (element instanceof HTMLVideoElement && element.readyState === 0) {
		throw new Error('The selected video has not loaded enough metadata to be sampled yet.');
	}
}
