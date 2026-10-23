import { Stack } from "expo-router";
import { useAuthSession } from "../../context/AuthSessionContext";
export default function AuthLayout() {
  const { state } = useAuthSession();
  return <Stack screenOptions={{ headerShown: false,animation:"fade" }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={state === "signed-out"}>
      <Stack.Screen name="wellcome" />
      <Stack.Screen name="login" />
    </Stack.Protected>
  </Stack>;
}
