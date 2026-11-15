import { describe, expect, it, vi } from 'vitest';
import { PickerTargetList } from '../../src/features/media-picker/picker-target-list';

describe('picker target list', () => {
	it('exposes frame targets as buttons and restores focus after cancellation', () => {
		const opener = document.createElement('button');
		document.body.append(opener);
		opener.focus();
		const select = vi.fn();
		const highlight = vi.fn();
		const cancel = vi.fn();
		const list = new PickerTargetList(select, highlight, cancel);
		list.mount();
		const frame = {
			frameId: 4,
			runtimeId: 'runtime',
			targets: [{ id: 'one', label: 'video', dimensions: '320x180' }],
		};
		list.update([frame]);
		const host = document.querySelector<HTMLElement>('[data-textmode-picker-list]')!;
		const button = host.shadowRoot!.querySelector<HTMLButtonElement>('li button')!;
		expect(button.getAttribute('aria-label')).toBe('video, 320x180');
		button.focus();
		expect(highlight).toHaveBeenCalledWith(frame, frame.targets[0]);
		button.click();
		expect(select).toHaveBeenCalledWith(frame, frame.targets[0]);
		list.update([frame]);
		expect(host.shadowRoot!.activeElement).toBe(button);
		list.update([]);
		expect(host.shadowRoot!.activeElement?.textContent).toBe('Select media');
		list.dispose();
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});
	it('distinguishes duplicate labels across frames', () => {
		const list = new PickerTargetList(vi.fn(), vi.fn(), vi.fn());
		list.mount();
		list.update([
			{
				frameId: 0,
				runtimeId: 'top',
				targets: [{ id: 'one', label: 'video' }],
			},
			{
				frameId: 3,
				runtimeId: 'child',
				targets: [
					{ id: 'two', label: 'video' },
					{ id: 'three', label: 'canvas' },
				],
			},
		]);
		const host = document.querySelector<HTMLElement>('[data-textmode-picker-list]')!;
		expect([...host.shadowRoot!.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
			'video (1)',
			'video (2)',
			'canvas',
		]);
		list.dispose();
	});

	it('previews hovered media and restores the keyboard-focused preview', () => {
		const highlight = vi.fn();
		const list = new PickerTargetList(vi.fn(), highlight, vi.fn());
		list.mount();
		const frame = {
			frameId: 0,
			runtimeId: 'runtime',
			targets: [
				{ id: 'a', label: 'canvas' },
				{ id: 'b', label: 'video' },
			],
		};
		list.update([frame]);
		const host = document.querySelector<HTMLElement>('[data-textmode-picker-list]')!;
		const [first, second] = [...host.shadowRoot!.querySelectorAll<HTMLButtonElement>('li button')];
		first!.focus();
		second!.dispatchEvent(new Event('pointerenter'));
		expect(highlight).toHaveBeenLastCalledWith(frame, frame.targets[1]);
		second!.dispatchEvent(new Event('pointerleave'));
		expect(highlight).toHaveBeenLastCalledWith(frame, frame.targets[0]);
		list.dispose();
		expect(highlight).toHaveBeenLastCalledWith(frame);
	});

	it('mounts inside the supplied panel area', () => {
		const mount = document.createElement('div');
		document.body.append(mount);
		const list = new PickerTargetList(vi.fn(), vi.fn(), vi.fn());
		list.mount(mount);
		expect(mount.querySelector('[data-textmode-picker-list]')).not.toBeNull();
		list.dispose();
		expect(mount.querySelector('[data-textmode-picker-list]')).toBeNull();
		mount.remove();
	});

	it('updates dimension badges in place and disambiguates duplicate labels independently of dimensions', () => {
		const list = new PickerTargetList(vi.fn(), vi.fn(), vi.fn());
		list.mount();
		const frame = {
			frameId: 0,
			runtimeId: 'runtime',
			targets: [
				{ id: 'a', label: 'canvas', dimensions: '320x180' },
				{ id: 'b', label: 'canvas', dimensions: '640x360' },
			],
		};
		list.update([frame]);
		const host = document.querySelector<HTMLElement>('[data-textmode-picker-list]')!;
		const buttons = [...host.shadowRoot!.querySelectorAll<HTMLButtonElement>('li button')];
		expect(buttons.map((button) => button.querySelector('.tm-picker-list__label-text')?.textContent)).toEqual([
			'canvas (1)',
			'canvas (2)',
		]);
		expect(buttons.map((button) => button.querySelector('.tm-picker-list__dimensions')?.textContent)).toEqual([
			'320x180',
			'640x360',
		]);

		list.update([
			{
				...frame,
				targets: [
					{ id: 'a', label: 'canvas', dimensions: '1280x720' },
					{ id: 'b', label: 'canvas' },
				],
			},
		]);
		expect(buttons[0]!.querySelector('.tm-picker-list__dimensions')?.textContent).toBe('1280x720');
		expect(buttons[1]!.querySelector('.tm-picker-list__dimensions')).toBeNull();
		expect(buttons[1]!.hasAttribute('aria-label')).toBe(false);
		list.dispose();
	});

	it('refreshes targets from the labeled icon button', () => {
		const refresh = vi.fn();
		const list = new PickerTargetList(vi.fn(), vi.fn(), vi.fn(), vi.fn(), refresh);
		list.mount();
		const host = document.querySelector<HTMLElement>('[data-textmode-picker-list]')!;
		const button = host.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Refresh media list"]')!;
		button.click();
		expect(refresh).toHaveBeenCalledOnce();
		list.dispose();
	});

	it('places the direct mouse-pick icon button to the left of refresh and toggles direct mode', () => {
		const cancel = vi.fn();
		const startDirectPick = vi.fn();
		const list = new PickerTargetList(vi.fn(), vi.fn(), cancel, vi.fn(), vi.fn(), startDirectPick);
		list.mount();
		const host = document.querySelector<HTMLElement>('[data-textmode-picker-list]')!;
		const actions = host.shadowRoot!.querySelector('.tm-picker-list__actions')!;
		const directButton = actions.children[0] as HTMLButtonElement;
		const refreshButton = actions.children[1] as HTMLButtonElement;
		expect(directButton.getAttribute('aria-label')).toBe('Select media on page');
		expect(refreshButton.getAttribute('aria-label')).toBe('Refresh media list');
		expect(directButton.getAttribute('aria-pressed')).toBe('false');
		expect(directButton.querySelector('svg')).not.toBeNull();

		directButton.focus();
		directButton.click();
		expect(startDirectPick).toHaveBeenCalledOnce();
		list.setDirectMode(true);
		expect(directButton.getAttribute('aria-pressed')).toBe('true');
		expect(host.shadowRoot!.querySelector<HTMLButtonElement>('.tm-picker-list__cancel')?.hidden).toBe(false);
		expect(host.shadowRoot!.querySelector<HTMLButtonElement>('.tm-picker-list__cancel')?.textContent).toBe(
			'cancel'
		);
		expect(host.shadowRoot!.activeElement).toBe(directButton);

		directButton.click();
		expect(cancel).toHaveBeenCalledOnce();
		list.setDirectMode(false);
		expect(directButton.getAttribute('aria-pressed')).toBe('false');
		expect(host.shadowRoot!.querySelector<HTMLButtonElement>('.tm-picker-list__cancel')?.hidden).toBe(true);
		list.dispose();
	});

	it('supports ArrowUp, ArrowDown, Home, and End navigation across media items', () => {
		const list = new PickerTargetList(vi.fn(), vi.fn(), vi.fn());
		list.mount();
		list.update([
			{
				frameId: 0,
				runtimeId: 'runtime',
				targets: [
					{ id: 'a', label: 'canvas' },
					{ id: 'b', label: 'video' },
					{ id: 'c', label: 'canvas' },
				],
			},
		]);
		const host = document.querySelector<HTMLElement>('[data-textmode-picker-list]')!;
		const buttons = [...host.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.tm-picker-list__item')];
		buttons[0]!.focus();
		buttons[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		expect(host.shadowRoot!.activeElement).toBe(buttons[1]);
		buttons[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
		expect(host.shadowRoot!.activeElement).toBe(buttons[2]);
		buttons[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
		expect(host.shadowRoot!.activeElement).toBe(buttons[1]);
		buttons[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
		expect(host.shadowRoot!.activeElement).toBe(buttons[0]);
		list.dispose();
	});
});
