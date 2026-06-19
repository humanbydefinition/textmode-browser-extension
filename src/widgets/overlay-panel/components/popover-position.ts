export type PopoverAlign = 'start' | 'center' | 'end';
export type PopoverSide = 'top' | 'bottom';

export interface PopoverPositionInput {
	triggerRect: DOMRectReadOnly;
	contentRect: DOMRectReadOnly;
	viewportWidth: number;
	viewportHeight: number;
	align?: PopoverAlign;
	preferredSide?: PopoverSide;
	sideOffset?: number;
	collisionPadding?: number;
}

export interface PopoverPosition {
	top: number;
	left: number;
	side: PopoverSide;
	align: PopoverAlign;
	transformOrigin: string;
}

const DEFAULT_SIDE_OFFSET = 4;
const DEFAULT_COLLISION_PADDING = 8;

export function computePopoverPosition({
	triggerRect,
	contentRect,
	viewportWidth,
	viewportHeight,
	align = 'center',
	preferredSide = 'bottom',
	sideOffset = DEFAULT_SIDE_OFFSET,
	collisionPadding = DEFAULT_COLLISION_PADDING,
}: PopoverPositionInput): PopoverPosition {
	const spaceBelow = viewportHeight - triggerRect.bottom;
	const requiredSpace = contentRect.height + sideOffset + collisionPadding;
	const side = preferredSide === 'bottom' && spaceBelow < requiredSpace ? 'top' : preferredSide;
	const unclampedTop =
		side === 'top' ? triggerRect.top - contentRect.height - sideOffset : triggerRect.bottom + sideOffset;
	const unclampedLeft = getAlignedLeft(triggerRect, contentRect, align);
	const top = clamp(unclampedTop, collisionPadding, viewportHeight - contentRect.height - collisionPadding);
	const left = clamp(unclampedLeft, collisionPadding, viewportWidth - contentRect.width - collisionPadding);

	return {
		top,
		left,
		side,
		align,
		transformOrigin: `${side === 'top' ? 'bottom' : 'top'} ${getTransformOriginX(align)}`,
	};
}

function getAlignedLeft(triggerRect: DOMRectReadOnly, contentRect: DOMRectReadOnly, align: PopoverAlign): number {
	if (align === 'start') {
		return triggerRect.left;
	}

	if (align === 'end') {
		return triggerRect.right - contentRect.width;
	}

	return triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
}

function getTransformOriginX(align: PopoverAlign): string {
	if (align === 'start') {
		return 'left';
	}

	if (align === 'end') {
		return 'right';
	}

	return 'center';
}

function clamp(value: number, min: number, max: number): number {
	if (max < min) {
		return min;
	}

	return Math.min(max, Math.max(min, value));
}
