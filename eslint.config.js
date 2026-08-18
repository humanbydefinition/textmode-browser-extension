import textmodeLint from '@textmode/lint';
import globals from 'globals';

export default [
	{
		ignores: ['dist', '.output', '.wxt', 'node_modules', 'coverage', '.agents', 'api', 'docs'],
	},
	...textmodeLint.map((config) => {
		if (config.files) {
			return {
				...config,
				files: ['**/*.{ts,js,mjs}'],
			};
		}
		return config;
	}),
	{
		files: ['**/*.{ts,js,mjs}'],
		languageOptions: {
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
	},
];
