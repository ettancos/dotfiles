# Memory Policy

Durable memory via MCP graph. Brief, high-signal, future-useful only. Not a session log.

## Session start

`memory_search_nodes` for the current project/user. Skim what's known before working.

## When to write

- **Repeatable win**: tactic/workflow that reliably helped
- **Avoidable loss**: pitfall that cost time or caused a bug
- **Stable preference**: user style, constraints, or conventions
- **Non-obvious decision**: "chose X over Y because Z" — will matter later

## How to write

One actionable sentence per observation. **Hard cap: ~200 chars.** Include enough context (what + why) to be useful without the original session.

**Entity naming** — use these prefixes:
`User`, `Repo: <name>`, `Tool: <name>`, `Decision: <topic>`, `Pitfall: <topic>`, `Pattern: <topic>`, `Workflow: <name>`

## Workflow

1. `memory_search_nodes` — find existing entity first
2. `memory_add_observations` — update existing over creating new
3. `memory_create_relations` — only when it aids navigation
4. **Supersede**: if an observation is outdated, delete it and add the corrected version
5. **Delete**: remove observations proven wrong or no longer relevant

## Never store

Secrets, credentials, large logs, stack traces, ephemeral state ("currently working on…"), or facts obvious from code without a non-obvious reason.
