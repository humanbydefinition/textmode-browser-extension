import { DEFAULT_OVERLAY_SETTINGS, mergeOverlaySettings, type OverlaySettings } from './overlay-settings';
import { readLocalStorageKey, writeLocalStorage } from './browser-api';

const ORIGIN_DEFAULTS_PREFIX = 'origin-defaults:';

export async function readOriginDefaults(origin: string): Promise<OverlaySettings> {
	const key = getOriginDefaultsKey(origin);
	const result = await readLocalStorageKey<Partial<OverlaySettings>>(key);
	return mergeOverlaySettings(DEFAULT_OVERLAY_SETTINGS, result[key] ?? {});
}

export async function writeOriginDefaults(origin: string, settings: OverlaySettings): Promise<void> {
	await writeLocalStorage({
		[getOriginDefaultsKey(origin)]: settings,
	});
}

export function getOriginDefaultsKey(origin: string): string {
	return `${ORIGIN_DEFAULTS_PREFIX}${origin}`;
}
