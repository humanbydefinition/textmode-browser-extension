import { describe, expect, it } from 'vitest';
import { createExtensionManifest, FIREFOX_EXTENSION_ID } from '../../src/shared/config/extension-manifest';

const TEST_FONT_RESOURCES = ['fonts/Bescii-Mono.ttf', 'fonts/UrsaFont.ttf'];

describe('extension manifest', () => {
	it('keeps the default build action-triggered and least-privilege', () => {
		const manifest = createExtensionManifest({ browser: 'chrome', fontResources: TEST_FONT_RESOURCES });

		expect(manifest.permissions).toEqual(['activeTab', 'scripting']);
		expect(manifest.host_permissions).toBeUndefined();
		expect(manifest.action?.default_popup).toBeUndefined();
	});

	it('declares Firefox signing identity and no data collection for store policy compliance', () => {
		expect(
			createExtensionManifest({ browser: 'firefox', fontResources: TEST_FONT_RESOURCES })
				.browser_specific_settings
		).toEqual({
			gecko: {
				id: FIREFOX_EXTENSION_ID,
				data_collection_permissions: {
					required: ['none'],
				},
			},
		});
	});

	it('adds host permissions only for the automated E2E build mode', () => {
		expect(
			createExtensionManifest({ browser: 'chrome', fontResources: TEST_FONT_RESOURCES }).host_permissions
		).toBeUndefined();
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
