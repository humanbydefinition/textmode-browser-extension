import { OVERLAY_EXPORT_FORMAT_DEFINITIONS, OVERLAY_EXPORT_FORMATS } from '../../../domain/overlay/export-formats';
import type { OverlayExportFormat } from '../../../domain/overlay/overlay-settings';
import { h } from '../dom';
import { icon } from '../icons';
import { createButton } from './form-controls';

export function createExportGrid(onExport: (format: OverlayExportFormat) => void): HTMLDivElement {
	return h(
		'div',
		{ className: 'tm-export-grid' },
		...OVERLAY_EXPORT_FORMATS.map((format) => createExportButton(format, onExport))
	);
}

function createExportButton(
	format: OverlayExportFormat,
	onExport: (format: OverlayExportFormat) => void
): HTMLButtonElement {
	const definition = OVERLAY_EXPORT_FORMAT_DEFINITIONS[format];
	const button = createButton(
		'tm-button tm-button--outline tm-button--sm tm-export-button',
		`export ${definition.label}`
	);
	button.append(
		icon(definition.iconName),
		h('span', { textContent: definition.label }),
		icon('download', 'tm-export-button__download')
	);
	button.addEventListener('click', () => onExport(format));
	return button;
}
