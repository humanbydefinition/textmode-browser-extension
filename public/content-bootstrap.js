(function () {
	const key = '__textmodeAsciiOverlayRuntimeReady';
	if (!globalThis[key]) {
		globalThis[key] = import(chrome.runtime.getURL('content-runtime.js'));
	}
})();
