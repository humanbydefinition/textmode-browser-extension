import { describe, expect, it, vi } from 'vitest';
import { h } from '../../../src/widgets/overlay-panel/dom';
import { PopoverView } from '../../../src/widgets/overlay-panel/components/popover-view';
import { SliderView } from '../../../src/widgets/overlay-panel/components/slider-view';
import { TabsView } from '../../../src/widgets/overlay-panel/components/tabs-view';
import { ToggleGroupView } from '../../../src/widgets/overlay-panel/components/toggle-group-view';

describe('vanilla UI primitives', () => {
	it('switches tabs with Radix-compatible state attributes', () => {
		const tabs = new TabsView();
		document.body.append(tabs.element);

		const triggers = tabs.element.querySelectorAll<HTMLButtonElement>('[role="tab"]');
		expect(triggers[0]?.dataset.state).toBe('active');
		expect(tabs.exportContent.hidden).toBe(false);
		expect(tabs.advancedContent.hidden).toBe(true);

		triggers[1]?.click();

		expect(triggers[0]?.dataset.state).toBe('inactive');
		expect(triggers[1]?.dataset.state).toBe('active');
		expect(tabs.exportContent.hidden).toBe(true);
		expect(tabs.advancedContent.hidden).toBe(false);

		tabs.element.remove();
	});

	it('updates single toggle group selection', () => {
		const onChange = vi.fn();
		const toggleGroup = new ToggleGroupView(['sampled', 'fixed'] as const, 'sampled', onChange);
		document.body.append(toggleGroup.element);

		const buttons = toggleGroup.element.querySelectorAll<HTMLButtonElement>('button');
		expect(buttons[0]?.dataset.state).toBe('on');
		expect(buttons[1]?.dataset.state).toBe('off');

		buttons[1]?.click();

		expect(onChange).toHaveBeenCalledWith('fixed');
		expect(buttons[0]?.dataset.state).toBe('off');
		expect(buttons[1]?.dataset.state).toBe('on');

		toggleGroup.element.remove();
	});

	it('clamps slider keyboard values and calls back with numbers', () => {
		const onChange = vi.fn();
		const slider = new SliderView({ min: 0, max: 1, step: 0.25, value: 0.5, onChange });
		document.body.append(slider.element);

		const thumb = slider.element.querySelector<HTMLElement>('[data-slot="slider-thumb"]');
		thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
		thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

		expect(onChange).toHaveBeenNthCalledWith(1, 0.75);
		expect(onChange).toHaveBeenNthCalledWith(2, 1);
		expect(thumb?.getAttribute('aria-valuenow')).toBe('1');

		slider.element.remove();
	});

	it('mounts popover content into the configured portal and cleans up', () => {
		const trigger = h('button', { attributes: { type: 'button' }, textContent: 'open' });
		const content = h('div', { textContent: 'popover' });
		const portal = h('div');
		document.body.append(trigger, portal);

		const popover = new PopoverView({ trigger, content, portalContainer: portal });
		trigger.click();

		expect(portal.querySelector('[data-slot="popover-content"]')).toBe(content);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');

		popover.dispose();
		expect(portal.querySelector('[data-slot="popover-content"]')).toBeNull();
		trigger.remove();
		portal.remove();
	});
});
