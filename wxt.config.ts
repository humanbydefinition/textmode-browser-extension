import 'dotenv/config';
import { defineConfig } from 'wxt';
import { createExtensionManifest } from './src/shared/config/extension-manifest';
import { resolveExtensionStoreTarget } from './src/shared/config/store-links';

const firefoxExtensionId = process.env.FIREFOX_EXTENSION_ID || undefined;

export default defineConfig({
	srcDir: 'src',
	imports: false,
	manifest: ({ browser, mode }) => createExtensionManifest({ browser, mode, firefoxExtensionId }),
	vite: ({ browser, mode }) => ({
		define: {
			__TEXTMODE_EXTENSION_STORE_TARGET__: JSON.stringify(resolveExtensionStoreTarget(browser, mode)),
		},
	}),
});
