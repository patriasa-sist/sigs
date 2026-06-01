import { AdminSidebar, AdminMobileNav } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="lg:flex lg:h-screen lg:overflow-hidden">
			<AdminSidebar />
			<main className="flex-1 lg:overflow-y-auto">
				<AdminMobileNav />
				<div className="p-4 sm:p-6 lg:p-8">{children}</div>
			</main>
		</div>
	);
}
