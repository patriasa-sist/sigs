import { createServerClient } from "@supabase/ssr";
import type { JwtPayload } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Permission } from "@/utils/auth/helpers";
import * as Sentry from "@sentry/nextjs";

/**
 * Errores esperables del ciclo de vida de la sesión (expiró y no se pudo
 * refrescar, sesión eliminada, etc.): el usuario simplemente vuelve a
 * loguearse. No son bugs, así que no se reportan a Sentry.
 */
const EXPECTED_AUTH_ERROR_CODES = new Set([
	"refresh_token_not_found",
	"refresh_token_already_used",
	"session_expired",
	"session_not_found",
]);

/**
 * Rutas protegidas por permiso.
 * Cada ruta requiere que el usuario tenga el permiso especificado en su JWT.
 * Si el valor es un array, basta con tener UNO de los permisos (OR).
 * Admin bypasea todas las verificaciones (hardcoded más abajo).
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

	const url = request.nextUrl.clone();
	const pathname = url.pathname;

	// Verifica el JWT LOCALMENTE: firma ES256 contra el JWKS del proyecto, cacheado
	// en memoria del proceso (GLOBAL_JWKS en auth-js) — sin round trip al servidor de
	// Auth en cada request, a diferencia de getUser(). Internamente pasa por
	// getSession(), que refresca el token expirado y reescribe cookies vía setAll
	// cuando corresponde. Los claims custom (user_role, user_permissions) llegan
	// verificados, no solo decodificados.
	// Sin sesión (visitante anónimo) devuelve { data: null, error: null } — no es error.
	// Ante cualquier fallo real (firma inválida, JWKS/refresh inaccesible) se reporta
	// y se trata al usuario como no autenticado, igual que hacía getUser().
	let claims: JwtPayload | null = null;
	try {
		const { data, error } = await supabase.auth.getClaims();
		if (error) {
			if (!error.code || !EXPECTED_AUTH_ERROR_CODES.has(error.code)) {
				Sentry.captureException(error, {
					extra: { context: "middleware_get_claims", pathname },
				});
			}
		} else {
			claims = data?.claims ?? null;
		}
	} catch (error) {
		// getClaims relanza los errores que no son de auth; si escapara del
		// middleware, TODAS las rutas responderían 500.
		Sentry.captureException(error, {
			extra: { context: "middleware_get_claims_throw", pathname },
		});
	}

	// Check if route is public
	const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));

	// If user is not authenticated and trying to access protected route
	if (!claims && !isPublicRoute) {
		url.pathname = "/auth/login";
		return NextResponse.redirect(url);
	}

	// If user is authenticated, check permission-based access
	if (claims) {
		const effectiveRole: string = claims.user_role || "invitado";
		const userPermissions: string[] = claims.user_permissions || [];

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
					.eq("user_id", claims.sub)
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

// El matcher de rutas vive en proxy.ts en la raíz del proyecto (Next solo lee el config de ahí).
