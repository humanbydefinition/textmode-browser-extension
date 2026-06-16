import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import { createExtensionManifest } from './src/shared/extension-manifest';

export default defineConfig({
	srcDir: 'src',
	imports: false,
	manifest: ({ browser, mode }) => createExtensionManifest({ browser, mode }),
	vite: () => ({
		plugins: [react()],
	}),
});
