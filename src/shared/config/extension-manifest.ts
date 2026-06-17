import type { TargetBrowser, UserManifest } from 'wxt';
import { TEXTMODE_HEADER_FONT_RESOURCE } from './extension-assets';

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
	name: 'Textmode Overlay',
	description: 'Turn <canvas> and <video> elements into live ASCII art.',
	permissions: ['activeTab', 'scripting', 'storage'],
	web_accessible_resources: [
		{
			resources: [TEXTMODE_HEADER_FONT_RESOURCE],
			matches: ['*://*/*'],
		},
	],
	action: {
		default_title: 'Textmode Overlay',
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
