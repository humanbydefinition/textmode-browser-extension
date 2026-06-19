import { existsSync, readdirSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT_ASSET_DIRECTORY = fileURLToPath(new URL('../public/fonts', import.meta.url));
const SUPPORTED_FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2']);

export function listProjectFontAssetPaths(fontDirectory = FONT_ASSET_DIRECTORY): string[] {
	if (!existsSync(fontDirectory)) {
		return [];
	}

	return readdirSync(fontDirectory, { withFileTypes: true })
		.filter((entry) => entry.isFile() && SUPPORTED_FONT_EXTENSIONS.has(extname(entry.name).toLowerCase()))
		.map((entry) => `fonts/${entry.name}`)
		.sort((left, right) => left.localeCompare(right));
}
