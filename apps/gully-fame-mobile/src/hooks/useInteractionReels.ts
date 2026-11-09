import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "@/api/client";

export type InteractionKind = "liked" | "saved";

const PAGE_SIZE = 30;
const cacheKey = (kind: InteractionKind) => `@gullyfame_profile_${kind}_reels`;

const normalize = (reel: any) => ({
  ...reel,
  id: String(reel.id || reel._id || ""),
  uri: reel.uri || reel.videoUrl || reel.video_url,
  thumbnail: reel.thumbnail || reel.thumbnail_url,
});

/**
 * Reels the signed-in user saved: the feed (GET /reels) carries
 * user_interactions.is_saved per reel, so pages are scanned for saved ones.
 * The feed has no "liked" flag and there is no liked-reels endpoint, so the
 * liked tab stays empty until the backend provides one.
 */
export function useInteractionReels(kind: InteractionKind, enabled: boolean) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      if (kind === "liked") return { confirmed: [] as any[], nextCursor: null, more: false };
      const response = await apiClient.get<any>("reels", {
        params: { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) },
        signal: controller.signal,
      });
      const data = (response.data as any)?.data;
      const list: any[] = Array.isArray(data?.reels) ? data.reels : [];
      const confirmed = list.filter((reel) => reel?.user_interactions?.is_saved === true).map(normalize);
      const nextCursor: string | null = data?.nextCursor || null;
      const more = Boolean(data?.hasMore) && !!nextCursor && nextCursor !== cursor;
      return { confirmed, nextCursor, more };
    },
    [kind]
  );

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!enabled) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await fetchPage(null);
        cursorRef.current = page.nextCursor;
        if (!mountedRef.current) return;
        setItems(page.confirmed);
        setHasMore(page.more);
        setIsOffline(false);
        AsyncStorage.setItem(cacheKey(kind), JSON.stringify(page.confirmed)).catch(() => {});
      } catch (e: any) {
        if (!mountedRef.current || e?.isCancelled) return;
        setError(e?.message || "Could not load reels");
        setIsOffline(!!e?.isNetworkError);
        setHasMore(false);
        try {
          const cached = await AsyncStorage.getItem(cacheKey(kind));
          if (cached && mountedRef.current) setItems(JSON.parse(cached));
        } catch {
          // No cached copy; the tab shows its error state.
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled, fetchPage, kind]
  );

  // Synchronous lock: onEndReached can fire twice before `loadingMore` state is applied.
  const loadingMoreRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loadingMore || !hasMore || !cursorRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage(cursorRef.current);
      cursorRef.current = page.nextCursor;
      if (!mountedRef.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...page.confirmed.filter((p) => p.id && !seen.has(p.id))];
        setHasMore(page.more && merged.length > prev.length);
        return merged;
      });
    } catch {
      if (mountedRef.current) setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchPage]);

  useEffect(() => {
    load("initial");
  }, [load]);

  const refresh = useCallback(() => load("refresh"), [load]);
  const retry = useCallback(() => load("initial"), [load]);

  return { items, loading: enabled && loading, refreshing, loadingMore, hasMore, isOffline, error, refresh, retry, loadMore };
}
