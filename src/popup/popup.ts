import './popup.css';
import { getActiveTab, injectContentRuntime, sendMessageToTab } from '../shared/browser-api';
import type { ContentToPopupMessage, RuntimeAck, RuntimeMessage } from '../shared/messages';
import type { OverlayDescriptor, OverlaySettings } from '../shared/overlay-settings';

const statusEl = getElement<HTMLParagraphElement>('status');
const overlaysEl = getElement<HTMLElement>('overlays');
const pickButton = getElement<HTMLButtonElement>('pick');

pickButton.addEventListener('click', () => execute({ type: 'START_PICKING' }));

chrome.runtime.onMessage.addListener((message: ContentToPopupMessage) => {
	if (message.type === 'OVERLAY_LIST_CHANGED') {
		renderOverlayState(message.overlays);
		setStatus(message.overlays.length > 0 ? 'Overlay active.' : 'No media selected.');
	} else if (message.type === 'PICKING_STARTED') {
		setStatus('Click a canvas or video. Press Escape to cancel.');
	} else if (message.type === 'PICKING_CANCELLED') {
		setStatus('Selection cancelled.');
	} else if (message.type === 'ERROR') {
		setStatus(message.message);
	}
});

void refresh();

async function refresh(): Promise<void> {
	await execute({ type: 'LIST_OVERLAYS' });
}

async function execute(message: RuntimeMessage): Promise<void> {
	try {
		const tab = await getActiveTab();
		if (!tab?.id) {
			setStatus('No active tab found.');
			return;
		}

		await ensureContentRuntime(tab.id);
		const response = await sendMessageToTab<RuntimeAck>(tab.id, message);
		if (!response.ok) {
			setStatus(response.error ?? 'The page runtime did not accept the request.');
			return;
		}

		if (message.type === 'START_PICKING') {
			setStatus('Click a canvas or video. Press Escape to cancel.');
		} else {
			setStatus(response.overlays?.length ? 'Overlay active.' : 'No media selected.');
		}

		if (response.overlays) {
			renderOverlayState(response.overlays);
		}
	} catch (error) {
		setStatus(error instanceof Error ? error.message : 'Unable to contact the active tab.');
	}
}

async function ensureContentRuntime(tabId: number): Promise<void> {
	await injectContentRuntime(tabId);
	for (let attempt = 0; attempt < 20; attempt++) {
		try {
			const response = await sendMessageToTab<RuntimeAck>(tabId, { type: 'PING' });
			if (response.ok) {
				return;
			}
		} catch {
			await delay(50);
		}
	}
	throw new Error('Timed out while starting the page runtime.');
}

function renderOverlayState(overlays: OverlayDescriptor[]): void {
	overlaysEl.replaceChildren();
	const overlay = overlays[0];
	pickButton.textContent = overlay ? 'Replace Media' : 'Select Media';

	if (!overlay) {
		const empty = document.createElement('p');
		empty.textContent = 'No media selected.';
		empty.className = 'empty-state';
		overlaysEl.append(empty);
		return;
	}

	overlaysEl.append(createOverlayCard(overlay));
}

function createOverlayCard(overlay: OverlayDescriptor): HTMLElement {
	const card = document.createElement('article');
	card.className = 'overlay-card';

	const header = document.createElement('header');
	header.className = 'overlay-card__header';
	const title = document.createElement('div');
	title.className = 'overlay-card__title';
	title.append(text(overlay.elementKind === 'video' ? 'Video selected' : 'Canvas selected'));
	const description = document.createElement('p');
	description.textContent = overlay.elementLabel;
	title.append(description);

	const status = document.createElement('span');
	status.className = `overlay-card__status overlay-card__status--${overlay.status}`;
	status.textContent = overlay.status;
	header.append(title, status);
	card.append(header);

	const quickControls = document.createElement('div');
	quickControls.className = 'control-list';
	quickControls.append(
		toggleField('Overlay', overlay.settings.enabled, (enabled) => updateOverlay(overlay.id, { enabled })),
		sliderField(
			'Opacity',
			overlay.settings.opacity,
			0,
			1,
			0.05,
			(opacity) => updateOverlay(overlay.id, { opacity }),
			formatPercent
		),
		sliderField(
			'Font size',
			overlay.settings.fontSize,
			4,
			48,
			1,
			(fontSize) => updateOverlay(overlay.id, { fontSize }),
			(value) => `${value}px`
		)
	);
	card.append(quickControls);

	card.append(createAdvancedControls(overlay));

	if (overlay.latestError) {
		const error = document.createElement('p');
		error.className = 'error';
		error.textContent = overlay.latestError;
		card.append(error);
	}

	const remove = document.createElement('button');
	remove.type = 'button';
	remove.className = 'button button--danger';
	remove.textContent = 'Remove overlay';
	remove.addEventListener('click', () => execute({ type: 'REMOVE_OVERLAY', id: overlay.id }));
	card.append(remove);

	return card;
}

function createAdvancedControls(overlay: OverlayDescriptor): HTMLElement {
	const details = document.createElement('details');
	details.className = 'advanced';

	const summary = document.createElement('summary');
	summary.textContent = 'Advanced settings';
	details.append(summary);

	const controls = document.createElement('div');
	controls.className = 'control-list control-list--advanced';
	controls.append(
		toggleField('Hide original', overlay.settings.hideOriginal, (hideOriginal) =>
			updateOverlay(overlay.id, { hideOriginal })
		),
		numberField('FPS', overlay.settings.frameRate, 1, 60, 1, (frameRate) =>
			updateOverlay(overlay.id, { frameRate })
		),
		selectField(
			'Mode',
			overlay.settings.conversionMode,
			['brightness', 'accurate', 'color', 'contour'],
			(conversionMode) => updateOverlay(overlay.id, { conversionMode })
		),
		toggleField('Invert', overlay.settings.invert, (invert) => updateOverlay(overlay.id, { invert })),
		colorModeField('Characters', overlay.settings.charColorMode, (charColorMode) =>
			updateOverlay(overlay.id, { charColorMode })
		),
		colorModeField('Cells', overlay.settings.cellColorMode, (cellColorMode) =>
			updateOverlay(overlay.id, { cellColorMode })
		),
		colorField('Cell color', overlay.settings.cellColor, (cellColor) => updateOverlay(overlay.id, { cellColor })),
		numberField('Brightness min', overlay.settings.brightnessStart, 0, 255, 1, (brightnessStart) =>
			updateOverlay(overlay.id, { brightnessStart })
		),
		numberField('Brightness max', overlay.settings.brightnessEnd, 0, 255, 1, (brightnessEnd) =>
			updateOverlay(overlay.id, { brightnessEnd })
		),
		textField('Glyph ramp', overlay.settings.glyphRamp, (glyphRamp) => updateOverlay(overlay.id, { glyphRamp }))
	);
	details.append(controls);
	return details;
}

function toggleField(label: string, value: boolean, onChange: (value: boolean) => void): HTMLElement {
	const row = document.createElement('label');
	row.className = 'toggle-row field';
	row.append(text(label));
	const input = document.createElement('input');
	input.type = 'checkbox';
	input.checked = value;
	input.addEventListener('change', () => onChange(input.checked));
	row.append(input);
	return row;
}

function numberField(
	label: string,
	value: number,
	min: number,
	max: number,
	step: number,
	onChange: (value: number) => void
): HTMLElement {
	const field = fieldBase(label);
	const input = document.createElement('input');
	input.type = 'number';
	input.min = String(min);
	input.max = String(max);
	input.step = String(step);
	input.value = String(value);
	input.addEventListener('change', () => onChange(Number(input.value)));
	field.append(input);
	return field;
}

function sliderField(
	label: string,
	value: number,
	min: number,
	max: number,
	step: number,
	onChange: (value: number) => void,
	formatValue: (value: number) => string = String
): HTMLElement {
	const field = fieldBase(label);
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
	field.append(input, output);
	return field;
}

function selectField<T extends string>(
	label: string,
	value: T,
	options: readonly T[],
	onChange: (value: T) => void
): HTMLElement {
	const field = fieldBase(label);
	const select = document.createElement('select');
	for (const optionValue of options) {
		const option = document.createElement('option');
		option.value = optionValue;
		option.textContent = optionValue;
		option.selected = optionValue === value;
		select.append(option);
	}
	select.addEventListener('change', () => onChange(select.value as T));
	field.append(select);
	return field;
}

function colorModeField(
	label: string,
	value: OverlaySettings['charColorMode'],
	onChange: (value: OverlaySettings['charColorMode']) => void
): HTMLElement {
	return selectField(label, value, ['sampled', 'fixed'] as const, onChange);
}

function colorField(label: string, value: string, onChange: (value: string) => void): HTMLElement {
	const field = fieldBase(label);
	const input = document.createElement('input');
	input.type = 'color';
	input.value = value;
	input.addEventListener('input', () => onChange(input.value));
	field.append(input);
	return field;
}

function textField(label: string, value: string, onChange: (value: string) => void): HTMLElement {
	const field = fieldBase(label);
	const input = document.createElement('input');
	input.type = 'text';
	input.value = value;
	input.addEventListener('change', () => onChange(input.value));
	field.append(input);
	return field;
}

function fieldBase(label: string): HTMLElement {
	const field = document.createElement('div');
	field.className = 'field';
	const labelEl = document.createElement('label');
	labelEl.textContent = label;
	field.append(labelEl);
	return field;
}

function updateOverlay(id: string, settings: Partial<OverlaySettings>): void {
	void execute({ type: 'UPDATE_OVERLAY', id, settings });
}

function setStatus(message: string): void {
	statusEl.textContent = message;
}

function text(value: string): Text {
	return document.createTextNode(value);
}

function getElement<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing popup element #${id}.`);
	}
	return element as T;
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatPercent(value: number): string {
	return `${Math.round(value * 100)}%`;
}
