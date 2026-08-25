import { countOccurrences, normalizeToLf, packText, unpackText } from "./file-state.ts";

export interface ExactEdit {
	path: string;
	oldText: string;
	newText: string;
}

interface MatchedEdit {
	index: number;
	start: number;
	end: number;
	newText: string;
}

export function planExactEdits(edits: ExactEdit[], files: ReadonlyMap<string, string | undefined>): Map<string, string> {
	if (edits.length === 0) {
		throw new Error("multi_edit requires at least one edit.");
	}

	const grouped = new Map<string, Array<{ edit: ExactEdit; index: number }>>();
	for (let index = 0; index < edits.length; index++) {
		const edit = edits[index];
		if (edit.oldText.length === 0) {
			throw new Error(`edits[${index}].oldText must not be empty in ${edit.path}.`);
		}
		const group = grouped.get(edit.path) ?? [];
		group.push({ edit, index });
		grouped.set(edit.path, group);
	}

	const planned = new Map<string, string>();
	for (const [path, group] of grouped) {
		const content = files.get(path);
		if (content === undefined) {
			throw new Error(`Could not read ${path}: file does not exist.`);
		}

		const envelope = unpackText(content);
		const matches: MatchedEdit[] = group.map(({ edit, index }) => {
			const oldText = normalizeToLf(edit.oldText);
			const occurrences = countOccurrences(envelope.text, oldText);
			if (occurrences === 0) {
				throw new Error(`Could not find edits[${index}].oldText in ${path}.`);
			}
			if (occurrences > 1) {
				throw new Error(`Found ${occurrences} occurrences of edits[${index}].oldText in ${path}; provide more context.`);
			}
			const start = envelope.text.indexOf(oldText);
			return {
				index,
				start,
				end: start + oldText.length,
				newText: normalizeToLf(edit.newText),
			};
		});

		matches.sort((left, right) => left.start - right.start);
		for (let index = 1; index < matches.length; index++) {
			if (matches[index].start < matches[index - 1].end) {
				throw new Error(`edits[${matches[index - 1].index}] and edits[${matches[index].index}] overlap in ${path}.`);
			}
		}

		let updated = envelope.text;
		for (let index = matches.length - 1; index >= 0; index--) {
			const match = matches[index];
			updated = updated.slice(0, match.start) + match.newText + updated.slice(match.end);
		}
		if (updated === envelope.text) {
			throw new Error(`No changes would be made to ${path}.`);
		}
		planned.set(path, packText(envelope, updated));
	}

	return planned;
}
