import { describe, expect, it } from 'vitest';
import { createExtensionManifest } from '../../src/shared/config/extension-manifest';

const TEST_FONT_RESOURCES = ['fonts/Bescii-Mono.ttf', 'fonts/UrsaFont.ttf'];

describe('extension manifest', () => {
	it('keeps the default build action-triggered and least-privilege', () => {
		const manifest = createExtensionManifest({ browser: 'chrome', fontResources: TEST_FONT_RESOURCES });

		expect(manifest.permissions).toEqual(['activeTab', 'scripting']);
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
			createExtensionManifest({ browser: 'firefox', fontResources: TEST_FONT_RESOURCES, firefoxExtensionId: customId })
				.browser_specific_settings
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
			createExtensionManifest({ browser: 'chrome', fontResources: TEST_FONT_RESOURCES, firefoxExtensionId: '{some-id}' })
				.browser_specific_settings
		).toBeUndefined();
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
