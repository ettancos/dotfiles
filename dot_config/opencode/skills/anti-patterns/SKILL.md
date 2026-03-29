---
name: anti-patterns
description: Common mistakes to avoid with explanations and correct alternatives
version: "2.0.0"
---

# Anti-Patterns to Avoid

Common mistakes in agent workflows with explanations of why they're harmful and how to do it correctly.

## Overview

This skill catalogs 11 critical anti-patterns that degrade agent performance, cause context loss, or lead to repeated failures. Each pattern includes:
- **Wrong:** The problematic approach
- **Right:** The correct alternative
- **Rationale:** Why this matters

## The 11 Anti-Patterns

### 1. Premature Clear

<anti-pattern name="premature-clear">
  <wrong>/clear mid-investigation</wrong>
  <right>Persist findings before clearing context</right>
  <rationale>Loses all context and investigation progress, forcing restart from scratch</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: Two failed fixes → /clear → start over with no memory of what was tried
✅ GOOD: Two failed fixes → Write findings to notes.md or CLAUDE.md → Then /clear if needed
```

---

### 2. Unmapped Features

<anti-pattern name="unmapped-features">
  <wrong>Add features without mapping impact</wrong>
  <right>Explore codebase → map affected files → integration test → implement</right>
  <rationale>Changes cascade unexpectedly without understanding full impact surface</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: "Add authentication middleware" → start coding immediately
✅ GOOD: Search for existing auth patterns → map affected files → integration test → implement
```

---

### 3. Visual-Only Debugging

<anti-pattern name="visual-only-debugging">
  <wrong>Screenshot-only debugging</wrong>
  <right>Full logs + chrome-devtools</right>
  <rationale>Visual symptoms don't reveal root cause; need console errors and network traces</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: "Button not working" → only take screenshots
✅ GOOD: Use @chrome-devtools → capture console errors → network traces → DOM inspection
```

---

### 4. Repeated Failing Fixes

<anti-pattern name="repeated-failing-fixes">
  <wrong>Third fix without analysis</wrong>
  <right>Two-Strike → STOP → analyze</right>
  <rationale>Random attempts waste time; systematic root cause analysis required after 2 failures</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: Fix 1 fails → Fix 2 fails → Try fix 3 immediately
✅ GOOD: Fix 1 fails → Fix 2 fails → STOP → Re-read error context → Load systematic-debugging skill
```

---

### 5. Unsynchronized Planning

<anti-pattern name="unsynchronized-planning">
  <wrong>TodoWrite without task_plan.md</wrong>
  <right>Create both, keep synced</right>
  <rationale>TUI todos are ephemeral; task_plan.md provides crash recovery and session continuity</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: Only use TodoWrite for task tracking
✅ GOOD: Create task_plan.md → TodoWrite with Phase 1 → Update task_plan.md Status section after TodoWrite changes
```

---

### 6. Context Amnesia

<anti-pattern name="context-amnesia">
  <wrong>Forget goals after tool calls</wrong>
  <right>Re-read task_plan.md</right>
  <rationale>Long tool outputs cause goal drift; task_plan.md anchors focus</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: Run 5 tool calls → lose track of original goal → implement wrong thing
✅ GOOD: Before major decisions → Re-read task_plan.md → Confirm next 2 steps
```

---

### 7. Knowledge Loss

<anti-pattern name="knowledge-loss">
  <wrong>Lose learnings at task end</wrong>
  <right>Persist decisions with reasoning context to project docs</right>
  <rationale>Store as decision trace: include Context + Reasoning, not just outcomes</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: Discover "Module X requires config Y" → mark task complete → forget
❌ ALSO BAD: Write "Module X requires config Y" (outcome only, no reasoning)
✅ GOOD: Add to CLAUDE.md or ADR: "Module X requires config Y for feature Z. Discovered during implementation — missing config caused silent test failure. Added to setup checklist."
```

---

### 8. Context Pollution

<anti-pattern name="context-pollution">
  <wrong>Stuff research in context</wrong>
  <right>Store in notes.md</right>
  <rationale>Large research dumps dilute focus; notes.md preserves findings without polluting working memory</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: Fetch 10 API docs → keep all in conversation context
✅ GOOD: Fetch docs → Summarize key points to notes.md → Reference as needed
```

---

### 9. Blind Truncation

<anti-pattern name="blind-truncation">
  <wrong>Apply same compression regardless of task tier</wrong>
  <right>Match compression ratio to tier (T1: 5-10x, T2: 2-5x, T3+: minimal)</right>
  <rationale>Architecture tasks need full context; simple edits can compress heavily</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: T3 architecture task → compress file output to first 20 lines only
✅ GOOD: T3 architecture task → Full structure with semantic preservation
```

---

### 10. Documentation Stagnation

<anti-pattern name="documentation-stagnation">
  <wrong>Add new project knowledge without checking existing docs</wrong>
  <right>Search existing docs first, update in place if same topic</right>
  <rationale>Duplicate documentation fragments knowledge; updated docs maintain coherence</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: Learn new auth pattern → Write new doc without checking existing
✅ GOOD: Search CLAUDE.md / ADRs for "auth" → Update existing section with new insight and date
```

---

### 11. Budget Blindness

<anti-pattern name="budget-blindness">
  <wrong>Ignore context usage until auto-compact or /clear forced</wrong>
  <right>Monitor budget proactively, offload at 75%, prepare for /clear at 90%</right>
  <rationale>Proactive offloading preserves continuity; reactive clearing loses context</rationale>
</anti-pattern>

**Example Scenario:**
```
❌ BAD: Context fills up → Auto-compacted unexpectedly → Lose critical state
✅ GOOD: Phase boundary → Check context usage → Offload research to notes.md → Continue
```

---

## Detection Guide

### How to Spot Anti-Patterns in Progress

| Anti-Pattern | Early Warning Sign |
|--------------|-------------------|
| Premature Clear | Thinking "/clear" before persisting findings |
| Unmapped Features | Starting code without exploring existing patterns |
| Visual-Only Debugging | Multiple screenshots, no console logs |
| Repeated Failing Fixes | About to try third fix without analysis |
| Unsynchronized Planning | TodoWrite exists but task_plan.md doesn't |
| Context Amnesia | Can't remember what Step 3 of task_plan.md was |
| Knowledge Loss | Completing task without documenting key decisions |
| Context Pollution | Conversation has 10+ long tool outputs unarchived |
| Blind Truncation | T3 task with heavily compressed file reads |
| Documentation Stagnation | Writing new docs without searching existing ones |
| Budget Blindness | Never checking context usage |

## Usage

Load this skill when:
- Starting a new task (review "DON'T" list)
- After a failed attempt (check if you hit an anti-pattern)
- Before major decisions (validate approach against anti-patterns)
- When debugging why something went wrong

**Quick check:** "Am I doing any of the 11 anti-patterns right now?"
