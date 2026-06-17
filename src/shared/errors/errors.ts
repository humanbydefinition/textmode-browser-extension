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
