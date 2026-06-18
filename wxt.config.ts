import { defineConfig } from 'wxt';
import { createExtensionManifest } from './src/shared/config/extension-manifest';
import { listProjectFontAssetPaths } from './scripts/font-assets';

const availableFontAssetPaths = listProjectFontAssetPaths();

export default defineConfig({
	srcDir: 'src',
	imports: false,
	manifest: ({ browser, mode }) => createExtensionManifest({ browser, mode, fontResources: availableFontAssetPaths }),
	vite: () => ({
		define: {
			__TEXTMODE_AVAILABLE_FONT_ASSET_PATHS__: JSON.stringify(availableFontAssetPaths),
		},
	}),
});
