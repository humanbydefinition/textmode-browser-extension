import { isSelectableElement, type SelectableElement } from './picker-target-registry';

declare global {
	interface Window {
		__textmodeContextTargetRegistry?: ContextTargetRegistry;
	}
}

export class ContextTargetRegistry {
	private target?: { token: string; element: SelectableElement };

	public reserve(element: SelectableElement): string {
		const token = createToken();
		this.target = { token, element };
		return token;
	}

	public clear(): void {
		this.target = undefined;
	}

	public consume(token: string): SelectableElement | undefined {
		if (this.target?.token !== token) return undefined;
		const { element } = this.target;
		this.clear();
		return isSelectableElement(element) ? element : undefined;
	}
}

export function getContextTargetRegistry(): ContextTargetRegistry {
	window.__textmodeContextTargetRegistry ??= new ContextTargetRegistry();
	return window.__textmodeContextTargetRegistry;
}

function createToken(): string {
	return typeof crypto.randomUUID === 'function'
		? `context-${crypto.randomUUID()}`
		: `context-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
