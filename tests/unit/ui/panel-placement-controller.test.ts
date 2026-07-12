import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelPlacementController } from '../../../src/widgets/overlay-panel/panel-placement-controller';
import { MockResizeObserver, mockRect } from '../test-helpers';

function pointerEvent(type: string, init: MouseEventInit & { pointerId?: number } = {}): PointerEvent {
	const event = new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		button: 0,
		...init,
	}) as PointerEvent;
	Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
	return event;
}

function createHarness(initialPlacement?: { xRatio: number; yRatio: number }) {
	const host = document.createElement('div');
	const surface = document.createElement('main');
	const handle = document.createElement('button');
	host.append(surface);
	document.body.append(host);
	mockRect(surface, { width: 300, height: 200 });
	mockRect(host, { width: 300, height: 200 });
	handle.setPointerCapture = vi.fn();
	handle.releasePointerCapture = vi.fn();
	handle.hasPointerCapture = vi.fn(() => true);
	const onCommit = vi.fn();
	const onReset = vi.fn();
	const controller = new PanelPlacementController({
		host,
		surface,
		handle,
		initialPlacement,
		onCommit,
		onReset,
	});
	controller.mount();
	return { controller, handle, host, onCommit, onReset, surface };
}

describe('PanelPlacementController', () => {
	beforeEach(() => {
		document.body.replaceChildren();
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
		let animationTime = 0;
		vi.stubGlobal(
			'requestAnimationFrame',
			vi.fn((callback: FrameRequestCallback) => {
				const frameTime = animationTime;
				animationTime += 100;
				callback(frameTime);
				return 1;
			})
		);
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
		Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('renders the default placement at the top-right viewport gutter', () => {
		const { controller, host } = createHarness();

		expect(host.style.left).toBe('490px');
		expect(host.style.top).toBe('10px');
		expect(controller.getPlacement()).toEqual({ xRatio: 1, yRatio: 0 });
	});

	it('drags one-to-one, clamps to the viewport, and commits on release', () => {
		const { handle, host, onCommit, surface } = createHarness();

		handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 7, clientX: 500, clientY: 10 }));
		handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 7, clientX: 400, clientY: 60 }));

		expect(host.style.left).toBe('390px');
		expect(host.style.top).toBe('60px');
		expect(surface.dataset.dragging).toBe('true');
		expect(onCommit).not.toHaveBeenCalled();

		handle.dispatchEvent(pointerEvent('pointerup', { pointerId: 7, clientX: 400, clientY: 60 }));
		expect(handle.setPointerCapture).toHaveBeenCalledWith(7);
		expect(handle.releasePointerCapture).toHaveBeenCalledWith(7);
		expect(surface.dataset.dragging).toBeUndefined();
		expect(onCommit).toHaveBeenCalledWith({
			xRatio: 380 / 480,
			yRatio: 50 / 380,
		});
	});

	it('ignores keyboard shortcuts owned by the host page', () => {
		const { handle, host, onCommit, onReset } = createHarness({ xRatio: 0.5, yRatio: 0.5 });

		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
		handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

		expect(host.style.left).toBe('250px');
		expect(host.style.top).toBe('200px');
		expect(onCommit).not.toHaveBeenCalled();
		expect(onReset).not.toHaveBeenCalled();
	});

	it('smoothly resets to the top-right on double-click without committing click-only drags', () => {
		const { controller, handle, host, onCommit, onReset, surface } = createHarness({
			xRatio: 0.5,
			yRatio: 0.5,
		});
		handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 3, clientX: 250, clientY: 200 }));
		handle.dispatchEvent(pointerEvent('pointerup', { pointerId: 3, clientX: 250, clientY: 200 }));
		expect(onCommit).not.toHaveBeenCalled();

		handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }));

		expect(host.style.left).toBe('490px');
		expect(host.style.top).toBe('10px');
		expect(controller.getPlacement()).toEqual({ xRatio: 1, yRatio: 0 });
		expect(onReset).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
		expect(surface.dataset.resetting).toBeUndefined();
		expect(requestAnimationFrame).toHaveBeenCalledTimes(4);
	});

	it('preserves relative placement when the viewport and panel size change', () => {
		const { controller, host, surface } = createHarness({ xRatio: 0.5, yRatio: 0.5 });
		expect(host.style.left).toBe('250px');
		expect(host.style.top).toBe('200px');

		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600 });
		Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
		mockRect(surface, { width: 300, height: 250 });
		controller.scheduleRender();

		expect(host.style.left).toBe('150px');
		expect(host.style.top).toBe('75px');
		expect(controller.getPlacement()).toEqual({ xRatio: 0.5, yRatio: 0.5 });
	});

	it('commits an active drag and removes pointer and double-click listeners on disposal', () => {
		const { controller, handle, host, onCommit } = createHarness({ xRatio: 0.5, yRatio: 0.5 });
		handle.dispatchEvent(pointerEvent('pointerdown', { pointerId: 9, clientX: 250, clientY: 200 }));
		handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 9, clientX: 270, clientY: 220 }));

		controller.dispose();
		expect(onCommit).toHaveBeenCalledTimes(1);
		const left = host.style.left;
		handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }));
		expect(host.style.left).toBe(left);
	});
});
