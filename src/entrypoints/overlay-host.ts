import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { startFrameOverlayHost } from '../application/frame-runtime/frame-overlay-host';

export default defineUnlistedScript({
	globalName: false,
	main() {
		startFrameOverlayHost();
	},
});
