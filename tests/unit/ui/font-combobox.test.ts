import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BundledFontEntry } from '@/domain/fonts/font-registry';
import type { BundledFontId } from '@/domain/overlay/overlay-settings';
import { FontComboboxView } from '@/widgets/overlay-panel/font-combobox/font-combobox-view';

function createFont(id: BundledFontId, displayName: string): BundledFontEntry {
	return {
		id,
		displayName,
		author: 'Test Author',
		authorUrl: 'https://example.com/author',
		sourceUrl: 'https://example.com/source',
		assetPath: `fonts/${displayName}.ttf`,
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

describe('FontComboboxView', () => {
	let host: HTMLDivElement;
	let portalRoot: HTMLDivElement;

	beforeEach(() => {
		host = document.createElement('div');
		portalRoot = document.createElement('div');
		document.body.append(host, portalRoot);
	});

	afterEach(() => {
		host.remove();
		portalRoot.remove();
	});

	it('renders the combobox trigger with the selected font name', () => {
		const combobox = createCombobox();
		host.append(combobox.element);

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		expect(trigger).not.toBeNull();
		expect(trigger!.textContent).toContain('CHUNKY');
	});

	it('shows fallback text when no font matches the value', () => {
		const fontsWithoutChunky = TEST_FONTS.filter((font) => font.id !== 'chunky');
		const combobox = createCombobox({ fonts: fontsWithoutChunky, fallbackLabel: 'BESCII' });
		host.append(combobox.element);

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		expect(trigger!.textContent).toContain('BESCII');
	});

	it('renders popover content when opened', () => {
		const combobox = createCombobox();
		host.append(combobox.element);

		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();

		const options = document.querySelectorAll('.tm-font-combobox__option');
		expect(options.length).toBe(TEST_FONTS.length);
	});

	it('filters fonts by search query', () => {
		const combobox = createCombobox();
		host.append(combobox.element);

		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();
		const searchInput = document.querySelector<HTMLInputElement>('.tm-font-combobox__search');
		expect(searchInput).not.toBeNull();

		searchInput!.value = 'CHUNKY';
		searchInput!.dispatchEvent(new Event('input', { bubbles: true }));

		const options = document.querySelectorAll('.tm-font-combobox__option');
		expect(options.length).toBe(1);
		expect(options[0]!.textContent).toContain('CHUNKY');
	});

	it('calls onChange when a font is selected', () => {
		const onChange = vi.fn();
		const combobox = createCombobox({ onChange });
		host.append(combobox.element);

		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();
		const options = document.querySelectorAll<HTMLButtonElement>('.tm-font-combobox__option');
		options[2]!.click();

		expect(onChange).toHaveBeenCalledWith('t64');
	});

	it('renders external links with correct URLs', () => {
		const combobox = createCombobox();
		host.append(combobox.element);

		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();

		const links = document.querySelectorAll<HTMLAnchorElement>('.tm-font-combobox__link');
		expect(links.length).toBeGreaterThan(0);
		expect(links[0]!.href).toBe('https://example.com/source');
		expect(links[0]!.target).toBe('_blank');
	});

	it('shows an unavailable state when no local fonts exist', () => {
		const combobox = createCombobox({ fonts: [] });
		host.append(combobox.element);

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		expect(trigger?.disabled).toBe(true);
		expect(trigger?.textContent).toContain('No local fonts');
	});
});

function createCombobox({
	fonts = TEST_FONTS,
	value = 'chunky',
	fallbackLabel = 'CHUNKY',
	onChange = vi.fn(),
}: {
	fonts?: readonly BundledFontEntry[];
	value?: BundledFontId;
	fallbackLabel?: string;
	onChange?: (fontId: BundledFontId) => void;
} = {}): FontComboboxView {
	const combobox = new FontComboboxView({
		fonts,
		value,
		portalContainer: document.querySelector<HTMLDivElement>('body > div:last-child')!,
		onChange,
	});
	combobox.update(value, fallbackLabel);
	return combobox;
}
