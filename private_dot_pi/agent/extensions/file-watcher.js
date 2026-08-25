import { Type } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";
import { watch } from "node:fs";
import { resolve } from "node:path";
function simpleGlobMatch(pattern, filePath) {
  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1);
    return filePath.endsWith(ext);
  }
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1);
    return filePath.startsWith(prefix);
  }
  return filePath === pattern;
}
function file_watcher_default(pi) {
  const watchers = /* @__PURE__ */ new Map();
  let nextId = 1;
  const debounceTimers = /* @__PURE__ */ new Map();
  const pendingChanges = /* @__PURE__ */ new Map();
  function flushChanges(id) {
    const pending = pendingChanges.get(id);
    if (!pending || pending.length === 0) return;
    const entry = watchers.get(id);
    if (!entry) return;
    const uniquePaths = [...new Set(pending.map((e) => e.path))];
    const summary = uniquePaths.length <= 10 ? uniquePaths.join(", ") : `${uniquePaths.slice(0, 10).join(", ")} and ${uniquePaths.length - 10} more`;
    pi.sendMessage(
      {
        customType: "file-watcher",
        content: `Files changed (watcher #${id}, ${entry.path}): ${summary}`,
        display: true
      },
      { deliverAs: "nextTurn" }
    );
    pendingChanges.set(id, []);
  }
  function scheduleFlush(id, event) {
    let pending = pendingChanges.get(id);
    if (!pending) {
      pending = [];
      pendingChanges.set(id, pending);
    }
    pending.push(event);
    const existing = debounceTimers.get(id);
    if (existing) clearTimeout(existing);
    debounceTimers.set(
      id,
      setTimeout(() => {
        debounceTimers.delete(id);
        flushChanges(id);
      }, 2e3)
    );
  }
  function cleanupWatcher(id) {
    const entry = watchers.get(id);
    if (entry) {
      entry.watcher.close();
      watchers.delete(id);
    }
    const timer = debounceTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.delete(id);
    }
    pendingChanges.delete(id);
  }
  function cleanupAll() {
    for (const id of [...watchers.keys()]) {
      cleanupWatcher(id);
    }
  }
  pi.on("session_shutdown", async () => {
    cleanupAll();
  });
  pi.registerTool({
    name: "watch_start",
    label: "Watch Start",
    description: "Start watching a file or directory for changes. Returns a watcher ID. Changes are accumulated and reported. Use watch_events to retrieve them.",
    parameters: Type.Object({
      path: Type.String({ description: "File or directory path to watch" }),
      recursive: Type.Optional(Type.Boolean({ description: "Watch recursively (default: true)" })),
      pattern: Type.Optional(
        Type.String({ description: "Glob-like filter pattern, e.g. '*.ts' or 'src/*'" })
      )
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const watchPath = resolve(ctx.cwd, params.path.replace(/^@/, ""));
      const recursive = params.recursive !== false;
      const pattern = params.pattern;
      const id = nextId++;
      try {
        const fsWatcher = watch(watchPath, { recursive }, (eventType, filename) => {
          const filePath = filename ?? "";
          if (pattern && !simpleGlobMatch(pattern, filePath)) {
            return;
          }
          const event = {
            type: eventType,
            path: filePath,
            timestamp: Date.now()
          };
          const entry2 = watchers.get(id);
          if (entry2) {
            entry2.events.push(event);
            if (entry2.events.length > 200) {
              entry2.events = entry2.events.slice(-200);
            }
          }
          scheduleFlush(id, event);
        });
        const entry = {
          watcher: fsWatcher,
          path: watchPath,
          pattern,
          events: []
        };
        watchers.set(id, entry);
        return {
          content: [
            {
              type: "text",
              text: `Started watcher #${id} on ${watchPath}${recursive ? " (recursive)" : ""}${pattern ? ` with filter: ${pattern}` : ""}`
            }
          ],
          details: { id, path: watchPath, recursive, pattern }
        };
      } catch (err) {
        throw new Error(`Failed to start watcher: ${err.message}`);
      }
    },
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("watch_start "));
      text += theme.fg("muted", args.path);
      if (args.pattern) text += " " + theme.fg("dim", `[${args.pattern}]`);
      return new Text(text, 0, 0);
    },
    renderResult(result, _options, theme) {
      if (result.isError) {
        const msg = result.content[0];
        return new Text(theme.fg("error", msg?.type === "text" ? msg.text : "Error"), 0, 0);
      }
      const details = result.details;
      if (!details) {
        const msg = result.content[0];
        return new Text(msg?.type === "text" ? msg.text : "", 0, 0);
      }
      let text = theme.fg("success", "\u2713 ") + theme.fg("accent", `#${details.id}`) + " watching ";
      text += theme.fg("muted", details.path);
      if (details.pattern) text += " " + theme.fg("dim", `[${details.pattern}]`);
      return new Text(text, 0, 0);
    }
  });
  pi.registerTool({
    name: "watch_stop",
    label: "Watch Stop",
    description: "Stop a file watcher by its ID.",
    parameters: Type.Object({
      id: Type.Number({ description: "Watcher ID to stop" })
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const entry = watchers.get(params.id);
      if (!entry) {
        throw new Error(`Watcher #${params.id} not found`);
      }
      const path = entry.path;
      cleanupWatcher(params.id);
      return {
        content: [{ type: "text", text: `Stopped watcher #${params.id} (${path})` }],
        details: { id: params.id, path }
      };
    },
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("watch_stop "));
      text += theme.fg("accent", `#${args.id}`);
      return new Text(text, 0, 0);
    },
    renderResult(result, _options, theme) {
      if (result.isError) {
        const msg = result.content[0];
        return new Text(theme.fg("error", msg?.type === "text" ? msg.text : "Error"), 0, 0);
      }
      const details = result.details;
      if (!details) {
        const msg = result.content[0];
        return new Text(msg?.type === "text" ? msg.text : "", 0, 0);
      }
      return new Text(
        theme.fg("success", "\u2713 ") + theme.fg("muted", "Stopped ") + theme.fg("accent", `#${details.id}`) + " " + theme.fg("dim", details.path),
        0,
        0
      );
    }
  });
  pi.registerTool({
    name: "watch_list",
    label: "Watch List",
    description: "List active file watchers and their recent events (last 50).",
    parameters: Type.Object({
      id: Type.Optional(Type.Number({ description: "Filter to a specific watcher ID" }))
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const entries = params.id !== void 0 ? watchers.has(params.id) ? [[params.id, watchers.get(params.id)]] : [] : [...watchers.entries()];
      if (entries.length === 0) {
        return {
          content: [{ type: "text", text: params.id !== void 0 ? `Watcher #${params.id} not found` : "No active watchers" }],
          details: { watchers: [] }
        };
      }
      const lines = [];
      const watcherSummaries = [];
      for (const [id, entry] of entries) {
        const recentEvents = entry.events.slice(-50);
        lines.push(`#${id}: ${entry.path}${entry.pattern ? ` [${entry.pattern}]` : ""} (${entry.events.length} events)`);
        if (recentEvents.length > 0) {
          for (const evt of recentEvents.slice(-10)) {
            lines.push(`  ${evt.type}: ${evt.path} (${new Date(evt.timestamp).toISOString()})`);
          }
          if (recentEvents.length > 10) {
            lines.push(`  ... and ${recentEvents.length - 10} more recent events`);
          }
        }
        watcherSummaries.push({
          id,
          path: entry.path,
          pattern: entry.pattern,
          eventCount: entry.events.length,
          recentEvents: recentEvents.slice(-50)
        });
      }
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { watchers: watcherSummaries }
      };
    },
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("watch_list"));
      if (args.id !== void 0) text += " " + theme.fg("accent", `#${args.id}`);
      return new Text(text, 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const details = result.details;
      if (!details || details.watchers.length === 0) {
        const msg = result.content[0];
        return new Text(theme.fg("dim", msg?.type === "text" ? msg.text : "No watchers"), 0, 0);
      }
      let text = theme.fg("muted", `${details.watchers.length} active watcher(s)`);
      for (const w of details.watchers) {
        text += "\n" + theme.fg("accent", `#${w.id}`) + " " + theme.fg("muted", w.path);
        if (w.pattern) text += " " + theme.fg("dim", `[${w.pattern}]`);
        text += " " + theme.fg("dim", `(${w.eventCount} events)`);
        if (expanded && w.recentEvents.length > 0) {
          for (const evt of w.recentEvents.slice(-10)) {
            text += "\n  " + theme.fg("dim", `${evt.type}: ${evt.path}`);
          }
        }
      }
      return new Text(text, 0, 0);
    }
  });
  pi.registerTool({
    name: "watch_events",
    label: "Watch Events",
    description: "Get accumulated file change events from a watcher. Optionally clear events after reading.",
    parameters: Type.Object({
      id: Type.Number({ description: "Watcher ID" }),
      clear: Type.Optional(Type.Boolean({ description: "Clear events after reading (default: false)" }))
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const entry = watchers.get(params.id);
      if (!entry) {
        throw new Error(`Watcher #${params.id} not found`);
      }
      const events = [...entry.events];
      if (params.clear) {
        entry.events = [];
      }
      if (events.length === 0) {
        return {
          content: [{ type: "text", text: `No events for watcher #${params.id}` }],
          details: { id: params.id, events: [], cleared: !!params.clear }
        };
      }
      const lines = events.map(
        (e) => `${e.type}: ${e.path} (${new Date(e.timestamp).toISOString()})`
      );
      return {
        content: [
          {
            type: "text",
            text: `${events.length} event(s) for watcher #${params.id}${params.clear ? " (cleared)" : ""}:
${lines.join("\n")}`
          }
        ],
        details: { id: params.id, events, cleared: !!params.clear }
      };
    },
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("watch_events "));
      text += theme.fg("accent", `#${args.id}`);
      if (args.clear) text += " " + theme.fg("warning", "(clear)");
      return new Text(text, 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      if (result.isError) {
        const msg = result.content[0];
        return new Text(theme.fg("error", msg?.type === "text" ? msg.text : "Error"), 0, 0);
      }
      const details = result.details;
      if (!details) {
        const msg = result.content[0];
        return new Text(msg?.type === "text" ? msg.text : "", 0, 0);
      }
      if (details.events.length === 0) {
        return new Text(theme.fg("dim", `No events for #${details.id}`), 0, 0);
      }
      let text = theme.fg("muted", `${details.events.length} event(s)`) + (details.cleared ? " " + theme.fg("warning", "(cleared)") : "");
      if (expanded) {
        const display = details.events.slice(-50);
        for (const evt of display) {
          text += "\n  " + theme.fg("dim", `${evt.type}: ${evt.path}`);
        }
        if (details.events.length > 50) {
          text += "\n  " + theme.fg("dim", `... ${details.events.length - 50} older events omitted`);
        }
      }
      return new Text(text, 0, 0);
    }
  });
}
export {
  file_watcher_default as default
};
