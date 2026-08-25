# Additive Pi File-Editing Tools Design

**Date:** 2026-08-25

## Summary

Replace the custom `edit` override with two additive tools:

- `multi_edit` applies exact-text replacements across one or more files.
- `apply_patch` applies Codex-style add, update, and delete operations.

Pi's built-in `edit` tool remains registered and unchanged. Both custom tools plan all changes in memory, coordinate mutations through Pi's file mutation queue, verify that source files have not changed before commit, and attempt to restore prior state if a commit fails.

## Goals

- Preserve Pi's built-in `edit` behavior and schema.
- Support exact replacements across multiple files in one `multi_edit` call.
- Support Codex-style `*** Add File`, `*** Update File`, and `*** Delete File` operations in one `apply_patch` call.
- Prevent lost updates between concurrent Pi file tools.
- Detect ambiguous, missing, and overlapping replacements before writing files.
- Preserve byte-order marks, line endings, file modes, and final-newline state where the requested change does not alter them.
- Prevent `Add File` from overwriting an existing path.
- Restore files to their original state when a commit fails after earlier files were changed.
- Keep the extension reproducible through chezmoi.

## Non-goals

- Provide filesystem-level atomicity across multiple files. Standard filesystem APIs cannot guarantee a single atomic transaction across independent paths.
- Restrict edits to the current working directory. Like Pi's built-in file tools, these tools can operate on absolute paths and paths outside the current working directory.
- Support patch move or rename operations.
- Support arbitrary unified-diff formats. `apply_patch` accepts only the documented Codex envelope and operation headers.

## Tool interfaces

### `multi_edit`

`multi_edit` accepts one required `edits` array:

```json
{
  "edits": [
    {
      "path": "src/a.ts",
      "oldText": "old value",
      "newText": "new value"
    },
    {
      "path": "src/b.ts",
      "oldText": "obsolete line\n",
      "newText": ""
    }
  ]
}
```

Each item requires `path`, `oldText`, and `newText`. Empty `newText` is valid and deletes the matched text. Empty `oldText` is invalid. Unknown properties are rejected where the provider supports strict tool schemas.

All edits for a file are matched against the same original content. Each `oldText` must match exactly one non-overlapping region. The tool rejects ambiguous, missing, duplicate-target, and overlapping edits instead of choosing an occurrence silently.

### `apply_patch`

`apply_patch` accepts one required `patch` string:

```json
{
  "patch": "*** Begin Patch\n*** Update File: src/a.ts\n@@\n-old\n+new\n*** End Patch"
}
```

Supported operations are:

- `*** Add File: PATH`
- `*** Update File: PATH`
- `*** Delete File: PATH`

`Add File` fails if the path already exists. `Update File` and `Delete File` fail if the path does not exist. Adding a file creates missing parent directories during commit. Move operations are rejected.

Update hunks use exact matching first and conservative fallback matching second. Fallback matching may ignore trailing whitespace and normalize common Unicode punctuation for locating a hunk. It does not ignore leading indentation. Context lines locate the hunk but are copied from the original file; only added and deleted lines change content. Ambiguous fallback matches fail instead of selecting the first match.

Pure insertion hunks insert at the location identified by their hunk context. Multiple insertions at one location retain patch order.

## Architecture

The extension is split into focused modules:

```text
private_dot_pi/agent/extensions/multi-edit/
├── index.ts
├── exact-edits.ts
├── patch-parser.ts
├── patch-planner.ts
├── transaction.ts
├── diff.ts
├── tests/
│   ├── multi-edit.test.ts
│   ├── apply-patch.test.ts
│   └── transaction.test.ts
├── package.json
└── package-lock.json
```

- `index.ts` defines strict tool schemas, registers `multi_edit` and `apply_patch`, and converts domain results to Pi tool results.
- `exact-edits.ts` validates and plans exact replacements without filesystem side effects.
- `patch-parser.ts` parses the Codex patch envelope into typed operations.
- `patch-planner.ts` applies parsed operations to in-memory snapshots and returns planned file states.
- `transaction.ts` reads snapshots, acquires mutation queues, detects concurrent changes, commits planned states, and restores original states after failures.
- `diff.ts` formats bounded, file-labeled diffs for tool results.

Production files live in the chezmoi source tree. Chezmoi applies them to `~/.pi/agent/extensions/multi-edit/`.

## Planning and transaction flow

Both tools use the same transaction pipeline:

1. Resolve each target to an absolute path relative to `ctx.cwd`.
2. Normalize a leading `@` in model-provided path arguments, matching Pi's built-in path behavior.
3. Canonicalize existing paths with `realpath` so symlink aliases identify the same mutation target.
4. Sort canonical paths to establish deterministic lock order.
5. Acquire Pi mutation queues for every affected path and hold them through planning, commit, and rollback.
6. Capture each target's existence, bytes, mode, and canonical identity.
7. Compute all desired states in memory without changing the filesystem.
8. Re-read each source immediately before commit and fail if its existence or bytes differ from the captured snapshot.
9. Commit operations in deterministic path order by writing temporary files and renaming them where applicable.
10. If a commit fails, restore every path already changed during this transaction in reverse commit order.
11. Report the original error and every rollback error. Never claim success when restoration is incomplete.

Rollback substantially reduces partial changes but does not provide a filesystem-wide atomicity guarantee. Process termination, hardware failure, disk failure, or rollback failure can still leave partial state.

## File-state behavior

For existing files, writes preserve the original mode. Exact replacements preserve the original byte-order mark and dominant line-ending convention. Patch updates preserve untouched bytes and the original final-newline state unless the patch explicitly changes the end of the file.

For new files, `apply_patch` uses the process's normal file mode and creates parent directories recursively. Rollback removes newly created files and removes transaction-created directories only when they remain empty.

Delete operations capture content and mode before removal so rollback can recreate the file. Symbolic links are treated as paths to their canonical targets for locking and change detection; the implementation must not accidentally replace a symbolic link with a regular file.

## Error handling

Validation and planning errors occur before any filesystem mutation. Error messages identify the tool, operation index, path, and reason.

Commit errors include:

- the operation that failed,
- paths committed before the failure,
- paths successfully restored,
- paths that could not be restored, and
- the restoration error for each affected path.

Cancellation before commit causes no changes. Cancellation during commit triggers restoration of already-applied changes before the tool returns an error.

## Result format

Successful results contain a concise summary in `content` and bounded, file-labeled diffs in `details`. Output uses Pi's standard truncation limits. The result identifies every added, updated, and deleted path.

Failure results are produced by throwing an error so Pi marks the tool result with `isError: true`.

## Tests

Tests use temporary directories and real filesystem operations. They cover:

- exact replacement across one and multiple files,
- empty `newText` deletion,
- empty and ambiguous `oldText` rejection,
- duplicate and overlapping replacement rejection,
- same-file and cross-tool concurrency without lost updates,
- source changes detected between snapshot and commit,
- rollback after a later write, rename, or delete fails,
- rollback failure reporting,
- existing-file rejection for `Add File`,
- missing-file rejection for update and delete,
- nested parent-directory creation and cleanup,
- exact, fallback, ambiguous, and missing patch hunk matching,
- unchanged context preservation during fallback matching,
- pure insertion placement and ordering,
- LF and CRLF preservation,
- byte-order mark preservation,
- final-newline preservation,
- file-mode preservation,
- cancellation before and during commit,
- symbolic-link aliases sharing a mutation queue, and
- bounded diff output.

Each regression test is written and observed failing before its corresponding implementation change.

## Migration

1. Add the new source files and tests under the chezmoi source directory.
2. Change tool registration from `edit` to `multi_edit` and `apply_patch`.
3. Apply the managed files with chezmoi.
4. Reload Pi.
5. Confirm that Pi exposes its built-in `edit` schema and the two new tool schemas.
6. Run integration tests against all three tools.

Existing sessions can contain calls to the old overriding `edit` schema. They are not automatically migrated. Resume those sessions only after changing models or starting a fresh turn that receives the new tool definitions; start a new session if a model continues to replay the old schema.
