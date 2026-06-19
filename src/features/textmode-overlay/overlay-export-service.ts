import { OVERLAY_EXPORT_FORMAT_DEFINITIONS } from '../../domain/overlay/export-formats';
import type { OverlayExportFormat } from '../../domain/overlay/overlay-settings';
import type { ExportableTextmodeInstance } from './overlay-renderer';

type OverlayExportAPI = Required<Pick<ExportableTextmodeInstance, 'saveCanvas' | 'saveSVG' | 'saveStrings'>>;

export async function exportTextmodeOverlay(
	instance: ExportableTextmodeInstance | undefined,
	format: OverlayExportFormat
): Promise<void> {
	const api = getExportAPI(instance);
	const definition = OVERLAY_EXPORT_FORMAT_DEFINITIONS[format];

	switch (definition.exportType) {
		case 'strings':
			api.saveStrings(definition.options);
			break;
		case 'svg':
			api.saveSVG(definition.options);
			break;
		case 'canvas':
			await api.saveCanvas(definition.options);
			break;
	}
}

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
