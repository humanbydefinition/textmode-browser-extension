import * as React from 'react';
import { cn } from '../../../shared/lib/utils';

interface SettingFieldProps {
	label: string;
	value?: string;
	children: React.ReactNode;
	className?: string;
}

export function SettingField({ label, value, children, className }: SettingFieldProps): React.JSX.Element {
	return (
		<label className={cn('tm-field', className)}>
			<span className="tm-field__label">
				<span>{label}</span>
				{value ? <output>{value}</output> : null}
			</span>
			{children}
		</label>
	);
}

interface ToggleFieldProps {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

export function ToggleField({ label, checked, onChange }: ToggleFieldProps): React.JSX.Element {
	return (
		<label className="tm-toggle-row">
			<span>{label}</span>
			<input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
		</label>
	);
}
