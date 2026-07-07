export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// Enforce conventional commit types
		'type-enum': [
			2,
			'always',
			[
				'feat', // New feature
				'fix', // Bug fix
				'docs', // Documentation only
				'style', // Formatting (no code change)
				'refactor', // Code change that neither fixes a bug nor adds a feature
				'perf', // Performance improvement
				'test', // Adding or updating tests
				'build', // Build system or external dependencies
				'ci', // CI configuration
				'chore', // Maintenance tasks
				'revert', // Revert a previous commit
			],
		],
		// Allow any case for subject (flexible for creative projects)
		'subject-case': [0],
		// Reasonable max length for header
		'header-max-length': [2, 'always', 100],
	},
};
