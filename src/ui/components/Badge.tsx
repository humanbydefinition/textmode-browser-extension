import * as React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
	return <span className={cn('tm-badge', className)} {...props} />;
}
