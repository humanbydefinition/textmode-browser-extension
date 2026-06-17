export interface RgbaColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

export interface HsvaColor {
	h: number;
	s: number;
	v: number;
	a: number;
}

export const FALLBACK_COLOR = '#000000';
export const FALLBACK_RGBA: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };

export function normalizeHexColor(value: string): string | null {
	const color = parseHexColor(value);
	return color ? formatHexColor(color) : null;
}

export function parseHexColor(value: string): RgbaColor | null {
	const hex = value.trim().replace(/^#/, '');

	if (!/^[0-9a-f]+$/i.test(hex)) {
		return null;
	}

	if (hex.length === 3) {
		const [r, g, b] = hex.split('');
		return {
			r: Number.parseInt(`${r}${r}`, 16),
			g: Number.parseInt(`${g}${g}`, 16),
			b: Number.parseInt(`${b}${b}`, 16),
			a: 1,
		};
	}

	if (hex.length === 6) {
		return {
			r: Number.parseInt(hex.slice(0, 2), 16),
			g: Number.parseInt(hex.slice(2, 4), 16),
			b: Number.parseInt(hex.slice(4, 6), 16),
			a: 1,
		};
	}

	return null;
}

export function formatHexColor(color: RgbaColor): string {
	const red = toHexByte(color.r);
	const green = toHexByte(color.g);
	const blue = toHexByte(color.b);

	return `#${red}${green}${blue}`;
}

export function getDisplayColor(value: string): string {
	return normalizeHexColor(value) ?? FALLBACK_COLOR;
}

export function rgbaToHsva({ r, g, b, a }: RgbaColor): HsvaColor {
	const red = clamp(r, 0, 255) / 255;
	const green = clamp(g, 0, 255) / 255;
	const blue = clamp(b, 0, 255) / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const delta = max - min;

	let hue = 0;
	if (delta !== 0) {
		if (max === red) {
			hue = 60 * (((green - blue) / delta) % 6);
		} else if (max === green) {
			hue = 60 * ((blue - red) / delta + 2);
		} else {
			hue = 60 * ((red - green) / delta + 4);
		}
	}

	return {
		h: Math.round((hue + 360) % 360),
		s: max === 0 ? 0 : delta / max,
		v: max,
		a: clamp(a, 0, 1),
	};
}

export function hsvaToRgba({ h, s, v, a }: HsvaColor): RgbaColor {
	const hue = ((h % 360) + 360) % 360;
	const saturation = clamp(s, 0, 1);
	const value = clamp(v, 0, 1);
	const chroma = value * saturation;
	const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = value - chroma;
	const [red, green, blue] = getHueRgb(hue, chroma, x);

	return {
		r: Math.round((red + m) * 255),
		g: Math.round((green + m) * 255),
		b: Math.round((blue + m) * 255),
		a: clamp(a, 0, 1),
	};
}

export function getHsvaFromHex(value: string): HsvaColor {
	return rgbaToHsva(parseHexColor(value) ?? FALLBACK_RGBA);
}

export function getPopoverPortalContainer(
	rootNode: Node | null | undefined,
	fallback: HTMLElement | null
): HTMLElement | null {
	if (rootNode instanceof ShadowRoot) {
		return rootNode.querySelector<HTMLElement>('[data-textmode-overlay-portal-root="true"]') ?? fallback;
	}

	return fallback;
}

function getHueRgb(hue: number, chroma: number, x: number): [number, number, number] {
	if (hue < 60) return [chroma, x, 0];
	if (hue < 120) return [x, chroma, 0];
	if (hue < 180) return [0, chroma, x];
	if (hue < 240) return [0, x, chroma];
	if (hue < 300) return [x, 0, chroma];
	return [chroma, 0, x];
}

function toHexByte(value: number): string {
	return Math.round(clamp(value, 0, 255))
		.toString(16)
		.padStart(2, '0');
}

function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) {
		return min;
	}
	return Math.min(max, Math.max(min, value));
}
