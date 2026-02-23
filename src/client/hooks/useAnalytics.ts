import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@client/lib/queryKeys";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnalyticsSummary = {
	readonly total: number;
	readonly sent: number;
	readonly failed: number;
	readonly pending: number;
	readonly deliveryRate: number | null;
	readonly byChannel: {
		readonly email: number;
		readonly webhook: number;
		readonly inApp: number;
	};
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchAnalytics(): Promise<AnalyticsSummary> {
	const res = await fetch("/api/analytics");
	if (!res.ok) throw new Error("Failed to fetch analytics");
	const json = (await res.json()) as { data: AnalyticsSummary };
	return json.data;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAnalytics() {
	return useQuery({
		queryKey: queryKeys.analytics.summary(),
		queryFn: fetchAnalytics,
		staleTime: 1000 * 30, // 30s — updates as notifications are processed
	});
}
