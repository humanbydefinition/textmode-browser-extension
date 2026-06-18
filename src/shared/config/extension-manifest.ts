import type { TargetBrowser, UserManifest } from 'wxt';

export interface ExtensionManifestOptions {
	browser: TargetBrowser;
	mode?: string;
	fontResources: readonly string[];
}

export function createExtensionManifest({ browser, mode, fontResources }: ExtensionManifestOptions): UserManifest {
	const manifest: UserManifest = {
		...createBaseExtensionManifest(fontResources),
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

export function createBaseExtensionManifest(fontResources: readonly string[]): UserManifest {
	return {
		name: 'Textmode Overlay',
		description: 'Turn <canvas> and <video> elements into live ASCII art.',
		permissions: ['activeTab', 'scripting'],
		...(fontResources.length > 0
			? {
					web_accessible_resources: [
						{
							resources: [...fontResources],
							matches: ['*://*/*'],
						},
					],
				}
			: {}),
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
}
