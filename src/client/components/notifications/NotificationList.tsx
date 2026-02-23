"use client";

import { useSearchParams } from "next/navigation";
import { useNotifications } from "@client/hooks/useNotifications";
import { NotificationCard } from "@client/components/notifications/NotificationCard";
import type { Notification } from "@server/core/domain/entities/Notification";

// ── Date grouping ─────────────────────────────────────────────────────────────

function groupLabel(date: Date): string {
	const now = new Date();
	const d = new Date(date);
	if (d.toDateString() === now.toDateString()) return "Today";
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
	return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function groupByDate(list: Notification[]): { label: string; items: Notification[] }[] {
	const map = new Map<string, Notification[]>();
	for (const n of list) {
		const key = groupLabel(new Date(n.createdAt));
		const group = map.get(key) ?? [];
		group.push(n);
		map.set(key, group);
	}
	return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function NotificationListSkeleton() {
	return (
		<div aria-label="Loading notifications" className="space-y-2.5">
			{[0, 1, 2].map((i) => (
				<div key={i} className="flex items-center gap-4 bg-white rounded-xl shadow-sm px-5 py-[18px] animate-pulse">
					<div className="h-12 w-12 rounded-xl bg-gray-200 flex-shrink-0" />
					<div className="flex-1 space-y-2">
						<div className="h-3.5 bg-gray-200 rounded w-1/2" />
						<div className="h-3 bg-gray-200 rounded w-3/4" />
					</div>
					<div className="h-3 w-8 bg-gray-200 rounded" />
				</div>
			))}
		</div>
	);
}

// ── List ──────────────────────────────────────────────────────────────────────

export function NotificationList() {
	const { query } = useNotifications();
	const searchParams = useSearchParams();
	const q = searchParams?.get("q")?.trim().toLowerCase() ?? "";

	if (query.isLoading) return <NotificationListSkeleton />;

	if (query.isError) {
		return (
			<p className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
				Failed to load notifications. Please try again later.
			</p>
		);
	}

	const all = query.data ?? [];
	const notifications = q
		? all.filter(
				(n) =>
					n.title.toLowerCase().includes(q) ||
					n.body.toLowerCase().includes(q),
			)
		: all;

	if (all.length === 0) {
		return (
			<div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-10 text-center">
				<p className="text-sm font-medium text-gray-600">No notifications yet</p>
				<p className="mt-1 text-xs text-gray-400">Send your first notification to get started.</p>
			</div>
		);
	}

	if (notifications.length === 0) {
		return (
			<div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-10 text-center">
				<p className="text-sm font-medium text-gray-600">No results for &ldquo;{searchParams?.get("q")}&rdquo;</p>
				<p className="mt-1 text-xs text-gray-400">Try a different search term.</p>
			</div>
		);
	}

	const groups = groupByDate(notifications);

	return (
		<div className="space-y-5">
			{groups.map(({ label, items }) => (
				<section key={label}>
					{/* Date header — texto simples, cinza, como no print */}
					<h3 className="mb-3 text-[13px] text-gray-500">{label}</h3>
					<ul className="space-y-2.5">
						{items.map((n) => (
							<li key={n.id}>
								<NotificationCard notification={n} />
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}
