import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/api/client";

/**
 * User-generated-content safety: block and report, backed by the server (F3 / backend B4).
 *
 *  - Blocking: POST/DELETE user/:id/block, GET user/blocked. The server enforces it both ways
 *    (feeds, search, comments, profiles, chat, follows). The list is also cached here so screens
 *    can filter instantly.
 *  - Reporting: reportContent(kind, id) opens the report sheet (ReportHost, mounted in the main
 *    layout), which sends POST user/:id/report, reels/comments/:id/report or chat/report.
 *  - Blocks saved only on this phone by older app versions are uploaded once.
 */

// Same official support address as the Help & Support screen.
export const SUPPORT_EMAIL = "admin@gullyfame.com";

/** Where older app versions kept blocks on the phone; uploaded to the server once, then removed. */
const LEGACY_BLOCKED_KEY = "@gullyfame_blocked_users";

export interface BlockedUser {
  id: string;
  /** Public display name, used to label the entry in the "Blocked users" list. */
  name: string;
}

interface ServerBlockedUser {
  id: string;
  name?: string;
  username?: string;
}

let cache: BlockedUser[] | null = null;
let loading: Promise<BlockedUser[]> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

async function uploadLegacyBlocks(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_BLOCKED_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    const ids = Array.isArray(parsed)
      ? parsed.map((e: any) => (e && typeof e.id === "string" ? e.id : "")).filter(Boolean)
      : [];
    for (const id of ids) {
      await apiPost(`user/${id}/block`, {}).catch(() => undefined);
    }
    await AsyncStorage.removeItem(LEGACY_BLOCKED_KEY);
  } catch {
    // Try again next launch.
  }
}

async function fetchAll(): Promise<BlockedUser[]> {
  await uploadLegacyBlocks();
  const out: BlockedUser[] = [];
  for (let page = 1; page <= 10; page++) {
    const data = await apiGet<{ users: ServerBlockedUser[]; totalPages: number }>("user/blocked", {
      params: { page, limit: 100 },
    });
    for (const u of data?.users ?? []) {
      out.push({ id: String(u.id), name: u.name || u.username || "User" });
    }
    if (!data || page >= (data.totalPages || 1)) break;
  }
  return out;
}

async function load(): Promise<BlockedUser[]> {
  if (cache) return cache;
  if (!loading) {
    loading = fetchAll()
      .then((list) => {
        cache = list;
        notify();
        return list;
      })
      .catch(() => cache ?? [])
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  return load();
}

export async function getBlockedUserIds(): Promise<Set<string>> {
  return new Set((await load()).map((entry) => entry.id));
}

/** Throws (ApiError) if the server refuses, e.g. offline. */
export async function blockUser(id: string, name = "User"): Promise<void> {
  if (!id) return;
  await apiPost(`user/${id}/block`, {});
  const current = cache ?? [];
  if (!current.some((entry) => entry.id === id)) {
    cache = [...current, { id, name: name.trim().slice(0, 60) || "User" }];
    notify();
  }
}

export async function unblockUser(id: string): Promise<void> {
  await apiDelete(`user/${id}/block`);
  cache = (cache ?? []).filter((entry) => entry.id !== id);
  notify();
}

/** Forget the cached list (called on logout). */
export function resetBlockedUsersCache(): void {
  cache = null;
  notify();
}

export const BLOCKED_USERS_STORAGE_KEY = LEGACY_BLOCKED_KEY;

/** Live list of blocked users; re-renders when someone is blocked or unblocked. */
export function useBlockedUsers(): BlockedUser[] {
  const [users, setUsers] = useState<BlockedUser[]>(cache ?? []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      load().then((list) => {
        if (active) setUsers(list);
      });
    };
    refresh();
    listeners.add(refresh);
    return () => {
      active = false;
      listeners.delete(refresh);
    };
  }, []);

  return users;
}

/* --------------------------------------------------------------- reporting */

export type ReportKind = "reel" | "comment" | "user" | "chat";
export interface ReportRequest {
  kind: ReportKind;
  id: string;
}

let reportListener: ((request: ReportRequest) => void) | null = null;

/** Used by ReportHost (mounted once in the main layout). */
export function setReportListener(listener: ((request: ReportRequest) => void) | null): void {
  reportListener = listener;
}

/**
 * Opens the report sheet for a user, comment, chat or reel. Returns false if the sheet is not
 * available (should not happen inside the signed-in app).
 */
export async function reportContent(kind: ReportKind, id: string): Promise<boolean> {
  if (!id || !reportListener) return false;
  reportListener({ kind, id });
  return true;
}
