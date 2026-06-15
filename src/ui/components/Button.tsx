import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva('tm-button', {
	variants: {
		variant: {
			default: 'tm-button--default',
			outline: 'tm-button--outline',
			ghost: 'tm-button--ghost',
			danger: 'tm-button--danger',
		},
		size: {
			default: 'tm-button--default-size',
			sm: 'tm-button--sm',
			icon: 'tm-button--icon',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
});

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps): React.JSX.Element {
	return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
