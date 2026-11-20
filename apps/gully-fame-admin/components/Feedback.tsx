'use client';

/**
 * In-page replacements for the browser's alert() and confirm():
 *  - notify.success(msg) / notify.error(msg): a toast in the top-right corner that fades out.
 *  - await confirmDialog(msg, options): a modal that resolves true (confirm) or false (cancel/Escape).
 * <FeedbackHost /> is mounted once in app/layout.tsx; the functions can be called from anywhere.
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastKind = 'success' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for deletes and other actions that cannot be undone. */
  danger?: boolean;
}
interface ConfirmRequest extends ConfirmOptions {
  message: string;
  resolve: (ok: boolean) => void;
}

type Listener = { toast: (t: Toast) => void; confirm: (c: ConfirmRequest) => void };
let host: Listener | null = null;
let nextId = 1;

function show(kind: ToastKind, message: string) {
  const toast = { id: nextId++, kind, message: String(message || '') };
  if (host) host.toast(toast);
  else if (typeof window !== 'undefined') window.alert(toast.message); // host not mounted yet
}

export const notify = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
};

const DANGER_WORDS = /delete|deactivate|reject|remove|cannot be undone|reset/i;

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (!host) return Promise.resolve(typeof window !== 'undefined' && window.confirm(message));
  return new Promise((resolve) => {
    host!.confirm({ danger: DANGER_WORDS.test(message), ...options, message, resolve });
  });
}

export default function FeedbackHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    host = {
      toast: (toast) => {
        setToasts((list) => [...list.slice(-3), toast]);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== toast.id)), toast.kind === 'error' ? 6000 : 3500);
      },
      confirm: (next) =>
        setRequest((current) => {
          current?.resolve(false); // only one dialog at a time
          return next;
        }),
    };
    return () => {
      host = null;
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    confirmButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <>
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg ${
              t.kind === 'success' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            {t.kind === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            )}
            <p className="flex-1 text-sm">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {request && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-lg font-semibold text-gray-900">
              {request.title || 'Please confirm'}
            </h2>
            <p id="confirm-message" className="mt-2 text-sm text-gray-600">
              {request.message}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {request.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmButton}
                type="button"
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  request.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {request.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
