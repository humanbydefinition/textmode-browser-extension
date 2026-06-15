import { DEFAULT_OVERLAY_SETTINGS, mergeOverlaySettings, type OverlaySettings } from './overlay-settings';

const ORIGIN_DEFAULTS_PREFIX = 'origin-defaults:';

export async function readOriginDefaults(origin: string): Promise<OverlaySettings> {
	const key = getOriginDefaultsKey(origin);
	const result = await chrome.storage.local.get(key);
	return mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, result[key] ?? {});
}

export async function writeOriginDefaults(origin: string, settings: OverlaySettings): Promise<void> {
	await chrome.storage.local.set({
		[getOriginDefaultsKey(origin)]: settings,
	});
}

export function getOriginDefaultsKey(origin: string): string {
	return `${ORIGIN_DEFAULTS_PREFIX}${origin}`;
}
