import assert from "node:assert/strict";
import test from "node:test";
import { parsePatch } from "../patch-parser.ts";
import { planPatch } from "../patch-planner.ts";

function patch(body) {
	return `*** Begin Patch\n${body}\n*** End Patch`;
}

function files(entries) {
	return new Map(entries);
}

test("parses add, update, and delete operations", () => {
	const operations = parsePatch(patch([
		"*** Add File: /new",
		"+created",
		"*** Update File: /update",
		"@@",
		"-old",
		"+new",
		"*** Delete File: /delete",
	].join("\n")));
	assert.deepEqual(operations.map((operation) => operation.kind), ["add", "update", "delete"]);
});

test("rejects malformed and empty patches", () => {
	assert.throws(() => parsePatch("not a patch"), /Begin Patch/);
	assert.throws(() => parsePatch("*** Begin Patch\n*** End Patch"), /at least one operation/);
});

test("rejects move operations", () => {
	assert.throws(
		() => parsePatch(patch("*** Update File: /a\n*** Move to: /b\n@@\n-old\n+new")),
		/Move to/,
	);
});

test("rejects malformed hunk lines", () => {
	assert.throws(
		() => parsePatch(patch("*** Update File: /a\n@@\nold\n+new")),
		/line must start/,
	);
});

test("supports an end-of-file hunk marker", () => {
	const result = planPatch(
		parsePatch(patch("*** Update File: /a\n@@\n-old\n+new\n*** End of File")),
		files([["/a", "prefix\nold\n"]]),
	);
	assert.equal(result.get("/a"), "prefix\nnew\n");
});

test("creates an added file without a final newline when marked", () => {
	const result = planPatch(
		parsePatch(patch("*** Add File: /a\n+content\n*** End of File")),
		files([]),
	);
	assert.equal(result.get("/a"), "content");
});

test("plans add, update, and delete without mutating inputs", () => {
	const original = files([["/update", "old\n"], ["/delete", "gone\n"]]);
	const plan = planPatch(parsePatch(patch([
		"*** Add File: /new",
		"+created",
		"*** Update File: /update",
		"@@",
		"-old",
		"+new",
		"*** Delete File: /delete",
	].join("\n"))), original);
	assert.deepEqual(plan, new Map([["/new", "created\n"], ["/update", "new\n"], ["/delete", null]]));
	assert.equal(original.get("/update"), "old\n");
});

test("rejects Add File when the target exists", () => {
	assert.throws(
		() => planPatch(parsePatch(patch("*** Add File: /a\n+replacement")), files([["/a", "original\n"]])),
		/already exists/,
	);
});

test("rejects update and delete when targets are missing", () => {
	assert.throws(
		() => planPatch(parsePatch(patch("*** Update File: /a\n@@\n-old\n+new")), files([])),
		/does not exist/,
	);
	assert.throws(
		() => planPatch(parsePatch(patch("*** Delete File: /a")), files([])),
		/does not exist/,
	);
});

test("places pure insertions after their context", () => {
	const result = planPatch(
		parsePatch(patch("*** Update File: /a\n@@ marker\n+first\n+second")),
		files([["/a", "head\nmarker\ntail\n"]]),
	);
	assert.equal(result.get("/a"), "head\nmarker\nfirst\nsecond\ntail\n");
});

test("rejects ambiguous patch hunks", () => {
	assert.throws(
		() => planPatch(
			parsePatch(patch("*** Update File: /a\n@@\n-same\n+new")),
			files([["/a", "same\nmiddle\nsame\n"]]),
		),
		/ambiguous/,
	);
});

test("fallback matching preserves original context bytes", () => {
	const result = planPatch(
		parsePatch(patch("*** Update File: /a\n@@\n     keep();\n-    old();\n+    new();")),
		files([["/a", "if (ok) {\n    keep();   \n    old();\n}\n"]]),
	);
	assert.equal(result.get("/a"), "if (ok) {\n    keep();   \n    new();\n}\n");
});

test("preserves CRLF, BOM, and the absence of a final newline", () => {
	const result = planPatch(
		parsePatch(patch("*** Update File: /a\n@@\n-old\n+new")),
		files([["/a", "\uFEFFbefore\r\nold"]]),
	);
	assert.equal(result.get("/a"), "\uFEFFbefore\r\nnew");
});
