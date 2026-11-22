import { router } from "expo-router";

/** Goes back when there is a screen to return to; otherwise falls back so GO_BACK is never unhandled. */
export const safeBack = (fallback: string = "/auth/signin") => {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as any);
};
