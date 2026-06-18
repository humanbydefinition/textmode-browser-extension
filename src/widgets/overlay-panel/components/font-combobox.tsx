import * as React from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { BundledFontEntry } from '@/domain/fonts/font-registry';
import type { BundledFontId } from '@/domain/overlay/overlay-settings';
import { getPopoverPortalContainer } from '../color-picker-model';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover';

export interface FontComboboxProps {
	fonts: readonly BundledFontEntry[];
	value: BundledFontId;
	onChange: (fontId: BundledFontId) => void;
	disabled?: boolean;
}

export function FontCombobox({ fonts, value, onChange, disabled = false }: FontComboboxProps): React.JSX.Element {
	const selectedFont = fonts.find((f) => f.id === value) ?? fonts[0];
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

	React.useLayoutEffect(() => {
		setPortalContainer(getPopoverPortalContainer(triggerRef.current?.getRootNode(), document.body));
	}, []);

	const filtered = React.useMemo(() => {
		if (!query.trim()) return fonts;
		const q = query.toLowerCase();
		return fonts.filter((f) => f.displayName.toLowerCase().includes(q));
	}, [fonts, query]);

	const handleSelect = React.useCallback(
		(fontId: BundledFontId) => {
			onChange(fontId);
			setOpen(false);
			setQuery('');
		},
		[onChange]
	);

	React.useEffect(() => {
		if (open) {
			requestAnimationFrame(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			});
		}
	}, [open]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					ref={triggerRef}
					type="button"
					disabled={disabled}
					className="tm-font-combobox__trigger"
					role="combobox"
					aria-expanded={open}
				>
					<span className="tm-font-combobox__value">{selectedFont?.displayName ?? 'Select font...'}</span>
					<ChevronDown aria-hidden="true" className="tm-font-combobox__chevron" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				container={portalContainer}
				align="start"
				side="bottom"
				sideOffset={8}
				className="tm-font-combobox-popover"
			>
				<PopoverHeader className="tm-font-combobox-popover__header">
					<PopoverTitle className="tm-font-combobox-popover__title">font</PopoverTitle>
					<PopoverDescription className="tm-font-combobox-popover__description">
						choose typeface.
					</PopoverDescription>
				</PopoverHeader>

				<input
					ref={inputRef}
					className="tm-font-combobox__search tm-input"
					type="text"
					placeholder="Search fonts..."
					value={query}
					autoComplete="off"
					spellCheck={false}
					onChange={(e) => setQuery(e.currentTarget.value)}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setOpen(false);
							setQuery('');
						}
					}}
				/>

				<div className="tm-font-combobox__list">
					{filtered.length === 0 ? (
						<p className="tm-font-combobox__empty">No fonts found.</p>
					) : (
						filtered.map((font) => (
							<button
								key={font.id}
								type="button"
								className={cn(
									'tm-font-combobox__option',
									font.id === value && 'tm-font-combobox__option--selected'
								)}
								onClick={() => handleSelect(font.id)}
							>
								<div className="tm-font-combobox__option-main">
									<span className="tm-font-combobox__option-name">{font.displayName}</span>
									<FontOptionLink url={font.sourceUrl} label={`Open ${font.displayName} source`} />
								</div>
								<div className="tm-font-combobox__option-meta">
									by {font.author}
									<FontOptionLink url={font.authorUrl} label={`Open ${font.author} author page`} />
								</div>
							</button>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function FontOptionLink({ url, label }: { url: string; label: string }): React.JSX.Element | null {
	if (!url) return null;

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="tm-font-combobox__link"
			aria-label={label}
			onPointerDown={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				window.open(url, '_blank', 'noopener,noreferrer');
			}}
		>
			<ExternalLink aria-hidden="true" />
		</a>
	);
}
