'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary: a crash inside one page shows this instead of a blank screen,
 * and "Try again" re-renders just that segment. The raw error message is never shown to the
 * user (it can contain internal details); only the opaque digest is, so support can look it up.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-600">
          This page hit an unexpected error. You can try again, or go back to the dashboard.
        </p>
        {error.digest && <p className="mt-2 text-xs text-gray-400">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
