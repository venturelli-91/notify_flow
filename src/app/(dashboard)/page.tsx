import { Suspense } from "react";
import Link from "next/link";
import {
	NotificationList,
	NotificationListSkeleton,
} from "@client/components/notifications/NotificationList";
import { Button } from "@client/components/ui/Button";

/**
 * Dashboard — Server Component root.
 *
 * <Suspense> wraps the client-component feed so that the page shell
 * (header, nav) streams immediately while the list hydrates on the client.
 * The skeleton fallback matches the final layout, preventing CLS.
 */
export default function DashboardPage() {
	return (
		<div className="mx-auto max-w-2xl px-4 py-10">
			<header className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-gray-900">
						NotifyFlow
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Self-hosted multi-channel notification engine
					</p>
				</div>

				<Link href="/send">
					<Button>Send notification</Button>
				</Link>
			</header>

			<section className="mt-10">
				<h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
					Recent notifications
				</h2>
				<Suspense fallback={<NotificationListSkeleton />}>
					<NotificationList />
				</Suspense>
			</section>
		</div>
	);
}
