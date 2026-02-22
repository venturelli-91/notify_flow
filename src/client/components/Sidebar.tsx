"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
		</svg>
	);
}

function GridIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
		</svg>
	);
}

function ChartIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
		</svg>
	);
}

function BellIcon({ className, white }: { className?: string; white?: boolean }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill={white ? "white" : "none"} stroke={white ? "white" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
		</svg>
	);
}

function UsersIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
		</svg>
	);
}

function HelpIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
		</svg>
	);
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const navItems = [
	{ label: "Dashboard",      href: "/",        Icon: HomeIcon,  exact: true,  disabled: false },
	{ label: "Channels",       href: "/channels", Icon: GridIcon,  exact: false, disabled: true  },
	{ label: "Analytics",      href: "/analytics",Icon: ChartIcon, exact: false, disabled: true  },
	{ label: "Notifications",  href: "/",         Icon: BellIcon,  exact: true,  disabled: false },
	{ label: "Team Members",   href: "/team",     Icon: UsersIcon, exact: false, disabled: true  },
	{ label: "Help & Support", href: "/help",     Icon: HelpIcon,  exact: false, disabled: true  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="w-52 flex-shrink-0 bg-white rounded-2xl shadow-sm flex flex-col py-8 px-4 self-start sticky top-5">
			{/* Logo */}
			<div className="flex items-center gap-3 px-2 mb-8">
				<div className="h-9 w-9 rounded-xl bg-teal-700 flex items-center justify-center flex-shrink-0">
					<GridIcon className="h-5 w-5 text-white" />
				</div>
				<span className="font-bold text-gray-900 text-[15px] tracking-tight">
					NotifyFlow
				</span>
			</div>

			{/* Nav */}
			<nav className="flex flex-col gap-1">
				{navItems.map(({ label, href, Icon, exact, disabled }) => {
					const isActive = !disabled && (exact ? pathname === href : pathname.startsWith(href));
					const isNotificationsActive = label === "Notifications" && isActive;

					if (disabled) {
						return (
							<span key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-400 cursor-default select-none">
								<Icon className="h-[18px] w-[18px] flex-shrink-0" />
								{label}
							</span>
						);
					}

					return (
						<Link
							key={label}
							href={href}
							className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
								isNotificationsActive
									? "bg-teal-700 text-white"
									: isActive
									? "bg-teal-50 text-teal-700"
									: "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
							}`}
						>
							<Icon
								className="h-[18px] w-[18px] flex-shrink-0"
								white={isNotificationsActive}
							/>
							{label}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
