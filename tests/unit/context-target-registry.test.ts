import { beforeEach, describe, expect, it } from 'vitest';
import { ContextTargetRegistry } from '../../src/features/media-picker/context-target-registry';
import { mockRect } from './test-helpers';

describe('context target registry', () => {
	beforeEach(() => {
		document.body.replaceChildren();
	});

	it('consumes an eligible target exactly once', () => {
		const canvas = document.createElement('canvas');
		mockRect(canvas, { width: 320, height: 180 });
		document.body.append(canvas);
		const registry = new ContextTargetRegistry();

		const token = registry.reserve(canvas);

		expect(registry.consume(token)).toBe(canvas);
		expect(registry.consume(token)).toBeUndefined();
	});

	it('rejects a target that detached after its context menu opened', () => {
		const video = document.createElement('video');
		mockRect(video, { width: 640, height: 360 });
		document.body.append(video);
		const registry = new ContextTargetRegistry();
		const token = registry.reserve(video);
		video.remove();

		expect(registry.consume(token)).toBeUndefined();
	});
});
