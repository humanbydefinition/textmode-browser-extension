import { textmode } from 'textmode.js';
import type { OverlaySettings } from '../../domain/overlay/overlay-settings';
import type { SelectableElement } from '../media-picker/element-picker';

export type TextmodeInstance = ReturnType<typeof textmode.create>;

export interface OverlayRendererPort {
	create(element: SelectableElement, settings: OverlaySettings): TextmodeInstance;
}

export const textmodeOverlayRenderer: OverlayRendererPort = {
	create(element, settings) {
		return textmode.create({
			canvas: element,
			overlay: true,
			pixelDensity: 1,
			fontSize: settings.fontSize,
			loadingScreen: { transition: 'none' },
		});
	},
};
