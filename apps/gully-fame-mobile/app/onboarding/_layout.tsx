import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}


// Contains a crash to this section instead of taking down the whole app.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/RouteErrorBoundary";
