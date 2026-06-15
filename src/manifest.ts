export const chromeManifest: chrome.runtime.ManifestV3 = {
	manifest_version: 3,
	name: 'textmode.js ASCII Overlay',
	version: '0.1.0',
	description: 'Select canvas and video elements on a page and convert them to real-time textmode ASCII overlays.',
	action: {
		default_title: 'textmode.js ASCII Overlay',
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
