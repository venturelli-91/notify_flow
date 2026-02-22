"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@client/lib/queryKeys";
import type { Notification } from "@server/core/domain/entities/Notification";

interface NotificationCardProps {
	readonly notification: Notification;
}

// ── Channel icon ──────────────────────────────────────────────────────────────

const channelConfig: Record<
	string,
	{ bg: string; color: string; svg: React.ReactNode }
> = {
	email: {
		bg: "bg-violet-100",
		color: "text-violet-500",
		svg: (
			<svg
				className="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round">
				<path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
			</svg>
		),
	},
	webhook: {
		bg: "bg-violet-100",
		color: "text-violet-500",
		svg: (
			<svg
				className="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round">
				<path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
			</svg>
		),
	},
	"in-app": {
		bg: "bg-violet-100",
		color: "text-violet-600",
		svg: (
			<svg
				className="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round">
				<path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
			</svg>
		),
	},
};

const fallback = {
	bg: "bg-gray-100",
	color: "text-gray-400",
	svg: (
		<svg
			className="h-5 w-5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
		</svg>
	),
};

// ── Action icons ──────────────────────────────────────────────────────────────

function RetryIcon() {
	return (
		<svg
			className="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
		</svg>
	);
}

function DeleteIcon() {
	return (
		<svg
			className="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
		</svg>
	);
}

// ── Time ──────────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
	const diffMs = Date.now() - date.getTime();
	const mins = Math.floor(diffMs / 60_000);
	const hrs = Math.floor(diffMs / 3_600_000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	if (hrs < 24) return `${hrs}h ago`;
	if (hrs < 48) return "Yesterday";
	return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

// ── Status badge ──────────────────────────────────────────────────────────────

const statusConfig = {
	pending: {
		label: "Pending",
		className: "bg-amber-100 text-amber-700 animate-pulse",
	},
	sent: { label: "Sent", className: "bg-violet-100  text-violet-700" },
	failed: { label: "Failed", className: "bg-red-100   text-red-600" },
} satisfies Record<string, { label: string; className: string }>;

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationCard({ notification }: NotificationCardProps) {
	const ch = channelConfig[notification.channel] ?? fallback;
	const time = relativeTime(new Date(notification.createdAt));
	const status = statusConfig[notification.status] ?? statusConfig.pending;
	const queryClient = useQueryClient();

	const canRetry = notification.status === "pending" || notification.status === "failed";

	const retryMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/notifications/${notification.id}/retry`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) throw new Error("Failed to retry notification");
		},
		onSettled: () =>
			void queryClient.invalidateQueries({
				queryKey: queryKeys.notifications.list(),
			}),
	});

	const deleteMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/notifications/${notification.id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete notification");
		},
		onSettled: () =>
			void queryClient.invalidateQueries({
				queryKey: queryKeys.notifications.list(),
			}),
	});

	return (
		<div
			title={notification.status}
			className="flex items-center gap-4 bg-white rounded-xl shadow-sm px-5 py-[18px] hover:shadow-md transition-shadow">
			{/* Ícone do canal */}
			<div
				className={`h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center ${ch.bg} ${ch.color}`}>
				{ch.svg}
			</div>

			{/* Conteúdo */}
			<div className="flex-1 min-w-0">
				<p className="text-sm leading-snug">
					<span className="font-semibold text-gray-900">
						{notification.title}
					</span>
					<span className="ml-2 text-xs text-gray-400 font-normal">{time}</span>
				</p>
				<p className="mt-0.5 text-sm text-gray-500 truncate">
					{notification.body}
				</p>
			</div>

			{/* Status badge + Actions */}
			<div className="flex items-center gap-2 flex-shrink-0">
				<span
					className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
					{status.label}
				</span>

				{canRetry && (
					<button
						type="button"
						onClick={() => retryMutation.mutate()}
						disabled={retryMutation.isPending || deleteMutation.isPending}
						className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50"
						title="Retry notification">
						<RetryIcon />
					</button>
				)}

				{canRetry && (
					<button
						type="button"
						onClick={() => deleteMutation.mutate()}
						disabled={deleteMutation.isPending || retryMutation.isPending}
						className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
						title="Delete notification">
						<DeleteIcon />
					</button>
				)}
			</div>
		</div>
	);
}
