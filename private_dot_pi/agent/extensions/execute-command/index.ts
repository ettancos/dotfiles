import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface PendingCommand {
  command: string;
  reason?: string;
}

export default function (pi: ExtensionAPI) {
  const pendingCommands: PendingCommand[] = [];

  pi.registerTool({
    name: "execute_command",
    label: "Execute Command",
    description: `Execute a slash command or send a message as if the user typed it. The message is added to the session history and triggers a new turn. Use this to:
- Self-invoke /answer after asking multiple questions
- Run /reload after creating skills
- Execute any slash command programmatically
- Send follow-up prompts to yourself

The command/message appears in the conversation as a user message.`,
    promptSnippet:
      "Execute a slash command or send a message as if the user typed it. " +
      "Use to self-invoke /answer after asking questions, run /reload after creating skills, or send follow-up prompts.",
    parameters: Type.Object({
      command: Type.String({
        minLength: 1,
        description: "The command or message to execute (e.g., '/answer', '/reload', or any text)",
      }),
      reason: Type.Optional(
        Type.String({
          description: "Optional explanation for why you're executing it (shown to the user)",
        }),
      ),
    }),

    async execute(_toolCallId, params) {
      pendingCommands.push({ command: params.command, reason: params.reason });
      const explanation = params.reason
        ? `Queued for execution: ${params.command}\nReason: ${params.reason}`
        : `Queued for execution: ${params.command}`;

      return {
        content: [{ type: "text", text: explanation }],
        details: {
          command: params.command,
          reason: params.reason,
          queued: true,
          queueLength: pendingCommands.length,
        },
      };
    },
  });

  // agent_settled means Pi has finished retries, compaction, and queued work.
  pi.on("agent_settled", async (_event, ctx) => {
    const commands = pendingCommands.splice(0);
    for (const { command } of commands) {
      if (command.startsWith("/")) {
        pi.sendUserMessage(command, {
          deliverAs: "followUp",
          expandPromptTemplates: true,
        });
      } else if (ctx.hasUI) {
        ctx.ui.setEditorText(command);
        ctx.ui.notify(`Press Enter to send: ${command}`, "info");
      }
    }
  });
}
