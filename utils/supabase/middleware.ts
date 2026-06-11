import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Permission } from "@/utils/auth/helpers";
import * as Sentry from "@sentry/nextjs";

/**
 * Rutas protegidas por permiso.
 * Cada ruta requiere que el usuario tenga el permiso especificado en su JWT.
 * Si el valor es un array, basta con tener UNO de los permisos (OR).
 * Admin bypasea todas las verificaciones (hardcoded en getUserPermissionsFromSession).
 */
const PROTECTED_ROUTES: Record<string, Permission | Permission[]> = {
	"/admin/anexos": "anexos.eliminar",
	"/admin": "admin.usuarios",
	"/polizas": "polizas.ver",
	"/clientes": "clientes.ver",
	"/cobranzas": "cobranzas.ver",
	"/siniestros": "siniestros.ver",
	"/vencimientos": "vencimientos.ver",
	"/gerencia/validacion": "polizas.validar",
	"/gerencia": "gerencia.ver",
	"/reportes": ["gerencia.exportar", "gerencia.amlc", "gerencia.aps"],
	"/auditoria": "auditoria.ver",
	"/rrhh": "rrhh.ver",
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
	} catch (error) {
		console.error("[Middleware] Error decoding JWT", {
			message: error instanceof Error ? error.message : String(error),
		});
		Sentry.captureException(error, {
			extra: { context: "jwt_decode_failure" },
		});
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
			const matchedRoute = matchingRoutes[0][0];
			// Admin bypass: admin siempre tiene acceso
			const isAdmin = effectiveRole === "admin";
			const requiredList = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
			let hasPermission = isAdmin || requiredList.some((p) => userPermissions.includes(p));

			// Excepción: los líderes de equipo pueden acceder a Validación aunque no
			// tengan el permiso polizas.validar (validan pólizas/anexos de su equipo).
			// El estado de líder no viaja en el JWT, así que se consulta a la BD solo
			// para esta ruta y solo cuando el permiso no alcanza.
			if (!hasPermission && matchedRoute === "/gerencia/validacion") {
				const { count } = await supabase
					.from("equipo_miembros")
					.select("*", { count: "exact", head: true })
					.eq("user_id", user.id)
					.eq("rol_equipo", "lider");
				hasPermission = (count ?? 0) > 0;
			}

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

// El matcher de rutas vive en middleware.ts en la raíz del proyecto (Next solo lee el config de ahí).
