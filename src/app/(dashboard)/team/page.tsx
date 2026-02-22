import { TopBar } from "@client/components/TopBar";

export default function TeamPage() {
	return (
		<div className="flex flex-col min-h-full">
			<TopBar />
			<div className="flex-1 bg-white rounded-2xl shadow-sm px-8 py-7">
				<div className="flex items-start justify-between mb-1">
					<h1 className="text-[22px] font-bold text-gray-900 leading-tight">
						Team Members
					</h1>
					<button
						type="button"
						className="text-[13px] font-medium text-white bg-violet-600 rounded-lg px-4 py-2 hover:bg-violet-700 transition-colors flex-shrink-0">
						+ Invite member
					</button>
				</div>
				<p className="text-[13px] text-gray-500 mb-8">
					Manage who has access to NotifyFlow.
				</p>

				<div className="rounded-xl border border-gray-200 px-5 py-10 text-center">
					<p className="text-sm font-medium text-gray-600">
						No team members yet
					</p>
					<p className="mt-1 text-xs text-gray-400">
						Invite teammates to collaborate on notifications.
					</p>
				</div>
			</div>
		</div>
	);
}
