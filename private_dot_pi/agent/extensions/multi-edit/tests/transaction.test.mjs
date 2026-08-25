import assert from "node:assert/strict";
import { chmod, lstat, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { nodeFileSystem, runFileTransaction } from "../transaction.ts";

function serialQueue() {
	const tails = new Map();
	return async (path, operation) => {
		const previous = tails.get(path) ?? Promise.resolve();
		let release;
		const current = new Promise((resolve) => { release = resolve; });
		tails.set(path, previous.then(() => current));
		await previous;
		try {
			return await operation();
		} finally {
			release();
			if (tails.get(path) === current) tails.delete(path);
		}
	};
}

async function tempRoot() {
	return mkdtemp(join(tmpdir(), "pi-edit-transaction-"));
}

test("commits multiple file changes", async () => {
	const root = await tempRoot();
	const a = join(root, "a.txt");
	const b = join(root, "b.txt");
	await Promise.all([writeFile(a, "a"), writeFile(b, "b")]);
	await runFileTransaction({
		paths: [a, b], cwd: root, queue: serialQueue(),
		plan: (files) => new Map([[a, `${files.get(a)}1`], [b, `${files.get(b)}2`]]),
	});
	assert.equal(await readFile(a, "utf8"), "a1");
	assert.equal(await readFile(b, "utf8"), "b2");
});

test("serializes concurrent transactions for the same file", async () => {
	const root = await tempRoot();
	const file = join(root, "both.txt");
	await writeFile(file, "A B");
	const queue = serialQueue();
	await Promise.all([
		runFileTransaction({ paths: [file], cwd: root, queue, plan: (files) => new Map([[file, files.get(file).replace("A", "X")]]) }),
		runFileTransaction({ paths: [file], cwd: root, queue, plan: (files) => new Map([[file, files.get(file).replace("B", "Y")]]) }),
	]);
	assert.equal(await readFile(file, "utf8"), "X Y");
});

test("restores earlier changes when a later commit fails", async () => {
	const root = await tempRoot();
	const a = join(root, "a.txt");
	const b = join(root, "b.txt");
	const fileSystem = {
		...nodeFileSystem,
		link: async (source, target) => {
			if (target === b) throw new Error("injected commit failure");
			return nodeFileSystem.link(source, target);
		},
	};
	await assert.rejects(
		runFileTransaction({
			paths: [a, b], cwd: root, queue: serialQueue(), fileSystem,
			plan: () => new Map([[a, "a"], [b, "b"]]),
		}),
		/injected commit failure/,
	);
	await assert.rejects(lstat(a), { code: "ENOENT" });
	await assert.rejects(lstat(b), { code: "ENOENT" });
});

test("reports rollback failures", async () => {
	const root = await tempRoot();
	const a = join(root, "a.txt");
	const b = join(root, "b.txt");
	const fileSystem = {
		...nodeFileSystem,
		link: async (source, target) => {
			if (target === b) throw new Error("injected commit failure");
			return nodeFileSystem.link(source, target);
		},
		unlink: async (path) => {
			if (path === a) throw new Error("injected rollback failure");
			return nodeFileSystem.unlink(path);
		},
	};
	await assert.rejects(
		runFileTransaction({
			paths: [a, b], cwd: root, queue: serialQueue(), fileSystem,
			plan: () => new Map([[a, "a"], [b, "b"]]),
		}),
		(error) => /injected commit failure/.test(error.message) && /Rollback failures/.test(error.message) && /injected rollback failure/.test(error.message),
	);
});

test("detects source changes before commit", async () => {
	const root = await tempRoot();
	const file = join(root, "a.txt");
	await writeFile(file, "original");
	let injected = false;
	const fileSystem = {
		...nodeFileSystem,
		writeFile: async (path, data, options) => {
			await nodeFileSystem.writeFile(path, data, options);
			if (!injected && path !== file) {
				injected = true;
				await nodeFileSystem.writeFile(file, "external");
			}
		},
	};
	await assert.rejects(
		runFileTransaction({
			paths: [file], cwd: root, queue: serialQueue(), fileSystem,
			plan: () => new Map([[file, "planned"]]),
		}),
		/changed during planning/,
	);
	assert.equal(await readFile(file, "utf8"), "external");
});

test("creates parent directories and preserves existing file mode", async () => {
	const root = await tempRoot();
	const existing = join(root, "existing.sh");
	const nested = join(root, "new", "deep", "file.txt");
	await writeFile(existing, "old");
	await chmod(existing, 0o751);
	await runFileTransaction({
		paths: [existing, nested], cwd: root, queue: serialQueue(),
		plan: () => new Map([[existing, "new"], [nested, "nested"]]),
	});
	assert.equal((await lstat(existing)).mode & 0o777, 0o751);
	assert.equal(await readFile(nested, "utf8"), "nested");
});

test("creates one shared parent safely during concurrent adds", async () => {
	const root = await tempRoot();
	const parent = join(root, "shared");
	const a = join(parent, "a.txt");
	const b = join(parent, "b.txt");
	let waiting = 0;
	let release;
	const barrier = new Promise((resolve) => { release = resolve; });
	const fileSystem = {
		...nodeFileSystem,
		lstat: async (path) => {
			if (path === parent && waiting < 2) {
				waiting++;
				if (waiting === 2) release();
				await barrier;
				const error = new Error("missing");
				error.code = "ENOENT";
				throw error;
			}
			return nodeFileSystem.lstat(path);
		},
	};
	await Promise.all([
		runFileTransaction({ paths: [a], cwd: root, queue: serialQueue(), fileSystem, plan: () => new Map([[a, "a"]]) }),
		runFileTransaction({ paths: [b], cwd: root, queue: serialQueue(), fileSystem, plan: () => new Map([[b, "b"]]) }),
	]);
	assert.equal(await readFile(a, "utf8"), "a");
	assert.equal(await readFile(b, "utf8"), "b");
});

test("canonicalizes symbolic-link aliases into one queue", async () => {
	const root = await tempRoot();
	const target = join(root, "target.txt");
	const alias = join(root, "alias.txt");
	await writeFile(target, "A B");
	await symlink(target, alias);
	const queue = serialQueue();
	await Promise.all([
		runFileTransaction({ paths: [target], cwd: root, queue, plan: (files) => new Map([[target, files.get(target).replace("A", "X")]]) }),
		runFileTransaction({ paths: [alias], cwd: root, queue, plan: (files) => new Map([[alias, files.get(alias).replace("B", "Y")]]) }),
	]);
	assert.equal(await readFile(target, "utf8"), "X Y");
	assert.equal((await lstat(alias)).isSymbolicLink(), true);
});

test("cancellation during commit restores files already created", async () => {
	const root = await tempRoot();
	const a = join(root, "a.txt");
	const b = join(root, "b.txt");
	const controller = new AbortController();
	const fileSystem = {
		...nodeFileSystem,
		link: async (source, target) => {
			await nodeFileSystem.link(source, target);
			if (target === a) controller.abort();
		},
	};
	await assert.rejects(
		runFileTransaction({
			paths: [a, b], cwd: root, queue: serialQueue(), signal: controller.signal, fileSystem,
			plan: () => new Map([[a, "a"], [b, "b"]]),
		}),
		/Operation canceled/,
	);
	await assert.rejects(lstat(a), { code: "ENOENT" });
	await assert.rejects(lstat(b), { code: "ENOENT" });
});

test("cancellation before commit leaves files unchanged", async () => {
	const root = await tempRoot();
	const file = join(root, "a.txt");
	await writeFile(file, "old");
	const controller = new AbortController();
	controller.abort();
	await assert.rejects(
		runFileTransaction({
			paths: [file], cwd: root, queue: serialQueue(), signal: controller.signal,
			plan: () => new Map([[file, "new"]]),
		}),
		/Operation canceled/,
	);
	assert.equal(await readFile(file, "utf8"), "old");
});
