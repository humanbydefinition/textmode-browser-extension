export type Cleanup = () => void;

export function classNames(...values: Array<string | false | null | undefined>): string {
	return values.filter(Boolean).join(' ');
}

export function removeChildren(element: Element): void {
	element.replaceChildren();
}

export function text(value: string): Text {
	return document.createTextNode(value);
}

export function h<K extends keyof HTMLElementTagNameMap>(
	tagName: K,
	options: ElementOptions = {},
	...children: Array<Node | string | null | undefined>
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tagName);
	applyOptions(element, options);
	appendChildren(element, children);
	return element;
}

export function svgIcon(paths: string[], className?: string): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	svg.setAttribute('aria-hidden', 'true');
	if (className) {
		svg.setAttribute('class', className);
	}

	for (const pathData of paths) {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', pathData);
		svg.append(path);
	}

	return svg;
}

export function setStyleProperty(element: HTMLElement, name: string, value: string): void {
	element.style.setProperty(name, value);
}

export function on<K extends keyof HTMLElementEventMap>(
	element: HTMLElement | Document | Window | ShadowRoot,
	type: K,
	listener: (event: HTMLElementEventMap[K]) => void,
	options?: boolean | AddEventListenerOptions
): Cleanup {
	element.addEventListener(type, listener as EventListener, options);
	return () => element.removeEventListener(type, listener as EventListener, options);
}

export function appendChildren(parent: Node, children: Array<Node | string | null | undefined>): void {
	for (const child of children) {
		if (child == null) continue;
		parent.appendChild(typeof child === 'string' ? text(child) : child);
	}
}

export interface ElementOptions {
	className?: string;
	textContent?: string;
	attributes?: Record<string, string | number | boolean | null | undefined>;
	dataset?: Record<string, string | undefined>;
	style?: Partial<CSSStyleDeclaration>;
	onClick?: (event: MouseEvent) => void;
}

function applyOptions<T extends HTMLElement>(element: T, options: ElementOptions): void {
	if (options.className) {
		element.className = options.className;
	}
	if (options.textContent !== undefined) {
		element.textContent = options.textContent;
	}
	if (options.attributes) {
		for (const [name, value] of Object.entries(options.attributes)) {
			if (value == null || value === false) continue;
			element.setAttribute(name, value === true ? '' : String(value));
		}
	}
	if (options.dataset) {
		for (const [name, value] of Object.entries(options.dataset)) {
			if (value !== undefined) {
				element.dataset[name] = value;
			}
		}
	}
	if (options.style) {
		Object.assign(element.style, options.style);
	}
	if (options.onClick) {
		element.addEventListener('click', options.onClick);
	}
}
