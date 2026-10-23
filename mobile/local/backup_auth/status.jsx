import { useState } from "react";
import { useAuthSession } from "../../context/AuthSessionContext";
import AuthScreen from "../../components/auth/AuthScreen";
import { AuthButton, AuthError } from "../../components/auth/AuthControls";
import { useAuthText } from "../../components/auth/authText";
export default function AuthStatus() {
  const { state, logout, resetCaches } = useAuthSession();
  const [error, setError] = useState("");
  const text = useAuthText();
  const message = state === "inactive" ? text("This account is inactive. Contact support if you need help.") :
    state === "cache-error" ? "Your local account data could not be cleared. Please retry." :
    "Your session could not connect. Please sign out and try again.";
  return <AuthScreen title={text("Account unavailable")} subtitle={message}>
    <AuthError message={error} />
    {state === "cache-error" ? <AuthButton title={text("Retry")} onPress={resetCaches} /> : null}
    <AuthButton title={text("Sign out")} onPress={() => logout().catch(() => setError("Sign-out failed. Please retry."))} />
  </AuthScreen>;
}
