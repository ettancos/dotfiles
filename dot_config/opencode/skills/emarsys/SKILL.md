---
name: emarsys
description: Use when tasks involve SAP Emarsys platform work (Core API, contact/segment/event workflows, WSSE/OAuth auth, triggered campaigns) or Emarsys-specific Atlassian knowledge retrieval via atlassian-sync.
version: "2.0.0"
---

# Emarsys Skill

Use this skill for Emarsys-specific engineering work: API integrations, campaign/contact automation flows, and internal Emarsys platform knowledge lookup.

## When to Use

Activate this skill when the user mentions any of:

- **Emarsys APIs**: `api.emarsys.net`, Core API v2, v3 endpoints
- **Auth terms**: `X-WSSE`, WSSE header, OAuth
- **Domain terms**: contacts, fields, segments, contact lists, external events, automation programs, triggered email, ESL
- **Internal knowledge tasks**: CLOUDP/GAP Jira projects, SUITEDEV/PCA Confluence spaces, `atlassian-sync` queries for Emarsys infra/platform docs

Typical requests:

- "How do we trigger an Emarsys external event?"
- "Why does this X-WSSE call fail?"
- "Find the Emarsys GAP docs for multi-region deployment"
- "Map contacts with external_id/key_id correctly"

## When NOT to Use

Do not activate for generic SAP questions unrelated to Emarsys or for purely visual/UI work without Emarsys API, data model, or platform context.

## Workflow

### 1) Classify the request

- **API/integration implementation** (headers, payloads, endpoints, retries, id mapping)
- **Operational debugging** (auth failures, invalid field ids, event/campaign misfires)
- **Knowledge retrieval** (internal docs/issues/runbooks)

### 2) Gather authoritative sources first

For external/API questions:

- Prefer official Emarsys docs from `https://dev.emarsys.com/` and SAP Help before coding.
- If endpoint semantics are unclear, fetch exact docs first (don’t guess request/response shape).

For internal/platform questions:

- Use `atlassian-sync` cache for Jira/Confluence discovery.
- Prioritize known scope: Jira **CLOUDP**, **GAP** and Confluence **SUITEDEV**, **PCA**.

### 3) Execute with Emarsys-specific guardrails

- Treat authentication mode explicitly (WSSE vs OAuth); don’t mix assumptions.
- Preserve identifier semantics (`external_id`, `key_id`, field IDs) and call out mapping decisions.
- For data-mutating operations, define idempotency and rollback/compensation strategy.
- For event/campaign flows, verify trigger prerequisites and failure observability.

### 4) Verify before claiming success

- Validate request payload and headers against docs.
- Validate response handling (status codes, throttling/retry behavior).
- For internal lookup tasks, provide concrete artifact references (issue keys/page IDs/paths).

## atlassian-sync Quick Patterns (Internal)

```bash
# Search Emarsys platform docs/issues
atlassian-sync search -j -s CLOUDP,GAP "multi-region"
atlassian-sync search -c -s SUITEDEV,PCA "external event"

# Show specific record
atlassian-sync show CLOUDP-2780
atlassian-sync show 5792235894
```

## Output Expectations

When this skill is used, responses should include:

1. **Assumed auth model** (WSSE/OAuth)
2. **Concrete entities** (endpoint/event/contact fields involved)
3. **Validation evidence** (docs or internal artifact references)
4. **Risk notes** (rate limits, id mapping pitfalls, mutating operation safeguards)
