"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function GridIcon() {
	return (
		<svg
			className="h-5 w-5 text-white"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
		</svg>
	);
}

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const res = await fetch("/api/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		});

		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError((data as { error?: string }).error ?? "Registration failed.");
			setLoading(false);
			return;
		}

		const result = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});

		setLoading(false);

		if (result?.error) {
			router.push("/login");
			return;
		}

		router.push("/");
	}

	return (
		<div className="min-h-screen bg-[#ede9fe] flex items-center justify-center p-5">
			<div className="w-full max-w-sm">
				{/* Logo */}
				<div className="flex items-center gap-3 justify-center mb-8">
					<div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center">
						<GridIcon />
					</div>
					<span className="font-bold text-gray-900 text-xl tracking-tight">
						NotifyFlow
					</span>
				</div>

				{/* Card */}
				<div className="bg-white rounded-2xl shadow-sm px-8 py-8">
					<h1 className="text-[20px] font-bold text-gray-900 mb-1">
						Create account
					</h1>
					<p className="text-[13px] text-gray-500 mb-6">
						Sign up to start managing your notifications.
					</p>

					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Name
							</label>
							<input
								type="text"
								required
								minLength={2}
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Your name"
								className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
							/>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Email
							</label>
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
							/>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Password
							</label>
							<input
								type="password"
								required
								minLength={6}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
							/>
						</div>

						{error && (
							<p role="alert" className="text-xs text-red-500">
								{error}
							</p>
						)}

						<button
							type="submit"
							disabled={loading}
							className="mt-1 w-full rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors">
							{loading ? "Creating account…" : "Create account"}
						</button>
					</form>
				</div>

				<p className="mt-5 text-center text-[13px] text-gray-500">
					Already have an account?{" "}
					<Link
						href="/login"
						className="font-semibold text-violet-600 hover:text-violet-700">
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
