import { Suspense } from "react";
import {
	NotificationList,
	NotificationListSkeleton,
} from "@client/components/notifications/NotificationList";
import { NotificationPageMeta } from "@client/components/notifications/NotificationPageMeta";
import { TopBar } from "@client/components/TopBar";

export default function DashboardPage() {
	return (
		<div className="flex flex-col min-h-full">
			<TopBar />

			{/* Cartão branco principal */}
			<div className="flex-1 bg-white rounded-2xl shadow-sm px-8 py-7">
				{/* Cabeçalho da página */}
				<div className="flex items-start justify-between mb-1">
					<h1 className="text-[22px] font-bold text-gray-900 leading-tight">
						Notifications
					</h1>
					<button
						type="button"
						className="text-[13px] font-medium text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors flex-shrink-0"
					>
						Mark all as Read
					</button>
				</div>

				{/* Subtítulo dinâmico com contagem */}
				<Suspense fallback={<p className="mt-1 mb-6 text-sm text-gray-500">Loading…</p>}>
					<NotificationPageMeta />
				</Suspense>

				{/* Lista agrupada por data */}
				<Suspense fallback={<NotificationListSkeleton />}>
					<NotificationList />
				</Suspense>
			</div>
		</div>
	);
}
