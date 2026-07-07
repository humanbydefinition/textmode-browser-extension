export type OverlayPostFxFilterId =
	| 'invert'
	| 'grayscale'
	| 'sepia'
	| 'threshold'
	| 'brightness'
	| 'contrast'
	| 'saturation'
	| 'hueRotate'
	| 'posterize'
	| 'chromaticAberration'
	| 'pixelate'
	| 'crtMattias'
	| 'scanlines'
	| 'vignette'
	| 'bloom'
	| 'filmGrain';

export type OverlayPostFxGroup = 'built-in' | 'color' | 'distortion' | 'stylize';

export interface OverlayPostFxParamDefinition {
	id: string;
	label: string;
	min: number;
	max: number;
	step: number;
	defaultValue: number;
	format?: 'number' | 'percent' | 'pixels' | 'degrees';
}

export interface OverlayPostFxDefinition {
	id: OverlayPostFxFilterId;
	label: string;
	group: OverlayPostFxGroup;
	description: string;
	params: readonly OverlayPostFxParamDefinition[];
}

export interface OverlayPostFxItem {
	id: string;
	filter: OverlayPostFxFilterId;
	enabled: boolean;
	params: Record<string, number>;
}

const FACTOR_PARAM_LIMIT = { min: 0, max: 1, step: 0.05 } as const;
const MULTIPLIER_LIMIT = { min: 0, max: 3, step: 0.05 } as const;

export const OVERLAY_POST_FX_DEFINITIONS = [
	defineFilter('invert', 'invert', 'built-in', 'Invert final output colors.', []),
	defineFilter('grayscale', 'grayscale', 'built-in', 'Blend the final output toward grayscale.', [
		param('amount', 'amount', FACTOR_PARAM_LIMIT, 1, 'percent'),
	]),
	defineFilter('sepia', 'sepia', 'built-in', 'Blend the final output toward sepia tones.', [
		param('amount', 'amount', FACTOR_PARAM_LIMIT, 1, 'percent'),
	]),
	defineFilter('threshold', 'threshold', 'built-in', 'Convert the final output to hard black and white bands.', [
		param('threshold', 'threshold', FACTOR_PARAM_LIMIT, 0.5, 'percent'),
	]),
	defineFilter('brightness', 'brightness', 'color', 'Multiply the final output brightness.', [
		param('amount', 'amount', MULTIPLIER_LIMIT, 1),
	]),
	defineFilter('contrast', 'contrast', 'color', 'Scale contrast around the midpoint.', [
		param('amount', 'amount', MULTIPLIER_LIMIT, 1),
	]),
	defineFilter('saturation', 'saturation', 'color', 'Adjust color intensity without changing luminance.', [
		param('amount', 'amount', MULTIPLIER_LIMIT, 1),
	]),
	defineFilter('hueRotate', 'hue rotate', 'color', 'Rotate colors around the color wheel.', [
		param('angle', 'angle', { min: 0, max: 360, step: 1 }, 0, 'degrees'),
	]),
	defineFilter('posterize', 'posterize', 'color', 'Reduce colors into channel bands.', [
		param('levels', 'levels', { min: 2, max: 16, step: 1 }, 4),
	]),
	defineFilter('chromaticAberration', 'chromatic aberration', 'distortion', 'Separate color channels by direction.', [
		param('amount', 'amount', { min: 0, max: 24, step: 0.5 }, 5, 'pixels'),
		param('directionX', 'direction x', { min: -1, max: 1, step: 0.05 }, 1),
		param('directionY', 'direction y', { min: -1, max: 1, step: 0.05 }, 0),
	]),
	defineFilter('pixelate', 'pixelate', 'distortion', 'Apply a mosaic-style pixel block effect.', [
		param('pixelSize', 'pixel size', { min: 1, max: 64, step: 1 }, 4, 'pixels'),
	]),
	defineFilter('crtMattias', 'crt mattias', 'stylize', 'Apply CRT curvature and animated scan movement.', [
		param('curvature', 'curvature', FACTOR_PARAM_LIMIT, 0.5, 'percent'),
		param('scanSpeed', 'scan speed', { min: 0, max: 3, step: 0.05 }, 1),
	]),
	defineFilter('scanlines', 'scanlines', 'stylize', 'Overlay animated horizontal scanlines.', [
		param('count', 'count', { min: 10, max: 600, step: 10 }, 300),
		param('lineWidth', 'line width', FACTOR_PARAM_LIMIT, 0.5, 'percent'),
		param('intensity', 'intensity', FACTOR_PARAM_LIMIT, 0.75, 'percent'),
		param('speed', 'speed', { min: 0, max: 3, step: 0.05 }, 1),
	]),
	defineFilter('vignette', 'vignette', 'stylize', 'Darken the final output edges.', [
		param('amount', 'amount', FACTOR_PARAM_LIMIT, 0.5, 'percent'),
		param('softness', 'softness', FACTOR_PARAM_LIMIT, 0.5, 'percent'),
		param('roundness', 'roundness', FACTOR_PARAM_LIMIT, 0.5, 'percent'),
	]),
	defineFilter('bloom', 'bloom', 'stylize', 'Glow around bright regions.', [
		param('threshold', 'threshold', FACTOR_PARAM_LIMIT, 0.5, 'percent'),
		param('intensity', 'intensity', { min: 0, max: 3, step: 0.05 }, 1),
		param('radius', 'radius', { min: 1, max: 16, step: 0.5 }, 4, 'pixels'),
	]),
	defineFilter('filmGrain', 'film grain', 'stylize', 'Add animated film-style grain.', [
		param('intensity', 'intensity', FACTOR_PARAM_LIMIT, 0.2, 'percent'),
		param('size', 'size', { min: 1, max: 10, step: 0.5 }, 2, 'pixels'),
		param('speed', 'speed', { min: 0, max: 3, step: 0.05 }, 1),
	]),
] as const satisfies readonly OverlayPostFxDefinition[];

export const OVERLAY_POST_FX_FILTER_IDS = OVERLAY_POST_FX_DEFINITIONS.map((definition) => definition.id);

export const OVERLAY_POST_FX_GROUP_LABELS: Record<OverlayPostFxGroup, string> = {
	'built-in': 'built-in',
	color: 'color',
	distortion: 'distortion',
	stylize: 'stylize',
};

export function getOverlayPostFxDefinition(filter: string): OverlayPostFxDefinition | undefined {
	return OVERLAY_POST_FX_DEFINITIONS.find((definition) => definition.id === filter);
}

export function isOverlayPostFxFilterId(value: string): value is OverlayPostFxFilterId {
	return OVERLAY_POST_FX_FILTER_IDS.includes(value as OverlayPostFxFilterId);
}

export function createOverlayPostFxItem(filter: OverlayPostFxFilterId): OverlayPostFxItem {
	const definition = getOverlayPostFxDefinition(filter);
	return {
		id: createPostFxId(filter),
		filter,
		enabled: false,
		params: definition ? createDefaultPostFxParams(definition) : {},
	};
}

export function createDefaultOverlayPostFxItems(): OverlayPostFxItem[] {
	return OVERLAY_POST_FX_DEFINITIONS.map((definition) => createOverlayPostFxItem(definition.id));
}

export function normalizeOverlayPostFxItems(items: readonly OverlayPostFxItem[] | undefined): OverlayPostFxItem[] {
	if (!Array.isArray(items)) {
		return createDefaultOverlayPostFxItems();
	}

	const seen = new Set<OverlayPostFxFilterId>();
	const normalized: OverlayPostFxItem[] = [];

	for (const item of items) {
		const next = normalizeOverlayPostFxItem(item);
		if (!next || seen.has(next.filter)) continue;
		seen.add(next.filter);
		normalized.push(next);
	}

	for (const definition of OVERLAY_POST_FX_DEFINITIONS) {
		if (seen.has(definition.id)) continue;
		normalized.push(createOverlayPostFxItem(definition.id));
	}

	return normalized;
}

export function createDefaultPostFxParams(definition: OverlayPostFxDefinition): Record<string, number> {
	const params: Record<string, number> = {};
	for (const paramDefinition of definition.params) {
		params[paramDefinition.id] = paramDefinition.defaultValue;
	}
	return params;
}

export function normalizeOverlayPostFxParams(
	filter: OverlayPostFxFilterId,
	params: Record<string, unknown> | undefined
): Record<string, number> {
	const definition = getOverlayPostFxDefinition(filter);
	if (!definition) return {};

	const next = createDefaultPostFxParams(definition);
	for (const paramDefinition of definition.params) {
		const value = params?.[paramDefinition.id];
		next[paramDefinition.id] = normalizeNumber(value, paramDefinition);
	}
	return next;
}

function normalizeOverlayPostFxItem(item: OverlayPostFxItem): OverlayPostFxItem | null {
	if (!item || !isOverlayPostFxFilterId(item.filter)) {
		return null;
	}

	return {
		id: typeof item.id === 'string' && item.id.trim() ? item.id : createPostFxId(item.filter),
		filter: item.filter,
		enabled: typeof item.enabled === 'boolean' ? item.enabled : false,
		params: normalizeOverlayPostFxParams(item.filter, item.params),
	};
}

function defineFilter(
	id: OverlayPostFxFilterId,
	label: string,
	group: OverlayPostFxGroup,
	description: string,
	params: readonly OverlayPostFxParamDefinition[]
): OverlayPostFxDefinition {
	return { id, label, group, description, params };
}

function param(
	id: string,
	label: string,
	limits: { min: number; max: number; step: number },
	defaultValue: number,
	format: OverlayPostFxParamDefinition['format'] = 'number'
): OverlayPostFxParamDefinition {
	return {
		id,
		label,
		min: limits.min,
		max: limits.max,
		step: limits.step,
		defaultValue,
		format,
	};
}

function normalizeNumber(value: unknown, definition: OverlayPostFxParamDefinition): number {
	const numeric = typeof value === 'number' && Number.isFinite(value) ? value : definition.defaultValue;
	const stepped = definition.step >= 1 ? Math.round(numeric / definition.step) * definition.step : numeric;
	return Math.min(definition.max, Math.max(definition.min, stepped));
}

function createPostFxId(filter: OverlayPostFxFilterId): string {
	return `postfx-${filter}`;
}
