export type IconName =
	| 'arrow-left'
	| 'arrow-right'
	| 'chevron-down'
	| 'download'
	| 'external-link'
	| 'file-code'
	| 'file-text'
	| 'github'
	| 'heart-handshake'
	| 'image-down'
	| 'mouse-pointer'
	| 'pipette'
	| 'trash'
	| 'upload'
	| 'x';

const iconPaths: Record<IconName, string[]> = {
	'arrow-left': ['m12 19-7-7 7-7', 'M19 12H5'],
	'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
	'chevron-down': ['m6 9 6 6 6-6'],
	download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
	'external-link': ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
	'file-code': [
		'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
		'M14 2v6h6',
		'm10 13-2 2 2 2',
		'm14 17 2-2-2-2',
	],
	'file-text': [
		'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
		'M14 2v6h6',
		'M16 13H8',
		'M16 17H8',
		'M10 9H8',
	],
	github: [
		'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
	],
	'heart-handshake': [
		'M19.5 12.5 12 20l-7.5-7.5a5 5 0 0 1 7.1-7.1l.4.4.4-.4a5 5 0 1 1 7.1 7.1Z',
		'M9 12h6',
		'M12 9v6',
	],
	'image-down': [
		'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
		'm21 8-5 5-5-5',
		'M16 13V3',
		'm3 17 5-5 4 4 3-3 5 5',
	],
	'mouse-pointer': ['M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z', 'm13 13 6 6'],
	pipette: ['m2 22 1-1h3l9-9', 'M3 21v-3l9-9', 'm15 6 3-3 3 3-3 3z', 'm12 9 3 3', 'm14 4 6 6'],
	trash: [
		'M3 6h18',
		'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
		'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
		'M10 11v6',
		'M14 11v6',
	],
	upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
	x: ['M18 6 6 18', 'M6 6l12 12'],
};

export function icon(name: IconName, className?: string): SVGSVGElement {
	return svgIcon(iconPaths[name], className);
}

function svgIcon(paths: string[], className?: string): SVGSVGElement {
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
