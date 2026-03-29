Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Specific instructions

* Do NOT ever use sudo without the user approval, this overrides any other instructions!
* Use uv for python
* If you run into tool error, permission issues, don't try to work around, report it and explain what you are trying to do.

### URL Verification Protocol: Never share download URLs from memory or search results. Always verify existence first:
1. Fetch the parent directory listing or releases page with webfetch
2. Extract the actual filename/URL from the live page
3. Only then share with the user

For software downloads, prefer canonical release pages:
- releases.ubuntu.com/{codename}/
- github.com/{org}/{repo}/releases/latest
- PyPI/npm/crates.io API endpoints

### Use get-api-docs skill to fetch documentation

chub contains local documentation to many frameworks and libraries.

### Use Context7 MCP for Loading Documentation

Context7 MCP is available to fetch up-to-date documentation with code examples.

## Infrastructure Operations
- Always run `terraform plan` before `terraform apply`. Never skip it.
- Always use `kubectl diff` before `kubectl apply`.
- Never run destructive operations (`helm uninstall`, `kubectl delete`, `argocd app delete`) without explicit user confirmation.
- For any cloud/k8s command that modifies state, state the operation and ask for confirmation first.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
