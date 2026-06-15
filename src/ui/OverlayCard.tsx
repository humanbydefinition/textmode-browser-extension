import * as React from 'react';
import type { OverlayDescriptor, OverlaySettings } from '../shared/overlay-settings';
import { Badge } from './components/Badge';
import { OverlaySettingsForm } from './OverlaySettingsForm';

interface OverlayCardProps {
	overlay: OverlayDescriptor;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
}

export function OverlayCard({ overlay, onUpdateOverlay }: OverlayCardProps): React.JSX.Element {
	const title = overlay.elementKind === 'video' ? 'Video selected' : 'Canvas selected';
	const elementName = getElementName(overlay.elementLabel);
	const dimensions = `${overlay.bounds.width}x${overlay.bounds.height}`;

	return (
		<article className="tm-overlay-card">
			<header className="tm-overlay-card__header">
				<div className="tm-overlay-card__title">
					<h2>{title}</h2>
					<p title={elementName}>{elementName}</p>
				</div>
				<Badge className="tm-dimensions">{dimensions}</Badge>
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
		</article>
	);
}

function getElementName(elementLabel: string): string {
	return elementLabel.replace(/\s+\d+x\d+$/i, '');
}
