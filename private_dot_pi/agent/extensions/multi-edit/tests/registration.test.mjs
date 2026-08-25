import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourcePaths = [new URL("../index.ts", import.meta.url), new URL("../tools.ts", import.meta.url)];

test("registers additive tools without overriding edit", async () => {
	const source = (await Promise.all(sourcePaths.map((path) => readFile(path, "utf8")))).join("\n");
	const names = [...source.matchAll(/name:\s*["']([^"']+)["']/g)].map((match) => match[1]);

	assert.ok(names.includes("multi_edit"));
	assert.ok(names.includes("apply_patch"));
	assert.ok(!names.includes("edit"));
});
