import 'dotenv/config';
import { defineConfig } from 'wxt';
import { createExtensionManifest } from './src/shared/config/extension-manifest';
import { resolveExtensionStoreTarget } from './src/shared/config/store-links';
import { BUNDLED_FONTS } from './src/domain/fonts/font-metadata';

const firefoxExtensionId = process.env.FIREFOX_EXTENSION_ID || undefined;
const inlineFontPaths = new Set(BUNDLED_FONTS.map((font) => font.assetPath));

export default defineConfig({
	srcDir: 'src',
	imports: false,
	manifest: ({ browser, mode }) => createExtensionManifest({ browser, mode, firefoxExtensionId }),
	hooks: {
		'build:publicAssets': (_wxt, files) => {
			// The runtime embeds these fonts; only other public assets need to be copied.
			for (let index = files.length - 1; index >= 0; index--) {
				if (inlineFontPaths.has(files[index]!.relativeDest.replace(/\\/g, '/'))) files.splice(index, 1);
			}
		},
	},
	vite: ({ browser, mode }) => ({
		define: {
			__TEXTMODE_EXTENSION_STORE_TARGET__: JSON.stringify(resolveExtensionStoreTarget(browser, mode)),
		},
	}),
});
