import { resolveSiteKey } from './site-key';

export const PANEL_PLACEMENT_VERSION = 1;
export const PANEL_PLACEMENT_STORAGE_PREFIX = 'site-panel-position:v1:';
export const DEFAULT_PANEL_PLACEMENT: Readonly<PanelPlacement> = Object.freeze({
	xRatio: 1,
	yRatio: 0,
});

export interface PanelPlacement {
	xRatio: number;
	yRatio: number;
}

export interface StoredPanelPlacement {
	version: typeof PANEL_PLACEMENT_VERSION;
	placement: PanelPlacement;
	updatedAt: number;
}

export function resolvePanelPlacementKey(url: URL): string | null {
	const siteKey = resolveSiteKey(url);
	return siteKey ? createPanelPlacementStorageKey(siteKey) : null;
}

export function createPanelPlacementStorageKey(siteKey: string): string {
	return `${PANEL_PLACEMENT_STORAGE_PREFIX}${siteKey}`;
}

export function createStoredPanelPlacement(placement: PanelPlacement, updatedAt = Date.now()): StoredPanelPlacement {
	return {
		version: PANEL_PLACEMENT_VERSION,
		placement: { ...placement },
		updatedAt,
	};
}

export function normalizePanelPlacement(value: unknown): PanelPlacement | null {
	if (!isRecord(value) || !isRatio(value.xRatio) || !isRatio(value.yRatio)) {
		return null;
	}

	return {
		xRatio: value.xRatio,
		yRatio: value.yRatio,
	};
}

export function normalizeStoredPanelPlacement(value: unknown): StoredPanelPlacement | null {
	if (!isRecord(value) || value.version !== PANEL_PLACEMENT_VERSION) {
		return null;
	}

	const placement = normalizePanelPlacement(value.placement);
	if (!placement) {
		return null;
	}

	const updatedAt = typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : 0;
	return createStoredPanelPlacement(placement, updatedAt);
}

function isRatio(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
