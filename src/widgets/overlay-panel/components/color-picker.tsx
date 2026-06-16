import * as React from 'react';
import { Pipette } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
	formatHexColor,
	getDisplayColor,
	getHsvaFromHex,
	getPopoverPortalContainer,
	hsvaToRgba,
	normalizeHexColor,
	type HsvaColor,
} from '../color-picker-model';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover';
import { ColorSwatch } from './color-swatch';

interface ColorPickerProps {
	label: string;
	value: string;
	onChange: (color: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps): React.JSX.Element {
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const colorSpaceRef = React.useRef<HTMLDivElement>(null);
	const [open, setOpen] = React.useState(false);
	const [draftValue, setDraftValue] = React.useState(value.toLowerCase());
	const [color, setColor] = React.useState(() => getHsvaFromHex(value));
	const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

	React.useEffect(() => {
		setDraftValue(value.toLowerCase());
		setColor(getHsvaFromHex(value));
	}, [value]);

	React.useLayoutEffect(() => {
		setPortalContainer(getPopoverPortalContainer(triggerRef.current?.getRootNode(), document.body));
	}, []);

	const normalizedValue = getDisplayColor(value);
	const currentHexColor = formatHexColor(hsvaToRgba(color));

	const commitColor = (nextColor: HsvaColor): void => {
		setColor(nextColor);
		const nextHexColor = formatHexColor(hsvaToRgba(nextColor));
		setDraftValue(nextHexColor);
		onChange(nextHexColor);
	};

	const updateColorSpace = (clientX: number, clientY: number): void => {
		const rect = colorSpaceRef.current?.getBoundingClientRect();
		if (!rect) return;

		commitColor({
			...color,
			s: clamp01((clientX - rect.left) / rect.width),
			v: clamp01(1 - (clientY - rect.top) / rect.height),
		});
	};

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) {
					setDraftValue(value.toLowerCase());
					setColor(getHsvaFromHex(value));
				}
			}}
		>
			<PopoverTrigger asChild>
				<button ref={triggerRef} type="button" className="tm-color-trigger" aria-label={`${label} color`}>
					<ColorSwatch color={normalizedValue} />
					<span className="tm-color-trigger__value">{normalizedValue}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				container={portalContainer}
				align="end"
				side="bottom"
				sideOffset={8}
				className="tm-color-popover"
			>
				<PopoverHeader className="tm-color-popover__header">
					<PopoverTitle className="tm-color-popover__title">{label} color</PopoverTitle>
					<PopoverDescription className="tm-color-popover__description">
						adjust color.
					</PopoverDescription>
				</PopoverHeader>

				<div
					ref={colorSpaceRef}
					className="tm-color-space"
					role="slider"
					tabIndex={0}
					aria-label={`${label} saturation and brightness`}
					aria-valuetext={`saturation ${Math.round(color.s * 100)}%, brightness ${Math.round(color.v * 100)}%`}
					style={
						{
							'--tm-color-picker-hue': `hsl(${color.h} 100% 50%)`,
							'--tm-color-space-pointer-x': `${color.s * 100}%`,
							'--tm-color-space-pointer-y': `${(1 - color.v) * 100}%`,
							'--tm-color-space-pointer-color': currentHexColor,
						} as React.CSSProperties
					}
					onPointerDown={(event) => {
						event.currentTarget.setPointerCapture(event.pointerId);
						updateColorSpace(event.clientX, event.clientY);
					}}
					onPointerMove={(event) => {
						if (event.currentTarget.hasPointerCapture(event.pointerId)) {
							updateColorSpace(event.clientX, event.clientY);
						}
					}}
					onKeyDown={(event) => {
						const step = event.shiftKey ? 0.1 : 0.02;
						if (event.key === 'ArrowLeft') {
							event.preventDefault();
							commitColor({ ...color, s: clamp01(color.s - step) });
						} else if (event.key === 'ArrowRight') {
							event.preventDefault();
							commitColor({ ...color, s: clamp01(color.s + step) });
						} else if (event.key === 'ArrowDown') {
							event.preventDefault();
							commitColor({ ...color, v: clamp01(color.v - step) });
						} else if (event.key === 'ArrowUp') {
							event.preventDefault();
							commitColor({ ...color, v: clamp01(color.v + step) });
						}
					}}
				>
					<span className="tm-color-space__pointer" aria-hidden="true" />
				</div>

				<div className="tm-color-slider-list">
					<ColorRange
						label="hue"
						min={0}
						max={359}
						step={1}
						value={color.h}
						className="tm-color-range--hue"
						onChange={(h) => commitColor({ ...color, h })}
					/>
				</div>

				<label className="tm-color-popover__field">
					<span className="tm-color-popover__field-label">hex value</span>
					<div className="tm-color-popover__input-row">
						<ColorSwatch color={currentHexColor} className="tm-color-swatch--preview" />
						<Pipette aria-hidden="true" />
						<input
							className="tm-input tm-color-popover__input"
							type="text"
							value={draftValue}
							maxLength={7}
							aria-label={`${label} color value`}
							autoComplete="off"
							autoCapitalize="off"
							spellCheck={false}
							onChange={(event) => {
								const raw = event.currentTarget.value.toLowerCase();
								const hex = raw.replace(/^#/, '').replace(/[^0-9a-f]/g, '').slice(0, 6);
								const nextValue = hex ? `#${hex}` : '#';
								setDraftValue(nextValue);
								if (hex.length === 3 || hex.length === 6) {
									const normalized = normalizeHexColor(nextValue);
									if (normalized) {
										setColor(getHsvaFromHex(normalized));
										onChange(normalized);
									}
								}
							}}
							onBlur={() => {
								const hex = draftValue.replace(/^#/, '').replace(/[^0-9a-f]/g, '');
								if (hex.length !== 3 && hex.length !== 6) {
									setDraftValue(currentHexColor);
								}
							}}
						/>
					</div>
				</label>
			</PopoverContent>
		</Popover>
	);
}

interface ColorRangeProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'type'> {
	label: string;
	value: number;
	valueLabel?: string;
	onChange: (value: number) => void;
}

function ColorRange({ label, value, valueLabel, className, onChange, ...props }: ColorRangeProps): React.JSX.Element {
	return (
		<label className="tm-color-range">
			<span className="tm-color-range__label">
				<span>{label}</span>
				<output>{valueLabel ?? Math.round(value)}</output>
			</span>
			<input
				{...props}
				className={cn('tm-color-range__input', className)}
				type="range"
				value={value}
				aria-label={label}
				onChange={(event) => onChange(Number(event.currentTarget.value))}
			/>
		</label>
	);
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}
