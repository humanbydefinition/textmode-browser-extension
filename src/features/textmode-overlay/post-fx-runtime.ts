import {
	OVERLAY_POST_FX_FILTER_IDS,
	getOverlayPostFxDefinition,
	type OverlayPostFxFilterId,
	type OverlayPostFxItem,
} from '../../domain/overlay/overlay-settings';
import type { ExportableTextmodeInstance } from './overlay-renderer';

export interface ResolvedPostFxFilter {
	name: OverlayPostFxFilterId;
	params?: Record<string, number | number[]>;
}

type FilterableTextmodeInstance = ExportableTextmodeInstance & {
	filters?: {
		has?: (name: string) => boolean;
	};
	secs?: number;
};

const FILTER_REGISTRATION_TIMEOUT_MS = 250;

export function applyPostFxFilters(instance: ExportableTextmodeInstance, postFx: readonly OverlayPostFxItem[]): void {
	const filterable = instance as FilterableTextmodeInstance;
	if (typeof filterable.filter !== 'function') return;

	for (const filter of resolvePostFxFilters(instance, postFx)) {
		filterable.filter(filter.name, filter.params);
	}
}

export function resolvePostFxFilters(
	instance: ExportableTextmodeInstance,
	postFx: readonly OverlayPostFxItem[]
): ResolvedPostFxFilter[] {
	const filterable = instance as FilterableTextmodeInstance;
	const resolved: ResolvedPostFxFilter[] = [];

	for (const item of postFx) {
		if (!item.enabled) continue;
		if (!getOverlayPostFxDefinition(item.filter)) continue;
		if (filterable.filters?.has && !filterable.filters.has(item.filter)) continue;

		resolved.push({
			name: item.filter,
			params: resolvePostFxParams(filterable, item),
		});
	}

	return resolved;
}

export function arePostFxFiltersRegistered(instance: ExportableTextmodeInstance): boolean {
	const filterable = instance as FilterableTextmodeInstance;
	if (!filterable.filters?.has) return false;
	return OVERLAY_POST_FX_FILTER_IDS.every((filterId) => filterable.filters?.has?.(filterId));
}

export async function waitForPostFxFilterRegistration(instance: ExportableTextmodeInstance): Promise<boolean> {
	if (arePostFxFiltersRegistered(instance)) return true;

	const startedAt = performance.now();
	while (performance.now() - startedAt < FILTER_REGISTRATION_TIMEOUT_MS) {
		await nextFrame();
		if (arePostFxFiltersRegistered(instance)) return true;
	}

	return false;
}

function resolvePostFxParams(
	instance: FilterableTextmodeInstance,
	item: OverlayPostFxItem
): Record<string, number | number[]> | undefined {
	switch (item.filter) {
		case 'invert':
			return undefined;
		case 'chromaticAberration':
			return {
				amount: item.params.amount,
				direction: [item.params.directionX, item.params.directionY],
			};
		case 'crtMattias':
			return {
				curvature: item.params.curvature,
				scanSpeed: item.params.scanSpeed,
				time: getRuntimeSeconds(instance),
			};
		case 'scanlines':
			return {
				count: item.params.count,
				lineWidth: item.params.lineWidth,
				intensity: item.params.intensity,
				speed: item.params.speed,
				time: getRuntimeSeconds(instance),
			};
		case 'filmGrain':
			return {
				intensity: item.params.intensity,
				size: item.params.size,
				speed: item.params.speed,
				time: getRuntimeSeconds(instance),
			};
		default:
			return resolvePlainParams(item);
	}
}

function resolvePlainParams(item: OverlayPostFxItem): Record<string, number> {
	const definition = getOverlayPostFxDefinition(item.filter);
	const params: Record<string, number> = {};
	for (const param of definition?.params ?? []) {
		params[param.id] = item.params[param.id];
	}
	return params;
}

function getRuntimeSeconds(instance: FilterableTextmodeInstance): number {
	return finiteOr(instance.secs, 0);
}

function finiteOr(value: number | undefined, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nextFrame(): Promise<void> {
	return new Promise((resolve) => {
		if (typeof requestAnimationFrame === 'function') {
			requestAnimationFrame(() => resolve());
			return;
		}
		setTimeout(resolve, 0);
	});
}
