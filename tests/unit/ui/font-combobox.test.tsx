import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BundledFontEntry } from '@/domain/fonts/font-registry';
import type { BundledFontId } from '@/domain/overlay/overlay-settings';
import { FontCombobox } from '@/widgets/overlay-panel/components/font-combobox';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createFont(id: BundledFontId, displayName: string): BundledFontEntry {
	return {
		id,
		displayName,
		author: 'Test Author',
		authorUrl: 'https://example.com/author',
		sourceUrl: 'https://example.com/source',
		assetPath: `fonts/${displayName}.woff`,
		cssFontFamily: `Font-${displayName}`,
	};
}

const TEST_FONTS: readonly BundledFontEntry[] = [
	createFont('chunky', 'CHUNKY'),
	createFont('bescii', 'BESCII'),
	createFont('t64', 'T64'),
	createFont('rook', 'Rook'),
	createFont('unscii8', 'UNSCII 8'),
];

describe('FontCombobox', () => {
	let host: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		host = document.createElement('div');
		document.body.append(host);
		root = createRoot(host);
	});

	afterEach(() => {
		act(() => root.unmount());
		host.remove();
	});

	it('renders the combobox trigger with the selected font name', () => {
		act(() => {
			root.render(<FontCombobox fonts={TEST_FONTS} value="chunky" onChange={vi.fn()} />);
		});

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		expect(trigger).not.toBeNull();
		expect(trigger!.textContent).toContain('CHUNKY');
	});

	it('shows fallback text when no font matches the value', () => {
		const fontsWithoutChunky = TEST_FONTS.filter((f) => f.id !== 'chunky');

		act(() => {
			root.render(<FontCombobox fonts={fontsWithoutChunky} value="chunky" onChange={vi.fn()} />);
		});

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		expect(trigger!.textContent).toContain('BESCII');
	});

	it('renders popover content when opened', () => {
		act(() => {
			root.render(<FontCombobox fonts={TEST_FONTS} value="chunky" onChange={vi.fn()} />);
		});

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		act(() => {
			trigger!.click();
		});

		const options = document.querySelectorAll('.tm-font-combobox__option');
		expect(options.length).toBe(TEST_FONTS.length);
	});

	it('filters fonts by search query', () => {
		act(() => {
			root.render(<FontCombobox fonts={TEST_FONTS} value="chunky" onChange={vi.fn()} />);
		});

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		act(() => {
			trigger!.click();
		});

		const searchInput = document.querySelector<HTMLInputElement>('.tm-font-combobox__search');
		expect(searchInput).not.toBeNull();

		act(() => {
			const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
				window.HTMLInputElement.prototype,
				'value'
			)?.set;
			nativeInputValueSetter?.call(searchInput, 'CHUNKY');
			searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
		});

		const options = document.querySelectorAll('.tm-font-combobox__option');
		expect(options.length).toBe(1);
		expect(options[0]!.textContent).toContain('CHUNKY');
	});

	it('calls onChange when a font is selected', () => {
		const onChange = vi.fn();

		act(() => {
			root.render(<FontCombobox fonts={TEST_FONTS} value="chunky" onChange={onChange} />);
		});

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		act(() => {
			trigger!.click();
		});

		const options = document.querySelectorAll<HTMLButtonElement>('.tm-font-combobox__option');
		act(() => {
			options[2]!.click();
		});

		expect(onChange).toHaveBeenCalledWith('t64');
	});

	it('renders external links with correct URLs', () => {
		act(() => {
			root.render(<FontCombobox fonts={TEST_FONTS} value="chunky" onChange={vi.fn()} />);
		});

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		act(() => {
			trigger!.click();
		});

		const links = document.querySelectorAll<HTMLAnchorElement>('.tm-font-combobox__link');
		expect(links.length).toBeGreaterThan(0);
		expect(links[0]!.href).toBe('https://example.com/source');
		expect(links[0]!.target).toBe('_blank');
	});

	it('shows an unavailable state when no local fonts exist', () => {
		act(() => {
			root.render(<FontCombobox fonts={[]} value="chunky" onChange={vi.fn()} />);
		});

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		expect(trigger?.disabled).toBe(true);
		expect(trigger?.textContent).toContain('No local fonts');
	});
});
