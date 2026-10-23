import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const instance = axios.create({
  baseURL: "https://luqya.onrender.com/api/v1",
  timeout: 20000, // Increased timeout; 1000ms is very short for a free Render instance
  headers: { "Content-Type": "application/json" },
});

/** 1. REQUEST INTERCEPTOR: Inject Token */
instance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/** 2. RESPONSE INTERCEPTOR: Auto-retry 503 (server waking up) + Log errors */
instance.interceptors.response.use(
  // Success - pass through
  (response) => response,

  // Error - retry 503s, then log and reject
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    // Auto-retry for 503 (Render free-tier server waking up)
    if (status === 503 && (!config._retryCount || config._retryCount < 2)) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = config._retryCount * 2000; // 2s, 4s
      if (__DEV__) {
        console.log(`Server waking up, retry ${config._retryCount}/2 in ${delay}ms...`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return instance(config);
    }

    if (__DEV__ && status && status !== 401) {
      console.warn(
        `API Error: ${config.method?.toUpperCase()} ${config.url} → ${status}`,
      );
    }

    // Still reject so the calling code can handle it
    return Promise.reject(error);
  },
);

export default instance;
