import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createExtensionManifest } from '../../src/shared/config/extension-manifest';

const TEST_FONT_RESOURCES = ['fonts/Bescii-Mono.ttf', 'fonts/UrsaFont.ttf'];
const LOCALES_DIR = resolve(import.meta.dirname, '../../public/_locales');

describe('extension manifest', () => {
	it('references localized identity messages and declares the default locale', () => {
		const manifest = createExtensionManifest({ browser: 'chrome', fontResources: TEST_FONT_RESOURCES });

		expect(manifest.name).toBe('__MSG_extName__');
		expect(manifest.description).toBe('__MSG_extDescription__');
		expect(manifest.default_locale).toBe('en');
	});

	it('ships a catalog with the identity messages for the default locale and every advertised locale', () => {
		const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);

		expect(locales).toEqual(expect.arrayContaining(['en', 'de', 'es', 'pt_BR', 'ja', 'fr']));

		for (const locale of locales) {
			const catalog = JSON.parse(readFileSync(resolve(LOCALES_DIR, locale, 'messages.json'), 'utf8')) as Record<
				string,
				{ message?: string }
			>;

			expect(catalog.extName?.message?.trim()).toBeTruthy();
			expect(catalog.extDescription?.message?.trim()).toBeTruthy();
			expect(catalog.extDescription?.message?.length ?? 0).toBeLessThanOrEqual(132);
		}
	});

	it('declares context-menu support without permanent web access', () => {
		const manifest = createExtensionManifest({ browser: 'chrome', fontResources: TEST_FONT_RESOURCES });

		expect(manifest.permissions).toEqual(['activeTab', 'contextMenus', 'scripting', 'storage', 'unlimitedStorage']);
		expect(manifest.host_permissions).toBeUndefined();
		expect(manifest.action?.default_popup).toBeUndefined();
	});

	it('omits browser_specific_settings when no firefoxExtensionId is provided', () => {
		expect(
			createExtensionManifest({ browser: 'firefox', fontResources: TEST_FONT_RESOURCES })
				.browser_specific_settings
		).toBeUndefined();
	});

	it('includes browser_specific_settings with the provided firefoxExtensionId', () => {
		const customId = '{abc123-def456}';
		expect(
			createExtensionManifest({
				browser: 'firefox',
				fontResources: TEST_FONT_RESOURCES,
				firefoxExtensionId: customId,
			}).browser_specific_settings
		).toEqual({
			gecko: {
				id: customId,
				data_collection_permissions: {
					required: ['none'],
				},
			},
		});
	});

	it('does not add browser_specific_settings for non-Firefox browsers, even with an ID', () => {
		expect(
			createExtensionManifest({
				browser: 'chrome',
				fontResources: TEST_FONT_RESOURCES,
				firefoxExtensionId: '{some-id}',
			}).browser_specific_settings
		).toBeUndefined();
	});

	it('adds all URLs only to the non-distributable automated E2E harness', () => {
		expect(
			createExtensionManifest({ browser: 'chrome', mode: 'e2e', fontResources: TEST_FONT_RESOURCES })
				.host_permissions
		).toEqual(['<all_urls>']);
	});

	it('only exposes font resources that are actually available to the build', () => {
		expect(
			createExtensionManifest({ browser: 'chrome', fontResources: TEST_FONT_RESOURCES }).web_accessible_resources
		).toEqual([
			{
				resources: TEST_FONT_RESOURCES,
				matches: ['*://*/*'],
			},
		]);
		expect(
			createExtensionManifest({ browser: 'chrome', fontResources: [] }).web_accessible_resources
		).toBeUndefined();
	});
});
