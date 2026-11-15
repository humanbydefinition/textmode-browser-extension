export function deepActiveElement(): HTMLElement | undefined {
	let element: Element | null = document.activeElement;
	while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
	return element instanceof HTMLElement ? element : undefined;
}
