import type { OverlayExportFormat } from '../../../domain/overlay/overlay-settings';
import { h } from '../dom';
import { icon } from '../icons';
import { createButton } from './form-controls';

export function createExportGrid(onExport: (format: OverlayExportFormat) => void): HTMLDivElement {
	return h(
		'div',
		{ className: 'tm-export-grid' },
		createExportButton('txt', 'TXT', onExport),
		createExportButton('svg', 'SVG', onExport),
		createExportButton('png', 'PNG', onExport),
		createExportButton('jpg', 'JPG', onExport)
	);
}

function createExportButton(
	format: OverlayExportFormat,
	label: string,
	onExport: (format: OverlayExportFormat) => void
): HTMLButtonElement {
	const button = createButton('tm-button tm-button--outline tm-button--sm tm-export-button', `export ${label}`);
	button.append(
		icon(getExportIconName(format)),
		h('span', { textContent: label }),
		icon('download', 'tm-export-button__download')
	);
	button.addEventListener('click', () => onExport(format));
	return button;
}

function getExportIconName(format: OverlayExportFormat): 'file-text' | 'file-code' | 'image-down' {
	switch (format) {
		case 'txt':
			return 'file-text';
		case 'svg':
			return 'file-code';
		case 'png':
		case 'jpg':
			return 'image-down';
	}
}
