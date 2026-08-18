declare const __TEXTMODE_EXTENSION_STORE_TARGET__: 'chrome' | 'opera' | 'firefox' | 'unsupported';

declare module '*.css' {
	const content: string;
	export default content;
}

declare module '*?inline' {
	const content: string;
	export default content;
}
