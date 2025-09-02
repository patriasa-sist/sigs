import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Define protected routes and their required roles
const PROTECTED_ROUTES = {
	"/admin": "admin",
	"/auth/invite": "admin",
} as const;

const PUBLIC_ROUTES = ["/auth/login", "/auth/signup", "/auth/error", "/auth/confirm", "/unauthorized"] as const;

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
					supabaseResponse = NextResponse.next({
						request,
					});
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options)
					);
				},
			},
		}
	);

	// Get current user
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const url = request.nextUrl.clone();
	const pathname = url.pathname;

	// Check if route is public
	const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));

	// If user is not authenticated and trying to access protected route
	if (!user && !isPublicRoute) {
		url.pathname = "/auth/login";
		return NextResponse.redirect(url);
	}

	// If user is authenticated, check role-based permissions
	if (user) {
		console.log("🔍 [Middleware] Authenticated user:", user.id, "accessing:", pathname);
		
		// Use admin client to get user profile with role (bypasses RLS policies)
		const supabaseAdmin = createAdminClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);
		
		const { data: profile, error } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();

		if (error) {
			console.log("❌ [Middleware] Admin client failed to fetch profile:");
			console.log("   Error:", error.message);
		} else if (profile) {
			console.log("✅ [Middleware] Successfully fetched role via admin client:", profile.role);
		} else {
			console.log("⚠️ [Middleware] Admin client returned no profile data");
		}

		// Check if route requires specific role
		const requiredRole = Object.entries(PROTECTED_ROUTES).find(([route]) => pathname.startsWith(route))?.[1];

		if (requiredRole) {
			console.log("🔒 [Middleware] Route requires role:", requiredRole, "| User has role:", profile?.role);
		}

		if (requiredRole && profile?.role !== requiredRole) {
			console.log("🚫 [Middleware] Access denied - redirecting to /unauthorized");
			url.pathname = "/unauthorized";
			return NextResponse.redirect(url);
		}

		// Redirect authenticated users away from auth pages
		if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup")) {
			// Redirect based on user role
			if (profile?.role === "admin") {
				url.pathname = "/admin";
			} else {
				url.pathname = "/";
			}
			return NextResponse.redirect(url);
		}
	}

	return supabaseResponse;
}

// Configure which paths the middleware runs on
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - images, icons, etc. (static assets)
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
