import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Splash Screen - Entry point for auth flow */}
      <Stack.Screen 
        name="splashscreen" 
        options={{ 
          gestureEnabled: false 
        }} 
      />
      
      {/* Onboarding Screens */}
      <Stack.Screen name="onboarding1" options={{}} />
      <Stack.Screen name="onboarding2" options={{}} />
      <Stack.Screen name="onboarding3" options={{}} />
      <Stack.Screen name="onboarding4" options={{}} />
      
      {/* Authentication Screens */}
      <Stack.Screen name="signin" options={{}} />
      <Stack.Screen name="createaccount" options={{}} />
      <Stack.Screen name="login-via-otp" options={{}} />
      <Stack.Screen name="login-via-email" options={{}} />
      <Stack.Screen name="verify-otp" options={{}} />
      <Stack.Screen name="resetpassword" options={{}} />
      <Stack.Screen name="forgotpassword" options={{}} />
      
      {/* Location Selection */}
      <Stack.Screen name="location/index" options={{}} />
      
      {/* Legal */}
      <Stack.Screen name="termsandconditions" options={{}} />
    </Stack>
  );
}
// Contains a crash to this section instead of taking down the whole app.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/RouteErrorBoundary";
