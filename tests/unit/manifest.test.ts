import { describe, expect, it } from 'vitest';
import { createExtensionManifest } from '../../src/shared/config/extension-manifest';

describe('extension manifest', () => {
	it('keeps the default build action-triggered and least-privilege', () => {
		const manifest = createExtensionManifest({ browser: 'chrome' });

		expect(manifest.host_permissions).toBeUndefined();
		expect(manifest.action?.default_popup).toBeUndefined();
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
