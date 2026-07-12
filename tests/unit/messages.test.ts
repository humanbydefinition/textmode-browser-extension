import { describe, expect, it } from 'vitest';
import { isRuntimeMessage } from '../../src/shared/messaging/messages';

describe('isRuntimeMessage', () => {
	it('accepts supported messages with valid payloads', () => {
		expect(isRuntimeMessage({ type: 'FRAME_PING' })).toBe(true);
		expect(isRuntimeMessage({ type: 'REMOVE_OVERLAY', id: 'overlay-1' })).toBe(true);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { fontSize: 16 } })).toBe(true);
		expect(
			isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { brightnessEnabled: false } })
		).toBe(true);
		expect(
			isRuntimeMessage({
				type: 'UPDATE_OVERLAY',
				id: 'overlay-1',
				settings: {
					postFx: [{ id: 'fx-1', filter: 'brightness', enabled: true, params: { amount: 1.2 } }],
				},
			})
		).toBe(true);
		expect(
			isRuntimeMessage({
				type: 'UPDATE_OVERLAY',
				id: 'overlay-1',
				settings: {
					contour: {
						enabled: true,
						invert: false,
						threshold: 0.2,
						colorSensitivity: 0.8,
						charColorMode: 'fixed',
						charColor: '#ffffff',
						cellColorMode: 'fixed',
						cellColor: '#000000',
					},
				},
			})
		).toBe(true);
		expect(isRuntimeMessage({ type: 'EXPORT_OVERLAY', id: 'overlay-1', format: 'txt' })).toBe(true);
		expect(isRuntimeMessage({ type: 'EXPORT_OVERLAY', id: 'overlay-1', format: 'svg' })).toBe(true);
		expect(isRuntimeMessage({ type: 'EXPORT_OVERLAY', id: 'overlay-1', format: 'png' })).toBe(true);
		expect(isRuntimeMessage({ type: 'EXPORT_OVERLAY', id: 'overlay-1', format: 'jpg' })).toBe(true);
		expect(isRuntimeMessage({ type: 'ENSURE_FRAME_AGENTS' })).toBe(true);
		expect(
			isRuntimeMessage({
				type: 'BROADCAST_FRAME_COMMAND',
				command: { type: 'FRAME_BEGIN_PICKING', pickSessionId: 'pick-1' },
			})
		).toBe(true);
		expect(
			isRuntimeMessage({
				type: 'SEND_FRAME_COMMAND',
				frameId: 4,
				command: { type: 'FRAME_REMOVE_ALL', runtimeId: 'runtime-1' },
			})
		).toBe(true);
		expect(
			isRuntimeMessage({
				type: 'FRAME_EVENT',
				event: {
					type: 'FRAME_TARGET_PICKED',
					pickSessionId: 'pick-1',
					runtimeId: 'runtime-1',
					targetToken: 'target-1',
				},
			})
		).toBe(true);
	});

	it('rejects missing or non-string types', () => {
		expect(isRuntimeMessage(null)).toBe(false);
		expect(isRuntimeMessage({})).toBe(false);
		expect(isRuntimeMessage({ type: 1 })).toBe(false);
	});

	it('rejects unknown message types', () => {
		expect(isRuntimeMessage({ type: 'OPEN_PORTAL' })).toBe(false);
	});

	it('accepts UPDATE_OVERLAY with fontId', () => {
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { fontId: 'chunky' } })).toBe(
			true
		);
	});

	it('accepts overlay broadcasts with custom font summaries', () => {
		expect(
			isRuntimeMessage({
				type: 'OVERLAY_LIST_CHANGED',
				overlays: [],
				customFonts: [{ id: 'custom:abc', displayName: 'Pixel Grid' }],
			})
		).toBe(true);
	});

	it('rejects malformed custom font summaries', () => {
		expect(
			isRuntimeMessage({
				type: 'OVERLAY_LIST_CHANGED',
				overlays: [],
				customFonts: [{ id: 'custom:', displayName: 'Pixel Grid' }],
			})
		).toBe(false);
		expect(
			isRuntimeMessage({
				type: 'OVERLAY_LIST_CHANGED',
				overlays: [],
				customFonts: [{ id: 'custom:abc', displayName: '' }],
			})
		).toBe(false);
	});

	it('rejects malformed overlay mutation messages', () => {
		expect(isRuntimeMessage({ type: 'REMOVE_OVERLAY' })).toBe(false);
		expect(isRuntimeMessage({ type: 'REMOVE_OVERLAY', id: 1 })).toBe(false);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1' })).toBe(false);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: null })).toBe(false);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { enabled: 'yes' } })).toBe(false);
		expect(
			isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { charColorMode: 'rainbow' } })
		).toBe(false);
		expect(isRuntimeMessage({ type: 'UPDATE_OVERLAY', id: 'overlay-1', settings: { mystery: true } })).toBe(false);
		expect(
			isRuntimeMessage({
				type: 'UPDATE_OVERLAY',
				id: 'overlay-1',
				settings: { contour: { enabled: true, threshold: 2 } },
			})
		).toBe(false);
		expect(isRuntimeMessage({ type: 'EXPORT_OVERLAY' })).toBe(false);
		expect(isRuntimeMessage({ type: 'EXPORT_OVERLAY', id: 1, format: 'png' })).toBe(false);
		expect(isRuntimeMessage({ type: 'EXPORT_OVERLAY', id: 'overlay-1' })).toBe(false);
		expect(isRuntimeMessage({ type: 'EXPORT_OVERLAY', id: 'overlay-1', format: 'webp' })).toBe(false);
		expect(
			isRuntimeMessage({
				type: 'SEND_FRAME_COMMAND',
				frameId: 'child',
				command: { type: 'FRAME_REMOVE_ALL' },
			})
		).toBe(false);
		expect(
			isRuntimeMessage({
				type: 'FRAME_CREATE_OVERLAY',
				runtimeId: 'runtime-1',
				targetToken: 'target-1',
				overlayId: 'overlay-1',
				settings: { fontSize: 'large' },
			})
		).toBe(false);
	});
});
