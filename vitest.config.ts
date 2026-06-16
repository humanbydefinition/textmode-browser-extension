import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(import.meta.dirname, 'src'),
		},
	},
	plugins: [react()],
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['tests/unit/**/*.test.{ts,tsx}'],
	},
});
