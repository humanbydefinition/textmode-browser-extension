import { describe, expect, it } from 'vitest';
import { getRateExtensionUrl, resolveExtensionStoreTarget } from '../../src/shared/config/store-links';

describe('extension store links', () => {
	it('resolves the Chrome Web Store rating link for Chrome builds', () => {
		const target = resolveExtensionStoreTarget('chrome');

		expect(target).toBe('chrome');
		expect(getRateExtensionUrl(target)).toBe(
			'https://chromewebstore.google.com/detail/textmode-overlay/nmepplnokndndgeldlhbffhkipimmaia/reviews'
		);
	});

	it('resolves the Opera Add-ons rating link for Opera mode builds', () => {
		const target = resolveExtensionStoreTarget('chrome', 'opera');

		expect(target).toBe('opera');
		expect(getRateExtensionUrl(target)).toBe('https://addons.opera.com/en/extensions/details/textmode-overlay/');
	});

	it('resolves the Firefox Add-ons rating link for Firefox builds', () => {
		const target = resolveExtensionStoreTarget('firefox');

		expect(target).toBe('firefox');
		expect(getRateExtensionUrl(target)).toBe(
			'https://addons.mozilla.org/en-US/firefox/addon/textmode-overlay/reviews/'
		);
	});

	it('omits the rating link for unsupported store targets', () => {
		const target = resolveExtensionStoreTarget('edge');

		expect(target).toBe('unsupported');
		expect(getRateExtensionUrl(target)).toBeNull();
	});
});
