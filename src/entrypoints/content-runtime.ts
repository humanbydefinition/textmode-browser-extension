import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { startFrameAgent } from '../application/frame-runtime/frame-agent';
import { startTopFrameCoordinator } from '../application/page-runtime/top-frame-coordinator';

export default defineUnlistedScript({
	globalName: false,
	main() {
		startFrameAgent();
		startTopFrameCoordinator();
	},
});
