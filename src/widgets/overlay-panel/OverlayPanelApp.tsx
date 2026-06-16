import * as React from 'react';
import { HeartHandshake, MousePointer2, Trash2, X } from 'lucide-react';
import type { OverlayDescriptor, OverlayExportFormat, OverlaySettings } from '../../domain/overlay/overlay-settings';
import { Button } from './components/button';
import { OverlayCard } from './OverlayCard';

export interface OverlayPanelAppProps {
	overlays: OverlayDescriptor[];
	onStartPicking: () => void;
	onUpdateOverlay: (id: string, settings: Partial<OverlaySettings>) => void;
	onExportOverlay: (id: string, format: OverlayExportFormat) => void;
	onRemoveOverlay: (id: string) => void;
	onClose?: () => void;
}

export function OverlayPanelApp({
	overlays,
	onStartPicking,
	onUpdateOverlay,
	onExportOverlay,
	onRemoveOverlay,
	onClose,
}: OverlayPanelAppProps): React.JSX.Element {
	const overlay = overlays[0];

	return (
		<main className="tm-panel" data-testid="overlay-panel">
			<header className="tm-panel__header">
				<div className="tm-panel__title">
					<h1 aria-label="textmode overlay">
						<span>textmode</span>
						<span>
							overlay
							<span className="tm-panel__title-char"></span>
						</span>
					</h1>
				</div>
				<div className="tm-panel__actions">
					<a
						className="tm-button tm-button--ghost tm-support-link"
						href="https://code.textmode.art/docs/support"
						target="_blank"
						rel="noreferrer"
					>
						<HeartHandshake aria-hidden="true" />
						support
					</a>
					{onClose ? (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="tm-button tm-button--ghost tm-button--icon"
							aria-label="close panel"
							onClick={onClose}
						>
							<X aria-hidden="true" />
						</Button>
					) : null}
				</div>
			</header>

			<Button
				type="button"
				className="tm-button tm-button--default tm-button--default-size tm-select-button"
				onClick={onStartPicking}
			>
				<MousePointer2 aria-hidden="true" />
				{overlay ? 'replace media' : 'select media'}
			</Button>

			<section className="tm-overlay-list" aria-live="polite">
				{overlay ? (
					<OverlayCard
						overlay={overlay}
						onUpdateOverlay={onUpdateOverlay}
						onExportOverlay={onExportOverlay}
					/>
				) : (
					<p className="tm-empty-state">no media selected.</p>
				)}
			</section>

			<footer className="tm-panel__footer">
				<Button
					type="button"
					variant="destructive"
					className="tm-button tm-button--danger tm-button--default-size tm-remove-button"
					disabled={!overlay}
					onClick={() => {
						if (overlay) {
							onRemoveOverlay(overlay.id);
						}
					}}
				>
					<Trash2 aria-hidden="true" />
					remove overlay
				</Button>
				<p className="tm-built-with">
					built with{' '}
					<a href="https://code.textmode.art" target="_blank" rel="noreferrer">
						textmode.js
					</a>
				</p>
			</footer>
		</main>
	);
}
