import { defineContentScript } from 'wxt/utils/define-content-script';
import { startContextTargetTracker } from '../features/media-picker/context-target-tracker';

export default defineContentScript({
	matches: ['http://*/*', 'https://*/*'],
	runAt: 'document_start',
	allFrames: true,
	matchAboutBlank: true,
	matchOriginAsFallback: true,
	main() {
		startContextTargetTracker();
	},
});
