import type { Notification } from "@server/core/domain/entities/Notification";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface NotificationCardProps {
	readonly notification: Notification;
}

const channelLabel: Record<string, string> = {
	email: "📧 Email",
	webhook: "🔗 Webhook",
	"in-app": "📱 In-App",
};

const statusColors: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800",
	sent: "bg-green-100 text-green-800",
	failed: "bg-red-100 text-red-800",
};

/**
 * NotificationCard — pure display component.
 *
 * SRP: receives a Notification and renders it. No hooks, no side effects.
 * LSP: can replace any other notification display without breaking the list.
 */
export function NotificationCard({ notification }: NotificationCardProps) {
	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardContent className="pt-6">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1">
						<p className="truncate font-semibold text-gray-900">
							{notification.title}
						</p>
						<p className="mt-2 line-clamp-2 text-sm text-gray-600">
							{notification.body}
						</p>
					</div>
					<Badge
						className={`whitespace-nowrap ${statusColors[notification.status]}`}>
						{notification.status === "pending" && "⏳ Pending"}
						{notification.status === "sent" && "✓ Sent"}
						{notification.status === "failed" && "✗ Failed"}
					</Badge>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
					<span>
						{channelLabel[notification.channel] ?? notification.channel}
					</span>
					<span>{new Date(notification.createdAt).toLocaleString()}</span>
					{notification.correlationId && (
						<span
							className="font-mono text-gray-400"
							title={notification.correlationId}>
							#{notification.correlationId.slice(0, 8)}
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
