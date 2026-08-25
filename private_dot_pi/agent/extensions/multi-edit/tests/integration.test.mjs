import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { registerTools } from "../tools.ts";

function serialQueue() {
	const tails = new Map();
	return async (path, operation) => {
		const previous = tails.get(path) ?? Promise.resolve();
		let release;
		const current = new Promise((resolve) => { release = resolve; });
		tails.set(path, previous.then(() => current));
		await previous;
		try { return await operation(); }
		finally { release(); }
	};
}

function registeredTools() {
	const tools = new Map();
	registerTools({ registerTool(tool) { tools.set(tool.name, tool); } }, serialQueue());
	return tools;
}

async function invoke(tool, params, cwd) {
	return tool.execute("test", params, undefined, undefined, { cwd });
}

test("publishes strict, single-purpose schemas", () => {
	const tools = registeredTools();
	assert.deepEqual([...tools.keys()], ["multi_edit", "apply_patch"]);
	assert.deepEqual(tools.get("multi_edit").parameters.required, ["edits"]);
	assert.equal(tools.get("multi_edit").parameters.additionalProperties, false);
	assert.deepEqual(tools.get("apply_patch").parameters.required, ["patch"]);
	assert.equal(tools.get("apply_patch").parameters.additionalProperties, false);
});

test("multi_edit changes multiple files and reports labeled diffs", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-multi-tool-"));
	await Promise.all([writeFile(join(root, "a.txt"), "old-a\n"), writeFile(join(root, "b.txt"), "old-b\n")]);
	const result = await invoke(registeredTools().get("multi_edit"), {
		edits: [
			{ path: "a.txt", oldText: "old-a", newText: "new-a" },
			{ path: "b.txt", oldText: "old-b", newText: "new-b" },
		],
	}, root);
	assert.equal(await readFile(join(root, "a.txt"), "utf8"), "new-a\n");
	assert.equal(await readFile(join(root, "b.txt"), "utf8"), "new-b\n");
	assert.match(result.content[0].text, /Updated 2 files/);
	assert.match(result.details.diff, /File: .*a\.txt/);
	assert.match(result.details.diff, /File: .*b\.txt/);
});

test("apply_patch supports add, update, and delete", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-patch-tool-"));
	await writeFile(join(root, "update.txt"), "old\n");
	await writeFile(join(root, "delete.txt"), "gone\n");
	const body = [
		"*** Begin Patch",
		"*** Add File: nested/new.txt",
		"+created",
		"*** Update File: update.txt",
		"@@",
		"-old",
		"+new",
		"*** Delete File: delete.txt",
		"*** End Patch",
	].join("\n");
	const result = await invoke(registeredTools().get("apply_patch"), { patch: body }, root);
	assert.equal(await readFile(join(root, "nested/new.txt"), "utf8"), "created\n");
	assert.equal(await readFile(join(root, "update.txt"), "utf8"), "new\n");
	await assert.rejects(readFile(join(root, "delete.txt")), { code: "ENOENT" });
	assert.match(result.content[0].text, /Applied patch to 3 files/);
});

test("bounds rendered diff details", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-diff-tool-"));
	const file = join(root, "large.txt");
	const oldText = "x".repeat(70_000);
	await writeFile(file, oldText);
	const result = await invoke(registeredTools().get("multi_edit"), {
		edits: [{ path: file, oldText, newText: "y".repeat(70_000) }],
	}, root);
	assert.ok(Buffer.byteLength(result.details.diff, "utf8") <= 50 * 1024);
	assert.match(result.details.diff, /truncated/);
});

test("tool failures are thrown", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-error-tool-"));
	await assert.rejects(
		invoke(registeredTools().get("multi_edit"), { edits: [{ path: "missing", oldText: "x", newText: "y" }] }, root),
		/does not exist/,
	);
});
