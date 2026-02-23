"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
	return (
		<svg
			className="h-[22px] w-[22px]"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={active ? 2 : 1.5}
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
		</svg>
	);
}

function PlusIcon() {
	return (
		<svg
			className="h-[22px] w-[22px] text-white"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M12 4.5v15m7.5-7.5h-15" />
		</svg>
	);
}

function GridIcon({ active }: { active: boolean }) {
	return (
		<svg
			className="h-[22px] w-[22px]"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={active ? 2 : 1.5}
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
		</svg>
	);
}

function ChartIcon({ active }: { active: boolean }) {
	return (
		<svg
			className="h-[22px] w-[22px]"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={active ? 2 : 1.5}
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
		</svg>
	);
}

const navItems = [
	{ label: "Home", href: "/", Icon: HomeIcon, exact: true },
	{ label: "Channels", href: "/channels", Icon: GridIcon, exact: false },
	{ label: "Analytics", href: "/analytics", Icon: ChartIcon, exact: false },
] as const;

export function BottomNav() {
	const pathname = usePathname();

	return (
		<nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-2 h-16 safe-area-inset-bottom">
			{/* Left items */}
			{navItems.slice(0, 1).map(({ label, href, Icon, exact }) => {
				const active = exact ? pathname === href : pathname.startsWith(href);
				return (
					<Link
						key={label}
						href={href}
						className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${
							active ? "text-violet-600" : "text-gray-400"
						}`}>
						<Icon active={active} />
						<span className="text-[10px] font-medium">{label}</span>
					</Link>
				);
			})}

			{/* Send — central destaque */}
			<Link
				href="/send"
				aria-label="Send notification"
				className="flex flex-col items-center gap-0.5">
				<div className="h-12 w-12 rounded-full bg-violet-600 flex items-center justify-center shadow-lg -mt-5">
					<PlusIcon />
				</div>
				<span className="text-[10px] font-medium text-gray-400 mt-0.5">Send</span>
			</Link>

			{/* Right items */}
			{navItems.slice(1).map(({ label, href, Icon, exact }) => {
				const active = exact ? pathname === href : pathname.startsWith(href);
				return (
					<Link
						key={label}
						href={href}
						className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${
							active ? "text-violet-600" : "text-gray-400"
						}`}>
						<Icon active={active} />
						<span className="text-[10px] font-medium">{label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
