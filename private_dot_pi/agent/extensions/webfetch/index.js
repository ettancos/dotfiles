import { truncateHead, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT = 3e4;
const MAX_TIMEOUT = 12e4;
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
const EXA_MCP_URL = "https://mcp.exa.ai/mcp";
const DEFAULT_NUM_RESULTS = 8;
function decodeHtmlEntities(text) {
  return text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : void 0;
}
function convertHtmlToMarkdown(html) {
  const withoutNonContent = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  const withBreaks = withoutNonContent.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\s*\/\s*(p|div|section|article|h[1-6]|li|ul|ol|table|tr|blockquote)\s*>/gi, "\n").replace(/<\s*li[^>]*>/gi, "- ");
  const textOnly = withBreaks.replace(/<[^>]+>/g, "");
  return decodeHtmlEntities(textOnly).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").replace(/\s+\n/g, "\n").trim();
}
function extractReadableContent(html, _url) {
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const content = articleMatch?.[1] ?? html;
  const title = extractTitle(html);
  return { title, content };
}
function extractTextFromHtml(html) {
  return convertHtmlToMarkdown(html);
}
function truncateOutput(text) {
  const result = truncateHead(text, {
    maxBytes: DEFAULT_MAX_BYTES,
    maxLines: DEFAULT_MAX_LINES,
  });
  if (!result.truncated) return result.content;
  return `${result.content}\n\n[Output truncated: showing ${formatSize(result.outputBytes)} of ${formatSize(result.totalBytes)}]`;
}
function index_default(pi) {
  pi.registerTool({
    name: "webfetch",
    label: "Web Fetch",
    description: [
      "Fetch content from a URL and return it as markdown, text, or HTML.",
      "- URL must start with http:// or https://",
      "- Format options: 'markdown' (default), 'text', or 'html'",
      "- Converts HTML to clean readable markdown by default",
      "- Use for reading documentation, articles, web pages",
      "- Results may be truncated if the content is very large",
      "- Optional timeout in seconds (default 30, max 120)"
    ].join("\n"),
    parameters: Type.Object({
      url: Type.String({ description: "The URL to fetch content from" }),
      format: Type.Optional(
        StringEnum(["markdown", "text", "html"], {
          description: "Output format: 'markdown' (default), 'text', or 'html'"
        })
      ),
      timeout: Type.Optional(
        Type.Number({ description: "Timeout in seconds (default 30, max 120)" })
      )
    }),
    async execute(_toolCallId, params, signal) {
      const url = params.url;
      const format = params.format || "markdown";
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("URL must start with http:// or https://");
      }
      const timeout = Math.min((params.timeout ?? 30) * 1e3, MAX_TIMEOUT);
      try {
        let acceptHeader;
        switch (format) {
          case "markdown":
            acceptHeader = "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1";
            break;
          case "text":
            acceptHeader = "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1";
            break;
          case "html":
            acceptHeader = "text/html;q=1.0, application/xhtml+xml;q=0.9, */*;q=0.1";
            break;
          default:
            acceptHeader = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
        }
        const headers = {
          "User-Agent": USER_AGENT,
          Accept: acceptHeader,
          "Accept-Language": "en-US,en;q=0.9"
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        if (signal) {
          signal.addEventListener("abort", () => controller.abort(), { once: true });
        }
        let response;
        try {
          const initial = await fetch(url, { signal: controller.signal, headers });
          if (initial.status === 403 && initial.headers.get("cf-mitigated") === "challenge") {
            response = await fetch(url, {
              signal: controller.signal,
              headers: { ...headers, "User-Agent": "pi-coding-agent" }
            });
          } else {
            response = initial;
          }
        } finally {
          clearTimeout(timeoutId);
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
          throw new Error("Response too large (exceeds 5MB limit)");
        }
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
          throw new Error("Response too large (exceeds 5MB limit)");
        }
        const contentType = response.headers.get("content-type") || "";
        const isHtml = contentType.includes("text/html");
        const raw = new TextDecoder().decode(arrayBuffer);
        let output;
        switch (format) {
          case "markdown":
            if (isHtml) {
              const article = extractReadableContent(raw, url);
              if (article) {
                const md = convertHtmlToMarkdown(article.content);
                output = article.title ? `# ${article.title}

${md}` : md;
              } else {
                output = convertHtmlToMarkdown(raw);
              }
            } else {
              output = raw;
            }
            break;
          case "text":
            if (isHtml) {
              output = extractTextFromHtml(raw);
            } else {
              output = raw;
            }
            break;
          case "html":
            output = raw;
            break;
          default:
            output = raw;
        }
        output = truncateOutput(output);
        return {
          content: [{ type: "text", text: output }],
          details: { url, format, contentType, size: arrayBuffer.byteLength }
        };
      } catch (err) {
        const msg = err.name === "AbortError" ? "Request timed out" : err.message;
        throw new Error(msg);
      }
    },
    renderCall(args, theme) {
      const url = args.url || "";
      const format = args.format && args.format !== "markdown" ? ` (${args.format})` : "";
      const display = url.length > 80 ? url.slice(0, 77) + "..." : url;
      return new Text(
        theme.fg("toolTitle", theme.bold("webfetch ")) + theme.fg("muted", display) + theme.fg("dim", format),
        0,
        0
      );
    },
    renderResult(result, _opts, theme) {
      if (result.isError) {
        const text = result.content?.[0];
        return new Text(theme.fg("error", text?.type === "text" ? text.text : "Error"), 0, 0);
      }
      const details = result.details || {};
      const size = details.size ? formatSize(details.size) : "";
      const ct = details.contentType ? details.contentType.split(";")[0] : "";
      const info = [ct, size].filter(Boolean).join(", ");
      return new Text(
        theme.fg("success", "\u2713 ") + theme.fg("muted", info),
        0,
        0
      );
    }
  });
  pi.registerTool({
    name: "websearch",
    label: "Web Search",
    description: [
      "Search the web for information using Exa AI. No API key required.",
      "- Performs real-time web searches with up-to-date results",
      "- Returns content from the most relevant websites",
      "- Supports configurable result counts (default: 8)",
      "- Search types: 'auto' (balanced, default), 'fast' (quick), 'deep' (comprehensive)",
      "- Live crawl modes: 'fallback' (default) or 'preferred'",
      "- Use websearch for discovery, webfetch for retrieving a specific URL",
      "- Use perplexity_search when you want a synthesised answer rather than a list of sources",
      `- The current year is ${(/* @__PURE__ */ new Date()).getFullYear()}. Use the current year when searching for recent information.`
    ].join("\n"),
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      numResults: Type.Optional(
        Type.Number({ description: "Number of results to return (default: 8)" })
      ),
      type: Type.Optional(
        StringEnum(["auto", "fast", "deep"], {
          description: "Search type: 'auto' (default), 'fast', or 'deep'"
        })
      ),
      livecrawl: Type.Optional(
        StringEnum(["fallback", "preferred"], {
          description: "Live crawl mode: 'fallback' (default) or 'preferred'"
        })
      ),
      contextMaxCharacters: Type.Optional(
        Type.Number({ description: "Max characters for context (default: 10000)" })
      )
    }),
    async execute(_toolCallId, params, signal) {
      const searchRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "web_search_exa",
          arguments: {
            query: params.query,
            type: params.type || "auto",
            numResults: params.numResults || DEFAULT_NUM_RESULTS,
            livecrawl: params.livecrawl || "fallback",
            contextMaxCharacters: params.contextMaxCharacters
          }
        }
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25e3);
      if (signal) {
        signal.addEventListener("abort", () => controller.abort(), { once: true });
      }
      try {
        const response = await fetch(EXA_MCP_URL, {
          method: "POST",
          headers: {
            Accept: "application/json, text/event-stream",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(searchRequest),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Search error (HTTP ${response.status}): ${errorText}`);
        }
        const responseText = await response.text();
        const lines = responseText.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.result?.content?.length > 0) {
                const output = truncateOutput(data.result.content[0].text);
                return {
                  content: [{ type: "text", text: output }],
                  details: { query: params.query, numResults: params.numResults || DEFAULT_NUM_RESULTS }
                };
              }
            } catch {
            }
          }
        }
        try {
          const data = JSON.parse(responseText);
          if (data.result?.content?.length > 0) {
            const output = truncateOutput(data.result.content[0].text);
            return {
              content: [{ type: "text", text: output }],
              details: { query: params.query, numResults: params.numResults || DEFAULT_NUM_RESULTS }
            };
          }
        } catch {
        }
        return {
          content: [{ type: "text", text: "No search results found. Try a different query." }],
          details: { query: params.query }
        };
      } catch (err) {
        clearTimeout(timeoutId);
        const msg = err.name === "AbortError" ? "Search request timed out" : err.message;
        throw new Error(msg);
      }
    },
    renderCall(args, theme) {
      const query = args.query || "";
      const display = query.length > 80 ? query.slice(0, 77) + "..." : query;
      const extra = args.type && args.type !== "auto" ? ` (${args.type})` : "";
      return new Text(
        theme.fg("toolTitle", theme.bold("websearch ")) + theme.fg("muted", `"${display}"`) + theme.fg("dim", extra),
        0,
        0
      );
    },
    renderResult(result, _opts, theme) {
      if (result.isError) {
        const text = result.content?.[0];
        return new Text(theme.fg("error", text?.type === "text" ? text.text : "Error"), 0, 0);
      }
      const details = result.details || {};
      const content = result.content?.[0]?.text || "";
      const lines = content.split("\n").length;
      const size = formatSize(Buffer.byteLength(content, "utf-8"));
      return new Text(
        theme.fg("success", "\u2713 ") + theme.fg("muted", `${lines} lines, ${size}`) + (details.query ? theme.fg("dim", ` \u2014 "${details.query}"`) : ""),
        0,
        0
      );
    }
  });
}
export {
  index_default as default
};
