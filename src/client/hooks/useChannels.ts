import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@client/lib/queryKeys";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Channel = {
	readonly name: string;
	readonly isAvailable: boolean;
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchChannels(): Promise<Channel[]> {
	const res = await fetch("/api/channels");
	if (!res.ok) throw new Error("Failed to fetch channels");
	const json = (await res.json()) as { data: Channel[] };
	return json.data;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useChannels — thin wrapper over useQuery.
 *
 * staleTime of 5 minutes: channel availability changes only when env vars
 * are updated and the process restarts, so aggressive caching is safe.
 */
export function useChannels() {
	return useQuery({
		queryKey: queryKeys.channels.list(),
		queryFn: fetchChannels,
		staleTime: 1000 * 60 * 5,
	});
}
