import popupStyles from '../popup/popup.css?inline';
import type { OverlayDescriptor, OverlaySettings } from '../shared/overlay-settings';

export interface ControlPanelOptions {
	onStartPicking: () => void;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onRemoveOverlay: (id: string) => void;
	onClose: () => void;
}

export class ControlPanel {
	private readonly container: HTMLDivElement;
	private readonly shadowRoot: ShadowRoot;
	private readonly statusEl: HTMLParagraphElement;
	private readonly overlaysEl: HTMLElement;
	private readonly pickButton: HTMLButtonElement;

	private activeOverlayId?: string;

	// UI references
	private statusSpan?: HTMLSpanElement;
	private enabledInput?: HTMLInputElement;
	private opacityInput?: HTMLInputElement;
	private opacityOutput?: HTMLOutputElement;
	private fontSizeInput?: HTMLInputElement;
	private fontSizeOutput?: HTMLOutputElement;
	private hideOriginalInput?: HTMLInputElement;
	private invertInput?: HTMLInputElement;
	private charColorModeSelect?: HTMLSelectElement;
	private charColorInput?: HTMLInputElement;
	private cellColorModeSelect?: HTMLSelectElement;
	private cellColorInput?: HTMLInputElement;
	private glyphRampInput?: HTMLInputElement;

	public constructor(private readonly options: ControlPanelOptions) {
		this.container = document.createElement('div');
		this.container.id = 'textmode-ascii-overlay-control-panel-root';

		// Apply fixed floating positioning
		Object.assign(this.container.style, {
			position: 'fixed',
			top: '30px', // placed slightly down
			right: '20px',
			zIndex: '2147483646',
			width: '340px',
		});

		this.shadowRoot = this.container.attachShadow({ mode: 'open' });

		// Build isolated styles
		const styleEl = document.createElement('style');
		styleEl.textContent = `
			:host {
				display: block;
				position: relative;
				width: 340px;
				max-width: 340px;
				background: #0b1020;
				color: #f8fafc;
				font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
				border-radius: 12px;
				border: 1px solid #243047;
				box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
				overflow: hidden;
			}
			.close-btn {
				position: absolute;
				top: 12px;
				right: 12px;
				width: 24px;
				height: 24px;
				padding: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				background: transparent;
				border: none;
				color: #94a3b8;
				font-size: 20px;
				line-height: 1;
				cursor: pointer;
				transition: color 0.15s ease;
			}
			.close-btn:hover {
				color: #f8fafc;
				border-color: transparent !important;
				background: transparent !important;
			}
			.color-row {
				display: flex;
				gap: 8px;
				align-items: center;
				margin-top: 4px;
			}
			.color-row select {
				flex: 1;
			}
			.color-row input[type="color"] {
				flex: 0 0 42px;
				width: 42px;
				height: 28px;
				padding: 0;
				border: 1px solid #334155;
				border-radius: 5px;
				background: #0f172a;
				cursor: pointer;
				box-sizing: border-box;
			}
			.color-row input[type="color"]:disabled {
				opacity: 0.4;
				cursor: not-allowed;
			}
			${popupStyles.replace(/body\s*\{/g, '.popup {')}
		`;
		this.shadowRoot.appendChild(styleEl);

		// Build panel body
		const mainEl = document.createElement('main');
		mainEl.className = 'popup';
		this.shadowRoot.appendChild(mainEl);

		// Close button
		const closeButton = document.createElement('button');
		closeButton.type = 'button';
		closeButton.className = 'close-btn';
		closeButton.innerHTML = '&times;';
		closeButton.ariaLabel = 'Close panel';
		closeButton.addEventListener('click', () => this.options.onClose());
		mainEl.appendChild(closeButton);

		// Header
		const header = document.createElement('header');
		header.className = 'popup__header';
		const headerDiv = document.createElement('div');
		const h1 = document.createElement('h1');
		h1.textContent = 'ASCII Overlay';
		this.statusEl = document.createElement('p');
		this.statusEl.id = 'status';
		this.statusEl.textContent = 'Select a canvas or video to start.';
		headerDiv.appendChild(h1);
		headerDiv.appendChild(this.statusEl);
		header.appendChild(headerDiv);
		mainEl.appendChild(header);

		// Primary actions
		const actions = document.createElement('section');
		actions.className = 'popup__actions popup__actions--primary';
		actions.ariaLabel = 'Actions';
		this.pickButton = document.createElement('button');
		this.pickButton.id = 'pick';
		this.pickButton.type = 'button';
		this.pickButton.textContent = 'Select Media';
		this.pickButton.addEventListener('click', () => this.options.onStartPicking());
		actions.appendChild(this.pickButton);
		mainEl.appendChild(actions);

		// Overlays section
		this.overlaysEl = document.createElement('section');
		this.overlaysEl.id = 'overlays';
		this.overlaysEl.className = 'overlay-list';
		this.overlaysEl.ariaLive = 'polite';
		mainEl.appendChild(this.overlaysEl);
	}

	public mount(): void {
		if (!this.container.isConnected) {
			document.documentElement.appendChild(this.container);
		}
	}

	public unmount(): void {
		this.container.remove();
	}

	public setStatus(message: string): void {
		this.statusEl.textContent = message;
	}

	public updateState(overlays: OverlayDescriptor[]): void {
		const overlay = overlays[0];

		if (!overlay) {
			this.activeOverlayId = undefined;
			this.statusSpan = undefined;
			this.enabledInput = undefined;
			this.opacityInput = undefined;
			this.opacityOutput = undefined;
			this.fontSizeInput = undefined;
			this.fontSizeOutput = undefined;
			this.hideOriginalInput = undefined;
			this.invertInput = undefined;
			this.charColorModeSelect = undefined;
			this.charColorInput = undefined;
			this.cellColorModeSelect = undefined;
			this.cellColorInput = undefined;
			this.glyphRampInput = undefined;

			this.overlaysEl.replaceChildren();
			const empty = document.createElement('p');
			empty.textContent = 'No media selected.';
			empty.className = 'empty-state';
			this.overlaysEl.appendChild(empty);
			this.pickButton.textContent = 'Select Media';
			this.setStatus('No media selected.');
			return;
		}

		this.pickButton.textContent = 'Replace Media';

		if (this.activeOverlayId !== overlay.id) {
			this.activeOverlayId = overlay.id;
			this.overlaysEl.replaceChildren();
			this.overlaysEl.appendChild(this.createOverlayCard(overlay));
		} else {
			// Update status span
			if (this.statusSpan) {
				this.statusSpan.className = `overlay-card__status overlay-card__status--${overlay.status}`;
				this.statusSpan.textContent = overlay.status;
			}

			// Update values in-place
			if (this.enabledInput) {
				this.updateCheckbox(this.enabledInput, overlay.settings.enabled);
			}
			if (this.opacityInput && this.opacityOutput) {
				this.updateRange(this.opacityInput, this.opacityOutput, overlay.settings.opacity, this.formatPercent);
			}
			if (this.fontSizeInput && this.fontSizeOutput) {
				this.updateRange(
					this.fontSizeInput,
					this.fontSizeOutput,
					overlay.settings.fontSize,
					(value) => `${value}px`
				);
			}
			if (this.hideOriginalInput) {
				this.updateCheckbox(this.hideOriginalInput, overlay.settings.hideOriginal);
			}
			if (this.invertInput) {
				this.updateCheckbox(this.invertInput, overlay.settings.invert);
			}
			if (this.charColorModeSelect) {
				this.updateSelect(this.charColorModeSelect, overlay.settings.charColorMode);
			}
			if (this.charColorInput) {
				this.updateColorInput(
					this.charColorInput,
					overlay.settings.charColor,
					overlay.settings.charColorMode === 'sampled'
				);
			}
			if (this.cellColorModeSelect) {
				this.updateSelect(this.cellColorModeSelect, overlay.settings.cellColorMode);
			}
			if (this.cellColorInput) {
				this.updateColorInput(
					this.cellColorInput,
					overlay.settings.cellColor,
					overlay.settings.cellColorMode === 'sampled'
				);
			}
			if (this.glyphRampInput) {
				this.updateTextInput(this.glyphRampInput, overlay.settings.glyphRamp);
			}
		}

		this.setStatus('Overlay active.');
	}

	private createOverlayCard(overlay: OverlayDescriptor): HTMLElement {
		const card = document.createElement('article');
		card.className = 'overlay-card';

		const header = document.createElement('header');
		header.className = 'overlay-card__header';
		const title = document.createElement('div');
		title.className = 'overlay-card__title';
		title.appendChild(
			document.createTextNode(overlay.elementKind === 'video' ? 'Video selected' : 'Canvas selected')
		);

		const description = document.createElement('p');
		description.textContent = overlay.elementLabel;
		title.appendChild(description);

		this.statusSpan = document.createElement('span');
		this.statusSpan.className = `overlay-card__status overlay-card__status--${overlay.status}`;
		this.statusSpan.textContent = overlay.status;
		header.appendChild(title);
		header.appendChild(this.statusSpan);
		card.appendChild(header);

		const quickControls = document.createElement('div');
		quickControls.className = 'control-list';

		const enabledField = this.toggleField('Overlay', overlay.settings.enabled, (enabled) =>
			this.options.onUpdateOverlay(overlay.id, { enabled })
		);
		this.enabledInput = enabledField.querySelector('input') as HTMLInputElement;
		quickControls.appendChild(enabledField);

		const opacityField = this.sliderField(
			'Opacity',
			overlay.settings.opacity,
			0,
			1,
			0.05,
			(opacity) => this.options.onUpdateOverlay(overlay.id, { opacity }),
			this.formatPercent
		);
		this.opacityInput = opacityField.querySelector('input') as HTMLInputElement;
		this.opacityOutput = opacityField.querySelector('output') as HTMLOutputElement;
		quickControls.appendChild(opacityField);

		const fontSizeField = this.sliderField(
			'Font size',
			overlay.settings.fontSize,
			8,
			64,
			1,
			(fontSize) => this.options.onUpdateOverlay(overlay.id, { fontSize }),
			(value) => `${value}px`
		);
		this.fontSizeInput = fontSizeField.querySelector('input') as HTMLInputElement;
		this.fontSizeOutput = fontSizeField.querySelector('output') as HTMLOutputElement;
		quickControls.appendChild(fontSizeField);

		card.appendChild(quickControls);

		card.appendChild(this.createAdvancedControls(overlay));

		if (overlay.latestError) {
			const error = document.createElement('p');
			error.className = 'error';
			error.textContent = overlay.latestError;
			card.appendChild(error);
		}

		const remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'button button--danger';
		remove.textContent = 'Remove overlay';
		remove.addEventListener('click', () => this.options.onRemoveOverlay(overlay.id));
		card.appendChild(remove);

		return card;
	}

	private createAdvancedControls(overlay: OverlayDescriptor): HTMLElement {
		const details = document.createElement('details');
		details.className = 'advanced';

		const summary = document.createElement('summary');
		summary.textContent = 'Advanced settings';
		details.appendChild(summary);

		const controls = document.createElement('div');
		controls.className = 'control-list control-list--advanced';

		const hideOriginalField = this.toggleField('Hide original', overlay.settings.hideOriginal, (hideOriginal) =>
			this.options.onUpdateOverlay(overlay.id, { hideOriginal })
		);
		this.hideOriginalInput = hideOriginalField.querySelector('input') as HTMLInputElement;
		controls.appendChild(hideOriginalField);

		const invertField = this.toggleField('Invert', overlay.settings.invert, (invert) =>
			this.options.onUpdateOverlay(overlay.id, { invert })
		);
		this.invertInput = invertField.querySelector('input') as HTMLInputElement;
		controls.appendChild(invertField);

		const charRow = this.colorModeRow(
			'Characters',
			overlay.settings.charColorMode,
			overlay.settings.charColor,
			(charColorMode) => this.options.onUpdateOverlay(overlay.id, { charColorMode }),
			(charColor) => this.options.onUpdateOverlay(overlay.id, { charColor })
		);
		this.charColorModeSelect = charRow.querySelector('select') as HTMLSelectElement;
		this.charColorInput = charRow.querySelector('input[type="color"]') as HTMLInputElement;
		controls.appendChild(charRow);

		const cellRow = this.colorModeRow(
			'Cells',
			overlay.settings.cellColorMode,
			overlay.settings.cellColor,
			(cellColorMode) => this.options.onUpdateOverlay(overlay.id, { cellColorMode }),
			(cellColor) => this.options.onUpdateOverlay(overlay.id, { cellColor })
		);
		this.cellColorModeSelect = cellRow.querySelector('select') as HTMLSelectElement;
		this.cellColorInput = cellRow.querySelector('input[type="color"]') as HTMLInputElement;
		controls.appendChild(cellRow);

		const glyphRampField = this.textField('Glyph ramp', overlay.settings.glyphRamp, (glyphRamp) =>
			this.options.onUpdateOverlay(overlay.id, { glyphRamp })
		);
		this.glyphRampInput = glyphRampField.querySelector('input') as HTMLInputElement;
		controls.appendChild(glyphRampField);

		details.appendChild(controls);
		return details;
	}

	private toggleField(label: string, value: boolean, onChange: (value: boolean) => void): HTMLElement {
		const row = document.createElement('label');
		row.className = 'toggle-row field';
		row.appendChild(document.createTextNode(label));
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = value;
		input.addEventListener('change', () => onChange(input.checked));
		row.appendChild(input);
		return row;
	}

	private colorModeRow(
		label: string,
		modeValue: 'sampled' | 'fixed',
		colorValue: string,
		onModeChange: (mode: 'sampled' | 'fixed') => void,
		onColorChange: (color: string) => void
	): HTMLElement {
		const field = this.fieldBase(label);

		const row = document.createElement('div');
		row.className = 'color-row';

		const select = document.createElement('select');
		for (const optionValue of ['sampled', 'fixed'] as const) {
			const option = document.createElement('option');
			option.value = optionValue;
			option.textContent = optionValue;
			option.selected = optionValue === modeValue;
			select.appendChild(option);
		}
		select.addEventListener('change', () => {
			const nextMode = select.value as 'sampled' | 'fixed';
			input.disabled = nextMode === 'sampled';
			onModeChange(nextMode);
		});

		const input = document.createElement('input');
		input.type = 'color';
		input.value = colorValue;
		input.disabled = modeValue === 'sampled';
		input.addEventListener('input', () => onColorChange(input.value));

		row.appendChild(select);
		row.appendChild(input);
		field.appendChild(row);

		return field;
	}

	private sliderField(
		label: string,
		value: number,
		min: number,
		max: number,
		step: number,
		onChange: (value: number) => void,
		formatValue: (value: number) => string = String
	): HTMLElement {
		const field = this.fieldBase(label);
		field.classList.add('field--slider');
		const input = document.createElement('input');
		const output = document.createElement('output');
		input.type = 'range';
		input.min = String(min);
		input.max = String(max);
		input.step = String(step);
		input.value = String(value);
		output.value = formatValue(value);
		input.addEventListener('input', () => {
			const nextValue = Number(input.value);
			output.value = formatValue(nextValue);
			onChange(nextValue);
		});
		field.appendChild(input);
		field.appendChild(output);
		return field;
	}

	private textField(label: string, value: string, onChange: (value: string) => void): HTMLElement {
		const field = this.fieldBase(label);
		const input = document.createElement('input');
		input.type = 'text';
		input.value = value;
		input.addEventListener('change', () => onChange(input.value));
		field.appendChild(input);
		return field;
	}

	private fieldBase(label: string): HTMLElement {
		const field = document.createElement('div');
		field.className = 'field';
		const labelEl = document.createElement('label');
		labelEl.textContent = label;
		field.appendChild(labelEl);
		return field;
	}

	private formatPercent(value: number): string {
		return `${Math.round(value * 100)}%`;
	}

	private updateCheckbox(input: HTMLInputElement, value: boolean): void {
		if (input.checked !== value) {
			input.checked = value;
		}
	}

	private updateRange(
		input: HTMLInputElement,
		output: HTMLOutputElement,
		value: number,
		format: (v: number) => string
	): void {
		if (Number(input.value) !== value) {
			input.value = String(value);
			output.value = format(value);
		}
	}

	private updateSelect(select: HTMLSelectElement, value: string): void {
		if (select.value !== value) {
			select.value = value;
		}
	}

	private updateColorInput(input: HTMLInputElement, value: string, disabled: boolean): void {
		if (input.value !== value) {
			input.value = value;
		}
		if (input.disabled !== disabled) {
			input.disabled = disabled;
		}
	}

	private updateTextInput(input: HTMLInputElement, value: string): void {
		if (this.shadowRoot.activeElement !== input && input.value !== value) {
			input.value = value;
		}
	}
}
