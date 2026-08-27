import { truncateHead, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { execSync, spawnSync } from "node:child_process";
import { platform } from "node:os";
function which(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function detectClipboard() {
  const os = platform();
  if (os === "darwin") {
    return { read: ["pbpaste"], write: ["pbcopy"] };
  }
  if (os === "linux") {
    if (process.env.WAYLAND_DISPLAY) {
      if (which("wl-paste") && which("wl-copy")) {
        return { read: ["wl-paste", "--no-newline"], write: ["wl-copy"] };
      }
    }
    if (which("xclip")) {
      return {
        read: ["xclip", "-selection", "clipboard", "-o"],
        write: ["xclip", "-selection", "clipboard"]
      };
    }
    if (which("xsel")) {
      return {
        read: ["xsel", "--clipboard", "--output"],
        write: ["xsel", "--clipboard", "--input"]
      };
    }
  }
  return null;
}
function clipboard_default(pi) {
  const clip = detectClipboard();
  if (!clip) {
    return;
  }
  const readCmd = clip.read[0];
  const readArgs = clip.read.slice(1);
  const writeCmd = clip.write[0];
  const writeArgs = clip.write.slice(1);
  pi.registerTool({
    name: "clipboard_read",
    label: "Read Clipboard",
    description: "Read the contents of the system clipboard. Returns clipboard contents as text.",
    parameters: Type.Object({}),
    async execute() {
      try {
        const execResult = await pi.exec(readCmd, readArgs);
        const raw = execResult.stdout;
        const result = truncateHead(raw, {
          maxBytes: DEFAULT_MAX_BYTES,
          maxLines: DEFAULT_MAX_LINES,
        });
        const text = result.truncated
          ? `[Clipboard content truncated \u2014 showing ${formatSize(result.outputBytes)} of ${formatSize(result.totalBytes)}]\n\n${result.content}`
          : result.content;
        return {
          content: [{ type: "text", text: text || "(clipboard is empty)" }]
        };
      } catch (err) {
        throw new Error(`Failed to read clipboard: ${err.message}`);
      }
    },
    renderCall(_args, theme) {
      return new Text(theme.fg("toolTitle", theme.bold("clipboard_read")), 0, 0);
    },
    renderResult(result, _opts, theme) {
      if (result.isError) {
        const text2 = result.content[0];
        return new Text(theme.fg("error", text2?.type === "text" ? text2.text : "Error"), 0, 0);
      }
      const text = result.content[0];
      const content = text?.type === "text" ? text.text : "";
      const lines = content.split("\n").length;
      const size = Buffer.byteLength(content, "utf-8");
      return new Text(
        theme.fg("success", "\u2713 ") + theme.fg("muted", `${lines} line(s), ${formatSize(size)}`),
        0,
        0
      );
    }
  });
  pi.registerTool({
    name: "clipboard_write",
    label: "Write Clipboard",
    description: "Write text to the system clipboard.",
    parameters: Type.Object({
      text: Type.String({ description: "Text to write to the clipboard" })
    }),
    async execute(_toolCallId, params) {
      try {
        spawnSync(writeCmd, writeArgs, { input: params.text, stdio: ["pipe", "ignore", "ignore"] });
        const size = Buffer.byteLength(params.text, "utf-8");
        return {
          content: [{ type: "text", text: `Wrote ${formatSize(size)} to clipboard.` }]
        };
      } catch (err) {
        throw new Error(`Failed to write clipboard: ${err.message}`);
      }
    },
    renderCall(args, theme) {
      const preview = args.text?.length > 60 ? args.text.slice(0, 57) + "..." : args.text ?? "";
      return new Text(
        theme.fg("toolTitle", theme.bold("clipboard_write ")) + theme.fg("muted", preview),
        0,
        0
      );
    },
    renderResult(result, _opts, theme) {
      if (result.isError) {
        const text2 = result.content[0];
        return new Text(theme.fg("error", text2?.type === "text" ? text2.text : "Error"), 0, 0);
      }
      const text = result.content[0];
      return new Text(theme.fg("success", "\u2713 ") + theme.fg("muted", text?.type === "text" ? text.text : ""), 0, 0);
    }
  });
}
export {
  clipboard_default as default
};
