import { CUSTOM_FONT_MAX_BYTES } from './runtime-font-registry-constants';
import { FontUploadError } from '../errors/errors';

export async function readAndValidateCustomFont(file: File): Promise<Uint8Array> {
	const bytes = new Uint8Array(await readBlobBytes(file));
	validateCustomFontBytes(file.name, bytes);
	return bytes;
}

export function validateCustomFontBytes(fileName: string, bytes: Uint8Array): void {
	const lowerName = fileName.toLowerCase();
	if (lowerName.endsWith('.woff2')) {
		throw new FontUploadError('INVALID_TYPE', 'WOFF2 fonts are not supported. Please upload a .ttf or .otf file.');
	}
	if (!lowerName.endsWith('.ttf') && !lowerName.endsWith('.otf')) {
		throw new FontUploadError('INVALID_TYPE', 'Please upload a .ttf or .otf font file.');
	}
	if (bytes.byteLength > CUSTOM_FONT_MAX_BYTES) {
		throw new FontUploadError('TOO_LARGE', 'Font file is too large. Please upload a font under 10 MB.');
	}

	const isTrueTypeSfnt = bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00;
	const isCffOpenType = bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f;
	if (isCffOpenType) {
		throw new FontUploadError(
			'INVALID_SIGNATURE',
			'CFF-based OTF fonts are not supported yet. Please upload a TrueType .ttf or .otf file.'
		);
	}
	if (!isTrueTypeSfnt) {
		throw new FontUploadError('INVALID_SIGNATURE', 'This does not look like a supported TrueType font file.');
	}
}

export function encodeBase64(bytes: Uint8Array): string {
	let binary = '';
	const chunkSize = 0x8000;
	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
	}
	return btoa(binary);
}

export function decodeBase64(value: string): Uint8Array {
	try {
		const binary = atob(value);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
		return bytes;
	} catch {
		throw new FontUploadError('CORRUPT_STORED_FONT', 'A stored custom font is corrupt and was removed.');
	}
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
	const source = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', source));
	return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readBlobBytes(blob: Blob): Promise<ArrayBuffer> {
	if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('load', () =>
			reader.result instanceof ArrayBuffer
				? resolve(reader.result)
				: reject(new Error('Unable to read font file bytes.'))
		);
		reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read font file bytes.')));
		reader.readAsArrayBuffer(blob);
	});
}
