import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { queryKeys } from "@client/lib/queryKeys";
import type { Notification } from "@server/core/domain/entities/Notification";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SendPayload = {
	readonly title: string;
	readonly body: string;
	readonly channel: "email" | "webhook" | "in-app";
	readonly metadata?: Record<string, unknown>;
};

type PaginatedResponse = {
	data: Notification[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
};

/** Returned by POST /api/notifications (202 Accepted — job was enqueued). */
type EnqueuedJob = {
	readonly jobId: string | undefined;
	readonly correlationId: string;
};

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
export function useNotifications(page = 1) {
	const queryClient = useQueryClient();
	const { data: session } = useSession();

	// Fetch notifications with session cookies
	async function fetchNotifications(): Promise<PaginatedResponse> {
		const res = await fetch(`/api/notifications?page=${page}&limit=20`, {
			credentials: "include", // Send cookies with request
		});
		if (!res.ok) throw new Error("Failed to fetch notifications");
		return (await res.json()) as PaginatedResponse;
	}

	// Send notification with session cookies
	async function sendNotification(payload: SendPayload): Promise<EnqueuedJob> {
		const res = await fetch("/api/notifications", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			credentials: "include", // Send cookies with request
		});
		if (!res.ok) throw new Error("Failed to send notification");
		return (await res.json()) as EnqueuedJob;
	}

	const query = useQuery({
		queryKey: queryKeys.notifications.list(page),
		queryFn: fetchNotifications,
		select: (data) => data.data, // Extract just the items array for display
		enabled: !!session, // Only run query if session exists
	});

	const mutation = useMutation({
		mutationFn: sendNotification,

		onMutate: async (payload) => {
			// Cancel in-flight refetches to prevent overwriting the optimistic state
			await queryClient.cancelQueries({
				queryKey: queryKeys.notifications.list(page),
			});

			const previous = queryClient.getQueryData<Notification[]>(
				queryKeys.notifications.list(page),
			);

			// Inject a synthetic entry at the top of the list
			const optimistic: Notification = {
				id: `optimistic-${Date.now()}`,
				title: payload.title,
				body: payload.body,
				channel: payload.channel,
				status: "pending",
				readAt: null,
				metadata: payload.metadata ?? null,
				correlationId: null,
				userId: "optimistic",
				templateId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			queryClient.setQueryData<Notification[]>(
				queryKeys.notifications.list(page),
				(old) => [optimistic, ...(old ?? [])],
			);

			return { previous };
		},

		onError: (_err, _payload, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(
					queryKeys.notifications.list(page),
					context.previous,
				);
			}
			toast.error("Failed to send notification");
		},

		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.notifications.list(page),
			});
		},
	});

	return { query, mutation };
}
