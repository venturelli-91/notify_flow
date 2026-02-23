"use client";

import { TopBar } from "@client/components/TopBar";
import { useAnalytics } from "@client/hooks/useAnalytics";

// ── Helpers ────────────────────────────────────────────────────────────────────

function Bar({ value, total, color }: { value: number; total: number; color: string }) {
	const pct = total > 0 ? Math.round((value / total) * 100) : 0;
	return (
		<div className="flex items-center gap-3">
			<div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-500 ${color}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
		</div>
	);
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function StatSkeleton() {
	return (
		<div className="rounded-xl border border-gray-200 px-5 py-5 animate-pulse">
			<div className="h-3 w-16 rounded bg-gray-200 mb-3" />
			<div className="h-8 w-12 rounded bg-gray-200" />
		</div>
	);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
	const { data, isLoading } = useAnalytics();

	const stats = [
		{
			label: "Total",
			value: data?.total ?? 0,
			color: "text-gray-900",
			bg: "",
		},
		{
			label: "Sent",
			value: data?.sent ?? 0,
			color: "text-violet-600",
			bg: "bg-violet-50",
		},
		{
			label: "Failed",
			value: data?.failed ?? 0,
			color: "text-red-500",
			bg: "bg-red-50",
		},
		{
			label: "Pending",
			value: data?.pending ?? 0,
			color: "text-amber-500",
			bg: "bg-amber-50",
		},
	];

	const channels = [
		{ label: "Email", value: data?.byChannel.email ?? 0 },
		{ label: "Webhook", value: data?.byChannel.webhook ?? 0 },
		{ label: "In-App", value: data?.byChannel.inApp ?? 0 },
	];

	const channelColors = [
		"bg-violet-400",
		"bg-blue-400",
		"bg-emerald-400",
	];

	return (
		<div className="flex flex-col min-h-full">
			<TopBar />
			<div className="flex-1 bg-white rounded-2xl shadow-sm px-8 py-7">
				<h1 className="text-[22px] font-bold text-gray-900 leading-tight mb-1">
					Analytics
				</h1>
				<p className="text-[13px] text-gray-500 mb-8">
					Delivery rates and performance metrics.
				</p>

				{/* Stats */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
					{isLoading
						? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
						: stats.map((s) => (
								<div
									key={s.label}
									className={`rounded-xl border border-gray-200 px-5 py-5 ${s.bg}`}>
									<p className="text-xs text-gray-500 mb-1">{s.label}</p>
									<p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
								</div>
							))}
				</div>

				{/* Delivery rate */}
				{!isLoading && (
					<div className="rounded-xl border border-gray-200 px-5 py-5 mb-4">
						<div className="flex items-center justify-between mb-3">
							<p className="text-sm font-semibold text-gray-800">Delivery Rate</p>
							<p className="text-sm font-bold text-violet-600">
								{data?.deliveryRate != null ? `${data.deliveryRate}%` : "—"}
							</p>
						</div>
						{data?.deliveryRate != null && (
							<div className="h-2 rounded-full bg-gray-100 overflow-hidden">
								<div
									className="h-full rounded-full bg-violet-500 transition-all duration-500"
									style={{ width: `${data.deliveryRate}%` }}
								/>
							</div>
						)}
						{data?.deliveryRate == null && (
							<p className="text-xs text-gray-400">No completed deliveries yet.</p>
						)}
					</div>
				)}

				{/* By channel */}
				{!isLoading && (
					<div className="rounded-xl border border-gray-200 px-5 py-5">
						<p className="text-sm font-semibold text-gray-800 mb-4">By Channel</p>
						<div className="flex flex-col gap-3">
							{channels.map((ch, i) => (
								<div key={ch.label}>
									<div className="flex justify-between mb-1">
										<span className="text-xs text-gray-600">{ch.label}</span>
										<span className="text-xs text-gray-500">{ch.value}</span>
									</div>
									<Bar
										value={ch.value}
										total={data?.total ?? 0}
										color={channelColors[i] ?? "bg-gray-400"}
									/>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
