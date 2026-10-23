import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Text and recorded voice share chronology, receipts, and expiration.
const messageFields = {
  chatId: v.id("chats"),
  senderId: v.id("users"),
  clientMessageId: v.optional(v.string()),
  status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read")),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
};

export default defineSchema({
  // 1. USERS
  users: defineTable({
    clerkId: v.string(),
    fullName: v.string(),
    nickName: v.optional(v.string()),
    directoryOrderKey: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    verifiedEmail: v.optional(v.string()),

    isOnline: v.boolean(),
    lastSeenAt: v.optional(v.number()),

    showOnlineStatus: v.boolean(),
    showLastSeen: v.boolean(),
    notificationsEnabled: v.optional(v.boolean()),
    notificationSettingsVersion: v.optional(v.number()),
    notificationSyncStatus: v.optional(v.union(v.literal("pending"), v.literal("synced"), v.literal("failed"))),

    isActive: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_fullName", ["fullName"])
    .index("by_active_directory_order", ["isActive", "directoryOrderKey"])
    .searchIndex("search_fullName", { searchField: "fullName", filterFields: ["isActive"] })
    .searchIndex("search_nickName", { searchField: "nickName", filterFields: ["isActive"] }),

  // 2. BLOCKED USERS
  blockedUsers: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_pair", ["blockerId", "blockedId"]),

  // 3. FRIEND REQUESTS
  // Durable self-service deletion work survives sign-out and service outages.
  accountDeletions: defineTable({
    userId: v.id("users"), clerkId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("complete")),
    localStep: v.number(), localDone: v.boolean(), clerkDone: v.boolean(), streamDone: v.boolean(),
    streamTaskId: v.optional(v.string()), attempts: v.number(),
    dueAt: v.optional(v.number()), lease: v.optional(v.string()), leaseUntil: v.optional(v.number()),
    createdAt: v.number(), completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]).index("by_due", ["dueAt"]),

  friendRequests: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),

    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("cancelled")
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_pair", ["senderId", "receiverId"])
    .index("by_receiver_status", ["receiverId", "status"]),

  // 4. FRIENDSHIPS
  friendships: defineTable({
    user1Id: v.id("users"),
    user2Id: v.id("users"),
    directoryOrderKey: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user1", ["user1Id"])
    .index("by_user2", ["user2Id"])
    .index("by_user1_directory_order", ["user1Id", "directoryOrderKey"])
    .index("by_user2_directory_order", ["user2Id", "directoryOrderKey"])
    .index("by_pair", ["user1Id", "user2Id"]),

  // 5. CHATS
  chats: defineTable({
    type: v.literal("direct"),
    directPairKey: v.optional(v.string()),

    disappearingMessages: v.boolean(),

    lastMessageId: v.optional(v.id("messages")),
    lastMessageAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_last_message", ["lastMessageAt"])
    .index("by_direct_pair", ["directPairKey"]),

  // 6. CHAT MEMBERS
  chatMembers: defineTable({
    chatId: v.id("chats"),
    userId: v.id("users"),

    lastReadAt: v.optional(v.number()),
    readThrough: v.optional(v.object({ createdAt: v.number(), creationTime: v.number() })),
    isArchived: v.boolean(),
    isMuted: v.boolean(),
    isHidden: v.optional(v.boolean()),
    lastActivityAt: v.optional(v.number()),
    lastActivityOrder: v.optional(v.number()),
    clearedThrough: v.optional(v.object({ createdAt: v.number(), creationTime: v.number() })),

    joinedAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"])
    .index("by_user_visible_activity", ["userId", "isHidden", "lastActivityAt", "lastActivityOrder"])
    .index("by_chat_user", ["chatId", "userId"]),

  // 7. MESSAGES — TEXT + AUDIO
  messages: defineTable(v.union(
    v.object({
      ...messageFields,
      type: v.literal("text"),
      text: v.string(),
    }),
    v.object({
      ...messageFields,
      type: v.literal("audio"),
      audioStorageId: v.id("_storage"),
      audioDuration: v.number(), // Seconds, not milliseconds.
    }),
    v.object({
      ...messageFields,
      type: v.union(v.literal("text"), v.literal("audio")),
      deletedAt: v.number(), // A tombstone has no text or attachment payload.
    }),
  ))
    .index("by_chat", ["chatId"])
    .index("by_chat_created", ["chatId", "createdAt"])
    .index("by_chat_sender_created", ["chatId", "senderId", "createdAt"])
    .index("by_chat_sender_client", ["chatId", "senderId", "clientMessageId"])
    .index("by_audio_storage", ["audioStorageId"])
    .index("by_expires_at", ["expiresAt"]),

  // Private upload lifecycle; never a second message history.
  audioUploads: defineTable({
    ownerId: v.id("users"), chatId: v.id("chats"), clientMessageId: v.string(),
    status: v.union(v.literal("pending"), v.literal("uploading"), v.literal("ready"), v.literal("consumed")),
    storageId: v.optional(v.id("_storage")), audioDuration: v.optional(v.number()),
    lease: v.optional(v.string()), leaseUntil: v.optional(v.number()),
    createdAt: v.number(), expiresAt: v.number(),
  })
    .index("by_owner_key", ["ownerId", "clientMessageId"])
    .index("by_owner_status", ["ownerId", "status"])
    .index("by_storage", ["storageId"])
    .index("by_expires_at", ["expiresAt"]),

  // 8. DEVICES — PUSH NOTIFICATIONS
  devices: defineTable({
    userId: v.id("users"),

    expoPushToken: v.string(),
    installationId: v.optional(v.string()),
    language: v.optional(v.union(v.literal("en"), v.literal("ar"))),
    registrationVersion: v.optional(v.number()),

    platform: v.union(
      v.literal("android"),
      v.literal("ios")
    ),

    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_push_token", ["expoPushToken"])
    .index("by_installation", ["installationId"])
    .index("by_user_active", ["userId", "isActive"]),

  // Private transport state, not an in-app notification inbox.
  pushDeliveries: defineTable({
    eventKey: v.string(),
    kind: v.union(v.literal("friend_request"), v.literal("friend_accepted"), v.literal("message")),
    actorId: v.id("users"), recipientId: v.id("users"), deviceId: v.id("devices"),
    registrationVersion: v.number(),
    friendRequestId: v.optional(v.id("friendRequests")),
    messageId: v.optional(v.id("messages")), chatId: v.optional(v.id("chats")),
    status: v.union(v.literal("pending"), v.literal("sending"), v.literal("submitted"),
      v.literal("complete"), v.literal("failed"), v.literal("suppressed")),
    attempts: v.number(), receiptAttempts: v.number(), dueAt: v.number(),
    ticketId: v.optional(v.string()), errorCode: v.optional(v.string()),
    createdAt: v.number(), updatedAt: v.number(),
  })
    .index("by_actor", ["actorId"])
    .index("by_recipient", ["recipientId"])
    .index("by_event_device", ["eventKey", "deviceId"])
    .index("by_status_due", ["status", "dueAt"])
    .index("by_status_updated", ["status", "updatedAt"]),

 

    

  // 10. CALLS — STREAM AUDIO
  calls: defineTable({
    callerId: v.id("users"),
    receiverId: v.id("users"),
    callerHistoryVisible: v.optional(v.boolean()),
    receiverHistoryVisible: v.optional(v.boolean()),

    streamCallId: v.string(),
    chatId: v.optional(v.id("chats")),
    requestId: v.optional(v.string()),
    ringDeadline: v.optional(v.number()),
    provisioned: v.optional(v.boolean()),
    outcome: v.optional(v.string()),
    cleanupPending: v.optional(v.boolean()),
    cleanupAttempts: v.optional(v.number()),
    lastEventAt: v.optional(v.number()),

    type: v.literal("audio"),

    status: v.union(
      v.literal("ringing"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("missed"),
      v.literal("ended"),
      v.literal("failed")
    ),

    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index("by_caller", ["callerId"])
    .index("by_receiver", ["receiverId"])
    .index("by_caller_created", ["callerId", "createdAt"])
    .index("by_receiver_created", ["receiverId", "createdAt"])
    .index("by_caller_visible_created", ["callerId", "callerHistoryVisible", "createdAt"])
    .index("by_receiver_visible_created", ["receiverId", "receiverHistoryVisible", "createdAt"])
    .index("by_caller_status", ["callerId", "status"])
    .index("by_receiver_status", ["receiverId", "status"])
    .index("by_caller_request", ["callerId", "requestId"])
    .index("by_status_deadline", ["status", "ringDeadline"])
    .index("by_cleanup", ["cleanupPending"])
    .index("by_stream_call", ["streamCallId"]),
});
