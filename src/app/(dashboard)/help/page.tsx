import { TopBar } from "@client/components/TopBar";

export default function HelpPage() {
	const faqs = [
		{
			q: "How do I send my first notification?",
			a: 'Click "+ New Notification" on the dashboard, fill in the title, body and channel, then submit.',
		},
		{
			q: "How do I enable the email channel?",
			a: "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in your .env file, then restart the server and the worker process.",
		},
		{
			q: "Why does the notification show as failed?",
			a: "Check that the worker process is running (npm run worker) and that the channel credentials are correct in .env.",
		},
		{
			q: "What is the worker process?",
			a: "Notifications are dispatched asynchronously via BullMQ. Run `npm run worker` in a separate terminal alongside `npm run dev`.",
		},
	];

	return (
		<div className="flex flex-col min-h-full">
			<TopBar />
			<div className="flex-1 bg-white rounded-2xl shadow-sm px-8 py-7">
				<h1 className="text-[22px] font-bold text-gray-900 leading-tight mb-1">Help & Support</h1>
				<p className="text-[13px] text-gray-500 mb-8">Frequently asked questions and documentation.</p>

				<div className="space-y-4 max-w-2xl">
					{faqs.map((item) => (
						<div key={item.q} className="rounded-xl border border-gray-200 px-5 py-4">
							<p className="text-sm font-semibold text-gray-800 mb-1">{item.q}</p>
							<p className="text-sm text-gray-500">{item.a}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
