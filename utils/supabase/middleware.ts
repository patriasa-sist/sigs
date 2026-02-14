import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Permission } from "@/utils/auth/helpers";

/**
 * Rutas protegidas por permiso.
 * Cada ruta requiere que el usuario tenga el permiso especificado en su JWT.
 * Admin bypasea todas las verificaciones (hardcoded en getUserPermissionsFromSession).
 */
const PROTECTED_ROUTES: Record<string, Permission> = {
	"/admin": "admin.usuarios",
	"/polizas": "polizas.ver",
	"/clientes": "clientes.ver",
	"/cobranzas": "cobranzas.ver",
	"/siniestros": "siniestros.ver",
	"/vencimientos": "vencimientos.ver",
	"/gerencia/validacion": "polizas.validar",
};

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
 * Decodifica el payload del JWT y extrae los datos del usuario.
 * Retorna rol y permisos sin consulta a BD.
 */
function decodeJWTPayload(accessToken: string): { user_role: string | null; user_permissions: string[] } {
	try {
		const payload = accessToken.split(".")[1];
		if (!payload) return { user_role: null, user_permissions: [] };

		const decoded = JSON.parse(
			Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
		);

		return {
			user_role: decoded.user_role || null,
			user_permissions: decoded.user_permissions || [],
		};
	} catch {
		console.error("[Middleware] Error decoding JWT");
		return { user_role: null, user_permissions: [] };
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

	// If user is authenticated, check permission-based access
	if (user) {
		const {
			data: { session },
		} = await supabase.auth.getSession();

		const { user_role: userRole, user_permissions: userPermissions } = session?.access_token
			? decodeJWTPayload(session.access_token)
			: { user_role: "invitado", user_permissions: [] as string[] };

		const effectiveRole = userRole || "invitado";

		// Find the most specific matching route (longer path = more specific)
		const matchingRoutes = Object.entries(PROTECTED_ROUTES)
			.filter(([route]) => pathname.startsWith(route))
			.sort(([a], [b]) => b.length - a.length);

		const requiredPermission = matchingRoutes[0]?.[1];

		if (requiredPermission) {
			// Admin bypass: admin siempre tiene acceso
			const isAdmin = effectiveRole === "admin";
			const hasPermission = isAdmin || userPermissions.includes(requiredPermission);

			if (!hasPermission) {
				url.pathname = "/unauthorized";
				return NextResponse.redirect(url);
			}
		}

		// Redirect authenticated users away from auth pages
		if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup")) {
			if (effectiveRole === "admin") {
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
