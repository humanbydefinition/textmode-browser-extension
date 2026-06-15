import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { chromeManifest } from './src/manifest';

function manifestPlugin(): Plugin {
	return {
		name: 'textmode-extension-manifest',
		writeBundle(options) {
			const outDir = options.dir ?? resolve(import.meta.dirname, 'dist/chrome');
			mkdirSync(outDir, { recursive: true });
			writeFileSync(resolve(outDir, 'manifest.json'), `${JSON.stringify(chromeManifest, null, 2)}\n`);
		},
	};
}

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(import.meta.dirname, 'src'),
		},
	},
	build: {
		outDir: 'dist/chrome',
		emptyOutDir: true,
		sourcemap: true,
		target: 'es2022',
		rollupOptions: {
			input: {
				'service-worker': resolve(import.meta.dirname, 'src/background/service-worker.ts'),
				'content-runtime': resolve(import.meta.dirname, 'src/content/content-runtime.ts'),
				popup: resolve(import.meta.dirname, 'src/popup/popup.html'),
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: 'assets/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash][extname]',
			},
		},
	},
	plugins: [manifestPlugin()],
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['tests/unit/**/*.test.ts'],
	},
});
