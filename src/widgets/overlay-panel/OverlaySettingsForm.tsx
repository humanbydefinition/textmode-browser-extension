import * as React from 'react';
import { ArrowLeft, ArrowRight, Download, FileCode2, FileText, ImageDown } from 'lucide-react';
import type { BundledFontId, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { getAvailableFonts, getPreferredFontEntry, resolveFontId } from '../../domain/fonts/font-registry';
import { getAdjacentGlyphRampPreset, getGlyphRampPresetName } from '../../domain/overlay/glyph-ramp-registry';
import {
	formatPercent,
	formatPixels,
	labelFromValue,
	overlaySettingLimits,
	sourceColorModeOptions,
} from './overlay-ui-model';
import { Button } from './components/button';
import { ColorPicker } from './components/color-picker';
import { FontCombobox } from './components/font-combobox';
import { SettingField, ToggleField } from './components/SettingField';
import { Slider } from './components/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs';
import { ToggleGroup, ToggleGroupItem } from './components/toggle-group';

interface OverlaySettingsFormProps {
	settings: OverlaySettings;
	onChange: (settings: Partial<OverlaySettings>) => void;
	onExport: (format: OverlayExportFormat) => void;
}

export function OverlaySettingsForm({ settings, onChange, onExport }: OverlaySettingsFormProps): React.JSX.Element {
	const availableFonts = getAvailableFonts();
	const resolvedFontId = resolveFontId(settings.fontId);
	const selectedFont = getPreferredFontEntry(settings.fontId);
	const glyphRampFontId = resolvedFontId ?? settings.fontId;

	React.useEffect(() => {
		if (resolvedFontId && resolvedFontId !== settings.fontId) {
			onChange({ fontId: resolvedFontId });
		}
	}, [onChange, resolvedFontId, settings.fontId]);

	return (
		<div className="tm-settings-form">
			<section className="tm-control-group" aria-label="quick overlay controls">
				<ToggleField label="overlay" checked={settings.enabled} onChange={(enabled) => onChange({ enabled })} />
				<RangeField
					label="opacity"
					value={settings.opacity}
					limits={overlaySettingLimits.opacity}
					format={formatPercent}
					onChange={(opacity) => onChange({ opacity })}
				/>
				<RangeField
					label="font size"
					value={settings.fontSize}
					limits={overlaySettingLimits.fontSize}
					format={formatPixels}
					onChange={(fontSize) => onChange({ fontSize })}
				/>
			</section>

			<Tabs defaultValue="export" className="tm-settings-tabs">
				<TabsList className="tm-tabs-list" aria-label="overlay controls">
					<TabsTrigger className="tm-tabs-trigger" value="export">
						export
					</TabsTrigger>
					<TabsTrigger className="tm-tabs-trigger" value="advanced">
						advanced
					</TabsTrigger>
				</TabsList>
				<TabsContent className="tm-tabs-content" value="export" forceMount>
					<div className="tm-export-grid">
						<ExportButton format="txt" label="TXT" onExport={onExport} />
						<ExportButton format="svg" label="SVG" onExport={onExport} />
						<ExportButton format="png" label="PNG" onExport={onExport} />
						<ExportButton format="jpg" label="JPG" onExport={onExport} />
					</div>
				</TabsContent>
				<TabsContent className="tm-tabs-content" value="advanced" forceMount>
					<div className="tm-control-group tm-control-group--advanced">
						<ToggleField
							label="invert"
							checked={settings.invert}
							onChange={(invert) => onChange({ invert })}
						/>
						<ColorModeField
							label="characters"
							mode={settings.charColorMode}
							color={settings.charColor}
							onModeChange={(charColorMode) => onChange({ charColorMode })}
							onColorChange={(charColor) => onChange({ charColor })}
						/>
						<ColorModeField
							label="cells"
							mode={settings.cellColorMode}
							color={settings.cellColor}
							onModeChange={(cellColorMode) => onChange({ cellColorMode })}
							onColorChange={(cellColor) => onChange({ cellColor })}
						/>
						<GlyphRampField
							fontId={glyphRampFontId}
							value={settings.glyphRamp}
							onChange={(glyphRamp) => onChange({ glyphRamp })}
						/>
						<SettingField label="font" value={selectedFont?.displayName ?? 'System default'}>
							<FontCombobox
								fonts={availableFonts}
								value={resolvedFontId ?? settings.fontId}
								onChange={(fontId) => onChange({ fontId })}
								disabled={availableFonts.length === 0}
							/>
						</SettingField>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

interface GlyphRampFieldProps {
	fontId: BundledFontId;
	value: string;
	onChange: (glyphRamp: string) => void;
}

function GlyphRampField({ fontId, value, onChange }: GlyphRampFieldProps): React.JSX.Element {
	const inputId = React.useId();
	const presetName = getGlyphRampPresetName(fontId, value);

	function selectAdjacentPreset(direction: -1 | 1): void {
		onChange(getAdjacentGlyphRampPreset(fontId, value, direction).glyphRamp);
	}

	return (
		<div className="tm-field">
			<div className="tm-field__label">
				<label htmlFor={inputId}>glyph ramp</label>
				<div className="tm-glyph-ramp-actions">
					<output className="tm-glyph-ramp-name">{presetName}</output>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="tm-button tm-button--ghost tm-button--glyph-nav"
						aria-label="previous glyph ramp"
						title="previous glyph ramp"
						onClick={() => selectAdjacentPreset(-1)}
					>
						<ArrowLeft aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="tm-button tm-button--ghost tm-button--glyph-nav"
						aria-label="next glyph ramp"
						title="next glyph ramp"
						onClick={() => selectAdjacentPreset(1)}
					>
						<ArrowRight aria-hidden="true" />
					</Button>
				</div>
			</div>
			<input
				id={inputId}
				className="tm-input"
				type="text"
				value={value}
				onChange={(event) => onChange(event.currentTarget.value)}
			/>
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
			<Slider
				min={limits.min}
				max={limits.max}
				step={limits.step}
				value={[value]}
				onValueChange={([nextValue]) => {
					if (typeof nextValue === 'number') {
						onChange(nextValue);
					}
				}}
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
				<ToggleGroup
					type="single"
					value={mode}
					className="tm-toggle-group tm-color-mode-group"
					aria-label={`${label} color mode`}
					onValueChange={(nextMode) => {
						if (nextMode) {
							onModeChange(nextMode as OverlaySettings['charColorMode']);
						}
					}}
				>
					{sourceColorModeOptions.map((option) => (
						<ToggleGroupItem
							key={option}
							value={option}
							className="tm-toggle-group-item tm-color-mode-item"
							aria-label={`${label} ${labelFromValue(option)}`}
						>
							{labelFromValue(option)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<ColorPicker label={label} value={color} onChange={onColorChange} />
			</div>
		</SettingField>
	);
}

interface ExportButtonProps {
	format: OverlayExportFormat;
	label: string;
	onExport: (format: OverlayExportFormat) => void;
}

function ExportButton({ format, label, onExport }: ExportButtonProps): React.JSX.Element {
	const Icon = getExportIcon(format);

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="tm-button tm-button--outline tm-button--sm tm-export-button"
			aria-label={`export ${label}`}
			onClick={() => onExport(format)}
		>
			<Icon aria-hidden="true" />
			<span>{label}</span>
			<Download aria-hidden="true" className="tm-export-button__download" />
		</Button>
	);
}

function getExportIcon(format: OverlayExportFormat): typeof FileText {
	switch (format) {
		case 'txt':
			return FileText;
		case 'svg':
			return FileCode2;
		case 'png':
		case 'jpg':
			return ImageDown;
	}
}
