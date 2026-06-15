export const chromeManifest: chrome.runtime.ManifestV3 = {
	manifest_version: 3,
	name: 'textmode',
	version: '0.1.0',
	description: 'Select canvas and video elements on a page and convert them to real-time textmode ASCII overlays.',
	icons: {
		16: 'icons/icon-16.png',
		32: 'icons/icon-32.png',
		48: 'icons/icon-48.png',
		128: 'icons/icon-128.png',
	},
	action: {
		default_title: 'textmode',
		default_icon: {
			16: 'icons/icon-16.png',
			32: 'icons/icon-32.png',
		},
	},
	permissions: ['activeTab', 'scripting', 'storage'],
	background: {
		service_worker: 'service-worker.js',
		type: 'module',
	},
	web_accessible_resources: [
		{
			resources: ['content-bootstrap.js', 'content-runtime.js', 'assets/*'],
			matches: ['<all_urls>'],
		},
	],
};
