import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import textmodeEslintConfig from '@textmode/eslint-config';

export default defineConfig(
	textmodeEslintConfig,
	{
		ignores: ['dist', '.output', '.wxt', 'node_modules', 'coverage', '.agents', 'api', 'docs'],
	},
	{
		files: ['tests/**/*.{ts,js}', 'scripts/**/*.{ts,js,mjs}', '*.{ts,js,mjs}'],
		extends: [...tseslint.configs.recommended],
		languageOptions: {
			ecmaVersion: 2022,
			globals: {
				...globals.browser,
				...globals.node,
				chrome: 'readonly',
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-require-imports': 'off',
		},
	}
);
