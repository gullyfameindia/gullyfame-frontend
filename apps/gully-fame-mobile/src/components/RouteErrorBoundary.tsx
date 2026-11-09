import React, { useEffect } from "react";
import { router } from "expo-router";
import { ErrorFallback } from "@/components/ErrorBoundary";
import { reportError } from "@/utils/monitoring";

interface Props {
  error: Error;
  retry: () => Promise<void>;
}

/**
 * Route-level boundary. Re-exported as `ErrorBoundary` from a layout file so
 * expo-router renders it when a screen in that section throws; the rest of the
 * app (other sections, the root providers) keeps working.
 */
export function RouteErrorBoundary({ error, retry }: Props) {
  useEffect(() => {
    reportError(error, "route-boundary");
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      onReset={() => {
        retry().catch(() => {});
      }}
      onGoHome={() => {
        try {
          router.replace("/");
        } catch {
          // Navigation may be unavailable if the crash happened during mount.
        }
      }}
    />
  );
}

export default RouteErrorBoundary;
