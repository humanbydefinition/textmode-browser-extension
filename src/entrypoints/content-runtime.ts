import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { startPageRuntime } from '../application/page-runtime/page-runtime';

export default defineUnlistedScript({
	main() {
		startPageRuntime();
	},
});
