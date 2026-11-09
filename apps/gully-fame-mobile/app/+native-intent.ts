import { sanitizeIncomingLink } from "@/utils/deepLink";

/**
 * Called by expo-router for every incoming system link before it is routed (cold start, warm start,
 * universal links and push-notification URLs). Unsafe links fall back to the app root.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return sanitizeIncomingLink(path);
}
