"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNotifications } from "@client/hooks/useNotifications";
import { useChannels } from "@client/hooks/useChannels";
import { Button } from "@client/components/ui/Button";
import { TopBar } from "@client/components/TopBar";
import type { NotificationChannel } from "@server/core/domain/entities/Notification";

const inputClass =
	"mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" +
	" focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors";

export default function SendPage() {
	const router = useRouter();
	const { mutation } = useNotifications();
	const { data: channels } = useChannels();

	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [channel, setChannel] = useState<NotificationChannel>("in-app");
	const [recipientEmail, setRecipientEmail] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		mutation.mutate(
			{
				title,
				body,
				channel,
				metadata: channel === "email" ? { to: recipientEmail } : undefined,
			},
			{
				onSuccess: () => {
					toast.success("Notification queued!", {
						description: `"${title}" was enqueued via ${channel} and will be delivered shortly.`,
					});
					router.push("/");
				},
			},
		);
	}

	return (
		<div className="flex flex-col gap-0 min-h-full">
			<TopBar />

			<div className="bg-white rounded-2xl shadow-sm px-7 py-6 max-sm:px-4 max-sm:py-5">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							Send Notification
						</h1>
						<p className="mt-1 text-sm text-gray-500">
							Dispatch a message to a channel
						</p>
					</div>
					<Link
						href="/"
						className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
						← Back
					</Link>
				</div>

				<form
					onSubmit={handleSubmit}
					className="space-y-5 max-w-lg">
					<div>
						<label
							htmlFor="title"
							className="block text-sm font-medium text-gray-700">
							Title
						</label>
						<input
							id="title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							maxLength={100}
							placeholder="e.g. Deployment succeeded"
							className={inputClass}
						/>
					</div>

					<div>
						<label
							htmlFor="body"
							className="block text-sm font-medium text-gray-700">
							Body
						</label>
						<textarea
							id="body"
							value={body}
							onChange={(e) => setBody(e.target.value)}
							required
							maxLength={1000}
							rows={4}
							placeholder="Notification details…"
							className={`${inputClass} resize-none`}
						/>
					</div>

					<div>
						<label
							htmlFor="channel"
							className="block text-sm font-medium text-gray-700">
							Channel
						</label>
						<select
							id="channel"
							value={channel}
							onChange={(e) =>
								setChannel(e.target.value as NotificationChannel)
							}
							className={inputClass}>
							{(channels ?? []).map((ch) => (
								<option
									key={ch.name}
									value={ch.name}>
									{ch.name}
								</option>
							))}
						</select>
					</div>

					{channel === "email" && (
						<div>
							<label
								htmlFor="recipient"
								className="block text-sm font-medium text-gray-700">
								Recipient email
							</label>
							<input
								id="recipient"
								type="email"
								value={recipientEmail}
								onChange={(e) => setRecipientEmail(e.target.value)}
								required
								placeholder="user@example.com"
								className={inputClass}
							/>
						</div>
					)}

					{mutation.isError && (
						<p
							role="alert"
							className="text-sm text-red-600">
							Failed to send notification. Please try again.
						</p>
					)}

					<Button
						type="submit"
						isLoading={mutation.isPending}
						className="w-full justify-center">
						{mutation.isPending ? "Sending…" : "Send notification"}
					</Button>
				</form>
			</div>
		</div>
	);
}
