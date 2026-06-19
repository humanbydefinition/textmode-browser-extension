import { describe, expect, it, vi } from 'vitest';
import { exportTextmodeOverlay } from '@/features/textmode-overlay/overlay-export-service';
import type { ExportableTextmodeInstance } from '@/features/textmode-overlay/overlay-renderer';

describe('overlay export service', () => {
	it('maps export formats to fixed textmode export options', async () => {
		const instance = createExportableInstance();

		await exportTextmodeOverlay(instance, 'txt');
		await exportTextmodeOverlay(instance, 'svg');
		await exportTextmodeOverlay(instance, 'png');
		await exportTextmodeOverlay(instance, 'jpg');

		expect(instance.saveStrings).toHaveBeenCalledWith({
			filename: 'textmode-overlay.txt',
			preserveTrailingSpaces: false,
			emptyCharacter: ' ',
		});
		expect(instance.saveSVG).toHaveBeenCalledWith({
			filename: 'textmode-overlay.svg',
			includeBackgroundRectangles: true,
			drawMode: 'fill',
			strokeWidth: 1,
		});
		expect(instance.saveCanvas).toHaveBeenCalledWith({
			filename: 'textmode-overlay.png',
			format: 'png',
			scale: 1,
		});
		expect(instance.saveCanvas).toHaveBeenCalledWith({
			filename: 'textmode-overlay.jpg',
			format: 'jpg',
			scale: 1,
		});
	});

	it('rejects instances without export methods', async () => {
		await expect(exportTextmodeOverlay(undefined, 'txt')).rejects.toThrow(
			'Export controls are not available for this overlay.'
		);
	});
});

function createExportableInstance(): ExportableTextmodeInstance {
	return {
		saveCanvas: vi.fn(async () => undefined),
		saveSVG: vi.fn(),
		saveStrings: vi.fn(),
	} as unknown as ExportableTextmodeInstance;
}
