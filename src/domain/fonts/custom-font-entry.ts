import type { CustomFontId } from './font-id';

export interface CustomFontEntry {
	id: CustomFontId;
	displayName: string;
	fileName: string;
	uploadedAt: number;
}

export interface CustomFontSummary {
	id: CustomFontId;
	displayName: string;
}

export function toCustomFontSummary(entry: CustomFontEntry): CustomFontSummary {
	return {
		id: entry.id,
		displayName: entry.displayName,
	};
}
