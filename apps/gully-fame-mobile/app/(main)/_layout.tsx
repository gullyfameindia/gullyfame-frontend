import { useEffect, useState } from 'react';
import { safeIdParam } from "@/utils/routeParams";
import { Stack, router } from 'expo-router';
import { registerDeviceForNotifications, setupNotificationListeners } from '@/api/services/notificationIntegrationService';
import { socketChatService } from '@/api/services/socketChatService';
import { getAuthToken } from "@/api/client";
import { openCompetition } from "@/utils/openCompetition";

// Push payloads from the backend carry ids (competitionId, reelId, fromUserId), not a type.
const openFromPush = (data: Record<string, any> | undefined) => {
  if (!data) return;
  const competitionId = safeIdParam(data.competitionId);
  const reelId = safeIdParam(data.reelId);
  if (competitionId) openCompetition(competitionId);
  else if (reelId) router.push({ pathname: "/(main)/reel", params: { startReelId: reelId } } as any);
  else router.push("/(main)/settings/notifications" as any);
};

export default function MainLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        if (await getAuthToken()) {
          registerDeviceForNotifications();
          socketChatService.connect();
          unsubscribe = setupNotificationListeners(undefined, (content) => openFromPush(content.data as any));
        }
      } finally {
        setIsReady(true);
      }
    })();
    return () => unsubscribe?.();
  }, []);

  if (!isReady) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#3C2610' },
      }}
    >
      {/* Bottom-nav destinations: switch with no animation so tabs cut instantly, no fade/slide flash */}
      <Stack.Screen name="home" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="reel" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="inbox" options={{ headerShown: false }} />

      {/* Camera screen: transparent background with disabled animation */}
      <Stack.Screen
        name="camera"
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'none',
        }}
      />
    </Stack>
  );
}

// Contains a crash to this section instead of taking down the whole app.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/RouteErrorBoundary";
