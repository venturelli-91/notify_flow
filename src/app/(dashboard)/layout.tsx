import { Sidebar } from "@client/components/Sidebar";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-[#ede9fe] flex gap-4 p-5">
			<Sidebar />
			<main className="flex-1 min-w-0">{children}</main>
		</div>
	);
}
