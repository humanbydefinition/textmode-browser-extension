import { vi } from 'vitest';

export class MockResizeObserver {
	public observe = vi.fn();
	public unobserve = vi.fn();
	public disconnect = vi.fn();
}

export function mockRect(
	element: Element,
	rect: { left: number; top: number; width: number; height: number } | { width: number; height: number }
): void {
	const left = 'left' in rect ? rect.left : 0;
	const top = 'top' in rect ? rect.top : 0;
	element.getBoundingClientRect = () =>
		({
			x: left,
			y: top,
			left,
			top,
			right: left + rect.width,
			bottom: top + rect.height,
			width: rect.width,
			height: rect.height,
			toJSON: () => undefined,
		}) as DOMRect;
}

export function createMockSource(methods: readonly string[] = DEFAULT_SOURCE_METHODS): Record<string, () => unknown> {
	const source: Record<string, () => unknown> = {};
	for (const method of methods) {
		source[method] = vi.fn(() => source);
	}
	return source;
}

export function createMockOverlayController(source?: Record<string, () => unknown>) {
	const mockSource = source ?? createMockSource();
	return {
		source: mockSource,
		target: undefined as unknown,
		setTarget: vi.fn((_target: unknown) => mockSource),
		clearTarget: vi.fn(),
		show: vi.fn(),
		hide: vi.fn(),
		toggle: vi.fn(),
		isVisible: vi.fn(() => true),
	};
}

const DEFAULT_SOURCE_METHODS = [
	'characters',
	'conversionMode',
	'conversions',
	'invert',
	'brightnessRange',
	'charColorMode',
	'charColor',
	'cellColorMode',
	'cellColor',
	'background',
] as const;
