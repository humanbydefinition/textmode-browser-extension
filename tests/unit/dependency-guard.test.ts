import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const removedPackages = [
	'react',
	'react-dom',
	'radix-ui',
	'lucide-react',
	'class-variance-authority',
	'tailwind-merge',
	'clsx',
	'@vitejs/plugin-react',
	'@types/react',
	'@types/react-dom',
];

describe('React-free dependency guard', () => {
	it('keeps removed UI packages out of package-lock installed packages', () => {
		const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
			packages: Record<string, unknown>;
		};

		for (const packageName of removedPackages) {
			expect(lockfile.packages[`node_modules/${packageName}`]).toBeUndefined();
		}
	});

	it('keeps source and tests free of removed UI package imports', () => {
		const importPattern =
			/(from\s+['"](?:react|react-dom|radix-ui|lucide-react|class-variance-authority|tailwind-merge|clsx|@vitejs\/plugin-react)['"])|(import\s+['"](?:react|react-dom|radix-ui|lucide-react|class-variance-authority|tailwind-merge|clsx|@vitejs\/plugin-react)['"])/;
		const files = listTypeScriptFiles('src').concat(listTypeScriptFiles('tests'));
		const offenders = files.filter((file) => importPattern.test(readFileSync(file, 'utf8')));

		expect(offenders).toEqual([]);
	});
});

function listTypeScriptFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		const stats = statSync(path);
		if (stats.isDirectory()) {
			return listTypeScriptFiles(path);
		}
		return path.endsWith('.ts') ? [path] : [];
	});
}
