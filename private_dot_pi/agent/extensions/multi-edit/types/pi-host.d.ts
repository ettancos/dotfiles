declare module "@earendil-works/pi-coding-agent" {
	export function withFileMutationQueue<T>(path: string, operation: () => Promise<T>): Promise<T>;
}
