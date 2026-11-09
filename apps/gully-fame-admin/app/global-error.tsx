'use client';

import { useEffect } from 'react';
import './globals.css';

/**
 * Last-resort boundary: replaces the root layout when the layout itself (or AuthGuard)
 * crashes, so it must render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">The admin panel hit an error</h1>
            <p className="mt-2 text-sm text-gray-600">Reload the page to continue.</p>
            {error.digest && <p className="mt-2 text-xs text-gray-400">Reference: {error.digest}</p>}
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
