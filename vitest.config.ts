import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { listProjectFontAssetPaths } from './scripts/font-assets';

const availableFontAssetPaths = listProjectFontAssetPaths();

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(import.meta.dirname, 'src'),
		},
	},
	define: {
		__TEXTMODE_AVAILABLE_FONT_ASSET_PATHS__: JSON.stringify(availableFontAssetPaths),
	},
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['tests/unit/**/*.test.ts'],
	},
});
