import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/Store";
import { SocketIoStore } from "../store/socketioStore";

export default function SocketConnection() {
    // Defensive access to auth store
    const token = useAuthStore((state) => state?.token);
    const isSignIn = useAuthStore((state) => state?.isSignIn);

    // Defensive access to socket store functions
    const connect = SocketIoStore((s) => s?.connect);
    const disconnect = SocketIoStore((s) => s?.disconnect);

    // Track if user was previously signed in to detect explicit logout
    const wasSignedIn = useRef(false);

    useEffect(() => {
        try {
            if (isSignIn && token && typeof connect === 'function') {
                connect(token);
                wasSignedIn.current = true;
            } else if (wasSignedIn.current && !isSignIn && typeof disconnect === 'function') {
                // Only disconnect on explicit logout (was signed in, now isn't)
                disconnect();
                wasSignedIn.current = false;
            }
        } catch (error) {
            // Silently handle socket connection errors
            console.warn("SocketConnection error:", error?.message);
        }
    }, [token, isSignIn, connect, disconnect]);

    return null;
}
