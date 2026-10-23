import { create } from "zustand";
import { createSocket } from "../lib/SocketIo";
import * as Notifications from "expo-notifications";
import { queryClient } from "../lib/queryClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallStore } from "./callStore";

export const SocketIoStore = create((set, get) => ({
  socket: null,
  onlineUsers: [],
  isConnect: false,
  currentChatId: null,
  messages: [],
  typingUsers: {}, // { [chatId]: true/false }
  notificationsEnabled: true, // User preference for notifications

  connect: (token) => {
    if (!token) return;

    const existing = get().socket;
    if (existing?.connected) return;

    if (existing) existing.disconnect();

    const socket = createSocket(token);

    // Connection established
    socket.on("connect", () => {
      set({ isConnect: true });
      const currentChatId = get().currentChatId;
      if (currentChatId) {
        socket.emit("join-chat", currentChatId);
      }
    });

    // Disconnection
    socket.on("disconnect", (reason) => {
      set({ isConnect: false });
    });

    // Connection error
    socket.on("connect_error", (error) => {
      console.warn("Socket connect error:", error?.message);
    });

    // Generic error event
    socket.on("error", (error) => {
      console.warn("Socket error:", error?.message);
    });

    socket.on("getOnlineUsers", (users) => {
      // Defensive check: ensure users is an array
      const safeData = Array.isArray(users) ? users : [];
      set({ onlineUsers: safeData });
    });

    socket.on("user-online", (data) => {
      // Defensive check: ensure data and userId exist
      const userId = data?.userId;
      if (!userId) return;

      set((state) => {
        const currentUsers = Array.isArray(state.onlineUsers)
          ? state.onlineUsers
          : [];
        return {
          onlineUsers: [...new Set([...currentUsers, userId])],
        };
      });
    });

    socket.on("user-offline", (data) => {
      // Defensive check: ensure data and userId exist
      const userId = data?.userId;
      if (!userId) return;

      set((state) => {
        const currentUsers = Array.isArray(state.onlineUsers)
          ? state.onlineUsers
          : [];
        return {
          onlineUsers: currentUsers.filter((id) => id !== userId),
        };
      });
    });

    socket.on("friendRequestAccepted", async (data) => {
      // Defensive check
      const userId = data?.userId;

      // Clear caches so fresh data is fetched
      await AsyncStorage.multiRemove(["notification_cache", "users_cache"]);

      // Refresh friends list/users
      queryClient.invalidateQueries(["users"]);
      // Refresh notifications just in case
      queryClient.invalidateQueries(["notification"]);
      // refresh contacts
      queryClient.invalidateQueries(["contacts"]);

      if (get().notificationsEnabled) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Friend Request Accepted",
            body: "Your friend request was accepted!",
          },
          trigger: null,
        });
      }
    });

    socket.on("newFriendRequest", async (data) => {
      // Defensive check: ensure data and sender exist
      if (!data) return;

      // Clear notification cache so fresh data is fetched
      await AsyncStorage.removeItem("notification_cache");

      // Refresh notifications list to show the new request
      queryClient.invalidateQueries(["notification"]);

      if (get().notificationsEnabled) {
        const senderName = data?.sender?.FullName || "Someone";

        Notifications.scheduleNotificationAsync({
          content: {
            title: "New Friend Request",
            body: `${senderName} sent you a friend request`,
          },
          trigger: null,
        });
      }
    });

    /* ── Typing indicator for chat list ── */
    socket.on("typing-list", (data) => {
      if (!data) return;
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [data.chatId]: data.isTyping,
        },
      }));
    });

    /* ── Real-time message received ── */
    socket.on("receive-message", (message) => {
      if (!message) return;

      // Normalize chatId (handles both object and string)
      const incomingChatId = message.chat?._id || message.chat;
      if (!incomingChatId) return;

      console.log("New message received for chat:", incomingChatId);

      queryClient.setQueryData(
        ["messages", incomingChatId.toString()],
        (oldData) => {
          // useInfiniteQuery stores data as { pages: [[...], [...]], pageParams: [...] }
          if (!oldData || !oldData.pages) {
            return { pages: [[message]], pageParams: [1] };
          }

          const firstPage = oldData.pages[0] || [];

          // Prevent exact duplicates
          const allMessages = oldData.pages.flat();
          const exists = allMessages.some((m) => m._id === message._id);
          if (exists) return oldData;

          // Resolve Optimistic UI: Replace the temporary message
          const tempIndex = firstPage.findIndex(
            (m) =>
              String(m._id).startsWith("temp-") &&
              m.status === "sending" &&
              m.text === message.text &&
              m.sender?._id === message.sender?._id
          );

          if (tempIndex !== -1) {
            const newFirstPage = [...firstPage];
            newFirstPage[tempIndex] = { ...message, status: "sent" };
            const newPages = [...oldData.pages];
            newPages[0] = newFirstPage;
            return { ...oldData, pages: newPages };
          }

          // Normal injection: prepend to first page (newest-first)
          const newPages = [...oldData.pages];
          newPages[0] = [message, ...firstPage];
          return { ...oldData, pages: newPages };
        },
      );
    });

    /* ── Chat list update (new last message + unread count) ── */
    socket.on("update-chat-list", (data) => {
      if (!data) return;
      // Invalidate chats query so the list refetches with new data
      queryClient.invalidateQueries(["chats"]);
    });

    /* ── Push notification for messages in OTHER chats ── */
    socket.on("push-notification", (data) => {
      if (!data) return;
      const { currentChatId } = get();
      // Only show notification if we're NOT in the chat that sent it
      if (currentChatId === data.chatId) return;

      if (get().notificationsEnabled) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: data.title || "New Message",
            body: data.body || "",
            data: { chatId: data.chatId },
            android: {
              channelId: 'default',
            },
          },
          trigger: null,
        });
      }
    });

    /* ── Typing indicator inside chat room ── */
    socket.on("typing", (data) => {
      if (!data) return;
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [data.chatId]: data.isTyping,
        },
      }));
    });

    /* ── Read receipts: mark messages as "seen" ── */
    socket.on("messages-read", (data) => {
      if (!data?.chatId) return;
      const chatId = data.chatId;

      queryClient.setQueryData(["messages", chatId.toString()], (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            page.map((msg) => ({ ...msg, status: "seen" }))
          ),
        };
      });
    });

    // ── Call signaling listeners ──
    socket.on("incoming-call", (data) => {
      useCallStore.getState().handleIncomingCall(data);
    });
    socket.on("call-accepted", () => {
      useCallStore.getState().handleCallAccepted();
    });
    socket.on("call-rejected", () => {
      useCallStore.getState().handleCallRejected();
    });
    socket.on("call-ended", () => {
      useCallStore.getState().handleCallEnded();
    });
    socket.on("call-error", (data) => {
      useCallStore.getState().handleCallError(data);
    });

    // Wire call store with socket
    useCallStore.getState().setSocket(socket);

    set({ socket });
  },

  LeavChat: (chatId) => {
    const { socket } = get();
    set({ currentChatId: null });
    if (socket?.connected) {
      socket.emit("leave-chat", chatId);
    }
  },

  joinChat: (chatId) => {
    const { socket } = get();
    set({ currentChatId: chatId });
    if (socket?.connected) {
      socket.emit("join-chat", chatId);
    }
  },

  leaveChat: (chatId) => {
    const { socket } = get();
    set({ currentChatId: null });
    if (socket?.connected) {
      socket.emit("leave-chat", chatId);
    }
  },

  setTypingUser: (chatId, isTyping) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: isTyping,
      },
    }));
  },

  addOptimisticMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  replaceMessage: (tempId, realMessage) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === tempId ? realMessage : msg,
      ),
    })),

  markMessageFailed: (tempId) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === tempId ? { ...msg, status: "failed" } : msg,
      ),
    })),

  toggleNotifications: async () => {
    const current = get().notificationsEnabled;
    const newValue = !current;
    set({ notificationsEnabled: newValue });
    await AsyncStorage.setItem(
      "notifications_enabled",
      JSON.stringify(newValue),
    );
  },

  loadNotificationSetting: async () => {
    const stored = await AsyncStorage.getItem("notifications_enabled");
    if (stored !== null) {
      set({ notificationsEnabled: JSON.parse(stored) });
    }
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }

    set({
      socket: null,
      onlineUsers: [],
      isConnect: false,
    });
  },
}));
