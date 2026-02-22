import { TopBar } from "@client/components/TopBar";

export default function ChannelsPage() {
	return (
		<div className="flex flex-col min-h-full">
			<TopBar />
			<div className="flex-1 bg-white rounded-2xl shadow-sm px-8 py-7">
				<h1 className="text-[22px] font-bold text-gray-900 leading-tight mb-1">
					Channels
				</h1>
				<p className="text-[13px] text-gray-500 mb-8">
					Manage your notification delivery channels.
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{[
						{
							name: "In-App",
							description: "Real-time in-app notifications.",
							status: "Active",
						},
						{
							name: "Email",
							description: "SMTP delivery to any email address.",
							status: "Configure",
						},
						{
							name: "Webhook",
							description: "POST payloads to an external endpoint.",
							status: "Configure",
						},
					].map((ch) => (
						<div
							key={ch.name}
							className="rounded-xl border border-gray-200 px-5 py-5 flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-gray-800">
									{ch.name}
								</span>
								<span
									className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ch.status === "Active" ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"}`}>
									{ch.status}
								</span>
							</div>
							<p className="text-xs text-gray-500">{ch.description}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
