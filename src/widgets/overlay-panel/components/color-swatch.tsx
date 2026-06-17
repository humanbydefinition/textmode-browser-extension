import * as React from 'react';
import { cn } from '@/shared/lib/utils';

interface ColorSwatchProps extends Omit<React.ComponentProps<'span'>, 'color'> {
	color: string;
	size?: 'sm' | 'default';
}

export function ColorSwatch({
	color,
	size = 'default',
	className,
	style,
	...props
}: ColorSwatchProps): React.JSX.Element {
	return (
		<span
			aria-hidden="true"
			data-slot="color-swatch"
			className={cn('tm-color-swatch', size === 'sm' && 'tm-color-swatch--sm', className)}
			style={{ '--tm-color-swatch-color': color, ...style } as React.CSSProperties}
			{...props}
		/>
	);
}
