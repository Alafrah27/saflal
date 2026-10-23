import http from "http";
import { Server } from "socket.io";
import express from "express";
import { socketMiddleware } from "../middleWare/SocketMiddleWare.js";
import { registerChatEvents } from "./chatEvents.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    pingInterval: 25000,
    pingTimeout: 60000,
    transports: ["websocket", "polling"],
    credentials: true,
  },
});

export const onlineUsers = new Map();
// --- ADD THIS LINE ---
// Tracks which chatId each socket.id is currently looking at
export const activeChatRooms = new Map();

io.use(socketMiddleware);

io.on("connection", (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);

  socket.broadcast.emit("user-online", { userId });
  socket.join(userId);

  io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));

  registerChatEvents(socket, io, onlineUsers, activeChatRooms);

  socket.on("call-user", (data) => {
    const { targetUserId, callerInfo, roomId } = data;
    if (!targetUserId) return;
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("incoming-call", {
        callerId: userId,
        callerInfo,
        roomId,
      });
    }
    // This legacy event only reaches connected Socket.IO clients.
    // Saflal's Stream calls use Convex authorization and Stream push signaling.
  });

  socket.on("call-accepted", (data) => {
    const { callerId, roomId } = data;
    if (!callerId) return;
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", { acceptedBy: userId, roomId });
    }
  });

  socket.on("call-rejected", (data) => {
    const { callerId } = data;
    if (!callerId) return;
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-rejected", { rejectedBy: userId });
    }
  });

  socket.on("call-ended", (data) => {
    const { targetUserId } = data;
    if (!targetUserId) return;
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call-ended", { endedBy: userId });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    activeChatRooms.delete(socket.id);
    socket.broadcast.emit("user-offline", { userId });
    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
  });
});

export { io, app, server };
