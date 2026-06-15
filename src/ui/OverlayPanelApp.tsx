import * as React from 'react';
import { MousePointer2, X } from 'lucide-react';
import type { OverlayDescriptor, OverlaySettings } from '../shared/overlay-settings';
import { Button } from './components/Button';
import { OverlayCard } from './OverlayCard';

export interface OverlayPanelAppProps {
	status: string;
	overlays: OverlayDescriptor[];
	onStartPicking: () => void;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onRemoveOverlay: (id: string) => void;
	onClose?: () => void;
}

export function OverlayPanelApp({
	status,
	overlays,
	onStartPicking,
	onUpdateOverlay,
	onRemoveOverlay,
	onClose,
}: OverlayPanelAppProps): React.JSX.Element {
	const overlay = overlays[0];

	return (
		<main className="tm-panel" data-testid="overlay-panel">
			<header className="tm-panel__header">
				<div className="tm-panel__title">
					<p>textmode.js</p>
					<h1>ASCII Overlay</h1>
					<span role="status" aria-live="polite">
						{status}
					</span>
				</div>
				{onClose ? (
					<Button variant="ghost" size="icon" aria-label="Close panel" onClick={onClose}>
						<X aria-hidden="true" />
					</Button>
				) : null}
			</header>

			<Button className="tm-select-button" onClick={onStartPicking}>
				<MousePointer2 aria-hidden="true" />
				{overlay ? 'Replace Media' : 'Select Media'}
			</Button>

			<section className="tm-overlay-list" aria-live="polite">
				{overlay ? (
					<OverlayCard
						overlay={overlay}
						onUpdateOverlay={onUpdateOverlay}
						onRemoveOverlay={onRemoveOverlay}
					/>
				) : (
					<p className="tm-empty-state">No media selected.</p>
				)}
			</section>
		</main>
	);
}
