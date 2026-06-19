import { describe, expect, it } from 'vitest';
import { computePopoverPosition } from '@/widgets/overlay-panel/components/popover-position';

describe('computePopoverPosition', () => {
	it('places content below the trigger when there is enough space', () => {
		const position = computePopoverPosition({
			triggerRect: rect({ left: 100, top: 100, width: 80, height: 30 }),
			contentRect: rect({ left: 0, top: 0, width: 120, height: 80 }),
			viewportWidth: 400,
			viewportHeight: 400,
			sideOffset: 8,
		});

		expect(position).toMatchObject({
			top: 138,
			left: 80,
			side: 'bottom',
			align: 'center',
			transformOrigin: 'top center',
		});
	});

	it('places content above the trigger when the bottom side lacks space', () => {
		const position = computePopoverPosition({
			triggerRect: rect({ left: 100, top: 330, width: 80, height: 30 }),
			contentRect: rect({ left: 0, top: 0, width: 120, height: 80 }),
			viewportWidth: 400,
			viewportHeight: 400,
			sideOffset: 8,
		});

		expect(position).toMatchObject({
			top: 242,
			side: 'top',
			transformOrigin: 'bottom center',
		});
	});

	it('prefers top after bottom fails and clamps when neither side fully fits', () => {
		const position = computePopoverPosition({
			triggerRect: rect({ left: 10, top: 52, width: 60, height: 28 }),
			contentRect: rect({ left: 0, top: 0, width: 380, height: 170 }),
			viewportWidth: 300,
			viewportHeight: 180,
			sideOffset: 8,
			collisionPadding: 8,
		});

		expect(position.side).toBe('top');
		expect(position.top).toBe(8);
		expect(position.left).toBe(8);
	});

	it('supports start, center, and end horizontal alignment', () => {
		const input = {
			triggerRect: rect({ left: 100, top: 100, width: 80, height: 30 }),
			contentRect: rect({ left: 0, top: 0, width: 120, height: 80 }),
			viewportWidth: 400,
			viewportHeight: 400,
		};

		expect(computePopoverPosition({ ...input, align: 'start' }).left).toBe(100);
		expect(computePopoverPosition({ ...input, align: 'center' }).left).toBe(80);
		expect(computePopoverPosition({ ...input, align: 'end' }).left).toBe(60);
	});
});

function rect({
	left,
	top,
	width,
	height,
}: {
	left: number;
	top: number;
	width: number;
	height: number;
}): DOMRectReadOnly {
	return {
		x: left,
		y: top,
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		toJSON: () => undefined,
	} as DOMRectReadOnly;
}
