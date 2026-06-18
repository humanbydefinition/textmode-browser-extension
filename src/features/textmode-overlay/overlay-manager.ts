import { getMediaSecurityHint, toUserMessage } from '../../shared/errors/errors';
import {
	DEFAULT_OVERLAY_SETTINGS,
	getElementBounds,
	mergeOverlaySettings,
	type BundledFontId,
	type OverlayDescriptor,
	type OverlayExportFormat,
	type OverlaySettings,
} from '../../domain/overlay/overlay-settings';
import { getFontAssetUrl, resolveFontId } from '../../domain/fonts/font-registry';
import { describeElement, type SelectableElement } from '../media-picker/element-picker';
import { textmodeOverlayRenderer, type ExportableTextmodeInstance, type OverlayRendererPort } from './overlay-renderer';

interface OverlayController {
	id: string;
	element: SelectableElement;
	settings: OverlaySettings;
	instance?: ExportableTextmodeInstance;
	status: OverlayDescriptor['status'];
	latestError?: string;
	previousInlineOpacity: string;
	loadedFontId?: BundledFontId;
}

export class OverlayManager {
	private readonly overlays = new Map<string, OverlayController>();
	private idCounter = 0;
	private readonly resizeObserver = new ResizeObserver(() => this.syncCanvasStyles());
	private readonly mutationObserver = new MutationObserver(() => this.removeDetachedOverlays());

	public constructor(
		private readonly onChange: () => void,
		private readonly renderer: OverlayRendererPort = textmodeOverlayRenderer
	) {
		this.mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
	}

	public createOverlay(
		element: SelectableElement,
		initialSettings: Partial<OverlaySettings> = {}
	): OverlayDescriptor {
		assertCanCreateOverlay(element);
		this.clearOverlays();

		const id = `overlay-${Date.now().toString(36)}-${++this.idCounter}`;
		const settings = this.normalizeSettings(mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, initialSettings));
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
			const fontSource = getFontAssetUrl(settings.fontId);
			const instance = this.renderer.create(element, settings, fontSource ? { fontSource } : undefined);
			controller.instance = instance;
			controller.loadedFontId = settings.fontId;
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
				if (!canRenderElement(controller.element)) return;
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

		controller.settings = this.normalizeSettings(mergeOverlaySettings(controller.settings, patch));
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

	public async exportOverlay(id: string, format: OverlayExportFormat): Promise<OverlayDescriptor[]> {
		const controller = this.overlays.get(id);
		if (!controller) {
			throw new Error(`Overlay ${id} no longer exists.`);
		}

		try {
			const api = getExportAPI(controller.instance);
			switch (format) {
				case 'txt':
					api.saveStrings({
						filename: 'textmode-overlay.txt',
						preserveTrailingSpaces: false,
						emptyCharacter: ' ',
					});
					break;
				case 'svg':
					api.saveSVG({
						filename: 'textmode-overlay.svg',
						includeBackgroundRectangles: true,
						drawMode: 'fill',
						strokeWidth: 1,
					});
					break;
				case 'png':
					await api.saveCanvas({ filename: 'textmode-overlay.png', format: 'png', scale: 1 });
					break;
				case 'jpg':
					await api.saveCanvas({ filename: 'textmode-overlay.jpg', format: 'jpg', scale: 1 });
					break;
			}

			controller.latestError = undefined;
			controller.status = controller.settings.enabled ? 'active' : 'paused';
			this.onChange();
			return this.list();
		} catch (error) {
			this.markError(controller, error);
			this.onChange();
			throw new Error(controller.latestError ?? toUserMessage(error));
		}
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
		controller.element.style.opacity = controller.previousInlineOpacity;

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

		if (controller.loadedFontId !== settings.fontId) {
			const fontUrl = getFontAssetUrl(settings.fontId);
			if (fontUrl) {
				controller.loadedFontId = settings.fontId;
				void instance.loadFont(fontUrl).catch(() => {
					controller.loadedFontId = undefined;
				});
			}
		}

		this.configureSource(controller);
	}

	private normalizeSettings(settings: OverlaySettings): OverlaySettings {
		const resolvedFontId = resolveFontId(settings.fontId);
		if (!resolvedFontId || resolvedFontId === settings.fontId) {
			return settings;
		}

		return {
			...settings,
			fontId: resolvedFontId,
		};
	}

	private configureSource(controller: OverlayController): void {
		const source = controller.instance?.overlay;
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

type OverlayExportAPI = Required<Pick<ExportableTextmodeInstance, 'saveCanvas' | 'saveSVG' | 'saveStrings'>>;

function getExportAPI(instance: ExportableTextmodeInstance | undefined): OverlayExportAPI {
	if (!instance || !instance.saveCanvas || !instance.saveSVG || !instance.saveStrings) {
		throw new Error('Export controls are not available for this overlay.');
	}

	return {
		saveCanvas: instance.saveCanvas,
		saveSVG: instance.saveSVG,
		saveStrings: instance.saveStrings,
	};
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

function canRenderElement(element: SelectableElement): boolean {
	if (!(element instanceof HTMLVideoElement)) {
		return true;
	}

	return element.readyState >= element.HAVE_CURRENT_DATA && element.videoWidth > 0 && element.videoHeight > 0;
}
