import { createTwoFilesPatch } from "diff";

const MAX_BYTES = 50 * 1024;
const MAX_LINES = 2000;
const TRUNCATION_NOTICE = "\n\n[Diff truncated]";

function truncate(text: string): string {
	const lines = text.split("\n");
	let output = lines.length > MAX_LINES ? lines.slice(0, MAX_LINES).join("\n") : text;
	const budget = MAX_BYTES - Buffer.byteLength(TRUNCATION_NOTICE, "utf8");
	if (Buffer.byteLength(output, "utf8") > budget) {
		output = Buffer.from(output, "utf8").subarray(0, budget).toString("utf8").replace(/\uFFFD$/u, "");
	}
	if (output !== text) output += TRUNCATION_NOTICE;
	return output;
}

export function formatDiffs(
	before: ReadonlyMap<string, string | undefined>,
	changes: ReadonlyMap<string, string | null>,
): string {
	const sections: string[] = [];
	for (const [path, after] of changes) {
		const oldContent = before.get(path) ?? "";
		const newContent = after ?? "";
		sections.push(`File: ${path}\n${createTwoFilesPatch(path, path, oldContent, newContent)}`);
	}
	return truncate(sections.join("\n"));
}
