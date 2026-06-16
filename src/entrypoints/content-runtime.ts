import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { startPageRuntime } from '../content/content-runtime';

export default defineUnlistedScript({
	main() {
		startPageRuntime();
	},
});
