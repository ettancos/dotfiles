import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, resolve } from "node:path";

export type FileMutationQueue = <T>(path: string, operation: () => Promise<T>) => Promise<T>;

export interface FileSystem {
	chmod: typeof fs.chmod;
	link: typeof fs.link;
	lstat: typeof fs.lstat;
	mkdir: typeof fs.mkdir;
	readFile: typeof fs.readFile;
	realpath: typeof fs.realpath;
	rename: typeof fs.rename;
	rmdir: typeof fs.rmdir;
	unlink: typeof fs.unlink;
	writeFile: typeof fs.writeFile;
}

export const nodeFileSystem: FileSystem = {
	chmod: fs.chmod,
	link: fs.link,
	lstat: fs.lstat,
	mkdir: fs.mkdir,
	readFile: fs.readFile,
	realpath: fs.realpath,
	rename: fs.rename,
	rmdir: fs.rmdir,
	unlink: fs.unlink,
	writeFile: fs.writeFile,
};

interface Snapshot {
	path: string;
	exists: boolean;
	content?: Buffer;
	mode?: number;
}

interface StagedWrite {
	target: string;
	temporary: string;
}

interface AppliedChange {
	kind: "add" | "update" | "delete";
	target: string;
	backup?: string;
}

export interface TransactionOptions {
	paths: string[];
	cwd: string;
	queue: FileMutationQueue;
	plan: (files: ReadonlyMap<string, string | undefined>) => Map<string, string | null> | Promise<Map<string, string | null>>;
	signal?: AbortSignal;
	fileSystem?: FileSystem;
}

export interface TransactionResult {
	before: Map<string, string | undefined>;
	changes: Map<string, string | null>;
	warnings: string[];
}

function canceled(signal?: AbortSignal): void {
	if (signal?.aborted) throw new Error("Operation canceled.");
}

export function resolveToolPath(path: string, cwd: string): string {
	const normalized = path.startsWith("@") ? path.slice(1) : path;
	if (!normalized) throw new Error("File path must not be empty.");
	return isAbsolute(normalized) ? resolve(normalized) : resolve(cwd, normalized);
}

async function canonicalPath(path: string, fileSystem: FileSystem): Promise<string> {
	try {
		return await fileSystem.realpath(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return path;
		throw error;
	}
}

async function readSnapshot(path: string, fileSystem: FileSystem): Promise<Snapshot> {
	try {
		const stat = await fileSystem.lstat(path);
		if (!stat.isFile()) throw new Error(`Cannot edit ${path}: target is not a regular file.`);
		return {
			path,
			exists: true,
			content: await fileSystem.readFile(path),
			mode: stat.mode & 0o7777,
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { path, exists: false };
		throw error;
	}
}

function snapshotMatches(left: Snapshot, right: Snapshot): boolean {
	return left.exists === right.exists
		&& left.mode === right.mode
		&& (left.content === undefined
			? right.content === undefined
			: right.content !== undefined && left.content.equals(right.content));
}

async function withQueues<T>(paths: string[], queue: FileMutationQueue, operation: () => Promise<T>, index = 0): Promise<T> {
	if (index >= paths.length) return operation();
	return queue(paths[index], () => withQueues(paths, queue, operation, index + 1));
}

async function ensureParentDirectories(path: string, fileSystem: FileSystem, created: string[]): Promise<void> {
	const missing: string[] = [];
	let current = dirname(path);
	while (true) {
		try {
			const stat = await fileSystem.lstat(current);
			if (!stat.isDirectory()) throw new Error(`Cannot create ${path}: ${current} is not a directory.`);
			break;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			missing.push(current);
			const parent = dirname(current);
			if (parent === current) throw error;
			current = parent;
		}
	}
	for (const directory of missing.reverse()) {
		try {
			await fileSystem.mkdir(directory);
			created.push(directory);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			const stat = await fileSystem.lstat(directory);
			if (!stat.isDirectory()) throw new Error(`Cannot create ${path}: ${directory} is not a directory.`);
		}
	}
}

function transactionPath(target: string, label: string): string {
	return `${target}.pi-${label}-${process.pid}-${randomUUID()}`;
}

async function removeIfPresent(path: string, fileSystem: FileSystem): Promise<void> {
	try {
		await fileSystem.unlink(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
}

async function restoreChanges(applied: AppliedChange[], fileSystem: FileSystem): Promise<string[]> {
	const failures: string[] = [];
	for (const change of [...applied].reverse()) {
		try {
			if (change.kind === "add") {
				await removeIfPresent(change.target, fileSystem);
			} else {
				await removeIfPresent(change.target, fileSystem);
				await fileSystem.rename(change.backup!, change.target);
			}
		} catch (error) {
			failures.push(`${change.target}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	return failures;
}

async function cleanupDirectories(created: string[], fileSystem: FileSystem): Promise<void> {
	for (const directory of [...created].reverse()) {
		try {
			await fileSystem.rmdir(directory);
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code !== "ENOENT" && code !== "ENOTEMPTY") throw error;
		}
	}
}

export async function runFileTransaction(options: TransactionOptions): Promise<TransactionResult> {
	const fileSystem = options.fileSystem ?? nodeFileSystem;
	canceled(options.signal);

	const requested = options.paths.map((path) => resolveToolPath(path, options.cwd));
	const aliases = new Map<string, string>();
	for (const path of requested) aliases.set(path, await canonicalPath(path, fileSystem));
	const targets = [...new Set(aliases.values())].sort();

	return withQueues(targets, options.queue, async () => {
		canceled(options.signal);
		const snapshots = new Map<string, Snapshot>();
		for (const target of targets) snapshots.set(target, await readSnapshot(target, fileSystem));

		const files = new Map<string, string | undefined>();
		for (const [requestedPath, target] of aliases) {
			const content = snapshots.get(target)?.content?.toString("utf8");
			files.set(requestedPath, content);
			files.set(target, content);
		}

		const requestedChanges = await options.plan(files);
		const changes = new Map<string, string | null>();
		for (const [path, content] of requestedChanges) {
			const absolute = resolveToolPath(path, options.cwd);
			const target = aliases.get(absolute);
			if (!target) throw new Error(`Planner returned undeclared path ${path}.`);
			if (changes.has(target)) throw new Error(`Multiple requested paths resolve to the same file: ${target}.`);
			changes.set(target, content);
		}
		if (changes.size === 0) throw new Error("No file changes were planned.");

		const staged: StagedWrite[] = [];
		const createdDirectories: string[] = [];
		const applied: AppliedChange[] = [];
		const warnings: string[] = [];
		try {
			for (const [target, content] of changes) {
				canceled(options.signal);
				if (content === null) continue;
				const snapshot = snapshots.get(target)!;
				await ensureParentDirectories(target, fileSystem, createdDirectories);
				const temporary = transactionPath(target, "stage");
				await fileSystem.writeFile(temporary, content, { flag: "wx", mode: snapshot.mode ?? 0o666 });
				if (snapshot.mode !== undefined) await fileSystem.chmod(temporary, snapshot.mode);
				staged.push({ target, temporary });
			}

			for (const target of targets) {
				const current = await readSnapshot(target, fileSystem);
				if (!snapshotMatches(snapshots.get(target)!, current)) {
					throw new Error(`Cannot commit because ${target} changed during planning.`);
				}
			}

			for (const [target, content] of [...changes].sort(([left], [right]) => left.localeCompare(right))) {
				canceled(options.signal);
				const snapshot = snapshots.get(target)!;
				if (content === null) {
					const backup = transactionPath(target, "backup");
					await fileSystem.rename(target, backup);
					applied.push({ kind: "delete", target, backup });
					continue;
				}
				const stagedWrite = staged.find((entry) => entry.target === target)!;
				if (!snapshot.exists) {
					await fileSystem.link(stagedWrite.temporary, target);
					applied.push({ kind: "add", target });
					await fileSystem.unlink(stagedWrite.temporary);
					continue;
				}
				const backup = transactionPath(target, "backup");
				await fileSystem.rename(target, backup);
				applied.push({ kind: "update", target, backup });
				await fileSystem.rename(stagedWrite.temporary, target);
			}

			for (const change of applied) {
				if (!change.backup) continue;
				try {
					await fileSystem.unlink(change.backup);
				} catch (error) {
					warnings.push(`Could not remove transaction backup ${change.backup}: ${error instanceof Error ? error.message : String(error)}`);
				}
			}
			const before = new Map<string, string | undefined>();
			for (const [target, snapshot] of snapshots) before.set(target, snapshot.content?.toString("utf8"));
			return { before, changes, warnings };
		} catch (error) {
			const restorationFailures = await restoreChanges(applied, fileSystem);
			await Promise.all(staged.map((entry) => removeIfPresent(entry.temporary, fileSystem).catch(() => undefined)));
			await cleanupDirectories(createdDirectories, fileSystem).catch((cleanupError) => {
				restorationFailures.push(`directory cleanup: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
			});
			const message = error instanceof Error ? error.message : String(error);
			if (restorationFailures.length > 0) {
				throw new Error(`${message}\nRollback failures:\n${restorationFailures.join("\n")}`);
			}
			throw error;
		}
	});
}
