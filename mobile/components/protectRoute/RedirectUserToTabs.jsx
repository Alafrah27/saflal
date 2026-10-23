import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/Store";
import { useEffect } from "react";

export default function RedirectUserToTabs({ children }) {
    const router = useRouter();
    const { user, isSignIn, token, isLoading } = useAuthStore();


    useEffect(() => {
        if (isSignIn && token && user) {
            router.replace("/(tabs)/chat");
        }
    }, [isSignIn, router, token, user]);

    if (!isSignIn && !token && !user) {
        router.replace("/(auth)");
    }
    if (isLoading) return null
    return children;
}
