"use client";

import { TopBar } from "@client/components/TopBar";
import { useChannels } from "@client/hooks/useChannels";

// ── Icons ──────────────────────────────────────────────────────────────────────

function EmailIcon() {
	return (
		<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<rect x="2" y="4" width="20" height="16" rx="2" />
			<path d="m2 7 10 7 10-7" />
		</svg>
	);
}

function WebhookIcon() {
	return (
		<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5z" />
			<path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
		</svg>
	);
}

function InAppIcon() {
	return (
		<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
			<path d="M13.73 21a2 2 0 0 1-3.46 0" />
		</svg>
	);
}

// ── Channel metadata ───────────────────────────────────────────────────────────

const CHANNEL_META: Record<string, {
	label: string;
	description: string;
	icon: React.ReactNode;
	missingEnvVars: string[];
}> = {
	email: {
		label: "Email",
		description: "SMTP delivery to any email address.",
		icon: <EmailIcon />,
		missingEnvVars: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
	},
	webhook: {
		label: "Webhook",
		description: "POST payloads to an external HTTP endpoint.",
		icon: <WebhookIcon />,
		missingEnvVars: ["WEBHOOK_URL"],
	},
	"in-app": {
		label: "In-App",
		description: "Real-time in-app notifications stored in the database.",
		icon: <InAppIcon />,
		missingEnvVars: [],
	},
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

function ChannelSkeleton() {
	return (
		<div className="rounded-xl border border-gray-200 px-5 py-5 flex flex-col gap-3 animate-pulse">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="w-5 h-5 rounded bg-gray-200" />
					<div className="h-4 w-20 rounded bg-gray-200" />
				</div>
				<div className="h-5 w-16 rounded-full bg-gray-200" />
			</div>
			<div className="h-3 w-full rounded bg-gray-100" />
		</div>
	);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ChannelsPage() {
	const { data: channels, isLoading } = useChannels();

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
					{isLoading
						? Array.from({ length: 3 }).map((_, i) => (
								<ChannelSkeleton key={i} />
							))
						: channels?.map((ch) => {
								const meta = CHANNEL_META[ch.name];
								if (!meta) return null;
								return (
									<div
										key={ch.name}
										className="rounded-xl border border-gray-200 px-5 py-5 flex flex-col gap-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2 text-gray-700">
												{meta.icon}
												<span className="text-sm font-semibold text-gray-800">
													{meta.label}
												</span>
											</div>
											<span
												className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
													ch.isAvailable
														? "bg-violet-100 text-violet-600"
														: "bg-gray-100 text-gray-500"
												}`}>
												{ch.isAvailable ? "Active" : "Not Configured"}
											</span>
										</div>
										<p className="text-xs text-gray-500">{meta.description}</p>
										{!ch.isAvailable && meta.missingEnvVars.length > 0 && (
											<div className="rounded-lg bg-gray-50 px-3 py-2">
												<p className="text-[11px] text-gray-400 mb-1">
													Required env vars:
												</p>
												{meta.missingEnvVars.map((v) => (
													<code
														key={v}
														className="block text-[11px] font-mono text-gray-600">
														{v}
													</code>
												))}
											</div>
										)}
									</div>
								);
							})}
				</div>
			</div>
		</div>
	);
}
