/**
 * perplexity.ts — pi extension that registers a `perplexity_search` tool.
 *
 * Calls the Perplexity sonar models through the Hyperspace LLM Proxy
 * (hai-perplexity provider, LiteLLM endpoint).  The API key is read
 * from the system keyring — same credential used by models.json.
 *
 * Tool: perplexity_search(query, model?)
 *   model — "sonar" (default) or "sonar-pro"
 *
 * Installed to ~/.pi/agent/extensions/perplexity.ts; auto-loaded by pi.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import { execFileSync } from "node:child_process"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the HAI proxy API key using the same shell command as models.json. */
function resolveApiKey(): string {
  try {
    return execFileSync(
      "secret-tool",
      ["lookup", "service", "nono", "username", "llm_proxy_key"],
      { encoding: "utf8" },
    ).trim()
  } catch {
    throw new Error(
      "perplexity_search: could not read API key from keyring " +
        "(secret-tool lookup service nono username llm_proxy_key failed)",
    )
  }
}

interface PerplexityCitation {
  ref_id: number
  title: string
  url: string
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string
      extensions?: { citations?: PerplexityCitation[] }
    }
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

/** Format citations as a compact numbered list appended after the answer. */
function formatCitations(citations: PerplexityCitation[]): string {
  if (!citations.length) return ""
  const lines = citations.map((c) => `[${c.ref_id}] ${c.title} — ${c.url}`)
  return "\n\n**Sources**\n" + lines.join("\n")
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "perplexity_search",
    label: "Perplexity Search",
    description:
      "Search the web using Perplexity's sonar models via the Hyperspace LLM Proxy. " +
      "Returns a single AI-synthesised answer with inline citations — not a list of links. " +
      "Use when you want an answer, not sources: current events, version numbers, factual lookups, " +
      "or complex questions that would otherwise require manually synthesising multiple search results. " +
      "Do NOT use when: you need to read a specific URL (use webfetch), " +
      "you need to discover which sources cover a topic (use websearch), " +
      "or the query involves confidential/internal SAP data (routes to external Perplexity servers).",
    parameters: Type.Object({
      query: Type.String({ description: "The search query or question to answer." }),
      model: Type.Optional(
        Type.Union(
          [Type.Literal("sonar"), Type.Literal("sonar-pro")],
          {
            description:
              "Model to use. " +
              '"sonar" (default) is fast and suited for most searches. ' +
              '"sonar-pro" provides deeper reasoning and is better for complex or multi-step questions.',
          },
        ),
      ),
    }),

    async execute(toolCallId, params, signal) {
      const model = params.model ?? "sonar"
      const apiKey = resolveApiKey()

      const body = JSON.stringify({
        model,
        messages: [{ role: "user", content: params.query }],
        stream: false,
      })

      const response = await fetch("http://localhost:6655/litellm/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body,
        signal,
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => "(no body)")
        throw new Error(`Perplexity API error ${response.status}: ${errText}`)
      }

      const data = (await response.json()) as PerplexityResponse
      const choice = data.choices?.[0]
      if (!choice) throw new Error("Perplexity returned no choices")

      const answer = choice.message.content
      const citations: PerplexityCitation[] =
        choice.message.extensions?.citations ?? []

      const text = answer + formatCitations(citations)

      return {
        content: [{ type: "text" as const, text }],
        details: {
          model,
          citationCount: citations.length,
          usage: data.usage,
        },
      }
    },
  })
}
