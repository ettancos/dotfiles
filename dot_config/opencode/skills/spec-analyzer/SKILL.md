---
name: spec-analyzer
description: "Analyze and enhance specs from Jira or manual input using Socratic questioning before implementation planning"
version: "2.0.0"
license: MIT
compatibility: opencode
---

# Spec Analyzer

## Overview

Transform vague requirements or Jira tickets into well-defined, implementation-ready specifications through structured Socratic questioning.

This skill helps identify gaps, ambiguities, and edge cases BEFORE you start planning implementation. It uses existing project context (docs, code patterns, prior decisions) to ask smarter questions and avoid redundant clarification.

**When to use:**
- Jira ticket needs clarification ("JIRA-123")
- Vague feature request ("build a login system")
- Requirements seem incomplete or ambiguous
- Before T3+ tasks requiring detailed planning

## Prerequisites

### Optional: Jira Integration

If Jira MCP tools are available, you can analyze tickets directly. Just provide the ticket ID (e.g., "PROJ-123").

## The Process

### Phase 1: Context Gathering

**1a. Check existing project context:**
- Review CLAUDE.md, ADRs, and project docs for relevant past decisions
- Search codebase for existing patterns related to the feature
- Note established conventions and constraints

**1b. Get the spec:**
- **If Jira ticket ID provided:** Use `jira_getJiraIssue` to pull ticket details
- **If manual input:** Accept user's description

**1c. Review project context:**
- Check relevant files, docs, existing patterns
- Understand current architecture where feature will live

### Phase 2: Socratic Questioning

**Ask one question at a time** to refine understanding:

**Focus areas:**
1. **Purpose & Success Criteria**
   - What problem does this solve?
   - How do we know it's working?
   - What's the expected user flow?

2. **Constraints & Requirements**
   - Performance requirements?
   - Security considerations?
   - Browser/device support?
   - Accessibility requirements?

3. **Edge Cases & Error Handling**
   - What happens when things go wrong?
   - Boundary conditions?
   - Rate limiting needed?
   - Timeout handling?

4. **Integration Points**
   - What existing code does this touch?
   - Dependencies on other features?
   - API contracts?
   - Database changes?

5. **Testing Strategy**
   - How will this be tested?
   - What are the test cases?
   - Manual testing steps?

**Questioning style:**
- **Prefer multiple choice** when applicable
- **One question per message** — don't overwhelm
- **Skip resolved questions** if project docs or codebase already establish the answer
- **Reference existing patterns** (e.g., "The codebase uses react-hook-form for all forms. Same here?")

**Example context-aware question:**
```
Bad:  "What authentication method should we use?"
Good: "The codebase uses OAuth 2.1 for all auth flows (see src/auth/). Should this follow the same pattern, or does it need custom handling?"
```

### Phase 3: Explore Approaches

**Once you understand the requirements**, propose 2-3 approaches:

```markdown
## Approach Options

### Option 1: [Name] (Recommended)
- **Description:** [Brief explanation]
- **Pros:** [Why this is best]
- **Cons:** [Trade-offs]
- **Effort:** [Relative complexity]

### Option 2: [Alternative]
- **Description:** [Brief explanation]
- **Pros:** [Advantages]
- **Cons:** [Why not recommended]
- **Effort:** [Relative complexity]

### Recommendation
I recommend Option 1 because [reasoning based on requirements and constraints].
```

### Phase 4: Present Enhanced Spec

**Present the enhanced spec in sections** (200-300 words each):
- Validate each section before moving to next
- Ask: "Does this section look right so far?"

**Sections to cover:**
1. **Feature Summary**
   - Purpose and success criteria
   - User personas/use cases
   
2. **Functional Requirements**
   - Core functionality
   - User flows
   - Business logic
   
3. **Technical Requirements**
   - Architecture approach
   - Integration points
   - Data model changes
   
4. **Edge Cases & Error Handling**
   - Boundary conditions
   - Error scenarios
   - Fallback behavior
   
5. **Testing Strategy**
   - Test cases
   - Acceptance criteria
   - Manual testing steps

## Output Format

### Store Enhanced Spec in notes.md

```markdown
## Enhanced Spec: [Feature Name]

**Source:** [JIRA-123 OR Manual input]
**Date:** YYYY-MM-DD

### Summary
[1-2 sentences]

### Purpose & Success Criteria
[What problem this solves and how we measure success]

### Functional Requirements
[Core functionality, user flows]

### Technical Requirements
[Architecture, integrations, data changes]

### Edge Cases & Error Handling
[Boundary conditions, error scenarios]

### Testing Strategy
[Test cases, acceptance criteria]

### Open Questions
[Any unresolved items]

---

**Next Steps:**
1. Review this spec
2. If approved: Create task_plan.md with phases
3. Proceed with implementation
```

## Integration with Workflow

### When to Use

| Scenario | Use spec-analyzer? |
|----------|-------------------|
| Vague requirement ("add login") | ✅ YES |
| Jira ticket with unclear acceptance criteria | ✅ YES |
| T3+ task before planning | ✅ RECOMMENDED |
| Well-defined task with clear spec | ❌ Skip, go to task_plan.md |
| Follow-up on existing work | ❌ Skip |

### Workflow Integration

```
User request → spec-analyzer detects ambiguity
     ↓
Gather project context (docs, codebase patterns)
     ↓
Socratic questioning (context-aware)
     ↓
Enhanced spec → notes.md
     ↓
Continue with planning → task_plan.md
```

## Key Principles

1. **Context-first:** Check project docs and codebase before asking questions
2. **One question at a time:** Don't overwhelm with multiple questions
3. **Multiple choice preferred:** Easier to answer when possible
4. **Skip resolved questions:** If docs or code show "we always use X", don't ask
5. **Reference existing patterns:** Point to concrete code when proposing conventions
6. **YAGNI ruthlessly:** Remove unnecessary features from all designs
7. **Explore alternatives:** Always propose 2-3 approaches before settling
8. **Incremental validation:** Present spec in sections, validate each
9. **Be flexible:** Go back and clarify when something doesn't make sense

## Examples

### Example 1: Jira Ticket Analysis

**User:** "Analyze JIRA-456"

**Agent Actions:**
1. Pull ticket via Jira MCP tools
2. Search codebase for related patterns (e.g., grep for auth, existing middleware)
3. Review project docs (CLAUDE.md, READMEs) for established conventions
4. Start questioning:
   - ✅ "The ticket mentions login. The codebase uses OAuth 2.1 (see `src/auth/provider.ts`). Should this follow the same flow?"
   - ❌ "What authentication method?" (codebase already shows the answer)

### Example 2: Manual Input with Existing Patterns

**User:** "Build a payment checkout flow"

**Project context found:**
- `src/payments/stripe.ts` exists — Stripe is already integrated
- `src/forms/` uses react-hook-form + zod throughout

**Agent Questions:**
1. ✅ "Stripe is already integrated in the codebase. Should checkout use the existing Stripe setup, or does it need a different provider?"
2. ✅ "All forms use react-hook-form + zod. Same for the checkout form?"
3. ❌ "What payment provider?" (codebase already shows Stripe)

### Example 3: Greenfield Feature

**User:** "Create a new reporting dashboard"

**No existing patterns found for reporting**

**Agent Questions (start from scratch):**
1. "What type of reports will this show? (a) Financial metrics, (b) User analytics, (c) System performance, (d) Custom"
2. "Who are the primary users? (a) Executives, (b) Analysts, (c) Developers, (d) All"
3. ... (continue standard questioning)

## After Spec Analysis

1. **Store enhanced spec** in notes.md
2. **Ask:** "Does this spec capture everything? Any changes needed?"
3. **When approved:**
   - "Ready to create task_plan.md with implementation phases?"
   - Continue with normal planning workflow

## Common Pitfalls to Avoid

❌ **Asking questions the codebase already answers:**
```
Bad:  "What form validation library should we use?"
Good: "The codebase uses react-hook-form + zod everywhere. Apply this pattern here?"
```

❌ **Overwhelming with multiple questions:**
```
Bad:  "What authentication method, what database, what UI library, and what testing framework?"
Good: "Let's start with authentication. The codebase uses OAuth 2.1. Confirm this applies here?"
```

❌ **Skipping context gathering:**
```
Bad:  [Jump straight to questions without exploring codebase]
Good: [Search docs and code for existing patterns, then ask informed questions]
```

❌ **Creating spec without exploration:**
```
Bad:  [Immediately write spec based on vague input]
Good: [Ask clarifying questions first, explore approaches, then present spec]
```

## Notes

- **Not a planning tool:** This skill refines REQUIREMENTS, not implementation plans
- **Use before task_plan.md:** Enhanced spec feeds into your normal planning workflow
- **Works standalone or with Jira:** Flexible input sources
- **Context-aware:** Uses project docs and codebase patterns for smarter questions
