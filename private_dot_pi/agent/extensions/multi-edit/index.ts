import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { registerTools, type ToolRegistrar } from "./tools.ts";

export default function (pi: ToolRegistrar): void {
	registerTools(pi, withFileMutationQueue);
}
