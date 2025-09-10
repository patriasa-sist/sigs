"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";

export function ConditionalNavbar() {
	const pathname = usePathname();
	
	// Don't show navbar on auth pages
	const hideNavbarRoutes = [
		"/auth/login",
		"/auth/signup", 
		"/auth/confirm",
		"/auth/error",
		"/auth/unauthorized"
	];

	const shouldHideNavbar = hideNavbarRoutes.some(route => pathname?.startsWith(route));

	if (shouldHideNavbar) {
		return null;
	}

	return <Navbar />;
}