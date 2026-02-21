import type { NotificationStatus } from "@server/core/domain/entities/Notification";

interface BadgeProps {
	readonly status: NotificationStatus;
}

/**
 * Badge — status indicator with OCP config-map pattern.
 *
 * The "pending" entry carries animate-pulse so optimistic entries
 * in the list receive a visual heartbeat without any conditional logic.
 */
const styles: Record<NotificationStatus, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 animate-pulse",
	sent: "bg-green-100 text-green-800",
	failed: "bg-red-100 text-red-800",
};

const labels: Record<NotificationStatus, string> = {
	pending: "Pending",
	sent: "Sent",
	failed: "Failed",
};

export function Badge({ status }: BadgeProps) {
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
		>
			{labels[status]}
		</span>
	);
}
