import { API_ORIGIN } from "@/config/env";

// The API returns media either as absolute URLs or as server-relative paths ("/thumbs/a.jpg").
// Relative paths are served from the API host, not from the /v1/api prefix.
const SERVER_ORIGIN = API_ORIGIN;

export function resolveMediaUrl(path?: string | null): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^(https?:|file:|content:|data:)/i.test(trimmed)) return trimmed;
  return `${SERVER_ORIGIN}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

/** 1234 -> "1.2K", 3400000 -> "3.4M". */
export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value < 1000) return String(Math.floor(value));
  const units = [
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ];
  for (const u of units) {
    if (value >= u.v) {
      const n = value / u.v;
      return `${n >= 100 ? Math.floor(n) : n.toFixed(1).replace(/\.0$/, "")}${u.s}`;
    }
  }
  return String(value);
}
