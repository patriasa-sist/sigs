"use server";

import * as Sentry from "@sentry/nextjs";
import { getCurrentUser } from "@/utils/auth/helpers";

/**
 * Captura un error en Sentry con contexto adicional e identifica al usuario.
 * Usar en catch blocks de server actions y API routes.
 *
 * @example
 * ```ts
 * } catch (error) {
 *   captureError(error, "guardarPoliza");
 *   return { error: "Error al guardar" };
 * }
 * ```
 */
export async function captureError(
	error: unknown,
	context?: string,
	extra?: Record<string, unknown>
) {
	// Identificar usuario en el scope del error
	try {
		const user = await getCurrentUser();
		if (user) {
			Sentry.setUser({
				id: user.id,
				email: user.email,
			});
		}
	} catch { /* no bloquear el reporte si falla obtener el usuario */ }

	Sentry.captureException(error, {
		...(context || extra
			? {
					extra: {
						...(context ? { action: context } : {}),
						...extra,
					},
				}
			: {}),
	});

	// Asegurar que el evento se envíe antes de que la función serverless termine
	await Sentry.flush(2000);
}
