import { defineBackground } from 'wxt/utils/define-background';
import { startBackgroundServiceWorker } from '../application/background/service-worker';

export default defineBackground({
	type: 'module',
	main() {
		startBackgroundServiceWorker();
	},
});
