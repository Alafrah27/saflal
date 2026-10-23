import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import instance from "../../lib/axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../store/Store";
/**
 * Helper to clear all app caches
 * Call this after mutations that affect multiple data sources
 */
export const clearAllCaches = async () => {
  try {
    await AsyncStorage.multiRemove(["notification_cache", "users_cache"]);
  } catch (error) {
    console.warn("Failed to clear caches:", error);
  }
};

/**
 * Helper to remove a specific notification from cache
 * More efficient than clearing entire cache
 */
export const removeNotificationFromCache = async (notificationId) => {
  try {
    const cached = await AsyncStorage.getItem("notification_cache");
    if (cached) {
      const notifications = JSON.parse(cached);
      const updated = notifications.filter(
        (n) => n?._id !== notificationId && n?.sender?._id !== notificationId,
      );
      await AsyncStorage.setItem("notification_cache", JSON.stringify(updated));
    }
  } catch (error) {
    console.warn("Failed to update notification cache:", error);
  }
};

export const useGetAllUsers = (searchQuery = "") => {
  return useInfiniteQuery({
    queryKey: ["users", searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await instance.get(`/users/all-users?page=${pageParam}&limit=15&search=${searchQuery}`);
      const users = res.data.users || [];

      // Update the cache for the next time the app opens (cache only page 1 for simple startup)
      if (pageParam === 1) {
        await AsyncStorage.setItem("users_cache", JSON.stringify(users));
      }

      return users;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // If we received fewer than the limit (15), there are no more pages
      return lastPage.length === 15 ? allPages.length + 1 : undefined;
    },
    // This maintains the previous state while fetching fresh data
    placeholderData: (previousData) => previousData,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useGetNotifications = () => {
  return useQuery({
    queryKey: ["notification"],
    queryFn: async () => {
      // 1. Fetch from your Render backend
      const res = await instance.get("/friend/request");
      const requestData = res?.data?.requests || [];

      // 2. Save fresh data to cache for the next app launch
      await AsyncStorage.setItem(
        "notification_cache",
        JSON.stringify(requestData),
      );

      return requestData;
    },
    // 3. This is the "Offline-First" magic.
    // It looks for local data before the network request even starts.
    placeholderData: (previousData) => previousData,

    // Optional: How long the data stays "fresh" before trying to background update
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await instance.post(`/friend/send-request/${id}`);
      return res.data;
    },
    onSuccess: async () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries(["notification"]);
      queryClient.invalidateQueries(["users"]);
    },
  });
};

export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await instance.post(`/friend/accept-request/${id}`);
      return { ...res.data, requestId: id };
    },
    onSuccess: async (data) => {
      // 1. Remove this notification from AsyncStorage cache immediately
      await removeNotificationFromCache(data?.requestId);

      // 2. Clear users cache so it refetches with new friend
      await AsyncStorage.removeItem("users_cache");

      // 3. Force refetch (not just invalidate) to bypass staleTime
      queryClient.refetchQueries(["notification"]);
      queryClient.refetchQueries(["users"]);
      queryClient.refetchQueries(["chats"]);
    },
  });
};

export const useRejectFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await instance.post(`/friend/reject-request/${id}`);
      return { ...res.data, requestId: id };
    },
    onSuccess: async (data) => {
      // 1. Remove this notification from AsyncStorage cache immediately
      await removeNotificationFromCache(data?.requestId);

      // 2. Invalidate query to refetch from server
      queryClient.invalidateQueries(["notification"]);
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async ({ chatId, text }) => {
      const res = await instance.post(`/message/${chatId}`, { text });
      return res.data.message || res.data;
    },
    onMutate: async ({ chatId, text }) => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries(["messages", chatId]);

      // 2. Snapshot current messages
      const previousMessages = queryClient.getQueryData(["messages", chatId]);

      // 3. Create optimistic message with temp ID
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        _id: tempId,
        text: text.trim(),
        sender: {
          _id: user?._id,
          FullName: user?.FullName,
          avatar: user?.avatar,
        },
        status: "sending",
        createdAt: new Date().toISOString(),
      };

      // 4. Update the UI instantly
      queryClient.setQueryData(["messages", chatId], (old) => {
        if (!old || !old.pages) return old;
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          // Since messages are newest-first, inject optimistic message at the very front
          newPages[0] = [optimisticMessage, ...newPages[0]];
        } else {
          newPages.push([optimisticMessage]);
        }
        return { ...old, pages: newPages };
      });

      return { previousMessages, chatId, tempId };
    },
    onSuccess: (serverMessage, variables, context) => {
      // Replace the optimistic message with the real one from server (no refetch needed)
      queryClient.setQueryData(["messages", context.chatId], (old) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((msg) =>
              msg._id === context.tempId ? { ...serverMessage, status: "sent" } : msg
            )
          ),
        };
      });
      // Refresh chat list to update last message preview
      queryClient.invalidateQueries(["chats"]);
    },
    onError: (err, variables, context) => {
      // Rollback on failure
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", context.chatId],
          context.previousMessages,
        );
      }
    },
  });

  return {
    sendMessage: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};

export const useGetMyChats = () => {
  return useInfiniteQuery({
    queryKey: ["chats"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await instance.get(`/chat?page=${pageParam}&limit=15`);
      const chats = res.data.chats || [];

      // Cache for offline-first
      if (pageParam === 1) {
        await AsyncStorage.setItem("chats_cache", JSON.stringify(chats));
      }

      return chats;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 15 ? allPages.length + 1 : undefined;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useDeleteChats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chatIds) => {
      const res = await instance.delete("/chat/delete-many", {
        data: { chatIds },
      });
      return res.data;
    },
    onSuccess: async () => {
      await AsyncStorage.removeItem("chats_cache");
      queryClient.invalidateQueries(["chats"]);
    },
  });
};

export const useDeleteMessages = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageIds, chatId }) => {
      const res = await instance.delete("/message/delete-many", {
        data: { messageIds },
      });
      return { ...res.data, chatId };
    },
    onSuccess: async (data) => {
      if (data?.chatId) {
        queryClient.invalidateQueries(["messages", data.chatId]);
      }
      queryClient.invalidateQueries(["chats"]);
    },
  });
};

export const useGetChatMessages = (chatId) => {
  return useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await instance.get(`/message/${chatId}?page=${pageParam}&limit=20`);
      const messages = res?.data?.messages || [];

      // Cache for offline-first
      if (pageParam === 1) {
        await AsyncStorage.setItem("messages_cache", JSON.stringify(messages));
      }

      return messages;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length + 1 : undefined;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30, // 30 seconds - avoid hammering server while it wakes up
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // 1s, 2s, 4s... max 10s
    enabled: !!chatId,
  });
};

export const useGetUserProfile = (userId) => {
  return useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      const res = await instance.get(`/users/user-profile/${userId}`);
      return res.data?.user || res.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useToggleBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const res = await instance.post(`/users/users/${userId}`);
      return res.data;
    },
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries(["userProfile", userId]);
      queryClient.invalidateQueries(["blockedContacts"]);
      queryClient.invalidateQueries(["chats"]);
      queryClient.invalidateQueries(["users"]);
    },
  });
};

export const useGetBlockedContacts = () => {
  return useQuery({
    queryKey: ["blockedContacts"],
    queryFn: async () => {
      const res = await instance.get("/auth/blocked-contacts");
      return res.data?.block || [];
    },
    staleTime: 1000 * 60,
  });
};
