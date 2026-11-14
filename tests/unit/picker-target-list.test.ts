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
			frameTitle: 'Player',
			targets: [{ id: 'one', label: 'video 320x180', availability: 'ready' as const }],
		};
		list.update([frame]);
		const host = document.querySelector<HTMLElement>('[data-textmode-picker-list]')!;
		const button = host.shadowRoot!.querySelector<HTMLButtonElement>('li button')!;
		expect(button.textContent).toBe('video 320x180');
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
	it('omits unavailable media and distinguishes duplicate labels without frame prefixes', () => {
		const list = new PickerTargetList(vi.fn(), vi.fn(), vi.fn());
		list.mount();
		list.update([
			{
				frameId: 0,
				runtimeId: 'top',
				frameTitle: '',
				targets: [
					{ id: 'blocked', label: 'unavailable', availability: 'blocked', reason: 'Not accessible' },
					{ id: 'one', label: 'video', availability: 'ready' },
				],
			},
			{
				frameId: 3,
				runtimeId: 'child',
				frameTitle: 'Player',
				targets: [
					{ id: 'two', label: 'video', availability: 'ready' },
					{ id: 'three', label: 'canvas', availability: 'ready' },
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
			frameTitle: '',
			targets: [
				{ id: 'a', label: 'canvas', availability: 'ready' as const },
				{ id: 'b', label: 'video', availability: 'ready' as const },
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
});
