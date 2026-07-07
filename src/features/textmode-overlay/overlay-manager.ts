import { getMediaSecurityHint, toUserMessage } from '../../shared/errors/errors';
import {
	DEFAULT_OVERLAY_SETTINGS,
	DEFAULT_FONT_ID,
	mergeOverlaySettings,
	type FontId,
	type OverlayDescriptor,
	type OverlayExportFormat,
	type OverlaySettings,
} from '../../domain/overlay/overlay-settings';
import { resolveFontId } from '../../shared/fonts/runtime-font-registry';
import type { SelectableElement } from '../media-picker/element-picker';
import { textmodeOverlayRenderer, type OverlayRendererPort } from './overlay-renderer';
import { toOverlayDescriptor } from './overlay-descriptor';
import { exportTextmodeOverlay } from './overlay-export-service';
import { applyControllerSettings, createOverlayInstance, syncControllerCanvasStyle } from './overlay-instance-adapter';
import {
	assertCanCreateOverlay,
	createOverlayController,
	disposeOverlayController,
	type OverlayController,
} from './overlay-session';

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
		const controller = createOverlayController(id, element, settings);

		this.overlays.set(id, controller);
		this.resizeObserver.observe(element);

		try {
			createOverlayInstance(controller, this.renderer);
		} catch (error) {
			this.markError(controller, error);
		}

		this.onChange();
		return toOverlayDescriptor(controller);
	}

	public list(): OverlayDescriptor[] {
		return [...this.overlays.values()].map(toOverlayDescriptor);
	}

	public updateOverlay(id: string, patch: Partial<OverlaySettings>): OverlayDescriptor[] {
		const controller = this.getController(id);

		controller.settings = this.normalizeSettings(mergeOverlaySettings(controller.settings, patch));
		try {
			applyControllerSettings(controller);
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
		const controller = this.getController(id);

		try {
			await exportTextmodeOverlay(controller.instance, format);
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
			applyControllerSettings(controller);
		}
		this.onChange();
		return this.list();
	}

	public resumeAll(): OverlayDescriptor[] {
		for (const controller of this.overlays.values()) {
			controller.settings = { ...controller.settings, enabled: true };
			applyControllerSettings(controller);
		}
		this.onChange();
		return this.list();
	}

	public removeAll(): OverlayDescriptor[] {
		this.clearOverlays();
		this.onChange();
		return [];
	}

	public revertOverlaysUsingFont(fontId: FontId): OverlayDescriptor[] {
		let changed = false;
		for (const controller of this.overlays.values()) {
			if (controller.settings.fontId !== fontId) continue;
			controller.settings = this.normalizeSettings(
				mergeOverlaySettings(controller.settings, { fontId: DEFAULT_FONT_ID })
			);
			try {
				applyControllerSettings(controller);
				controller.latestError = undefined;
				controller.status = controller.settings.enabled ? 'active' : 'paused';
			} catch (error) {
				this.markError(controller, error);
			}
			changed = true;
		}
		if (changed) {
			this.onChange();
		}
		return this.list();
	}

	private getController(id: string): OverlayController {
		const controller = this.overlays.get(id);
		if (!controller) {
			throw new Error(`Overlay ${id} no longer exists.`);
		}
		return controller;
	}

	private normalizeSettings(settings: OverlaySettings): OverlaySettings {
		const resolvedFontId = resolveFontId(settings.fontId);
		if (!resolvedFontId) {
			return {
				...settings,
				fontId: DEFAULT_FONT_ID,
			};
		}

		if (resolvedFontId === settings.fontId) {
			return settings;
		}

		return {
			...settings,
			fontId: resolvedFontId,
		};
	}

	private syncCanvasStyles(): void {
		for (const controller of this.overlays.values()) {
			syncControllerCanvasStyle(controller);
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
		disposeOverlayController(controller);
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
}
