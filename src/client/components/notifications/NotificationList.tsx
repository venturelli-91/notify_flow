"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications } from "@client/hooks/useNotifications";
import { NotificationCard } from "@client/components/notifications/NotificationCard";

/**
 * NotificationListSkeleton — exported so that page.tsx can use it as the
 * <Suspense> fallback, keeping the shell visible during SSR streaming.
 */
export function NotificationListSkeleton() {
	return (
		<ul className="space-y-3" aria-label="Loading notifications">
			{Array.from({ length: 3 }).map((_, i) => (
				<li key={i}>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-start justify-between">
								<div className="flex-1 space-y-2">
									<Skeleton className="h-5 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
								<Skeleton className="h-6 w-20" />
							</div>
						</CardContent>
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
			<Card className="border-red-200 bg-red-50">
				<CardContent className="pt-6 text-sm text-red-700">
					Failed to load notifications. Please try again later.
				</CardContent>
			</Card>
		);
	}

	const notifications = query.data ?? [];

	if (notifications.length === 0) {
		return (
			<Card className="border-gray-200 bg-gray-50">
				<CardContent className="pt-6 text-center text-sm text-gray-600">
					<p className="font-medium">No notifications yet</p>
					<p className="mt-1 text-xs text-gray-500">
						Send your first notification to get started.
					</p>
				</CardContent>
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
