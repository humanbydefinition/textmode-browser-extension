import { getElementBounds, type OverlayDescriptor } from '../../domain/overlay/overlay-settings';
import { describeElement } from '../media-picker/element-picker';
import type { OverlayController } from './overlay-session';

export function toOverlayDescriptor(controller: OverlayController): OverlayDescriptor {
	const info = describeElement(controller.element);
	return {
		id: controller.id,
		elementKind: info.kind,
		elementLabel: info.label,
		bounds: getElementBounds(controller.element),
		settings: controller.settings,
		status: controller.status,
		latestError: controller.latestError,
	};
}
