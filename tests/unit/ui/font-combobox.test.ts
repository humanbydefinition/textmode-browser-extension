import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BundledFontEntry } from '@/domain/fonts/font-registry';
import type { BundledFontId, FontId } from '@/domain/overlay/overlay-settings';
import { FontComboboxView, type FontEntry } from '@/widgets/overlay-panel/font-combobox/font-combobox-view';

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

const TEST_FONTS: readonly FontEntry[] = [
	toBundledEntry(createFont('chunky', 'CHUNKY')),
	toBundledEntry(createFont('bescii', 'BESCII')),
	toBundledEntry(createFont('t64', 'T64')),
	toBundledEntry(createFont('rook', 'Rook')),
	toBundledEntry(createFont('unscii8', 'UNSCII 8')),
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

	it('keeps the trigger enabled for upload-only states', () => {
		const combobox = createCombobox({ fonts: [], allowCustomFontUpload: true });
		host.append(combobox.element);

		const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
		expect(trigger?.disabled).toBe(false);
	});

	it('shows upload controls only when custom uploads are allowed', () => {
		const hiddenCombobox = createCombobox();
		host.append(hiddenCombobox.element);
		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();
		expect(document.querySelector('.tm-font-combobox__upload-button')).toBeNull();
		hiddenCombobox.dispose();
		host.replaceChildren();
		portalRoot.replaceChildren();

		const uploadCombobox = createCombobox({ allowCustomFontUpload: true });
		host.append(uploadCombobox.element);
		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();

		expect(document.querySelector('.tm-font-combobox__upload-button')).not.toBeNull();
	});

	it('fires onUploadFont when the hidden file input changes', () => {
		const onUploadFont = vi.fn();
		const combobox = createCombobox({ allowCustomFontUpload: true, onUploadFont });
		host.append(combobox.element);
		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();

		const file = new File([new Uint8Array([0, 1, 0, 0])], 'Grid.ttf');
		const input = document.querySelector<HTMLInputElement>('.tm-font-combobox__file-input');
		expect(input).not.toBeNull();
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		input!.dispatchEvent(new Event('change', { bubbles: true }));

		expect(onUploadFont).toHaveBeenCalledWith(file);
	});

	it('renders custom entries and removes them', () => {
		const onRemoveCustomFont = vi.fn();
		const fonts: readonly FontEntry[] = [
			{ kind: 'custom', id: 'custom:grid', displayName: 'Grid', fileName: 'Grid.ttf' },
			...TEST_FONTS,
		];
		const combobox = createCombobox({ fonts, value: 'custom:grid', onRemoveCustomFont });
		host.append(combobox.element);
		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();

		expect(document.querySelector('.tm-font-combobox__section-header')?.textContent).toBe('Your fonts');
		expect(document.querySelector('.tm-font-combobox__option--custom')?.textContent).toContain('Grid');
		document.querySelector<HTMLButtonElement>('.tm-font-combobox__option-remove')!.click();

		expect(onRemoveCustomFont).toHaveBeenCalledWith('custom:grid');
	});

	it('updates the rendered font list through setFonts', () => {
		const combobox = createCombobox({ fonts: TEST_FONTS.slice(0, 1) });
		host.append(combobox.element);
		host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();
		expect(document.querySelectorAll('.tm-font-combobox__option')).toHaveLength(1);

		combobox.setFonts(TEST_FONTS);

		expect(document.querySelectorAll('.tm-font-combobox__option')).toHaveLength(TEST_FONTS.length);
	});
});

function createCombobox({
	fonts = TEST_FONTS,
	value = 'chunky',
	fallbackLabel = 'CHUNKY',
	allowCustomFontUpload = false,
	onChange = vi.fn(),
	onUploadFont,
	onRemoveCustomFont,
}: {
	fonts?: readonly FontEntry[];
	value?: FontId;
	fallbackLabel?: string;
	allowCustomFontUpload?: boolean;
	onChange?: (fontId: FontId) => void;
	onUploadFont?: (file: File) => void;
	onRemoveCustomFont?: (id: `custom:${string}`) => void;
} = {}): FontComboboxView {
	const combobox = new FontComboboxView({
		fonts,
		value,
		portalContainer: document.querySelector<HTMLDivElement>('body > div:last-child')!,
		allowCustomFontUpload,
		onChange,
		onUploadFont,
		onRemoveCustomFont,
	});
	combobox.update(value, fallbackLabel);
	return combobox;
}

function toBundledEntry(font: BundledFontEntry): FontEntry {
	return { ...font, kind: 'bundled' };
}
