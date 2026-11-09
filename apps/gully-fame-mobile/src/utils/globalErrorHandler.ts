// Global handlers for errors that escape React (event handlers, timers, async code)
// and for promise rejections nobody catches. React render errors are handled by
// the root ErrorBoundary in app/_layout.tsx.

import { reportError } from "./monitoring";

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;

let installed = false;

export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  const errorUtils = (global as any).ErrorUtils as
    | { getGlobalHandler: () => ErrorHandler; setGlobalHandler: (h: ErrorHandler) => void }
    | undefined;

  if (errorUtils) {
    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      // Keep React Native's default behaviour for fatal errors (red box in dev,
      // crash report in release). Non-fatal errors are logged without crashing.
      reportError(error, isFatal ? "global-fatal" : "global-nonfatal");
      if (isFatal) {
        defaultHandler(error, isFatal);
      }
    });
  }

  // Hermes exposes a promise rejection tracker. Log unhandled rejections in every build
  // instead of only in development.
  const hermes = (global as any).HermesInternal;
  if (hermes?.enablePromiseRejectionTracker) {
    hermes.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (_id: number, rejection: unknown) => {
        reportError(rejection, "unhandled-rejection");
      },
      onHandled: () => {},
    });
  }
}
