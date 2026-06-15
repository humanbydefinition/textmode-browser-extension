import * as React from 'react';
import type { OverlaySettings } from '../shared/overlay-settings';
import {
	formatPercent,
	formatPixels,
	labelFromValue,
	overlaySettingLimits,
	sourceColorModeOptions,
} from './overlay-ui-model';
import { SettingField, ToggleField } from './components/SettingField';

interface OverlaySettingsFormProps {
	settings: OverlaySettings;
	onChange: (settings: Partial<OverlaySettings>) => void;
}

export function OverlaySettingsForm({ settings, onChange }: OverlaySettingsFormProps): React.JSX.Element {
	return (
		<div className="tm-settings-form">
			<section className="tm-control-group" aria-label="Quick overlay controls">
				<ToggleField label="Overlay" checked={settings.enabled} onChange={(enabled) => onChange({ enabled })} />
				<RangeField
					label="Opacity"
					value={settings.opacity}
					limits={overlaySettingLimits.opacity}
					format={formatPercent}
					onChange={(opacity) => onChange({ opacity })}
				/>
				<RangeField
					label="Font size"
					value={settings.fontSize}
					limits={overlaySettingLimits.fontSize}
					format={formatPixels}
					onChange={(fontSize) => onChange({ fontSize })}
				/>
			</section>

			<details className="tm-advanced">
				<summary>Advanced settings</summary>
				<div className="tm-control-group tm-control-group--advanced">
					<ToggleField label="Invert" checked={settings.invert} onChange={(invert) => onChange({ invert })} />
					<ColorModeField
						label="Characters"
						mode={settings.charColorMode}
						color={settings.charColor}
						onModeChange={(charColorMode) => onChange({ charColorMode })}
						onColorChange={(charColor) => onChange({ charColor })}
					/>
					<ColorModeField
						label="Cells"
						mode={settings.cellColorMode}
						color={settings.cellColor}
						onModeChange={(cellColorMode) => onChange({ cellColorMode })}
						onColorChange={(cellColor) => onChange({ cellColor })}
					/>
					<SettingField label="Glyph ramp">
						<input
							className="tm-input"
							type="text"
							value={settings.glyphRamp}
							onChange={(event) => onChange({ glyphRamp: event.currentTarget.value })}
						/>
					</SettingField>
				</div>
			</details>
		</div>
	);
}

interface NumericLimits {
	min: number;
	max: number;
	step: number;
}

interface RangeFieldProps {
	label: string;
	value: number;
	limits: NumericLimits;
	format: (value: number) => string;
	onChange: (value: number) => void;
}

function RangeField({ label, value, limits, format, onChange }: RangeFieldProps): React.JSX.Element {
	return (
		<SettingField label={label} value={format(value)} className="tm-field--range">
			<input
				className="tm-slider"
				type="range"
				min={limits.min}
				max={limits.max}
				step={limits.step}
				value={value}
				onChange={(event) => onChange(Number(event.currentTarget.value))}
			/>
		</SettingField>
	);
}

interface ColorModeFieldProps {
	label: string;
	mode: OverlaySettings['charColorMode'];
	color: string;
	onModeChange: (mode: OverlaySettings['charColorMode']) => void;
	onColorChange: (color: string) => void;
}

function ColorModeField({ label, mode, color, onModeChange, onColorChange }: ColorModeFieldProps): React.JSX.Element {
	return (
		<SettingField label={label}>
			<div className="tm-color-row">
				<select
					className="tm-select"
					value={mode}
					onChange={(event) => onModeChange(event.currentTarget.value as OverlaySettings['charColorMode'])}
				>
					{sourceColorModeOptions.map((option) => (
						<option key={option} value={option}>
							{labelFromValue(option)}
						</option>
					))}
				</select>
				<input
					className="tm-color-input"
					type="color"
					value={color}
					disabled={mode === 'sampled'}
					onChange={(event) => onColorChange(event.currentTarget.value)}
					aria-label={`${label} fixed color`}
				/>
			</div>
		</SettingField>
	);
}
