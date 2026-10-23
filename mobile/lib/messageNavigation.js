// Route IDs identify conversations, never contact/user IDs.
export function messageRoute(chatId) {
  return { pathname: "/chat/[id]", params: { id: chatId, source: "convex" } };
}

// A contact preview has no conversation yet. Never pass its sentinel/user ID
// to chat or message APIs; the route's mode selects the separate profile query.
export function contactMessageRoute(userId) {
  return { pathname: "/chat/[id]", params: { id: "new", source: "convex", mode: "contact", userId } };
}
