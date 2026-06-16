import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), '.output/chrome-mv3/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assertEqual(manifest.manifest_version, 3, 'manifest_version');
assertEqual(manifest.name, 'textmode overlay', 'name');
assertEqual(manifest.description, 'turn live video and canvas elements into adjustable ascii overlays.', 'description');
assertArrayEqual(manifest.permissions, ['activeTab', 'scripting', 'storage'], 'permissions');
assertAbsent(manifest.host_permissions, 'host_permissions');
assertAbsent(manifest.content_scripts, 'content_scripts');
assertAbsent(manifest.web_accessible_resources, 'web_accessible_resources');
assertAbsent(manifest.action?.default_popup, 'action.default_popup');
assertEqual(manifest.action?.default_title, 'textmode overlay', 'action.default_title');
assertEqual(manifest.background?.service_worker, 'background.js', 'background.service_worker');
assertEqual(manifest.background?.type, 'module', 'background.type');

function assertEqual(actual, expected, label) {
	if (actual !== expected) {
		throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

function assertArrayEqual(actual, expected, label) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

function assertAbsent(actual, label) {
	if (actual !== undefined) {
		throw new Error(`${label}: expected absent, got ${JSON.stringify(actual)}`);
	}
}
