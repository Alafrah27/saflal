import { useState } from "react";
import { useAuthSession } from "../../context/AuthSessionContext";
import AuthScreen from "../../components/auth/AuthScreen";
import { AuthButton, AuthError, AuthInput } from "../../components/auth/AuthControls";
import { useAuthText } from "../../components/auth/authText";

export default function ProfileOnboarding() {
  const { clerkUser, completeProfile, logout } = useAuthSession();
  const text = useAuthText();
  const [fullName, setFullName] = useState(clerkUser?.fullName || "");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true); setError("");
    try { await completeProfile({ fullName, username }); }
    catch (failure) { setError(typeof failure.data === "string" ? failure.data : "Profile could not be saved. Please retry."); }
    finally { setBusy(false); }
  }
  return <AuthScreen title={text("Complete your profile")} subtitle={text("Choose a name and a unique username.")}>
    <AuthInput accessibilityLabel={text("Full name")} placeholder={text("Full name")} value={fullName} onChangeText={setFullName} maxLength={160} />
    <AuthInput accessibilityLabel={text("Username")} placeholder={text("Username")} value={username} onChangeText={setUsername} maxLength={30} autoCapitalize="none" autoCorrect={false} />
    <AuthError message={error} />
    <AuthButton title={text("Continue")} busy={busy} onPress={submit} />
    <AuthButton title={text("Sign out")} secondary disabled={busy} onPress={() => logout().catch(() => setError("Sign-out failed. Please retry."))} />
  </AuthScreen>;
}
