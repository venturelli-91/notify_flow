"use client";

import { useState, useRef, useEffect } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon() {
	return (
		<svg
			className="h-4 w-4 text-gray-400"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg
			className="h-4 w-4 text-white"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
		</svg>
	);
}

function BellIcon() {
	return (
		<svg
			className="h-[22px] w-[22px]"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
		</svg>
	);
}

function ChevronDownIcon() {
	return (
		<svg
			className="h-3.5 w-3.5 text-gray-500"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
		</svg>
	);
}

function UserIcon() {
	return (
		<svg
			className="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
		</svg>
	);
}

function SettingsIcon() {
	return (
		<svg
			className="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
			<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	);
}

function LogoutIcon() {
	return (
		<svg
			className="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
		</svg>
	);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TopBar() {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function onClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	return (
		<header className="flex items-center gap-4 mb-5">
			{/* ── Search ─────────────────────────────────────────────────── */}
			<div className="flex-1 flex items-center bg-white rounded-xl shadow-sm pl-4 pr-2 py-2 gap-3">
				<input
					type="text"
					placeholder="Search"
					className="flex-1 bg-transparent text-sm text-gray-600 placeholder:text-gray-400 outline-none"
				/>
				<MicIcon />
				<button
					type="button"
					aria-label="Search"
					className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center hover:bg-violet-700 transition-colors flex-shrink-0">
					<SearchIcon />
				</button>
			</div>

			{/* ── Bell (solto, sem container) ─────────────────────────── */}
			<button
				type="button"
				aria-label="Notifications"
				className="relative text-gray-500 hover:text-gray-700 transition-colors p-1 flex-shrink-0">
				<BellIcon />
				{/* Red dot — com borda da cor do fundo para parecer flutuante */}
				<span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-[#ede9fe]" />
			</button>

			{/* ── Avatar + chevron + dropdown ─────────────────────────── */}
			<div
				className="relative flex-shrink-0"
				ref={ref}>
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					className="flex items-center gap-1 outline-none"
					aria-label="User menu"
					aria-expanded={open}>
					{/* Avatar circular */}
					<div className="h-9 w-9 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white shadow-sm">
						A
					</div>
					<ChevronDownIcon />
				</button>

				{/* Dropdown */}
				{open && (
					<div className="absolute right-0 top-[calc(100%+10px)] w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
						{/* Header do menu */}
						<div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
							<div className="h-10 w-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
								A
							</div>
							<div className="min-w-0">
								<p className="text-sm font-semibold text-gray-900 truncate">
									Admin
								</p>
								<p className="text-xs text-gray-400 truncate">
									admin@notifyflow.com
								</p>
							</div>
						</div>

						{/* Items */}
						<div className="py-1.5">
							<button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
								<UserIcon />
								Profile
							</button>
							<button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
								<SettingsIcon />
								Settings
							</button>
						</div>

						<div className="border-t border-gray-100 py-1.5">
							<button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
								<LogoutIcon />
								Sign out
							</button>
						</div>
					</div>
				)}
			</div>
		</header>
	);
}
