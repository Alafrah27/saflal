import { io } from "socket.io-client";

export const createSocket = (token) => {
  return io("https://luqya.onrender.com", {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    auth: {
      token,
    },
  });
};
