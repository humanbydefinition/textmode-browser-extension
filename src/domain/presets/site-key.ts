export function resolveSiteKey(url: URL): string | null {
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return null;
	}

	const hostname = url.hostname.trim().toLowerCase().replace(/\.$/, '');
	return hostname || null;
}
