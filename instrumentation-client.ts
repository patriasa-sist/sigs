// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://37c5e5cf32052443b92ef4508762b9a0@o4511006879121408.ingest.us.sentry.io/4511006880694272",

  // Free tier: desactivar performance tracing para no gastar cuota
  tracesSampleRate: 0,

  // Capturar replays solo cuando ocurre un error (no sesiones completas)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,
  sendDefaultPii: true,

  // Filtrar errores ruidosos que no son bugs reales
  ignoreErrors: [
    // Errores de red comunes (no son bugs del app)
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "AbortError",
    // Next.js navigation (no son errores reales)
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    // ResizeObserver (bug de browsers, inofensivo)
    "ResizeObserver loop",
  ],
});

// Identificar usuario en Sentry al cargar la app (lazy import para evitar problemas de módulos)
async function identifySentryUser() {
  try {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      Sentry.setUser(null);
      return;
    }

    // Extraer rol del JWT
    let role = "unknown";
    try {
      const payload = session.access_token.split(".")[1];
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      );
      role = decoded.user_role || "unknown";
    } catch { /* ignore */ }

    Sentry.setUser({
      id: session.user.id,
      email: session.user.email,
      role,
    });

    // Escuchar cambios de auth para mantener Sentry actualizado
    supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" || !newSession?.user) {
        Sentry.setUser(null);
      } else {
        let newRole = "unknown";
        try {
          const p = newSession.access_token.split(".")[1];
          const d = JSON.parse(
            atob(p.replace(/-/g, "+").replace(/_/g, "/"))
          );
          newRole = d.user_role || "unknown";
        } catch { /* ignore */ }

        Sentry.setUser({
          id: newSession.user.id,
          email: newSession.user.email,
          role: newRole,
        });
      }
    });
  } catch { /* ignore */ }
}

identifySentryUser();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
