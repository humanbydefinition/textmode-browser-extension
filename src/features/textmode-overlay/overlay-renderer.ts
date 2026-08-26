import { textmode } from 'textmode.js';
import { OverlayPlugin } from 'textmode.overlay.js';
import { ExportPlugin } from 'textmode.export.js';
import { FiltersPlugin } from 'textmode.filters.js';
import { ContourConversionPlugin } from 'textmode.contour.js';
import type { TextmodeExportAPI } from 'textmode.export.js';
import type { OverlaySettings } from '../../domain/overlay/overlay-settings';
import type { SelectableElement } from '../media-picker/element-picker';

export type TextmodeInstance = ReturnType<typeof textmode.create>;
export type ExportableTextmodeInstance = TextmodeInstance & Partial<TextmodeExportAPI>;

export interface OverlayRenderOptions {
	fontSource?: string;
}

export interface OverlayRendererPort {
	create(
		element: SelectableElement,
		settings: OverlaySettings,
		options?: OverlayRenderOptions
	): ExportableTextmodeInstance;
}

export const textmodeOverlayRenderer: OverlayRendererPort = {
	create(_element, settings, options = {}) {
		return textmode.create({
			pixelDensity: 1,
			fontSize: settings.fontSize,
			...(options.fontSource ? { fontSource: options.fontSource } : {}),
			loadingScreen: { transition: 'none' },
			plugins: [OverlayPlugin, ContourConversionPlugin, FiltersPlugin, ExportPlugin],
		});
	},
};
