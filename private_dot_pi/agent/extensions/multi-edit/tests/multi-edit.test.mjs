import assert from "node:assert/strict";
import test from "node:test";
import { planExactEdits } from "../exact-edits.ts";

function files(entries) {
	return new Map(entries);
}

test("plans exact edits across multiple files", () => {
	const result = planExactEdits(
		[
			{ path: "/a", oldText: "one", newText: "ONE" },
			{ path: "/b", oldText: "two", newText: "TWO" },
		],
		files([["/a", "one\n"], ["/b", "two\n"]]),
	);
	assert.deepEqual(result, new Map([["/a", "ONE\n"], ["/b", "TWO\n"]]));
});

test("accepts an empty replacement as deletion", () => {
	const result = planExactEdits(
		[{ path: "/a", oldText: "remove\n", newText: "" }],
		files([["/a", "keep\nremove\n"]]),
	);
	assert.equal(result.get("/a"), "keep\n");
});

test("rejects empty oldText", () => {
	assert.throws(
		() => planExactEdits([{ path: "/a", oldText: "", newText: "x" }], files([["/a", "body"]])),
		/oldText must not be empty/,
	);
});

test("rejects missing oldText", () => {
	assert.throws(
		() => planExactEdits([{ path: "/a", oldText: "missing", newText: "x" }], files([["/a", "body"]])),
		/Could not find/,
	);
});

test("rejects ambiguous oldText", () => {
	assert.throws(
		() => planExactEdits([{ path: "/a", oldText: "same", newText: "x" }], files([["/a", "same same"]])),
		/2 occurrences/,
	);
});

test("rejects overlapping replacements", () => {
	assert.throws(
		() => planExactEdits(
			[
				{ path: "/a", oldText: "abc", newText: "x" },
				{ path: "/a", oldText: "bc", newText: "y" },
			],
			files([["/a", "abc"]]),
		),
		/overlap/,
	);
});

test("preserves a UTF-8 byte-order mark", () => {
	const result = planExactEdits(
		[{ path: "/a", oldText: "old", newText: "new" }],
		files([["/a", "\uFEFFold\n"]]),
	);
	assert.equal(result.get("/a"), "\uFEFFnew\n");
});

test("uses the dominant line-ending convention", () => {
	const result = planExactEdits(
		[{ path: "/a", oldText: "old", newText: "new\nline" }],
		files([["/a", "first\nsecond\r\nold\r\nafter\r\n"]]),
	);
	assert.equal(result.get("/a"), "first\r\nsecond\r\nnew\r\nline\r\nafter\r\n");
});

test("uses the source CRLF convention for replacement lines", () => {
	const result = planExactEdits(
		[{ path: "/a", oldText: "old", newText: "new\nline" }],
		files([["/a", "before\r\nold\r\nafter\r\n"]]),
	);
	assert.equal(result.get("/a"), "before\r\nnew\r\nline\r\nafter\r\n");
});
