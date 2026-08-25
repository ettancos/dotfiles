# Pi Additive Edit Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom `edit` override with safe additive `multi_edit` and `apply_patch` tools while retaining Pi's built-in `edit` implementation.

**Architecture:** Parse and plan every operation without filesystem side effects, then use a shared transaction layer to lock canonical paths, verify snapshots, commit deterministic changes, and restore prior states after failures. Keep exact replacements, patch parsing, patch planning, transaction handling, and tool registration in focused TypeScript modules with Node's built-in test runner.

**Tech Stack:** TypeScript, Pi extension API, TypeBox, Node.js filesystem APIs, Node test runner, jsdiff.

---

### Task 1: Establish the managed extension and test harness

**Files:**
- Create: `private_dot_pi/agent/extensions/multi-edit/package.json`
- Create: `private_dot_pi/agent/extensions/multi-edit/tsconfig.json`
- Create: `private_dot_pi/agent/extensions/multi-edit/tests/helpers.ts`
- Create: `private_dot_pi/agent/extensions/multi-edit/index.ts`

- [ ] Copy the current extension package metadata into chezmoi and update imports to `@earendil-works/pi-coding-agent` and `typebox`.
- [ ] Add `test`, `test:watch`, and `typecheck` scripts using Node's test runner and TypeScript stripping.
- [ ] Add a test helper that captures registered tool definitions from the extension factory and invokes tools against a temporary directory.
- [ ] Add a failing registration test asserting that `edit` is not registered and `multi_edit` plus `apply_patch` are registered.
- [ ] Run the focused test and confirm it fails because the old `edit` tool is still registered.
- [ ] Implement minimal additive registration and rerun the test.

### Task 2: Implement exact multi-file planning

**Files:**
- Create: `private_dot_pi/agent/extensions/multi-edit/exact-edits.ts`
- Create: `private_dot_pi/agent/extensions/multi-edit/file-state.ts`
- Create: `private_dot_pi/agent/extensions/multi-edit/tests/multi-edit.test.ts`

- [ ] Add failing tests for multi-file replacement, deletion through empty `newText`, empty `oldText`, missing text, duplicate text, overlap, BOM preservation, and CRLF preservation.
- [ ] Run the tests and confirm failures are caused by missing planning behavior.
- [ ] Implement immutable file snapshots and exact replacement planning against the original content.
- [ ] Reject missing, ambiguous, empty, and overlapping targets before commit.
- [ ] Preserve BOM, dominant line endings, final-newline state, and existing file modes.
- [ ] Rerun the focused tests and confirm they pass.

### Task 3: Implement patch parsing and planning

**Files:**
- Create: `private_dot_pi/agent/extensions/multi-edit/patch-parser.ts`
- Create: `private_dot_pi/agent/extensions/multi-edit/patch-planner.ts`
- Create: `private_dot_pi/agent/extensions/multi-edit/tests/apply-patch.test.ts`

- [ ] Add failing parser tests for add, update, delete, multiple operations, malformed envelopes, empty patches, unsupported moves, and invalid hunk lines.
- [ ] Add failing planner tests for existing add targets, missing update/delete targets, pure insertion placement and order, ambiguous hunks, conservative fallback matching, context preservation, CRLF, BOM, and final-newline behavior.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Implement typed patch parsing without filesystem side effects.
- [ ] Implement exact-first and conservative fallback hunk location while preserving original context bytes.
- [ ] Implement add/update/delete planning and explicit final-newline handling.
- [ ] Rerun the focused tests and confirm they pass.

### Task 4: Implement queued commit and restoration

**Files:**
- Create: `private_dot_pi/agent/extensions/multi-edit/transaction.ts`
- Create: `private_dot_pi/agent/extensions/multi-edit/tests/transaction.test.ts`

- [ ] Add failing tests for deterministic path locking, concurrent updates without lost changes, source-change detection, nested-directory creation, mode preservation, commit failure restoration, restoration failure reporting, cancellation, and symbolic-link aliases.
- [ ] Run the tests and confirm expected failures.
- [ ] Implement sorted nested `withFileMutationQueue()` acquisition for all canonical target paths.
- [ ] Capture snapshots inside the locks, plan inside the locks, and verify snapshots immediately before commit.
- [ ] Commit writes through same-directory temporary files and rename operations; commit deletes only after all writes are staged.
- [ ] Restore changed files and remove newly created files and empty transaction-created directories after failure.
- [ ] Rerun the focused tests and confirm they pass.

### Task 5: Integrate tools and bounded results

**Files:**
- Modify: `private_dot_pi/agent/extensions/multi-edit/index.ts`
- Create: `private_dot_pi/agent/extensions/multi-edit/diff.ts`
- Modify: `private_dot_pi/agent/extensions/multi-edit/tests/helpers.ts`
- Modify: `private_dot_pi/agent/extensions/multi-edit/tests/multi-edit.test.ts`
- Modify: `private_dot_pi/agent/extensions/multi-edit/tests/apply-patch.test.ts`

- [ ] Add failing integration tests for strict schemas, operation summaries, file-labeled diffs, truncation, and thrown failures.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Wire `multi_edit` and `apply_patch` to planners and the transaction layer.
- [ ] Format concise summaries and bounded diffs using Pi's truncation utilities.
- [ ] Rerun integration tests and confirm they pass.

### Task 6: Apply and verify

**Files:**
- Modify: `private_dot_pi/agent/extensions/multi-edit/package-lock.json`
- Remove through chezmoi application: unmanaged legacy files under `~/.pi/agent/extensions/multi-edit/`

- [ ] Install package dependencies and generate the lockfile.
- [ ] Run `npm test` and confirm all tests pass.
- [ ] Run `npm run typecheck` and confirm it passes.
- [ ] Run `npm audit --omit=dev` and review any remaining findings.
- [ ] Run `chezmoi diff` and confirm only the intended extension files are affected.
- [ ] Apply the managed extension with chezmoi.
- [ ] Run `/reload` or start a fresh Pi process.
- [ ] Inspect the active tool schemas and confirm `edit`, `multi_edit`, and `apply_patch` are distinct.
- [ ] Run smoke tests for built-in `edit`, cross-file `multi_edit`, and add/update/delete `apply_patch` behavior.
- [ ] Review the final diff and commit only the plan and extension files.
