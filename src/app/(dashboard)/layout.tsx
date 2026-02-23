import { Sidebar } from "@client/components/Sidebar";
import { BottomNav } from "@client/components/BottomNav";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-[#ede9fe] flex gap-4 p-5 max-sm:p-3 overflow-x-hidden">
			<Sidebar />
			<main className="flex-1 min-w-0 pb-20 sm:pb-0">{children}</main>
			<BottomNav />
		</div>
	);
}
