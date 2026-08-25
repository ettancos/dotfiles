import { normalizeToLf } from "./file-state.ts";

export type PatchLine =
	| { kind: "context"; text: string }
	| { kind: "remove"; text: string }
	| { kind: "add"; text: string };

export interface PatchHunk {
	context?: string;
	lines: PatchLine[];
	endOfFile: boolean;
}

export type PatchOperation =
	| { kind: "add"; path: string; content: string }
	| { kind: "update"; path: string; hunks: PatchHunk[] }
	| { kind: "delete"; path: string };

function parsePath(line: string, prefix: string): string {
	const path = line.slice(prefix.length).trim();
	if (!path) throw new Error(`${prefix.trim()} requires a path.`);
	return path;
}

function parseHunk(lines: string[], start: number, end: number): { hunk: PatchHunk; next: number } {
	const header = lines[start];
	if (!header.startsWith("@@")) {
		throw new Error(`Expected an update hunk beginning with @@, got '${header}'.`);
	}
	const context = header === "@@" ? undefined : header.slice(2).trimStart();
	const hunkLines: PatchLine[] = [];
	let endOfFile = false;
	let index = start + 1;

	while (index < end) {
		const line = lines[index];
		if (line === "*** End of File") {
			endOfFile = true;
			index++;
			break;
		}
		if (line.startsWith("@@") || line.startsWith("*** ")) break;
		const marker = line[0];
		const text = line.slice(1);
		if (marker === " ") hunkLines.push({ kind: "context", text });
		else if (marker === "-") hunkLines.push({ kind: "remove", text });
		else if (marker === "+") hunkLines.push({ kind: "add", text });
		else throw new Error(`Patch hunk line must start with ' ', '+', or '-': '${line}'.`);
		index++;
	}

	if (hunkLines.length === 0) throw new Error("Update hunk must contain at least one line.");
	return { hunk: { context, lines: hunkLines, endOfFile }, next: index };
}

export function parsePatch(patch: string): PatchOperation[] {
	const lines = normalizeToLf(patch).split("\n");
	while (lines.length > 0 && lines[0].trim() === "") lines.shift();
	while (lines.length > 0 && lines.at(-1)?.trim() === "") lines.pop();

	if (lines[0]?.trim() !== "*** Begin Patch") {
		throw new Error("The first line of the patch must be '*** Begin Patch'.");
	}
	if (lines.at(-1)?.trim() !== "*** End Patch") {
		throw new Error("The last line of the patch must be '*** End Patch'.");
	}

	const operations: PatchOperation[] = [];
	const end = lines.length - 1;
	let index = 1;
	while (index < end) {
		if (lines[index].trim() === "") {
			index++;
			continue;
		}
		const line = lines[index];
		if (line.startsWith("*** Add File: ")) {
			const path = parsePath(line, "*** Add File: ");
			index++;
			const content: string[] = [];
			let finalNewline = true;
			while (index < end) {
				if (lines[index] === "*** End of File") {
					finalNewline = false;
					index++;
					break;
				}
				if (lines[index].startsWith("*** ")) break;
				if (!lines[index].startsWith("+")) {
					throw new Error(`Add File line must start with '+': '${lines[index]}'.`);
				}
				content.push(lines[index].slice(1));
				index++;
			}
			operations.push({
				kind: "add",
				path,
				content: content.join("\n") + (content.length > 0 && finalNewline ? "\n" : ""),
			});
			continue;
		}
		if (line.startsWith("*** Delete File: ")) {
			operations.push({ kind: "delete", path: parsePath(line, "*** Delete File: ") });
			index++;
			continue;
		}
		if (line.startsWith("*** Update File: ")) {
			const path = parsePath(line, "*** Update File: ");
			index++;
			if (lines[index]?.startsWith("*** Move to: ")) {
				throw new Error("Patch move operations (*** Move to:) are not supported.");
			}
			const hunks: PatchHunk[] = [];
			while (index < end && !lines[index].startsWith("*** ")) {
				if (lines[index].trim() === "") {
					index++;
					continue;
				}
				const parsed = parseHunk(lines, index, end);
				hunks.push(parsed.hunk);
				index = parsed.next;
			}
			if (hunks.length === 0) throw new Error(`Update File '${path}' requires at least one hunk.`);
			operations.push({ kind: "update", path, hunks });
			continue;
		}
		if (line.startsWith("*** Move to: ")) {
			throw new Error("Patch move operations (*** Move to:) are not supported.");
		}
		throw new Error(`Invalid patch operation header: '${line}'.`);
	}

	if (operations.length === 0) throw new Error("Patch must contain at least one operation.");
	return operations;
}
