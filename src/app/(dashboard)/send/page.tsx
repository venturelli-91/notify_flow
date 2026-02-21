"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@client/hooks/useNotifications";
import { useChannels } from "@client/hooks/useChannels";
import { Button } from "@client/components/ui/Button";
import { Card } from "@client/components/ui/Card";
import type { NotificationChannel } from "@server/core/domain/entities/Notification";

const inputClass =
	"mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" +
	" focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

/**
 * SendPage — form to dispatch a new notification.
 *
 * Mutation is handled by useNotifications().mutation (TanStack Query).
 * On success the router navigates back to the dashboard so the new
 * entry (already optimistically injected) is immediately visible.
 */
export default function SendPage() {
	const router = useRouter();
	const { mutation } = useNotifications();
	const { data: channels } = useChannels();

	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [channel, setChannel] = useState<NotificationChannel>("in-app");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		mutation.mutate(
			{ title, body, channel },
			{ onSuccess: () => router.push("/") },
		);
	}

	return (
		<div className="mx-auto max-w-lg px-4 py-10">
			<nav className="mb-6">
				<Link
					href="/"
					className="text-sm font-medium text-blue-600 hover:underline"
				>
					← Back to dashboard
				</Link>
			</nav>

			<h1 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">
				Send notification
			</h1>

			<Card>
				<form onSubmit={handleSubmit} className="space-y-5">
					{/* Title */}
					<div>
						<label
							htmlFor="title"
							className="block text-sm font-medium text-gray-700"
						>
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

					{/* Body */}
					<div>
						<label
							htmlFor="body"
							className="block text-sm font-medium text-gray-700"
						>
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
							className={inputClass}
						/>
					</div>

					{/* Channel */}
					<div>
						<label
							htmlFor="channel"
							className="block text-sm font-medium text-gray-700"
						>
							Channel
						</label>
						<select
							id="channel"
							value={channel}
							onChange={(e) =>
								setChannel(e.target.value as NotificationChannel)
							}
							className={inputClass}
						>
							{(channels ?? []).map((ch) => (
								<option
									key={ch.name}
									value={ch.name}
									disabled={!ch.isAvailable}
								>
									{ch.name}
									{!ch.isAvailable ? " (unavailable)" : ""}
								</option>
							))}
						</select>
					</div>

					{/* Error feedback */}
					{mutation.isError && (
						<p role="alert" className="text-sm text-red-600">
							Failed to send notification. Please try again.
						</p>
					)}

					<Button
						type="submit"
						isLoading={mutation.isPending}
						className="w-full justify-center"
					>
						{mutation.isPending ? "Sending…" : "Send notification"}
					</Button>
				</form>
			</Card>
		</div>
	);
}
