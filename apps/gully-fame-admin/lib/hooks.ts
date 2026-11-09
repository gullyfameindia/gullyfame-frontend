'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Returns `value` after it has stopped changing for `delay` ms (use for search boxes). */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Double-submit protection for action buttons (approve, reject, delete, ban...).
 *
 * `run(key, fn)` ignores the call if the same key is already running. The lock is a ref,
 * so a second click in the same tick is blocked before React re-renders; `isBusy(key)`
 * drives the disabled state of the button.
 */
export function useBusyActions() {
  const lock = useRef<Set<string>>(new Set());
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current.has(key)) return undefined;
    lock.current.add(key);
    setBusy(new Set(lock.current));
    try {
      return await fn();
    } finally {
      lock.current.delete(key);
      setBusy(new Set(lock.current));
    }
  }, []);

  const isBusy = useCallback((key: string) => busy.has(key), [busy]);

  return { run, isBusy, anyBusy: busy.size > 0 };
}

/** Client-side pagination for lists whose API returns everything at once. */
export function usePagedItems<T>(items: readonly T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Stay on a valid page when the list shrinks (filter, delete, refetch).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentPage = Math.min(page, totalPages);
  // Memoized so effects that depend on the visible rows do not re-run on unrelated renders.
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    page: currentPage,
    setPage,
    totalPages,
    total: items.length,
    pageSize,
    pageItems,
  };
}
