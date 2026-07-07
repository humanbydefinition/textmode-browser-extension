import type { CustomFontSummary } from '../../../domain/fonts/custom-font-entry';
import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../../domain/overlay/overlay-settings';
import type { CustomFontId } from '../../../domain/overlay/overlay-settings';
import { h } from '../dom';
import { OverlaySettingsFormView } from '../overlay-settings-form-view';

export interface OverlayCardViewOptions {
	overlay: OverlayDescriptor;
	portalContainer: HTMLElement;
	customFonts?: readonly CustomFontSummary[];
	allowCustomFontUpload?: boolean;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onExportOverlay: (id: string, format: OverlayExportFormat) => void;
	onUploadFont?: (file: File) => Promise<{ id: CustomFontId; displayName: string }>;
	onRemoveCustomFont?: (id: CustomFontId) => Promise<void> | void;
	onError?: (message: string) => void;
}

export class OverlayCardView {
	public readonly element: HTMLElement;
	public id: string;
	private readonly title: HTMLHeadingElement;
	private readonly elementName: HTMLParagraphElement;
	private readonly dimensions: HTMLSpanElement;
	private readonly error: HTMLParagraphElement;
	private readonly settingsForm: OverlaySettingsFormView;

	public constructor(options: OverlayCardViewOptions) {
		this.id = options.overlay.id;
		this.title = h('h2');
		this.elementName = h('p');
		this.dimensions = h('span', { className: 'tm-badge tm-dimensions', attributes: { 'data-slot': 'badge' } });
		this.settingsForm = new OverlaySettingsFormView({
			settings: options.overlay.settings,
			portalContainer: options.portalContainer,
			customFonts: options.customFonts,
			allowCustomFontUpload: options.allowCustomFontUpload,
			onChange: (settings) => options.onUpdateOverlay(this.id, settings),
			onExport: (format) => options.onExportOverlay(this.id, format),
			onUploadFont: options.onUploadFont,
			onRemoveCustomFont: options.onRemoveCustomFont,
			onError: options.onError,
		});
		this.error = h('p', { className: 'tm-error', attributes: { role: 'alert' } });
		this.element = h(
			'article',
			{ className: 'tm-overlay-card' },
			h(
				'header',
				{ className: 'tm-overlay-card__header' },
				h('div', { className: 'tm-overlay-card__title' }, this.title, this.elementName),
				this.dimensions
			),
			this.settingsForm.element,
			this.error
		);
		this.update(options.overlay);
	}

	public update(overlay: OverlayDescriptor, customFonts?: readonly CustomFontSummary[]): void {
		this.id = overlay.id;
		const title = overlay.elementKind === 'video' ? 'video selected' : 'canvas selected';
		const elementName = getElementName(overlay.elementLabel);
		this.title.textContent = title;
		this.elementName.textContent = elementName;
		this.elementName.title = elementName;
		this.dimensions.textContent = `${overlay.bounds.width}x${overlay.bounds.height}`;
		this.settingsForm.update(overlay.settings, customFonts);

		if (overlay.latestError) {
			this.error.textContent = overlay.latestError;
			this.error.hidden = false;
		} else {
			this.error.textContent = '';
			this.error.hidden = true;
		}
	}

	public dispose(): void {
		this.settingsForm.dispose();
	}
}

function getElementName(elementLabel: string): string {
	return elementLabel.replace(/\s+\d+x\d+$/i, '');
}
