import {
	DEFAULT_OVERLAY_SETTINGS,
	SOURCE_COLOR_MODES,
	mergeOverlaySettings,
	type OverlaySettings,
} from '../overlay/overlay-settings';

export const SITE_PRESET_VERSION = 1;
export const SITE_PRESET_STORAGE_PREFIX = 'site-preset:v1:';

export interface StoredSitePreset {
	version: typeof SITE_PRESET_VERSION;
	settings: OverlaySettings;
	updatedAt: number;
}

export function resolveSitePresetKey(url: URL): string | null {
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return null;
	}

	const hostname = normalizeHostname(url.hostname);
	return hostname || null;
}

export function createSitePresetStorageKey(siteKey: string): string {
	return `${SITE_PRESET_STORAGE_PREFIX}${siteKey}`;
}

export function createStoredSitePreset(settings: Partial<OverlaySettings>, updatedAt = Date.now()): StoredSitePreset {
	return {
		version: SITE_PRESET_VERSION,
		settings: normalizeOverlaySettings(settings),
		updatedAt,
	};
}

export function normalizeStoredSitePreset(value: unknown): StoredSitePreset | null {
	if (!isRecord(value) || value.version !== SITE_PRESET_VERSION || !isRecord(value.settings)) {
		return null;
	}

	const updatedAt = typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : 0;
	return createStoredSitePreset(value.settings as Partial<OverlaySettings>, updatedAt);
}

export function normalizeOverlaySettings(value: Partial<OverlaySettings>): OverlaySettings {
	const normalized = mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, value);
	return {
		...normalized,
		enabled: typeof value.enabled === 'boolean' ? normalized.enabled : DEFAULT_OVERLAY_SETTINGS.enabled,
		invert: typeof value.invert === 'boolean' ? normalized.invert : DEFAULT_OVERLAY_SETTINGS.invert,
		charColorMode: isSourceColorMode(value.charColorMode)
			? normalized.charColorMode
			: DEFAULT_OVERLAY_SETTINGS.charColorMode,
		cellColorMode: isSourceColorMode(value.cellColorMode)
			? normalized.cellColorMode
			: DEFAULT_OVERLAY_SETTINGS.cellColorMode,
	};
}

function normalizeHostname(hostname: string): string {
	return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isSourceColorMode(value: unknown): value is OverlaySettings['charColorMode'] {
	return typeof value === 'string' && SOURCE_COLOR_MODES.includes(value as OverlaySettings['charColorMode']);
}
