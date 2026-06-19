import 'dotenv/config';
import { defineConfig } from 'wxt';
import { createExtensionManifest } from './src/shared/config/extension-manifest';
import { listProjectFontAssetPaths } from './scripts/font-assets';

const availableFontAssetPaths = listProjectFontAssetPaths();

const firefoxExtensionId = process.env.FIREFOX_EXTENSION_ID || undefined;

export default defineConfig({
	srcDir: 'src',
	imports: false,
	manifest: ({ browser, mode }) =>
		createExtensionManifest({ browser, mode, fontResources: availableFontAssetPaths, firefoxExtensionId }),
	vite: () => ({
		define: {
			__TEXTMODE_AVAILABLE_FONT_ASSET_PATHS__: JSON.stringify(availableFontAssetPaths),
		},
	}),
});
