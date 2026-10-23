import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import instance from "../lib/axios";

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: false,
  token: null,
  isSignIn: false,

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await instance.post("/auth/register", data);
      const { user, token } = res.data;

      // 1. Persist to Storage
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      // 2. CRITICAL: Update the Zustand State so RootLayout sees it
      set({
        user,
        token,
        isSignIn: true,
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `hello ${user.FullName}`,
          body: `you have successfully logged  to luqya`,
        },
        trigger: null,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
      };
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (data) => {
    set({ isLoading: true });
    try {
      const res = await instance.post("/auth/login", data);
      const { user, token } = res.data;

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      // Update State
      set({
        user,
        token,
        isSignIn: true,
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `hello ${user.FullName}`,
          body: `you have successfully logged  to luqya`,
        },
        trigger: null,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    } finally {
      set({ isLoading: false });
    }
  },

  userAuth: async () => {
    set({ isLoading: true });
    try {
      // Check if we already have a token in state or storage
      const token = get().token || (await AsyncStorage.getItem("token"));
      console.log("[userAuth] token from storage:", token ? "EXISTS" : "NONE");
      if (!token) throw new Error("No token");

      const res = await instance.get("/auth/user-profile");
      console.log("[userAuth] profile OK:", res.data?.FullName);
      set({ user: res.data, isSignIn: true, token });
    } catch (error) {
      console.log("[userAuth] FAILED:", error?.message || error);
      // Clear ALL stale data from AsyncStorage so the app starts fresh
      await AsyncStorage.multiRemove([
        "token",
        "user",
        "notification_cache",
        "users_cache",
        "chats_cache",
        "messages_cache",
      ]);
      console.log("[userAuth] Cleared all AsyncStorage caches");
      set({ isSignIn: false, user: null, token: null });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove([
      "token",
      "user",
      "notification_cache",
      "users_cache",
      "chats_cache",
      "messages_cache",
    ]);
    set({ user: null, token: null, isSignIn: false });
  },

  updateUser: async (data) => {
    if (!data) return;

    set({ isLoading: true });

    try {
      const res = await instance.put(`/auth/update-profile`, data);

      set({ user: res.data });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Update failed",
      };
    } finally {
      set({ isLoading: false });
    }
  },
  deleteAccount: async () => {
    set({ isLoading: true });
    try {
      // 1. Call the API
      await instance.delete(`/auth/delete-account`);

      // 2. Clear EVERYTHING from Storage
      await AsyncStorage.multiRemove(["token", "user"]);

      // 3. Reset the state to initial values
      set({
        user: null,
        token: null,
        isSignIn: false,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Delete failed",
      };
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;
