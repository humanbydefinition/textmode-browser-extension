import type { BundledFontId, OverlayDescriptor, OverlaySettings } from '../../domain/overlay/overlay-settings';
import type { SelectableElement } from '../media-picker/element-picker';
import type { ExportableTextmodeInstance } from './overlay-renderer';

export interface OverlayController {
	id: string;
	element: SelectableElement;
	settings: OverlaySettings;
	instance?: ExportableTextmodeInstance;
	status: OverlayDescriptor['status'];
	latestError?: string;
	previousInlineOpacity: string;
	loadedFontId?: BundledFontId;
}

export function createOverlayController(
	id: string,
	element: SelectableElement,
	settings: OverlaySettings
): OverlayController {
	return {
		id,
		element,
		settings,
		status: 'active',
		previousInlineOpacity: element.style.opacity,
	};
}

export function disposeOverlayController(controller: OverlayController): void {
	controller.element.style.opacity = controller.previousInlineOpacity;
	controller.instance?.destroy();
}

export function assertCanCreateOverlay(element: SelectableElement): void {
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
