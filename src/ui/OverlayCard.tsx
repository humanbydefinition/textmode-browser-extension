import * as React from 'react';
import { Trash2 } from 'lucide-react';
import type { OverlayDescriptor, OverlaySettings } from '../shared/overlay-settings';
import { Button } from './components/Button';
import { OverlaySettingsForm } from './OverlaySettingsForm';
import { StatusBadge } from './StatusBadge';

interface OverlayCardProps {
	overlay: OverlayDescriptor;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onRemoveOverlay: (id: string) => void;
}

export function OverlayCard({ overlay, onUpdateOverlay, onRemoveOverlay }: OverlayCardProps): React.JSX.Element {
	const title = overlay.elementKind === 'video' ? 'Video selected' : 'Canvas selected';

	return (
		<article className="tm-overlay-card">
			<header className="tm-overlay-card__header">
				<div className="tm-overlay-card__title">
					<h2>{title}</h2>
					<p title={overlay.elementLabel}>{overlay.elementLabel}</p>
				</div>
				<StatusBadge status={overlay.status} />
			</header>

			<OverlaySettingsForm
				settings={overlay.settings}
				onChange={(settings) => onUpdateOverlay(overlay.id, settings)}
			/>

			{overlay.latestError ? (
				<p className="tm-error" role="alert">
					{overlay.latestError}
				</p>
			) : null}

			<Button variant="danger" className="tm-remove-button" onClick={() => onRemoveOverlay(overlay.id)}>
				<Trash2 aria-hidden="true" />
				Remove overlay
			</Button>
		</article>
	);
}
