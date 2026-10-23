import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../convex/_generated/api";
import { queryClient } from "../lib/queryClient";
import { disconnectStream } from "../lib/streamRuntime";

const AuthSessionContext = createContext(null);
async function clearAccountCaches() {
  await queryClient.cancelQueries();
  queryClient.clear();
  const keys = await AsyncStorage.getAllKeys();
  const privateKeys = keys.filter(key => ["token", "user"].includes(key) ||
    key.endsWith("_cache") || key.startsWith("messages_"));
  if (privateKeys.length) await AsyncStorage.multiRemove(privateKeys);
}

// Reset all session-specific state on account changes, including pending async UI.
export function AuthSessionProvider({ children }) {
  const { sessionId } = useAuth();
  return <SessionState key={sessionId ?? "signed-out"}>{children}</SessionState>;
}

function SessionState({ children }) {
  const { isLoaded, isSignedIn, userId, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const { isLoading: convexLoading, isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const completeProfile = useMutation(api.users.completeProfile);
  const syncProfile = useAction(api.users.syncFromClerk);
  const [cachesClean, setCachesClean] = useState(false);
  const [cacheError, setCacheError] = useState(false);
  const [syncError, setSyncError] = useState("");
  const signingOut = useRef(null);
  // Wait for the matching Clerk resource; don't reuse a previous account's photo.
  const clerkImageUrl = clerkUser?.id === userId ? clerkUser?.imageUrl : undefined;
  // Resource changes trigger a server refresh; the email itself is never sent
  // as authoritative profile data from the client.
  const clerkEmail = clerkUser?.id === userId ? clerkUser?.primaryEmailAddress : undefined;
  const clerkEmailVersion = [clerkEmail?.id, clerkEmail?.emailAddress, clerkEmail?.verification?.status].join(":");

  const resetCaches = useCallback(async () => {
    try {
      await clearAccountCaches();
      setCacheError(false);
      setCachesClean(true);
    } catch { setCacheError(true); }
  }, []);
  useEffect(() => {
    let active = true;
    clearAccountCaches().then(() => {
      if (active) setCachesClean(true);
    }).catch(() => {
      if (active) setCacheError(true);
    });
    return () => { active = false; };
  }, []);

  const refreshImage = useCallback(async () => {
    try {
      await syncProfile(clerkImageUrl ? { fallbackImageUrl: clerkImageUrl } : {});
      setSyncError("");
    } catch { setSyncError("Your profile details could not refresh. You can retry."); }
  }, [syncProfile, clerkImageUrl]);

  useEffect(() => {
    if (!isAuthenticated || !profile?.isActive) return;
    let active = true;
    syncProfile(clerkImageUrl ? { fallbackImageUrl: clerkImageUrl } : {}).then(() => {
      if (active) setSyncError("");
    }).catch(() => {
      if (active) setSyncError("Your profile details could not refresh. You can retry.");
    });
    return () => { active = false; };
  }, [isAuthenticated, profile?._id, profile?.isActive, syncProfile, clerkImageUrl, clerkEmailVersion]);

  useEffect(() => {
    if (!isAuthenticated || profile !== null || !cachesClean || !clerkUser) return;
    let active = true;
    let fullName = [...(clerkUser.fullName || clerkUser.firstName || "Saflal User").trim()].slice(0, 80).join("");
    if ([...fullName].length < 2) fullName = "Saflal User";

    completeProfile({ fullName }).catch(() => {
      if (active) {
        completeProfile({ fullName }).catch(() => {});
      }
    });
    return () => { active = false; };
  }, [isAuthenticated, profile, cachesClean, clerkUser, completeProfile]);

  const ready = !!(isAuthenticated && profile?.isActive && cachesClean);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active" && ready) void refreshImage();
    });
    return () => subscription.remove();
  }, [ready, refreshImage]);

  const logout = useCallback(() => {
    if (signingOut.current) return signingOut.current;
    const run = (async () => {
      await disconnectStream().catch(() => {});
      try { await signOut(); }
      finally { await clearAccountCaches(); }
    })();
    signingOut.current = run;
    void run.finally(() => { signingOut.current = null; }).catch(() => {});
    return run;
  }, [signOut]);
  useEffect(() => {
    if (profile?.deletedAt === undefined) return;
    // A realtime tombstone signs out every connected session, including when
    // the deletion request's HTTP response is lost or the Settings screen unmounts.
    const leave = () => { void logout().catch(() => {}); };
    leave();
    const retry = setInterval(leave, 5000);
    return () => clearInterval(retry);
  }, [profile?.deletedAt, logout]);

  let state = "loading";
  if (cacheError) state = "cache-error";
  else if (isLoaded && !isSignedIn) state = "signed-out";
  else if (isLoaded && !convexLoading && isAuthenticated && profile !== undefined && cachesClean) {
    state = profile === null ? "profile" : !profile.isActive ? "inactive" : "ready";
  } else if (isLoaded && isSignedIn && !convexLoading && !isAuthenticated) state = "convex-error";

  return <AuthSessionContext.Provider value={{
    state, profile, clerkUser, ready, completeProfile, logout,
    syncError, refreshImage, resetCaches,
  }}>{children}</AuthSessionContext.Provider>;
}
export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error("AuthSessionProvider is required.");
  return context;
}
