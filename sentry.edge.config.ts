// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://37c5e5cf32052443b92ef4508762b9a0@o4511006879121408.ingest.us.sentry.io/4511006880694272",

  // Free tier: desactivar performance tracing para no gastar cuota
  tracesSampleRate: 0,

  enableLogs: true,
  sendDefaultPii: true,

  ignoreErrors: [
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});
