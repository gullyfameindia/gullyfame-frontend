import * as Sentry from "@sentry/react-native";

/**
 * Crash / error reporting.
 *
 * - Runs only when EXPO_PUBLIC_SENTRY_DSN is set. A DSN is a public identifier
 *   (it can only send events), so it is safe in the bundle. The Sentry *auth
 *   token* (SENTRY_AUTH_TOKEN) is a build-time secret used to upload source maps
 *   and is never read by app code.
 * - Personal data is never sent: no default PII, no user object, no request
 *   bodies/headers/cookies, and breadcrumb payloads are dropped.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || "";
const ENVIRONMENT = process.env.EXPO_PUBLIC_ENV || (__DEV__ ? "development" : "production");

let initialized = false;

export const isMonitoringEnabled = () => initialized;

export function initMonitoring(): void {
  if (initialized || !DSN || __DEV__) return;
  try {
    Sentry.init({
      dsn: DSN,
      environment: ENVIRONMENT,
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      tracesSampleRate: 0.05,
      beforeBreadcrumb(breadcrumb) {
        // Network/console breadcrumbs can contain URLs with ids or message text.
        if (breadcrumb.category === "console" || breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
          return null;
        }
        return { ...breadcrumb, data: undefined };
      },
      beforeSend(event) {
        delete event.user;
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
          delete event.request.headers;
          delete event.request.query_string;
        }
        return event;
      },
    });
    initialized = true;
  } catch {
    // Monitoring must never crash the app.
  }
}

/** Reports an error with an optional short, non-personal tag describing where it happened. */
export function reportError(error: unknown, where?: string): void {
  if (!initialized) return;
  try {
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: where ? { where } : undefined,
    });
  } catch {
    // ignore
  }
}
