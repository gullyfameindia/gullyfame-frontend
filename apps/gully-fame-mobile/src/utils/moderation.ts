import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";

/**
 * User-generated-content safety: block and report.
 *
 * The backend has no block/report endpoints yet, so:
 *  - Blocking is stored on this device and applied when feeds, comments and chats are shown. It
 *    hides the other user's content from the blocker; it cannot stop them contacting the blocker
 *    server-side (that needs a backend endpoint).
 *  - Reporting opens a pre-filled email to support containing only the content type and id.
 * Both are wired so they can be swapped for real endpoints without touching the screens.
 */

// Same official support address as the Help & Support screen.
export const SUPPORT_EMAIL = "admin@gullyfame.com";

const BLOCKED_KEY = "@gullyfame_blocked_users";

export interface BlockedUser {
  id: string;
  /** Public display name, only used to label the entry in the "Blocked users" list. */
  name: string;
}

let cache: BlockedUser[] | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

async function load(): Promise<BlockedUser[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(BLOCKED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is BlockedUser =>
            !!entry && typeof entry.id === "string" && entry.id.length > 0 && typeof entry.name === "string"
        )
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function save(next: BlockedUser[]): Promise<void> {
  cache = next;
  notify();
  try {
    await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(next));
  } catch {
    // The in-memory list still applies for this session.
  }
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  return load();
}

export async function getBlockedUserIds(): Promise<Set<string>> {
  return new Set((await load()).map((entry) => entry.id));
}

export async function blockUser(id: string, name = "User"): Promise<void> {
  if (!id) return;
  const current = await load();
  if (current.some((entry) => entry.id === id)) return;
  await save([...current, { id, name: name.trim().slice(0, 60) || "User" }]);
}

export async function unblockUser(id: string): Promise<void> {
  const current = await load();
  await save(current.filter((entry) => entry.id !== id));
}

/** Forget the in-memory list (called on logout, together with removing the stored key). */
export function resetBlockedUsersCache(): void {
  cache = null;
  notify();
}

export const BLOCKED_USERS_STORAGE_KEY = BLOCKED_KEY;

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

export type ReportKind = "reel" | "comment" | "user" | "chat";

const KIND_LABEL: Record<ReportKind, string> = {
  reel: "reel",
  comment: "comment",
  user: "user",
  chat: "chat / user",
};

/**
 * Opens a pre-filled report email. Only the content type and id are included (no account details);
 * the person reporting adds the reason themselves. Returns false if no mail app could be opened.
 */
export async function reportContent(kind: ReportKind, id: string): Promise<boolean> {
  const subject = `Report: ${KIND_LABEL[kind]} ${id}`;
  const body = `Content type: ${KIND_LABEL[kind]}\nContent ID: ${id}\n\nWhat is wrong with this ${KIND_LABEL[kind]}?\n`;
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert("Couldn't open email", `Please write to ${SUPPORT_EMAIL} and include this ID: ${id}`);
    return false;
  }
}
