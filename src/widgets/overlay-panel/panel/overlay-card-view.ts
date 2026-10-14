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
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => Promise<void> | void;
	onExportOverlay: (id: string, format: OverlayExportFormat) => void;
	onUploadFont?: (file: File) => Promise<{ id: CustomFontId; displayName: string }>;
	onRemoveCustomFont?: (id: CustomFontId) => Promise<void> | void;
	onError?: (message: string) => void;
}

export class OverlayCardView {
	public readonly element: HTMLElement;
	public id: string;
	private readonly error: HTMLParagraphElement;
	private readonly settingsForm: OverlaySettingsFormView;

	public constructor(options: OverlayCardViewOptions) {
		this.id = options.overlay.id;
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
		this.element = h('article', { className: 'tm-overlay-card' }, this.settingsForm.element, this.error);
		this.update(options.overlay);
	}

	public update(overlay: OverlayDescriptor, customFonts?: readonly CustomFontSummary[]): void {
		this.id = overlay.id;
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
