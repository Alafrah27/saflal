import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function useMessageDeletion(chatId, userId, text) {
  const deleteMessage = useMutation(api.messages.deleteForEveryone);
  const [pendingId, setPendingId] = useState(null);
  const session = useRef(null);
  useFocusEffect(useCallback(() => {
    const current = { chatId, userId, active: true, pending: null, alertOpen: false };
    session.current = current;
    setPendingId(null);
    return () => { current.active = false; };
  }, [chatId, userId]));

  const requestDelete = message => {
    const current = session.current;
    if (!current?.active || current.pending || current.alertOpen || message.senderId !== userId ||
      message.deletedAt !== undefined || (message.expiresAt !== undefined && message.expiresAt <= Date.now())) return;
    const valid = () => current.active && session.current === current;
    const submit = async () => {
      current.alertOpen = false;
      if (!valid() || current.pending) return;
      current.pending = message._id;
      setPendingId(message._id);
      try {
        await deleteMessage({ messageId: message._id });
      } catch {
        if (valid()) {
          current.alertOpen = true;
          Alert.alert(text.deleteMessageErrorTitle, text.deleteMessageError, [
            { text: text.cancel, style: "cancel", onPress: () => { current.alertOpen = false; } },
            { text: text.retry, onPress: () => { void submit(); } },
          ], { cancelable: true, onDismiss: () => { current.alertOpen = false; } });
        }
      } finally {
        current.pending = null;
        if (valid()) setPendingId(null);
      }
    };
    current.alertOpen = true;
    Alert.alert(text.deleteMessageTitle, text.deleteMessageBody, [
      { text: text.cancel, style: "cancel", onPress: () => { current.alertOpen = false; } },
      { text: text.deleteMessage, style: "destructive", onPress: () => { void submit(); } },
    ], { cancelable: true, onDismiss: () => { current.alertOpen = false; } });
  };
  return { pendingId, requestDelete };
}
