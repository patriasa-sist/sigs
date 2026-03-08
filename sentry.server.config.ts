// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://37c5e5cf32052443b92ef4508762b9a0@o4511006879121408.ingest.us.sentry.io/4511006880694272",

  // Free tier: desactivar performance tracing para no gastar cuota
  tracesSampleRate: 0,

  enableLogs: true,
  sendDefaultPii: true,

  // Filtrar errores de navegación de Next.js (no son bugs reales)
  ignoreErrors: [
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});
