import type { Notification } from "@server/core/domain/entities/Notification";
import { Badge } from "@client/components/ui/Badge";
import { Card } from "@client/components/ui/Card";

interface NotificationCardProps {
	readonly notification: Notification;
}

const channelLabel: Record<string, string> = {
	email: "Email",
	webhook: "Webhook",
	"in-app": "In-App",
};

/**
 * NotificationCard — pure display component.
 *
 * SRP: receives a Notification and renders it. No hooks, no side effects.
 * LSP: can replace any other notification display without breaking the list.
 */
export function NotificationCard({ notification }: NotificationCardProps) {
	return (
		<Card>
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-gray-900">
						{notification.title}
					</p>
					<p className="mt-1 line-clamp-2 text-sm text-gray-500">
						{notification.body}
					</p>
				</div>
				<Badge status={notification.status} />
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
				<span>{channelLabel[notification.channel] ?? notification.channel}</span>
				<span aria-hidden>·</span>
				<span>
					{new Date(notification.createdAt).toLocaleString(undefined, {
						dateStyle: "medium",
						timeStyle: "short",
					})}
				</span>
				{notification.correlationId && (
					<>
						<span aria-hidden>·</span>
						<span
							className="max-w-[140px] truncate font-mono"
							title={notification.correlationId}
						>
							{notification.correlationId}
						</span>
					</>
				)}
			</div>
		</Card>
	);
}
