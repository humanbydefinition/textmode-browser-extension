import * as React from 'react';
import { AlertTriangle, Pause, Radio } from 'lucide-react';
import type { OverlayStatus } from '../shared/overlay-settings';
import { Badge } from './components/Badge';

interface StatusBadgeProps {
	status: OverlayStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
	const Icon = status === 'error' ? AlertTriangle : status === 'paused' ? Pause : Radio;

	return (
		<Badge className={`tm-status tm-status--${status}`}>
			<Icon aria-hidden="true" />
			{status}
		</Badge>
	);
}
