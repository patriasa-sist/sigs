import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Define protected routes and their required roles
const PROTECTED_ROUTES = {
	"/admin": "admin",
	// New role-based routes:
	"/agentes": "agente",
	"/vencimientos": ["agente", "comercial", "admin"],
	"/clientes": ["agente", "comercial", "admin"],
	"/polizas": ["agente", "comercial", "admin"],
	"/cobranzas": ["cobranza", "admin"],
} as const;

const PUBLIC_ROUTES = [
	"/auth/login",
	"/auth/signup",
	"/auth/error",
	"/auth/confirm",
	"/auth/reset-password",
	"/unauthorized",
	"/profile",
] as const;

/**
 * Extrae el rol del usuario desde el JWT token.
 * El rol se agrega al JWT mediante el custom_access_token_hook en Supabase.
 * Esto evita una consulta a la BD en cada request.
 */
function getUserRoleFromSession(session: { access_token: string } | null): string | null {
	if (!session?.access_token) return null;

	try {
		// El JWT tiene 3 partes separadas por puntos: header.payload.signature
		const payload = session.access_token.split(".")[1];
		if (!payload) return null;

		// Decodificar el payload (base64url)
		const decodedPayload = JSON.parse(
			Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
		);

		// El rol está en el claim 'user_role' agregado por el hook
		return decodedPayload.user_role || null;
	} catch {
		console.error("[Middleware] Error decoding JWT for role");
		return null;
	}
}

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
					cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

	// Get current user and session in a single call
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
		// Obtener la sesión para extraer el rol del JWT (sin consulta adicional a BD)
		const {
			data: { session },
		} = await supabase.auth.getSession();

		// Extraer el rol del JWT (agregado por custom_access_token_hook)
		const userRole = getUserRoleFromSession(session) || "invitado";

		// Check if route requires specific role
		const requiredRole = Object.entries(PROTECTED_ROUTES).find(([route]) => pathname.startsWith(route))?.[1];

		if (requiredRole) {
			// Handle multiple roles (array)
			if (Array.isArray(requiredRole)) {
				if (!requiredRole.includes(userRole)) {
					url.pathname = "/unauthorized";
					return NextResponse.redirect(url);
				}
			}
			// Handle single role (string)
			else if (userRole !== requiredRole) {
				url.pathname = "/unauthorized";
				return NextResponse.redirect(url);
			}
		}

		// Redirect authenticated users away from auth pages
		if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup")) {
			// Redirect based on user role
			if (userRole === "admin") {
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
