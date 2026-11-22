import { useEffect, useState } from "react";
import { apiGet } from "@api/client";

/**
 * Usernames: 3-20 characters, lowercase letters, numbers, "." and "_".
 * Same rules as the server (gullyfame-backend/src/util/username.js), which has the final say.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const USERNAME_RE = /^[a-z0-9._]+$/;

/** What the user types → what is stored: no leading "@", lowercase, no spaces. */
export const cleanUsername = (raw: string) =>
  raw.replace(/^@+/, "").toLowerCase().replace(/\s+/g, "").slice(0, USERNAME_MAX);

/** A rule broken before asking the server, or null. */
export function usernameRuleProblem(username: string): string | null {
  if (!username) return "Choose a username";
  if (!USERNAME_RE.test(username)) return "Use only lowercase letters, numbers, . and _";
  if (username.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters`;
  return null;
}

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

interface AvailabilityResult {
  username: string;
  available: boolean;
  reason: string | null;
  message: string;
}

/**
 * Live availability check while typing (debounced).
 * - signedIn: uses GET /user/username-available, where your own current name counts as free.
 * - current: the user's existing username; unchanged means "idle" (nothing to check).
 */
export function useUsernameCheck(value: string, { signedIn = false, current = "" } = {}) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const username = cleanUsername(value);
    if (!username || username === cleanUsername(current)) {
      setStatus("idle");
      setMessage("");
      return;
    }
    const problem = usernameRuleProblem(username);
    if (problem) {
      setStatus("invalid");
      setMessage(problem);
      return;
    }
    setStatus("checking");
    setMessage("");
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await apiGet<AvailabilityResult>(
          signedIn ? "user/username-available" : "auth/username-available",
          { params: { username }, ...(signedIn ? {} : { skipAuth: true }) } as any
        );
        if (cancelled) return;
        if (res.available) {
          setStatus("available");
          setMessage(`@${res.username} is available`);
        } else {
          setStatus(res.reason === "username_taken" ? "taken" : "invalid");
          setMessage(res.message || "That username isn't available.");
        }
      } catch {
        // Older servers have no check endpoint; the server still checks on save.
        if (!cancelled) {
          setStatus("error");
          setMessage("");
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, signedIn, current]);

  return { status, message, username: cleanUsername(value) };
}
