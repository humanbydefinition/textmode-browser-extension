export type ExtensionStoreTarget = 'chrome' | 'opera' | 'firefox' | 'unsupported';

export const EXTENSION_STORE_REVIEW_URLS: Record<Exclude<ExtensionStoreTarget, 'unsupported'>, string> = {
	chrome: 'https://chromewebstore.google.com/detail/textmode-overlay/nmepplnokndndgeldlhbffhkipimmaia/reviews',
	opera: 'https://addons.opera.com/en/extensions/details/textmode-overlay/',
	firefox: 'https://addons.mozilla.org/en-US/firefox/addon/textmode-overlay/reviews/',
};

export function resolveExtensionStoreTarget(browser: string, mode?: string): ExtensionStoreTarget {
	if (browser === 'firefox') return 'firefox';
	if (browser === 'chrome') return mode === 'opera' ? 'opera' : 'chrome';
	return 'unsupported';
}

export function getRateExtensionUrl(target: ExtensionStoreTarget): string | null {
	if (target === 'unsupported') return null;
	return EXTENSION_STORE_REVIEW_URLS[target];
}

const configuredStoreTarget: ExtensionStoreTarget =
	typeof __TEXTMODE_EXTENSION_STORE_TARGET__ === 'undefined' ? 'unsupported' : __TEXTMODE_EXTENSION_STORE_TARGET__;

export const rateExtensionUrl = getRateExtensionUrl(configuredStoreTarget);
