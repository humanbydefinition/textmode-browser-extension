import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const srcRoot = resolve(root, 'src');
const entrypointsRoot = resolve(srcRoot, 'entrypoints');
const applicationRoot = resolve(srcRoot, 'application');
const domainRoot = resolve(srcRoot, 'domain');
const featuresRoot = resolve(srcRoot, 'features');
const sharedBrowserRoot = resolve(srcRoot, 'shared/browser');
const widgetsRoot = resolve(srcRoot, 'widgets');
const wxtAllowedRoots = [entrypointsRoot, resolve(srcRoot, 'shared/browser'), resolve(srcRoot, 'shared/config')];
const importPattern =
	/(?:import|export)\s+(?:[^'"()]+?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const violations = [];

for (const file of collectSourceFiles(srcRoot)) {
	const source = readFileSync(file, 'utf8');
	const fromEntryPoints = isInside(file, entrypointsRoot);
	let match;

	while ((match = importPattern.exec(source))) {
		const specifier = match[1] ?? match[2];
		if (!specifier) continue;

		if (specifier.startsWith('wxt') && !wxtAllowedRoots.some((allowedRoot) => isInside(file, allowedRoot))) {
			violations.push(`${format(file)} imports WXT directly via "${specifier}".`);
		}

		if (!specifier.startsWith('.')) continue;
		const target = resolve(dirname(file), specifier);
		if (!fromEntryPoints && isInside(target, entrypointsRoot)) {
			violations.push(`${format(file)} imports an entrypoint via "${specifier}".`);
		}

		if (isInside(file, domainRoot) && isForbiddenDomainDependency(target)) {
			violations.push(`${format(file)} imports outside the domain boundary via "${specifier}".`);
		}

		if (isInside(file, widgetsRoot) && (isInside(target, applicationRoot) || isInside(target, featuresRoot))) {
			violations.push(`${format(file)} imports application/feature code via "${specifier}".`);
		}

		if (isInside(file, featuresRoot) && isInside(target, widgetsRoot)) {
			violations.push(`${format(file)} imports widget code via "${specifier}".`);
		}
	}

	if (isInside(file, domainRoot) && /\bchrome\./.test(source)) {
		violations.push(`${format(file)} uses the browser runtime directly from the domain layer.`);
	}
}

if (violations.length > 0) {
	console.error('Boundary check failed:');
	for (const violation of violations) {
		console.error(`- ${violation}`);
	}
	process.exit(1);
}

function collectSourceFiles(directory) {
	return readdirSync(directory).flatMap((entry) => {
		const path = resolve(directory, entry);
		const stats = statSync(path);
		if (stats.isDirectory()) {
			return collectSourceFiles(path);
		}
		return /\.(?:ts|tsx)$/.test(path) ? [path] : [];
	});
}

function isInside(path, directory) {
	const scoped = `${resolve(directory)}${sep}`;
	return path === resolve(directory) || path.startsWith(scoped);
}

function format(path) {
	return relative(root, path);
}

function isForbiddenDomainDependency(target) {
	return (
		isInside(target, applicationRoot) ||
		isInside(target, featuresRoot) ||
		isInside(target, widgetsRoot) ||
		isInside(target, sharedBrowserRoot)
	);
}
