import { describe, expect, it } from 'vitest';
import { TEXTMODE_HEADER_FONT_RESOURCE } from '../../src/shared/config/extension-assets';
import { baseExtensionManifest, createExtensionManifest } from '../../src/shared/config/extension-manifest';

describe('extension manifest', () => {
	it('preserves the least-privilege action-triggered baseline', () => {
		expect(baseExtensionManifest).toMatchObject({
			name: 'textmode overlay',
			description: 'turn live video and canvas elements into adjustable ascii overlays.',
			permissions: ['activeTab', 'scripting', 'storage'],
			action: {
				default_title: 'textmode overlay',
			},
		});
		expect(baseExtensionManifest.host_permissions).toBeUndefined();
		expect(baseExtensionManifest.action?.default_popup).toBeUndefined();
	});

	it('exposes only the packaged header font to page contexts', () => {
		expect(baseExtensionManifest.web_accessible_resources).toEqual([
			{
				resources: [TEXTMODE_HEADER_FONT_RESOURCE],
				matches: ['*://*/*'],
			},
		]);
	});

	it('declares no Firefox data collection for store policy compliance', () => {
		expect(createExtensionManifest({ browser: 'firefox' }).browser_specific_settings).toEqual({
			gecko: {
				data_collection_permissions: {
					required: ['none'],
				},
			},
		});
	});

	it('adds host permissions only for the automated E2E build mode', () => {
		expect(createExtensionManifest({ browser: 'chrome' }).host_permissions).toBeUndefined();
		expect(createExtensionManifest({ browser: 'chrome', mode: 'e2e' }).host_permissions).toEqual(['<all_urls>']);
	});
});
