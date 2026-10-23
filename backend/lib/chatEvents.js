import { Chat } from "../model/Chat.js";
import { canCommunicate, directPeer, validId } from "./chatAuthorization.js";

export function registerChatEvents(socket, io, onlineUsers, activeChatRooms) {
  const userId = String(socket.userId);
  socket.on("join-chat", async chatId => {
    try {
      if (!validId(chatId)) return;
      const chat = await Chat.findById(chatId).select("participants");
      const peerId = directPeer(chat, userId);
      if (!peerId || !socket.connected) return;
      await socket.join(`chat:${chatId}`);
      activeChatRooms.set(socket.id, chatId);
      const peerSocket = onlineUsers.get(peerId);
      if (peerSocket) io.to(peerSocket).emit("messages-read", { chatId, readBy: userId });
    } catch {
      // No room join, receipt, or private details on failed authorization/read.
    }
  });

  socket.on("leave-chat", chatId => {
    if (!validId(chatId)) return;
    socket.leave(`chat:${chatId}`);
    if (activeChatRooms.get(socket.id) === chatId) activeChatRooms.delete(socket.id);
  });

  socket.on("typing", async data => {
    try {
      const { chatId, isTyping } = data ?? {};
      if (!validId(chatId) || typeof isTyping !== "boolean") return;
      const chat = await Chat.findById(chatId).select("participants");
      const peerId = directPeer(chat, userId);
      if (!peerId || !await canCommunicate(userId, peerId) || !socket.connected) return;
      const payload = { userId, chatId, isTyping };
      // Personal rooms avoid duplicate events for a peer already in the chat.
      socket.to(peerId).emit("typing", payload);
      socket.to(peerId).emit("typing-list", payload);
    } catch {
      // Database failures never fall back to an unchecked broadcast.
    }
  });
}
