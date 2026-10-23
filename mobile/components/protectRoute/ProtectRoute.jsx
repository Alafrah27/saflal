import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/Store";

export default function ProtectRoute({ children }) {
  const router = useRouter();
  const { user, isSignIn, token, isLoading } = useAuthStore();


  useEffect(() => {
    if (!isSignIn && !token && !user) {
      router.replace("/(auth)");
    }
  }, [isSignIn, router, token, user]);

  if (isLoading) return null
  return children;
}
