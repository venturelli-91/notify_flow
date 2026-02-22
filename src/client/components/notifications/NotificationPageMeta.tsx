"use client";

import { useNotifications } from "@client/hooks/useNotifications";

export function NotificationPageMeta() {
	const { query } = useNotifications();
	const count = query.data?.length ?? 0;

	return (
		<p className="mt-1 mb-6 text-[13px] text-gray-500">
			You have{" "}
			<span className="font-semibold text-orange-500">{count}</span>{" "}
			notification{count !== 1 ? "s" : ""} to go through
		</p>
	);
}
