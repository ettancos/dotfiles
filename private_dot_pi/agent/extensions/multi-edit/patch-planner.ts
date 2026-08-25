import { normalizeToLf, packText, unpackText } from "./file-state.ts";
import type { PatchHunk, PatchLine, PatchOperation } from "./patch-parser.ts";

function normalizeComparable(line: string): string {
	return line
		.normalize("NFKC")
		.trimEnd()
		.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
		.replace(/[\u2018\u2019\u201A\u201B]/g, "'")
		.replace(/[\u201C\u201D\u201E\u201F]/g, '"')
		.replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, " ");
}

function findLine(lines: string[], value: string, start: number, path: string): number {
	const exact = lines.flatMap((line, index) => index >= start && line === value ? [index] : []);
	if (exact.length > 1) throw new Error(`Patch context '${value}' is ambiguous in ${path}.`);
	if (exact.length === 1) return exact[0];

	const wanted = normalizeComparable(value);
	const fallback = lines.flatMap((line, index) => index >= start && normalizeComparable(line) === wanted ? [index] : []);
	if (fallback.length > 1) throw new Error(`Patch context '${value}' is ambiguous in ${path}.`);
	if (fallback.length === 0) throw new Error(`Could not find patch context '${value}' in ${path}.`);
	return fallback[0];
}

function findSequence(
	lines: string[],
	pattern: string[],
	start: number,
	endOfFile: boolean,
	path: string,
): number {
	const lastStart = lines.length - pattern.length;
	if (lastStart < start) throw new Error(`Could not find patch hunk in ${path}.`);
	const candidates = endOfFile ? [lastStart] : Array.from({ length: lastStart - start + 1 }, (_, index) => start + index);
	const matches = (equal: (left: string, right: string) => boolean) =>
		candidates.filter((candidate) => pattern.every((line, offset) => equal(lines[candidate + offset], line)));

	const exact = matches((left, right) => left === right);
	if (exact.length > 1) throw new Error(`Patch hunk is ambiguous in ${path}.`);
	if (exact.length === 1) return exact[0];

	const fallback = matches((left, right) => normalizeComparable(left) === normalizeComparable(right));
	if (fallback.length > 1) throw new Error(`Patch hunk is ambiguous in ${path}.`);
	if (fallback.length === 0) throw new Error(`Could not find patch hunk in ${path}.`);
	return fallback[0];
}

function replacementForHunk(lines: string[], start: number, hunkLines: PatchLine[]): string[] {
	const replacement: string[] = [];
	let source = start;
	for (const line of hunkLines) {
		if (line.kind === "context") {
			replacement.push(lines[source]);
			source++;
		} else if (line.kind === "remove") {
			source++;
		} else {
			replacement.push(line.text);
		}
	}
	return replacement;
}

function applyHunks(path: string, content: string, hunks: PatchHunk[]): string {
	const envelope = unpackText(content);
	const hadFinalNewline = envelope.text.endsWith("\n");
	const lines = envelope.text.split("\n");
	if (hadFinalNewline) lines.pop();
	let cursor = 0;

	for (const hunk of hunks) {
		if (hunk.context !== undefined) {
			cursor = findLine(lines, hunk.context, cursor, path) + 1;
		}
		const oldLines = hunk.lines.filter((line) => line.kind !== "add").map((line) => line.text);
		const start = oldLines.length === 0
			? (hunk.endOfFile ? lines.length : cursor)
			: findSequence(lines, oldLines, cursor, hunk.endOfFile, path);
		const replacement = replacementForHunk(lines, start, hunk.lines);
		lines.splice(start, oldLines.length, ...replacement);
		cursor = start + replacement.length;
	}

	const updated = lines.join("\n") + (hadFinalNewline ? "\n" : "");
	return packText(envelope, updated);
}

function currentValue(
	path: string,
	planned: ReadonlyMap<string, string | null>,
	files: ReadonlyMap<string, string | undefined>,
): string | null | undefined {
	return planned.has(path) ? planned.get(path) : files.get(path);
}

export function planPatch(
	operations: PatchOperation[],
	files: ReadonlyMap<string, string | undefined>,
): Map<string, string | null> {
	const planned = new Map<string, string | null>();

	for (const operation of operations) {
		const current = currentValue(operation.path, planned, files);
		if (operation.kind === "add") {
			if (current !== undefined && current !== null) {
				throw new Error(`Cannot add ${operation.path}: target already exists.`);
			}
			planned.set(operation.path, operation.content);
			continue;
		}
		if (current === undefined || current === null) {
			throw new Error(`Cannot ${operation.kind} ${operation.path}: target does not exist.`);
		}
		if (operation.kind === "delete") {
			planned.set(operation.path, null);
			continue;
		}
		const updated = applyHunks(operation.path, current, operation.hunks);
		if (updated === current) throw new Error(`Patch makes no changes to ${operation.path}.`);
		planned.set(operation.path, updated);
	}

	return planned;
}
