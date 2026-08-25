import { formatDiffs } from "./diff.ts";
import { planExactEdits, type ExactEdit } from "./exact-edits.ts";
import { parsePatch, type PatchOperation } from "./patch-parser.ts";
import { planPatch } from "./patch-planner.ts";
import { resolveToolPath, runFileTransaction, type FileMutationQueue } from "./transaction.ts";

export type ToolResult = {
	content: Array<{ type: "text"; text: string }>;
	details: Record<string, unknown>;
};

export type ToolDefinition = {
	name: string;
	label: string;
	description: string;
	promptSnippet?: string;
	promptGuidelines?: string[];
	parameters: Record<string, unknown>;
	execute: (
		toolCallId: string,
		params: any,
		signal: AbortSignal | undefined,
		onUpdate: unknown,
		ctx: { cwd: string },
	) => Promise<ToolResult>;
};

export interface ToolRegistrar {
	registerTool(definition: ToolDefinition): void;
}

const editItemSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		path: { type: "string", minLength: 1, description: "Path to the file to edit, relative to the working directory or absolute." },
		oldText: { type: "string", minLength: 1, description: "Exact, unique text to replace." },
		newText: { type: "string", description: "Replacement text. Use an empty string to delete oldText." },
	},
	required: ["path", "oldText", "newText"],
} as const;

const multiEditSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		edits: {
			type: "array",
			minItems: 1,
			description: "Exact replacements across one or more files.",
			items: editItemSchema,
		},
	},
	required: ["edits"],
} as const;

const applyPatchSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		patch: {
			type: "string",
			minLength: 1,
			description: "Codex-style patch enclosed by *** Begin Patch and *** End Patch.",
		},
	},
	required: ["patch"],
} as const;

function resolveEdits(edits: ExactEdit[], cwd: string): ExactEdit[] {
	return edits.map((edit) => ({ ...edit, path: resolveToolPath(edit.path, cwd) }));
}

function resolveOperations(operations: PatchOperation[], cwd: string): PatchOperation[] {
	return operations.map((operation) => ({ ...operation, path: resolveToolPath(operation.path, cwd) }));
}

function resultText(action: string, count: number, warnings: string[]): string {
	const noun = count === 1 ? "file" : "files";
	const summary = `${action} ${count} ${noun}.`;
	return warnings.length === 0 ? summary : `${summary}\nWarnings:\n${warnings.join("\n")}`;
}

export function registerTools(pi: ToolRegistrar, queue: FileMutationQueue): void {
	pi.registerTool({
		name: "multi_edit",
		label: "multi_edit",
		description: "Apply exact, unique, non-overlapping text replacements across one or more files as one coordinated operation.",
		promptSnippet: "Apply exact text replacements across one or more files",
		promptGuidelines: ["Use multi_edit for coordinated exact replacements across multiple files."],
		parameters: multiEditSchema,
		async execute(_toolCallId, params: { edits: ExactEdit[] }, signal, _onUpdate, ctx) {
			if (!Array.isArray(params.edits) || params.edits.length === 0) {
				throw new Error("multi_edit requires at least one edit.");
			}
			const edits = resolveEdits(params.edits, ctx.cwd);
			const transaction = await runFileTransaction({
				paths: edits.map((edit) => edit.path),
				cwd: ctx.cwd,
				queue,
				signal,
				plan: (files) => planExactEdits(edits, files),
			});
			return {
				content: [{ type: "text", text: resultText("Updated", transaction.changes.size, transaction.warnings) }],
				details: {
					diff: formatDiffs(transaction.before, transaction.changes),
				},
			};
		},
	});

	pi.registerTool({
		name: "apply_patch",
		label: "apply_patch",
		description: "Apply a Codex-style patch containing add, update, and delete file operations as one coordinated operation.",
		promptSnippet: "Apply a Codex-style patch across one or more files",
		promptGuidelines: ["Use apply_patch for multi-file add, update, and delete patches."],
		parameters: applyPatchSchema,
		async execute(_toolCallId, params: { patch: string }, signal, _onUpdate, ctx) {
			const operations = resolveOperations(parsePatch(params.patch), ctx.cwd);
			const transaction = await runFileTransaction({
				paths: operations.map((operation) => operation.path),
				cwd: ctx.cwd,
				queue,
				signal,
				plan: (files) => planPatch(operations, files),
			});
			return {
				content: [{ type: "text", text: resultText("Applied patch to", transaction.changes.size, transaction.warnings) }],
				details: {
					diff: formatDiffs(transaction.before, transaction.changes),
				},
			};
		},
	});
}
