export const OVERLAY_EXPORT_FORMAT_DEFINITIONS = {
	txt: {
		label: 'TXT',
		iconName: 'file-text',
		exportType: 'strings',
		options: {
			filename: 'textmode-overlay.txt',
			preserveTrailingSpaces: false,
			emptyCharacter: ' ',
		},
	},
	svg: {
		label: 'SVG',
		iconName: 'file-code',
		exportType: 'svg',
		options: {
			filename: 'textmode-overlay.svg',
			includeBackgroundRectangles: true,
			drawMode: 'fill',
			strokeWidth: 1,
		},
	},
	png: {
		label: 'PNG',
		iconName: 'image-down',
		exportType: 'canvas',
		options: {
			filename: 'textmode-overlay.png',
			format: 'png',
			scale: 1,
		},
	},
	jpg: {
		label: 'JPG',
		iconName: 'image-down',
		exportType: 'canvas',
		options: {
			filename: 'textmode-overlay.jpg',
			format: 'jpg',
			scale: 1,
		},
	},
} as const;

export type OverlayExportFormat = keyof typeof OVERLAY_EXPORT_FORMAT_DEFINITIONS;
export type OverlayExportIconName = (typeof OVERLAY_EXPORT_FORMAT_DEFINITIONS)[OverlayExportFormat]['iconName'];

export const OVERLAY_EXPORT_FORMATS = Object.keys(
	OVERLAY_EXPORT_FORMAT_DEFINITIONS
) as OverlayExportFormat[];

export function isOverlayExportFormat(value: unknown): value is OverlayExportFormat {
	return typeof value === 'string' && value in OVERLAY_EXPORT_FORMAT_DEFINITIONS;
}
