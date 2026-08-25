import { streamSimple, completeSimple } from "@mariozechner/pi-ai";
import { Text } from "@mariozechner/pi-tui";
const BTW_TYPE = "btw";
const emptyUsage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
};
function btw_default(pi) {
  let btwThreadStart = 0;
  const pendingBtwThread = [];
  const slots = [];
  let widgetStatus = null;
  const BTW_RESET_TYPE = "btw-reset";
  pi.on("session_start", async (_event, ctx) => {
    pendingBtwThread.length = 0;
    slots.length = 0;
    btwThreadStart = 0;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === BTW_RESET_TYPE) {
        btwThreadStart = entry.data?.timestamp ?? 0;
      }
    }
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "custom" || entry.customType !== BTW_TYPE) continue;
      const entryTime = Date.parse(entry.timestamp) || 0;
      if (entryTime <= btwThreadStart) continue;
      const data = entry.data;
      if (data?.question && data?.answer && !data.answer.startsWith("\u274C")) {
        pendingBtwThread.push(data);
        slots.push({
          question: data.question,
          model: data.model,
          thinking: data.thinking || "",
          answer: data.answer,
          done: true
        });
      }
    }
    if (slots.length > 0) {
      renderWidget(ctx);
    }
  });
  function renderWidget(ctx) {
    if (slots.length === 0) {
      ctx.ui.setWidget("btw", void 0);
      return;
    }
    ctx.ui.setWidget("btw", (_tui, theme) => {
      const dim = (s) => theme.fg("dim", s);
      const green = (s) => theme.fg("success", s);
      const italic = (s) => theme.fg("dim", theme.italic(s));
      const yellow = (s) => theme.fg("warning", s);
      const parts = [];
      const title = " \u{1F4AD} btw ";
      const hint = " /btw:clear to dismiss ";
      const pad = Math.max(0, 50 - title.length - hint.length);
      parts.push(dim(`\u256D${title}${"\u2500".repeat(pad)}${hint}\u256E`));
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (i > 0) parts.push(dim("\u2502 \u2500\u2500\u2500"));
        parts.push(dim("\u2502 ") + green("\u203A ") + s.question);
        if (s.thinking) {
          const cursor = !s.answer && !s.done ? yellow(" \u258D") : "";
          parts.push(dim("\u2502 ") + italic(s.thinking) + cursor);
        }
        if (s.answer) {
          const answerLines = s.answer.split("\n");
          parts.push(dim("\u2502 ") + answerLines[0]);
          if (answerLines.length > 1) {
            parts.push(answerLines.slice(1).join("\n"));
          }
          if (!s.done) parts[parts.length - 1] += yellow(" \u258D");
        } else if (!s.thinking && !s.done) {
          parts.push(dim("\u2502 ") + yellow("\u23F3 thinking..."));
        }
      }
      if (widgetStatus) {
        parts.push(dim("\u2502 ") + yellow(widgetStatus));
      }
      parts.push(dim(`\u2570${"\u2500".repeat(50)}\u256F`));
      return new Text(parts.join("\n"), 0, 0);
    }, { placement: "aboveEditor" });
  }
  function resetThread(ctx) {
    btwThreadStart = Date.now();
    pendingBtwThread.length = 0;
    slots.length = 0;
    widgetStatus = null;
    pi.appendEntry(BTW_RESET_TYPE, { timestamp: btwThreadStart });
    renderWidget(ctx);
  }
  function collectBtwThread() {
    return pendingBtwThread.filter((d) => !d.answer.startsWith("\u274C"));
  }
  function formatThread(thread) {
    return thread.map((d) => `User: ${d.question.trim()}
Assistant: ${d.answer.trim()}`).join("\n\n---\n\n");
  }
  function buildMainMessages(ctx, model) {
    const messages = [];
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "message") continue;
      const msg = entry.message;
      if (!msg) continue;
      if (msg.role === "user") {
        const content = typeof msg.content === "string" ? msg.content : (msg.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
        if (content) {
          messages.push({
            role: "user",
            content: [{ type: "text", text: content }],
            timestamp: msg.timestamp ?? Date.now()
          });
        }
      } else if (msg.role === "assistant") {
        const content = (msg.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
        if (content) {
          messages.push({
            role: "assistant",
            content: [{ type: "text", text: content }],
            model: msg.model ?? model.id,
            provider: msg.provider ?? model.provider,
            api: msg.api ?? "",
            usage: msg.usage ?? emptyUsage,
            stopReason: "stop",
            timestamp: msg.timestamp ?? Date.now()
          });
        }
      }
    }
    return messages;
  }
  function buildBtwMessages(ctx, model, question) {
    const mainMessages = buildMainMessages(ctx, model);
    const thread = collectBtwThread();
    const all = [...mainMessages];
    if (thread.length > 0) {
      all.push({
        role: "user",
        content: [{ type: "text", text: "[The following is a separate side conversation. Continue this thread.]" }],
        timestamp: Date.now()
      });
      all.push({
        role: "assistant",
        content: [{ type: "text", text: "Understood, continuing our side conversation." }],
        model: model.id,
        provider: model.provider,
        api: "",
        usage: emptyUsage,
        stopReason: "stop",
        timestamp: Date.now()
      });
      for (const d of thread) {
        all.push({
          role: "user",
          content: [{ type: "text", text: d.question }],
          timestamp: Date.now()
        });
        all.push({
          role: "assistant",
          content: [{ type: "text", text: d.answer }],
          model: model.id,
          provider: model.provider,
          api: "",
          usage: emptyUsage,
          stopReason: "stop",
          timestamp: Date.now()
        });
      }
    }
    all.push({
      role: "user",
      content: [{ type: "text", text: question }],
      timestamp: Date.now()
    });
    return all;
  }
  function fireBtw(ctx, question) {
    const model = ctx.model;
    if (!model) {
      ctx.ui.notify("No model selected", "error");
      return;
    }
    const thinkingLevel = pi.getThinkingLevel();
    const modelLabel = `${model.provider}/${model.id}`;
    const allMessages = buildBtwMessages(ctx, model, question);
    const slot = { question, model: modelLabel, thinking: "", answer: "", done: false };
    slots.push(slot);
    renderWidget(ctx);
    (async () => {
      try {
        const apiKey = await ctx.modelRegistry.getApiKey(model);
        if (!apiKey) {
          slot.answer = "\u274C No API key";
          slot.done = true;
          renderWidget(ctx);
          return;
        }
        const eventStream = streamSimple(
          model,
          {
            systemPrompt: "You are having an aside conversation with the user, separate from their main working session. The main session messages are provided for context only \u2014 that work is being handled by another agent. Focus on answering the user's side questions, helping them think through ideas, or planning next steps. Do not act as if you need to complete or continue the main session's work.",
            messages: allMessages
          },
          { apiKey, reasoning: thinkingLevel }
        );
        for await (const event of eventStream) {
          if (event.type === "thinking_delta") {
            slot.thinking += event.delta;
            renderWidget(ctx);
          } else if (event.type === "text_delta") {
            slot.answer += event.delta;
            renderWidget(ctx);
          } else if (event.type === "error") {
            slot.answer += `
\u274C ${event.error.message}`;
            slot.done = true;
            renderWidget(ctx);
            return;
          }
        }
        slot.done = true;
        renderWidget(ctx);
        const details = { question, thinking: slot.thinking, answer: slot.answer, model: modelLabel };
        pendingBtwThread.push(details);
        pi.appendEntry(BTW_TYPE, details);
      } catch (err) {
        slot.answer = `\u274C ${err.message}`;
        slot.done = true;
        renderWidget(ctx);
      }
    })();
  }
  pi.registerCommand("btw", {
    description: "Ask a side question using current context (works async while agent is busy)",
    handler: async (args, ctx) => {
      const question = args.trim();
      if (!question) {
        ctx.ui.notify("Usage: /btw <question>", "warning");
        return;
      }
      fireBtw(ctx, question);
    }
  });
  pi.registerCommand("btw:new", {
    description: "Start a fresh btw thread, optionally with a new question",
    handler: async (args, ctx) => {
      resetThread(ctx);
      const question = args.trim();
      if (question) {
        fireBtw(ctx, question);
      } else {
        ctx.ui.notify("\u{1F4AD} btw: started fresh thread", "info");
      }
    }
  });
  pi.registerCommand("btw:clear", {
    description: "Dismiss the btw widget and clear thread",
    handler: async (_args, ctx) => {
      resetThread(ctx);
    }
  });
  pi.registerCommand("btw:inject", {
    description: "Inject btw thread into main agent context (queued as follow-up if busy) [optional instructions]",
    handler: async (args, ctx) => {
      const thread = collectBtwThread();
      if (thread.length === 0 || slots.length === 0) {
        ctx.ui.notify("No active btw thread to inject", "warning");
        return;
      }
      const instructions = args.trim();
      const threadText = formatThread(thread);
      const content = instructions ? `Here's a side conversation I had. ${instructions}

<btw-thread>
${threadText}
</btw-thread>` : `Here's a side conversation I had for additional context:

<btw-thread>
${threadText}
</btw-thread>`;
      pi.sendUserMessage(content, { deliverAs: "followUp" });
      resetThread(ctx);
      ctx.ui.notify(`\u{1F4AD} btw \u2192 main: injected ${thread.length} exchange(s)`, "info");
    }
  });
  pi.registerCommand("btw:summarize", {
    description: "Summarize btw thread and inject into main agent (queued as follow-up if busy) [optional instructions]",
    handler: async (args, ctx) => {
      const thread = collectBtwThread();
      if (thread.length === 0 || slots.length === 0) {
        ctx.ui.notify("No active btw thread to summarize", "warning");
        return;
      }
      const model = ctx.model;
      if (!model) {
        ctx.ui.notify("No model selected", "error");
        return;
      }
      const apiKey = await ctx.modelRegistry.getApiKey(model);
      if (!apiKey) {
        ctx.ui.notify(`No API key for ${model.provider}/${model.id}`, "error");
        return;
      }
      widgetStatus = "\u23F3 summarizing...";
      renderWidget(ctx);
      try {
        const threadText = formatThread(thread);
        const response = await completeSimple(
          model,
          {
            messages: [
              {
                role: "user",
                content: [{
                  type: "text",
                  text: [
                    "Summarize this side conversation concisely. Preserve key decisions, plans, insights, and action items.",
                    "Output only the summary, no preamble.",
                    "",
                    "<btw-thread>",
                    threadText,
                    "</btw-thread>"
                  ].join("\n")
                }],
                timestamp: Date.now()
              }
            ]
          },
          { apiKey, reasoning: "low" }
        );
        const summary = response.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
        const instructions = args.trim();
        const content = instructions ? `Here's a summary of a side conversation I had. ${instructions}

<btw-summary>
${summary}
</btw-summary>` : `Here's a summary of a side conversation I had:

<btw-summary>
${summary}
</btw-summary>`;
        pi.sendUserMessage(content, { deliverAs: "followUp" });
        resetThread(ctx);
        ctx.ui.notify(`\u{1F4AD} btw \u2192 main: injected summary of ${thread.length} exchange(s)`, "info");
      } catch (err) {
        widgetStatus = null;
        renderWidget(ctx);
        ctx.ui.notify(`btw:summarize error \u2014 ${err.message}`, "error");
      }
    }
  });
}
export {
  btw_default as default
};
