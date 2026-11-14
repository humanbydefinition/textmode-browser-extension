export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';

export interface BadgeOptions {
	text?: string;
	variant?: BadgeVariant;
	className?: string;
	ariaHidden?: boolean;
}

/** Create a shadcn/ui-inspired badge element using data-slot and data-variant attributes. */
export function createBadge(options: BadgeOptions = {}): HTMLSpanElement {
	const badge = document.createElement('span');
	badge.dataset.slot = 'badge';
	badge.dataset.variant = options.variant ?? 'secondary';
	if (options.className) {
		badge.className = options.className;
	}
	if (options.ariaHidden) {
		badge.setAttribute('aria-hidden', 'true');
	}
	if (options.text !== undefined) {
		badge.textContent = options.text;
	}
	return badge;
}
