import type { OverlayExportFormat } from '../../domain/overlay/overlay-settings';
import type { ExportableTextmodeInstance } from './overlay-renderer';

type OverlayExportAPI = Required<Pick<ExportableTextmodeInstance, 'saveCanvas' | 'saveSVG' | 'saveStrings'>>;

export async function exportTextmodeOverlay(
	instance: ExportableTextmodeInstance | undefined,
	format: OverlayExportFormat
): Promise<void> {
	const api = getExportAPI(instance);
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
