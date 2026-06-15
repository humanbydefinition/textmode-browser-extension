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

	public constructor(private readonly options: ControlPanelOptions) {
		this.container = document.createElement('div');
		this.container.id = 'textmode-ascii-overlay-control-panel-root';

		// Apply fixed floating positioning
		Object.assign(this.container.style, {
			position: 'fixed',
			top: '10px', // placed slightly down
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
		this.overlaysEl.replaceChildren();
		const overlay = overlays[0];
		this.pickButton.textContent = overlay ? 'Replace Media' : 'Select Media';

		if (!overlay) {
			const empty = document.createElement('p');
			empty.textContent = 'No media selected.';
			empty.className = 'empty-state';
			this.overlaysEl.appendChild(empty);
			this.setStatus('No media selected.');
			return;
		}

		this.setStatus('Overlay active.');
		this.overlaysEl.appendChild(this.createOverlayCard(overlay));
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

		const status = document.createElement('span');
		status.className = `overlay-card__status overlay-card__status--${overlay.status}`;
		status.textContent = overlay.status;
		header.appendChild(title);
		header.appendChild(status);
		card.appendChild(header);

		const quickControls = document.createElement('div');
		quickControls.className = 'control-list';
		quickControls.appendChild(
			this.toggleField('Overlay', overlay.settings.enabled, (enabled) =>
				this.options.onUpdateOverlay(overlay.id, { enabled })
			)
		);
		quickControls.appendChild(
			this.sliderField(
				'Opacity',
				overlay.settings.opacity,
				0,
				1,
				0.05,
				(opacity) => this.options.onUpdateOverlay(overlay.id, { opacity }),
				this.formatPercent
			)
		);
		quickControls.appendChild(
			this.sliderField(
				'Font size',
				overlay.settings.fontSize,
				4,
				48,
				1,
				(fontSize) => this.options.onUpdateOverlay(overlay.id, { fontSize }),
				(value) => `${value}px`
			)
		);
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

		controls.appendChild(
			this.toggleField('Hide original', overlay.settings.hideOriginal, (hideOriginal) =>
				this.options.onUpdateOverlay(overlay.id, { hideOriginal })
			)
		);
		controls.appendChild(
			this.toggleField('Invert', overlay.settings.invert, (invert) =>
				this.options.onUpdateOverlay(overlay.id, { invert })
			)
		);
		controls.appendChild(
			this.colorModeRow(
				'Characters',
				overlay.settings.charColorMode,
				overlay.settings.charColor,
				(charColorMode) => this.options.onUpdateOverlay(overlay.id, { charColorMode }),
				(charColor) => this.options.onUpdateOverlay(overlay.id, { charColor })
			)
		);
		controls.appendChild(
			this.colorModeRow(
				'Cells',
				overlay.settings.cellColorMode,
				overlay.settings.cellColor,
				(cellColorMode) => this.options.onUpdateOverlay(overlay.id, { cellColorMode }),
				(cellColor) => this.options.onUpdateOverlay(overlay.id, { cellColor })
			)
		);
		controls.appendChild(
			this.textField('Glyph ramp', overlay.settings.glyphRamp, (glyphRamp) =>
				this.options.onUpdateOverlay(overlay.id, { glyphRamp })
			)
		);

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
}
