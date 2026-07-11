import type { OverlayContourSettings, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { h } from './dom';
import { icon } from './icons';
import { createButton, createToggleField, createToggleInput } from './settings/form-controls';
import { ColorModeFieldView } from './settings/color-mode-field-view';
import { RangeFieldView } from './settings/range-field-view';
import { formatPercent, overlaySettingLimits } from './overlay-ui-model';

interface ContourPanelViewOptions {
	settings: OverlaySettings;
	portalContainer: HTMLElement;
	onChange: (settings: Partial<OverlaySettings>) => void;
}

let contourPanelId = 0;

export class ContourPanelView {
	public readonly element: HTMLElement;
	private readonly row: HTMLDivElement;
	private readonly triggerButton: HTMLButtonElement;
	private readonly disclosureButton: HTMLButtonElement;
	private readonly content: HTMLDivElement;
	private readonly enabledInput: HTMLInputElement;
	private readonly invertInput: HTMLInputElement;
	private readonly thresholdField: RangeFieldView;
	private readonly colorSensitivityField: RangeFieldView;
	private readonly charColorField: ColorModeFieldView;
	private readonly cellColorField: ColorModeFieldView;
	private contour: OverlayContourSettings;
	private open = false;

	public constructor(private readonly options: ContourPanelViewOptions) {
		this.contour = options.settings.contour;
		const id = `contour-panel-${++contourPanelId}`;
		const contentId = `${id}-content`;
		const triggerId = `${id}-trigger`;

		this.enabledInput = createToggleInput((enabled) => this.patch({ enabled }));
		this.enabledInput.addEventListener('click', (event) => event.stopPropagation());
		this.triggerButton = createButton('tm-contour-main', 'Expand contours / edges');
		this.triggerButton.id = triggerId;
		this.triggerButton.setAttribute('aria-controls', contentId);
		this.triggerButton.dataset.slot = 'accordion-trigger';
		this.triggerButton.append(h('span', { className: 'tm-contour-name', textContent: 'contours / edges' }));
		this.triggerButton.addEventListener('click', () => this.setOpen(!this.open));

		this.disclosureButton = createButton('tm-contour-disclosure', 'Expand contours / edges');
		this.disclosureButton.setAttribute('aria-controls', contentId);
		this.disclosureButton.append(icon('chevron-down'));
		this.disclosureButton.addEventListener('click', () => this.setOpen(!this.open));

		const header = h(
			'div',
			{ className: 'tm-contour-header' },
			this.triggerButton,
			h(
				'label',
				{ className: 'tm-toggle-row tm-contour-toggle' },
				h('span', { textContent: 'on' }),
				this.enabledInput
			),
			this.disclosureButton
		);

		this.thresholdField = new RangeFieldView({
			label: 'threshold',
			value: this.contour.threshold,
			limits: overlaySettingLimits.contourThreshold,
			format: formatPercent,
			onChange: (threshold) => this.patch({ threshold }),
		});
		this.invertInput = createToggleInput((invert) => this.patch({ invert }));
		this.colorSensitivityField = new RangeFieldView({
			label: 'color sensitivity',
			value: this.contour.colorSensitivity,
			limits: overlaySettingLimits.contourColorSensitivity,
			format: formatPercent,
			onChange: (colorSensitivity) => this.patch({ colorSensitivity }),
		});
		this.charColorField = new ColorModeFieldView({
			label: 'edge characters',
			mode: this.contour.charColorMode,
			color: this.contour.charColor,
			portalContainer: options.portalContainer,
			onModeChange: (charColorMode) => this.patch({ charColorMode }),
			onColorChange: (charColor) => this.patch({ charColor }),
		});
		this.cellColorField = new ColorModeFieldView({
			label: 'edge cells',
			mode: this.contour.cellColorMode,
			color: this.contour.cellColor,
			portalContainer: options.portalContainer,
			onModeChange: (cellColorMode) => this.patch({ cellColorMode }),
			onColorChange: (cellColor) => this.patch({ cellColor }),
		});

		this.content = h(
			'div',
			{
				className: 'tm-contour-content',
				attributes: {
					id: contentId,
					role: 'region',
					'aria-labelledby': triggerId,
					'data-slot': 'accordion-content',
				},
			},
			createToggleField('invert', this.invertInput),
			this.thresholdField.element,
			this.colorSensitivityField.element,
			this.charColorField.element,
			this.cellColorField.element
		);
		this.row = h(
			'div',
			{
				className: 'tm-contour-row tm-accordion-item',
				attributes: { 'data-slot': 'accordion-item' },
			},
			header,
			this.content
		);
		this.element = h('section', { className: 'tm-contour-panel' }, this.row);
		this.update(options.settings);
	}

	public update(settings: OverlaySettings): void {
		this.contour = settings.contour;
		this.enabledInput.checked = this.contour.enabled;
		this.invertInput.checked = this.contour.invert;
		this.thresholdField.update(this.contour.threshold);
		this.colorSensitivityField.update(this.contour.colorSensitivity);
		this.charColorField.update(this.contour.charColorMode, this.contour.charColor);
		this.cellColorField.update(this.contour.cellColorMode, this.contour.cellColor);
		this.renderState();
	}

	public dispose(): void {
		this.charColorField.dispose();
		this.cellColorField.dispose();
	}

	private patch(patch: Partial<OverlayContourSettings>): void {
		this.options.onChange({ contour: { ...this.contour, ...patch } });
	}

	private setOpen(open: boolean): void {
		this.open = open;
		this.renderState();
	}

	private renderState(): void {
		const state = this.open ? 'open' : 'closed';
		this.row.dataset.state = state;
		if (this.contour.enabled) {
			this.row.dataset.enabled = 'true';
		} else {
			delete this.row.dataset.enabled;
		}
		this.triggerButton.dataset.state = state;
		this.triggerButton.setAttribute('aria-expanded', String(this.open));
		this.triggerButton.setAttribute('aria-label', `${this.open ? 'Collapse' : 'Expand'} contours / edges`);
		this.disclosureButton.dataset.state = state;
		this.disclosureButton.setAttribute('aria-expanded', String(this.open));
		this.disclosureButton.setAttribute('aria-label', `${this.open ? 'Collapse' : 'Expand'} contours / edges`);
		this.content.dataset.state = state;
		this.content.hidden = !this.open;
	}
}
