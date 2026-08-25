/**
 * agent-cost.ts — pi extension that:
 *   1) redirects hai-bound provider traffic through agent-cost's wrapper
 *      proxy (so requests get tagged and cost is tracked)
 *   2) shows live cost from agent-cost's daemon in pi's persistent
 *      footer status area
 *
 * Install to ~/.pi/agent/extensions/agent-cost.ts. Pi auto-loads files
 * in that directory at startup.
 *
 * # How the redirect works
 *
 * Pi does NOT resolve `baseUrl` through its env-var interpolation system
 * (only `apiKey` and headers use it) — so we can't just point models.json
 * at ${AGENT_COST_PROXY_URL}. Instead, this extension calls
 * `pi.registerProvider(name, { baseUrl })` at startup, which pi's
 * ModelRegistry treats as an override for the provider's existing
 * baseUrl (see model-registry.ts:611: "If provider has only
 * baseUrl/headers: overrides existing models' URLs").
 *
 * When launched via `agent-cost run pi` the wrapper sets:
 *   AGENT_COST_PROXY_URL      — the wrapper's local proxy URL
 *   AGENT_COST_HAI_API_KEY    — hai's API key (same one your models.json uses)
 *   AGENT_COST_SESSION_ID     — this invocation's session UUID (for status)
 *   AGENT_COST_DAEMON_URL     — agent-cost daemon endpoint (for status)
 *
 * Launched without the wrapper (env vars unset) the extension is a
 * silent no-op — safe to leave installed permanently.
 *
 * # Which providers get redirected?
 *
 * By default this extension overrides the `hai-proxy` provider (the
 * name used in the repository docs and README examples). Users with a
 * differently-named hai provider can override the list via
 * AGENT_COST_PI_PROVIDERS (comma-separated names).
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent"

interface SessionStatus {
	requests: number
	cu: number
	eur: number
	tailer_stale?: boolean
}

const STATUS_ID = "agent-cost"

// Providers to override. Users who name their hai provider something
// else can override this via env var.
const DEFAULT_PROVIDERS = ["hai-proxy"]

export default function (pi: ExtensionAPI) {
	const proxyUrl = process.env.AGENT_COST_PROXY_URL
	const sessionId = process.env.AGENT_COST_SESSION_ID
	const daemonUrl = process.env.AGENT_COST_DAEMON_URL

	if (!proxyUrl || !sessionId || !daemonUrl) {
		// Not launched under `agent-cost run pi`. Silent no-op.
		return
	}

	// --- 1. redirect provider(s) through the wrapper --------------------
	// Comma-separated env var override; falls back to the standard name.
	const providerNames = (process.env.AGENT_COST_PI_PROVIDERS ?? DEFAULT_PROVIDERS.join(","))
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)

	for (const name of providerNames) {
		// Override-only config (no `models` array): pi merges this on
		// top of the existing models.json entry, replacing baseUrl for
		// every model in the provider. See model-registry.ts:611.
		pi.registerProvider(name, {
			baseUrl: proxyUrl,
		})
	}

	// --- 2. persistent footer with live cost ---------------------------

	const fetchSession = async (): Promise<SessionStatus | null> => {
		try {
			const res = await fetch(`${daemonUrl}/v1/sessions/${sessionId}`, {
				signal: AbortSignal.timeout(500),
			})
			if (!res.ok) return null
			return (await res.json()) as SessionStatus
		} catch {
			return null
		}
	}

	// Link pi's OWN native session id to our agent-cost session so cost logs
	// can be cross-referenced with pi's session files. Fired once; the daemon
	// endpoint is set-once, but we latch to avoid repeat posts on later events.
	let harnessPosted = false
	const postHarness = async (harnessSessionId: string) => {
		if (harnessPosted || !harnessSessionId) return
		harnessPosted = true
		try {
			await fetch(`${daemonUrl}/v1/sessions/${sessionId}/harness`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ harness_session_id: harnessSessionId }),
				signal: AbortSignal.timeout(500),
			})
		} catch {
			// Best effort; retry on the next qualifying event.
			harnessPosted = false
		}
	}

	const formatLine = (s: SessionStatus): string => {
		let line = `▸ ${s.requests} req`
		if (s.cu > 0) {
			line += ` · ${s.cu.toFixed(2)} CU · ${s.eur.toFixed(2)} €`
		}
		if (s.tailer_stale) line += " (partial)"
		return line
	}

	let lastLine = ""
	// Highest request count we've rendered. The daemon books a request
	// asynchronously relative to pi's events: for streaming responses (most
	// turns) the count is bumped by the daemon's log tailer only after hai
	// flushes its log line and the tailer polls it, which lands *after*
	// pi fires after_provider_response / turn_end. A single fetch at event
	// time therefore reads the pre-request count and the footer trails by
	// one. When we know a response just completed, poll briefly until the
	// count catches up. We only ever display the daemon's own number, so
	// this can never over-count.
	let lastRequests = -1

	// Fetch once, or — when a provider response just happened — retry a few
	// times until the daemon's request count exceeds what we last rendered.
	const fetchSettled = async (expectIncrease: boolean): Promise<SessionStatus | null> => {
		// ~1.4s worst case (7 × 200ms); the tailer polls hai's log every
		// 100ms, so in practice it settles in one or two tries.
		const attempts = expectIncrease ? 7 : 1
		let latest: SessionStatus | null = null
		for (let i = 0; i < attempts; i++) {
			const s = await fetchSession()
			if (s) {
				latest = s
				if (!expectIncrease || s.requests > lastRequests) break
			}
			if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200))
		}
		return latest
	}

	const update = async (ctx: ExtensionContext, expectIncrease = false) => {
		if (!ctx.hasUI) return
		const s = await fetchSettled(expectIncrease)
		if (!s) return
		if (s.requests > lastRequests) lastRequests = s.requests
		const line = formatLine(s)
		if (line === lastLine) return
		lastLine = line
		ctx.ui.setStatus(STATUS_ID, line)
	}

	pi.on("session_start", async (_event, ctx) => {
		await postHarness(ctx.sessionManager.getSessionId())
		await update(ctx)
	})
	pi.on("turn_end", async (_event, ctx) => {
		await postHarness(ctx.sessionManager.getSessionId())
		await update(ctx, true)
	})
	pi.on("after_provider_response", async (_event, ctx) => {
		await update(ctx, true)
	})
}
