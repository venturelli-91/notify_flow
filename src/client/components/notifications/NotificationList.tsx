"use client";

import { useNotifications } from "@client/hooks/useNotifications";
import { NotificationCard } from "@client/components/notifications/NotificationCard";
import { Card } from "@client/components/ui/Card";

/**
 * NotificationListSkeleton — exported so that page.tsx can use it as the
 * <Suspense> fallback, keeping the shell visible during SSR streaming.
 */
export function NotificationListSkeleton() {
	return (
		<ul className="space-y-3" aria-label="Loading notifications">
			{Array.from({ length: 3 }).map((_, i) => (
				<li key={i}>
					<Card className="animate-pulse">
						<div className="flex items-start justify-between gap-4">
							<div className="flex-1 space-y-2">
								<div className="h-4 w-3/4 rounded bg-gray-200" />
								<div className="h-3 w-1/2 rounded bg-gray-200" />
							</div>
							<div className="h-5 w-14 rounded-full bg-gray-200" />
						</div>
					</Card>
				</li>
			))}
		</ul>
	);
}

/**
 * NotificationList — consumes useNotifications() and owns all states.
 *
 * Loading  → skeleton cards (preserves layout, avoids CLS)
 * Error    → inline error message
 * Empty    → empty-state prompt
 * Data     → list of NotificationCard
 *
 * Optimistic entries (id starts with "optimistic-") have status="pending"
 * which Badge renders with animate-pulse automatically.
 */
export function NotificationList() {
	const { query } = useNotifications();

	if (query.isLoading) {
		return <NotificationListSkeleton />;
	}

	if (query.isError) {
		return (
			<Card className="text-center text-sm text-red-600">
				Failed to load notifications. Please try again later.
			</Card>
		);
	}

	const notifications = query.data ?? [];

	if (notifications.length === 0) {
		return (
			<Card className="text-center text-sm text-gray-400">
				No notifications yet. Send one to get started.
			</Card>
		);
	}

	return (
		<ul className="space-y-3" role="list" aria-label="Notifications">
			{notifications.map((n) => (
				<li key={n.id}>
					<NotificationCard notification={n} />
				</li>
			))}
		</ul>
	);
}
