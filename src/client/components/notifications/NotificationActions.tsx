"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@client/lib/queryKeys";
import { Button } from "@client/components/ui/Button";

async function bulkAction(
	action: "mark_all_read" | "mark_all_unread",
): Promise<void> {
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
		void queryClient.invalidateQueries({
			queryKey: queryKeys.notifications.list(),
		});

	const markAllReadMutation = useMutation({
		mutationFn: () => bulkAction("mark_all_read"),
		onError: () => toast.error("Failed to mark all as read"),
		onSettled: invalidate,
	});

	const markAllUnreadMutation = useMutation({
		mutationFn: () => bulkAction("mark_all_unread"),
		onError: () => toast.error("Failed to mark all as unread"),
		onSettled: invalidate,
	});

	return (
		<div className="flex items-center gap-2 flex-shrink-0">
			<Link
				href="/send"
				className="text-[13px] font-medium text-white bg-violet-600 rounded-lg px-4 py-2 hover:bg-violet-700 transition-colors">
				+ New Notification
			</Link>
			<Button
				type="button"
				onClick={() => markAllReadMutation.mutate()}
				disabled={markAllUnreadMutation.isPending}
				isLoading={markAllReadMutation.isPending}
				variant="secondary"
				size="sm"
				className="max-sm:hidden">
				Mark all as Read
			</Button>
			<Button
				type="button"
				onClick={() => markAllUnreadMutation.mutate()}
				disabled={markAllReadMutation.isPending}
				isLoading={markAllUnreadMutation.isPending}
				variant="secondary"
				size="sm"
				className="max-sm:hidden">
				Mark all as Unread
			</Button>
		</div>
	);
}
