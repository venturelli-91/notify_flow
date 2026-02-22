"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@client/lib/queryKeys";

async function bulkAction(action: "mark_all_read" | "mark_all_unread"): Promise<void> {
	const res = await fetch("/api/notifications", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action }),
	});
	if (!res.ok) throw new Error(`Failed to ${action}`);
}

export function NotificationActions() {
	const queryClient = useQueryClient();

	const invalidate = () =>
		void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });

	const markAllReadMutation = useMutation({
		mutationFn: () => bulkAction("mark_all_read"),
		onSettled: invalidate,
	});

	const markAllUnreadMutation = useMutation({
		mutationFn: () => bulkAction("mark_all_unread"),
		onSettled: invalidate,
	});

	return (
		<div className="flex items-center gap-2 flex-shrink-0">
			<Link
				href="/send"
				className="text-[13px] font-medium text-white bg-teal-700 rounded-lg px-4 py-2 hover:bg-teal-800 transition-colors"
			>
				+ New Notification
			</Link>
			<button
				type="button"
				onClick={() => markAllReadMutation.mutate()}
				disabled={markAllReadMutation.isPending || markAllUnreadMutation.isPending}
				className="min-w-[140px] text-[13px] font-medium text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
			>
				{markAllReadMutation.isPending ? "Updating…" : "Mark all as Read"}
			</button>
			<button
				type="button"
				onClick={() => markAllUnreadMutation.mutate()}
				disabled={markAllUnreadMutation.isPending || markAllReadMutation.isPending}
				className="min-w-[148px] text-[13px] font-medium text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
			>
				{markAllUnreadMutation.isPending ? "Updating…" : "Mark all as Unread"}
			</button>
		</div>
	);
}
