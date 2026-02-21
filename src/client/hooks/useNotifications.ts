import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@client/lib/queryKeys";
import type { Notification } from "@server/core/domain/entities/Notification";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SendPayload = {
	readonly title: string;
	readonly body: string;
	readonly channel: "email" | "webhook" | "in-app";
	readonly metadata?: Record<string, unknown>;
};

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchNotifications(): Promise<Notification[]> {
	const res = await fetch("/api/notifications");
	if (!res.ok) throw new Error("Failed to fetch notifications");
	const json = (await res.json()) as { data: Notification[] };
	return json.data;
}

async function sendNotification(payload: SendPayload): Promise<Notification> {
	const res = await fetch("/api/notifications", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) throw new Error("Failed to send notification");
	const json = (await res.json()) as { data: Notification };
	return json.data;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useNotifications — thin wrapper over TanStack Query.
 *
 * Returns:
 *   query    — the useQuery result for the notification list
 *   mutation — useMutation with full optimistic update lifecycle:
 *              onMutate  → snapshot + inject optimistic entry (status "pending")
 *              onError   → rollback to snapshot
 *              onSettled → invalidate to sync with server
 */
export function useNotifications() {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: queryKeys.notifications.list(),
		queryFn: fetchNotifications,
	});

	const mutation = useMutation({
		mutationFn: sendNotification,

		onMutate: async (payload) => {
			// Cancel in-flight refetches to prevent overwriting the optimistic state
			await queryClient.cancelQueries({
				queryKey: queryKeys.notifications.list(),
			});

			const previous = queryClient.getQueryData<Notification[]>(
				queryKeys.notifications.list(),
			);

			// Inject a synthetic entry at the top of the list
			const optimistic: Notification = {
				id: `optimistic-${Date.now()}`,
				title: payload.title,
				body: payload.body,
				channel: payload.channel,
				status: "pending",
				metadata: payload.metadata ?? null,
				correlationId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			queryClient.setQueryData<Notification[]>(
				queryKeys.notifications.list(),
				(old) => [optimistic, ...(old ?? [])],
			);

			return { previous };
		},

		onError: (_err, _payload, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					queryKeys.notifications.list(),
					context.previous,
				);
			}
		},

		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.notifications.list(),
			});
		},
	});

	return { query, mutation };
}
