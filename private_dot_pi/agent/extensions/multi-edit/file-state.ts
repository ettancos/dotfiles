export interface TextEnvelope {
	bom: string;
	lineEnding: "\n" | "\r\n";
	text: string;
}

export function detectLineEnding(content: string): "\n" | "\r\n" {
	const crlfCount = content.match(/\r\n/g)?.length ?? 0;
	const lfCount = content.match(/(?<!\r)\n/g)?.length ?? 0;
	if (crlfCount === lfCount) {
		const firstCrLf = content.indexOf("\r\n");
		const firstLf = content.search(/(?<!\r)\n/u);
		return firstCrLf !== -1 && (firstLf === -1 || firstCrLf < firstLf) ? "\r\n" : "\n";
	}
	return crlfCount > lfCount ? "\r\n" : "\n";
}

export function normalizeToLf(text: string): string {
	return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function unpackText(content: string): TextEnvelope {
	const bom = content.startsWith("\uFEFF") ? "\uFEFF" : "";
	const withoutBom = bom ? content.slice(1) : content;
	return {
		bom,
		lineEnding: detectLineEnding(withoutBom),
		text: normalizeToLf(withoutBom),
	};
}

export function packText(envelope: TextEnvelope, text: string): string {
	const restored = envelope.lineEnding === "\r\n" ? text.replace(/\n/g, "\r\n") : text;
	return envelope.bom + restored;
}

export function countOccurrences(content: string, needle: string): number {
	let count = 0;
	let offset = 0;
	while (true) {
		const index = content.indexOf(needle, offset);
		if (index === -1) return count;
		count++;
		offset = index + needle.length;
	}
}
