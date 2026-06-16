import * as React from 'react';
import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { Badge } from './components/badge';
import { OverlaySettingsForm } from './OverlaySettingsForm';

interface OverlayCardProps {
	overlay: OverlayDescriptor;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onExportOverlay: (id: string, format: OverlayExportFormat) => void;
}

export function OverlayCard({ overlay, onUpdateOverlay, onExportOverlay }: OverlayCardProps): React.JSX.Element {
	const title = overlay.elementKind === 'video' ? 'video selected' : 'canvas selected';
	const elementName = getElementName(overlay.elementLabel);
	const dimensions = `${overlay.bounds.width}x${overlay.bounds.height}`;

	return (
		<article className="tm-overlay-card">
			<header className="tm-overlay-card__header">
				<div className="tm-overlay-card__title">
					<h2>{title}</h2>
					<p title={elementName}>{elementName}</p>
				</div>
				<Badge className="tm-badge tm-dimensions">{dimensions}</Badge>
			</header>

			<OverlaySettingsForm
				settings={overlay.settings}
				onChange={(settings) => onUpdateOverlay(overlay.id, settings)}
				onExport={(format) => onExportOverlay(overlay.id, format)}
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
