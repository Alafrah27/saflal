import { useCallback } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

// A receipt acknowledges only the newest message actually loaded in this screen.
export default function useChatRead(chatId, messageId) {
  const markAsRead = useMutation(api.chats.markAsRead);
  useFocusEffect(useCallback(() => {
    if (!messageId) return;
    let focused = true, pending = false, timer, attempts = 0;
    const read = async () => {
      if (!focused || pending || AppState.currentState !== "active") return;
      pending = true;
      try {
        await markAsRead({ chatId, messageId });
      } catch {
        if (focused && ++attempts < 3) timer = setTimeout(read, 2000);
      } finally { pending = false; }
    };
    void read();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") { clearTimeout(timer); attempts = 0; void read(); }
    });
    return () => { focused = false; clearTimeout(timer); subscription.remove(); };
  }, [chatId, messageId, markAsRead]));
}
