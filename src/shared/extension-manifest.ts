import type { TargetBrowser, UserManifest } from 'wxt';

export interface ExtensionManifestOptions {
	browser: TargetBrowser;
	mode?: string;
}

export function createExtensionManifest({ browser, mode }: ExtensionManifestOptions): UserManifest {
	const manifest: UserManifest = {
		...baseExtensionManifest,
	};

	if (mode === 'e2e') {
		manifest.host_permissions = ['<all_urls>'];
	}

	if (browser === 'firefox') {
		manifest.browser_specific_settings = {
			gecko: {
				data_collection_permissions: {
					required: ['none'],
				},
			},
		};
	}

	return manifest;
}

export const baseExtensionManifest: UserManifest = {
	name: 'textmode overlay',
	description: 'turn live video and canvas elements into adjustable ascii overlays.',
	permissions: ['activeTab', 'scripting', 'storage'],
	action: {
		default_title: 'textmode overlay',
		default_icon: {
			16: '/icons/icon-16.png',
			32: '/icons/icon-32.png',
		},
	},
	icons: {
		16: '/icons/icon-16.png',
		32: '/icons/icon-32.png',
		48: '/icons/icon-48.png',
		128: '/icons/icon-128.png',
	},
};
