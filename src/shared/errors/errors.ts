export type FontUploadErrorCode =
	| 'INVALID_TYPE'
	| 'INVALID_SIGNATURE'
	| 'TOO_LARGE'
	| 'COUNT_LIMIT'
	| 'TOTAL_SIZE_LIMIT'
	| 'STORAGE_QUOTA'
	| 'STORAGE_UNAVAILABLE'
	| 'CORRUPT_STORED_FONT';

export class FontUploadError extends Error {
	public constructor(
		public readonly code: FontUploadErrorCode,
		message: string
	) {
		super(message);
		this.name = 'FontUploadError';
	}
}

export function toUserMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (typeof error === 'string' && error) {
		return error;
	}

	return 'Unexpected extension error.';
}

export function getMediaSecurityHint(error: unknown): string | undefined {
	const message = toUserMessage(error);
	if (/cross-origin|origin|taint|SecurityError/i.test(message)) {
		return 'The selected element appears to be cross-origin, tainted, or protected. Browser security may block real-time pixel sampling.';
	}
	return undefined;
}
