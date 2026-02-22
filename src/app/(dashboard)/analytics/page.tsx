import { TopBar } from "@client/components/TopBar";

export default function AnalyticsPage() {
	return (
		<div className="flex flex-col min-h-full">
			<TopBar />
			<div className="flex-1 bg-white rounded-2xl shadow-sm px-8 py-7">
				<h1 className="text-[22px] font-bold text-gray-900 leading-tight mb-1">Analytics</h1>
				<p className="text-[13px] text-gray-500 mb-8">Delivery rates and performance metrics.</p>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
					{[
						{ label: "Total sent",   value: "—" },
						{ label: "Delivered",    value: "—" },
						{ label: "Failed",       value: "—" },
					].map((stat) => (
						<div key={stat.label} className="rounded-xl border border-gray-200 px-5 py-5">
							<p className="text-xs text-gray-500 mb-1">{stat.label}</p>
							<p className="text-2xl font-bold text-gray-900">{stat.value}</p>
						</div>
					))}
				</div>

				<div className="rounded-xl border border-gray-200 px-5 py-10 text-center">
					<p className="text-sm font-medium text-gray-600">Analytics coming soon</p>
					<p className="mt-1 text-xs text-gray-400">Charts and detailed metrics will appear here.</p>
				</div>
			</div>
		</div>
	);
}
