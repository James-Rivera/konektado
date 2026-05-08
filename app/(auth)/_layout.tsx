import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Welcome" }} />
      <Stack.Screen name="login" options={{ title: "Sign in" }} />
      <Stack.Screen name="register" options={{ title: "Create account" }} />
      <Stack.Screen name="create-password" options={{ title: "Create password" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Forgot password" }} />
      <Stack.Screen name="role" options={{ title: "Choose your role" }} />
    </Stack>
  );
}
