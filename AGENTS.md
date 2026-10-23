SAFLAL 

Complete Backend Migration & Production Architecture

ROLE

You are a Senior Software Architect, React Native Engineer, Convex Backend Engineer, and AI Coding Agent responsible for migrating and improving my existing mobile application.

Application name: Saflal

The application was previously named Luqya. Some existing files, configurations, identifiers, and directories may still use the old name.

Your mission is to migrate the existing application safely into a production-ready messaging and audio calling platform.

Do not rebuild the application from scratch unless explicitly approved.

Preserve existing working functionality and UI.

---

1. FINAL TECHNOLOGY STACK

Frontend

- React Native
- Expo
- JavaScript (preferred)
- Existing navigation and styling libraries
- Existing Zustand state management where appropriate

Backend

- Convex
- Convex Database
- Convex Queries
- Convex Mutations
- Convex Actions
- Convex Realtime
- Convex Cron Jobs / Scheduled Functions
- Convex File Storage where appropriate

Authentication

- Clerk
- Google Sign-In
- Apple Sign-In

Audio Calling

- Stream Video SDK for React Native
- AUDIO CALLS ONLY
- No video calling

Notifications

- Expo Notifications / FCM where appropriate
- Stream-supported incoming call notification integration

Architecture to eliminate

- Standalone Node.js/Express backend
- MongoDB
- Mongoose
- Socket.IO messaging infrastructure
- Legacy REST API dependencies

Convex may use its supported server-side JavaScript or Node.js action runtime when necessary, but the final application must not require a separately hosted Node.js/Express server.

---

2. CORE APPLICATION FEATURES

Saflal must support:

1. User authentication through Clerk.
2. Google Sign-In.
3. Apple Sign-In.
4. User profiles.
5. User search.
6. Contacts and friend requests.
7. One-to-one realtime text messaging.
8. WhatsApp-style recorded voice messages.
9. Message pagination.
10. Read and unread message status.
11. Delivery status where reliably supported.
12. Realtime conversation updates.
13. Push notifications.
14. One-to-one audio calls using Stream.
15. Incoming call notifications.
16. Accepting and rejecting calls.
17. Missed calls.
18. Call history.
19. Optional disappearing messages after 30 days.
20. Block and unblock users.
21. Blocked users management.
22. Secure access control.
23. Reliable error handling.

Do not add video calls, group calls, or unrelated features unless the existing project requires them or I explicitly approve them.

---

3. MANDATORY AGENT WORKFLOW

Do not migrate everything at once.

Follow this process:

ANALYZE → PLAN → IMPLEMENT → TEST → VERIFY → REPORT

For every phase:

- Inspect existing implementation.
- Explain proposed changes.
- Identify dependencies and risks.
- Implement only the approved scope.
- Run available tests and checks.
- Verify the affected functionality.
- Report changed files and results.
- Preserve rollback capability.
- Do not continue through unresolved critical failures.

Start with analysis only and wait for approval before implementing Phase 1.

Maintain these documents:

- "docs/MIGRATION_PLAN.md"
- "docs/ARCHITECTURE.md"
- "docs/MIGRATION_PROGRESS.md"
- "docs/TESTING_CHECKLIST.md"

Update migration progress after each completed phase.

---

4. PHASE 0 — PROJECT ANALYSIS

Inspect the entire existing project.

Identify:

- Expo SDK and React Native versions
- Package dependencies
- App configuration
- Existing UI screens
- Existing navigation
- Express routes
- Controllers
- Mongoose schemas
- MongoDB indexes and relationships
- Authentication logic
- Socket.IO events
- Messaging logic
- Notification logic
- Voice recording implementation
- Calling implementation
- File uploads
- Background jobs
- Environment variables
- Existing frontend API clients
- External service integrations

Create a migration mapping:

Existing implementation| Convex replacement| Migration priority| Risk
Express routes| Queries/Mutations/Actions| TBD| TBD
MongoDB| Convex Database| TBD| TBD
Socket.IO messages| Convex Realtime| TBD| TBD
Legacy authentication| Clerk integration| TBD| TBD
Legacy calling| Stream Audio| TBD| TBD

Do not modify production code during this phase.

---

5. PHASE 1 — CONVEX AND CLERK SETUP

Configure Convex in the existing Expo application.

Integrate Clerk with Convex using the officially supported authentication integration.

Requirements:

- Google authentication
- Apple authentication
- Persistent authenticated sessions
- Secure sign-out
- Authenticated Convex queries and mutations
- Server-side identity verification
- User profile synchronization

Clerk is the authentication authority.

Convex stores application-specific user information.

Never trust client-provided user IDs as proof of identity.

Inspect the existing authentication and user IDs before migrating. Preserve existing user relationships and design a safe account-mapping strategy.

Do not create a second independent password authentication system.

---

6. PHASE 2 — CONVEX DATABASE SCHEMA

Design a production-ready Convex schema based on the actual existing application.

Suggested tables:

- "users"
- "chats"
- "chatMembers"
- "messages"
- "friendRequests"
- "blockedUsers"
- "devices"
- "notifications"
- "calls"
- "callParticipants" if needed

Do not create unnecessary tables.

Use Convex IDs and indexes appropriately.

Preserve legacy MongoDB identifiers temporarily when needed for migration.

Design efficient indexes for:

- User lookup
- User search
- Conversation membership
- Conversation lists
- Message pagination
- Message expiration
- Friend requests
- Block relationships
- Call history

Avoid unbounded queries and unnecessary database scans.

---

7. PHASE 3 — USER AND CONTACT SYSTEM

Implement:

- Create/synchronize user profile
- Get current user
- Get user by ID
- Update profile
- Search users
- Friend requests
- Accept request
- Reject request
- Cancel request
- List contacts
- Friendship status

Enforce authorization on every operation.

Use Convex realtime subscriptions where appropriate.

---

8. PHASE 4 — REALTIME MESSAGING

Replace Express and Socket.IO persistent messaging with Convex.

Required functionality:

- Create conversation
- List conversations
- Send text message
- Receive messages in realtime
- Fetch message history
- Paginate messages
- Read receipts
- Unread counts
- Message timestamps
- Edit/delete messages if supported by existing application

Use:

- Queries for reads
- Mutations for writes
- Reactive subscriptions for realtime updates

Ensure users cannot read or modify conversations they do not belong to.

Design idempotent message sending to prevent duplicate messages caused by retries.

Use bounded pagination.

Do not load an entire conversation history at once.

---

9. CRITICAL RULE — ONE MESSAGE SCHEMA

Text messages and recorded voice messages MUST share the same "messages" table.

Do not create a separate "voiceMessages" table.

Use a message type field:

- "text"
- "audio"

Common fields should include:

- "chatId"
- "senderId"
- "type"
- "createdAt"
- "expiresAt" (optional)
- Delivery/read information as required

Text-specific fields:

- "text"

Audio-specific fields:

- "audioStorageId" or another approved storage reference
- "audioDuration"
- Relevant audio metadata

Validate message type and corresponding fields server-side.

A text message must contain valid text.

An audio message must contain a valid, authorized audio reference.

Both message types must use the same:

- Conversation
- Chronological message list
- Realtime subscription
- Pagination
- Read/unread system
- Authorization system
- Expiration policy

---

10. PHASE 5 — WHATSAPP-STYLE VOICE MESSAGES

Implement recorded voice messages.

This is separate from Stream audio calling.

Required functionality:

- Start recording
- Stop recording
- Cancel recording
- Preview recording
- Send audio
- Receive audio message
- Play audio
- Pause playback
- Display audio duration
- Display playback progress
- Handle upload failures
- Handle unavailable audio files

Architecture:

Record locally → Upload to storage → Save message metadata in Convex → Realtime delivery

Use Expo-compatible audio recording and playback APIs supported by the installed SDK.

Store audio files in Convex Storage unless analysis identifies a strong reason to preserve existing storage.

Never store large audio binaries directly in ordinary database fields.

Validate uploads and enforce appropriate file size, duration, and access restrictions.

Prevent unauthorized users from accessing private audio attachments.

Handle abandoned uploads and cleanup safely.

---

11. PHASE 6 — OPTIONAL DISAPPEARING MESSAGES

Implement optional disappearing messages.

Default setting: OFF.

The setting is per conversation.

Users can enable or disable it through conversation settings.

When enabled:

- Newly sent messages expire after 30 days.
- Both text and audio messages follow the same expiration policy.
- Existing messages remain unchanged.
- Each new message receives an "expiresAt" timestamp.

When disabled:

- New messages have no expiration timestamp.
- Existing expiration timestamps are preserved.
- Previously scheduled expirations remain valid.

Suggested schema fields:

chats

- "disappearingMessages: boolean"

messages

- "expiresAt: optional number"

Use Convex Cron Jobs or an appropriate scheduled cleanup strategy.

Requirements:

- Efficient expiration indexes
- Bounded cleanup batches
- Safe audio-file deletion
- Reliable retry behavior
- Authorization checks
- Realtime removal from conversations
- Expired messages excluded from normal queries even if cleanup is delayed
- System notice when the setting changes

Both participants must see the setting status.

Define clearly who can modify the setting.

Do not claim that deletion removes screenshots, downloads, backups, or copies outside Saflal.

---

12. PHASE 7 — BLOCK AND UNBLOCK USERS

Implement a complete blocking system.

Create a "blockedUsers" table.

Suggested fields:

- "blockerId"
- "blockedId"
- "createdAt"

Required functions:

- "blockUser"
- "unblockUser"
- "getBlockedUsers"
- Privacy-safe blocking status checks

Rules:

- Users cannot block themselves.
- Prevent duplicate block records.
- Only the authenticated user can manage their own block list.
- Check blocking relationships in both directions.
- Do not expose private block lists to unrelated users.

When blocking exists between two users:

- Prevent new direct messages.
- Prevent new friend requests.
- Prevent new audio calls.
- Suppress relevant push notifications.
- Hide sensitive presence information.
- Preserve existing chat history unless separately deleted.
- Do not notify the blocked user of the block.

When unblocked:

- Restore communication only when allowed by friendship and privacy rules.
- Do not automatically restore deleted friendships.
- Do not resend previously rejected messages.

Blocking must be enforced in Convex server-side functions.

Do not rely only on hiding frontend buttons.

For Stream, enforce call authorization through supported server-side controls. Investigate token permissions and existing active calls so blocking cannot be bypassed by direct SDK access.

Add a Blocked Users screen in Settings.

---

13. PHASE 8 — PUSH NOTIFICATIONS

Implement reliable push notifications for:

- New messages
- Friend requests
- Accepted friend requests
- Missed calls
- Incoming audio calls

Use the appropriate Expo/FCM integration and Stream's supported incoming-call notification mechanisms.

Do not assume ordinary message push notifications are sufficient for reliable incoming-call behavior.

Investigate and implement the officially supported Stream React Native call notification setup.

Handle:

- Foreground
- Background
- Terminated application
- Notification permissions
- Android notification channels
- iOS notification requirements
- Device token updates
- Duplicate notifications
- Invalid tokens
- Retry and failure handling

Use Convex Actions for external notification APIs.

Trigger external side effects through appropriate server-side workflows.

Do not expose notification credentials in the mobile application.

Suppress notifications when blocking or privacy rules require it.

---

14. PHASE 9 — STREAM AUDIO CALLS ONLY

Replace legacy calling with Stream Video SDK configured for audio-only calls.

Do not implement video calling.

Required features:

- Start audio call
- Incoming audio call
- Ringing
- Accept call
- Reject call
- End call
- Mute/unmute microphone
- Speaker controls where supported
- Call duration
- Missed call handling
- Call history
- Connection errors
- Call cleanup

Stream handles:

- Actual audio transport
- Media connection
- Audio session management
- Supported call signaling

Convex handles:

- Application-level call records
- Caller and receiver relationships
- Privacy and blocking checks
- Call history
- Business logic

Use a secure server-side Convex Action or other supported Convex server-side function to generate Stream user tokens.

Never expose "STREAM_API_SECRET" to React Native.

Validate the Clerk identity before issuing tokens.

Use official Stream SDK documentation for the installed SDK version.

Ensure blocked users cannot create or join unauthorized calls.

Design consistent call status transitions and avoid duplicate or contradictory call records.

Implement any necessary Stream webhooks using supported Convex HTTP Actions.

Verify incoming-call behavior on real Android and iOS devices where available.

---

15. PHASE 10 — MONGODB DATA MIGRATION

Preserve all existing production data.

Build a migration process for:

- Users
- Conversations
- Members
- Messages
- Friend requests
- Relevant notifications
- Existing call history

Preserve:

- Relationships
- Message ordering
- Timestamps
- Ownership
- Existing identifiers where needed

Use temporary legacy ID mappings.

Do not delete MongoDB.

Test migration on a non-production dataset first.

Validate:

- Record counts
- Referential integrity
- Conversation membership
- Message content
- User identity mapping
- Duplicate records
- Missing attachments

Define a safe cutover strategy that prevents data loss or missing writes while both systems coexist.

Maintain a rollback plan.

---

16. PHASE 11 — FRONTEND MIGRATION

Replace old Express API calls with Convex.

Use:

- "useQuery"
- "useMutation"
- "useAction"

where appropriate.

Preserve existing UI components and navigation.

Preserve useful Zustand stores.

Avoid duplicating Convex server state unnecessarily in Zustand.

Maintain loading states, error handling, and pagination.

Do not remove old API calls until replacements are tested.

Keep UI changes minimal and consistent with the current Saflal design.

---

17. PHASE 12 — REMOVE LEGACY BACKEND

Only after all required features pass testing:

Remove unused:

- Express routes
- Controllers
- Middleware
- Mongoose models
- MongoDB connection
- Socket.IO server/client dependencies
- Legacy API clients
- Old calling SDK integrations
- Obsolete backend environment variables

Do not delete the old production database or backups automatically.

The final application must run without a separately hosted Node.js/Express backend.

---

18. APPLICATION REBRANDING

The new application name is:

Saflal

The previous name was:

Luqya

Update user-facing branding consistently.

Review:

- Expo app display name
- Splash screen
- App icon
- App labels
- Notification branding
- Store listing
- Deep links
- Relevant documentation

Do not automatically change package identifiers, bundle IDs, Clerk redirect URLs, Stream configuration, or existing native identifiers without evaluating compatibility.

Preserve existing installed-user upgrade paths.

---

19. SECURITY REQUIREMENTS

Enforce:

- Clerk-authenticated access
- Server-side authorization
- Conversation membership validation
- Block checks
- Secure file access
- Secure Stream token generation
- Input validation
- Safe pagination limits
- Rate limiting or abuse protection where appropriate
- Secret management
- Safe logging
- No private keys in source code
- No secrets in client environment variables
- No hardcoded credentials

Protect against unauthorized messaging, user enumeration, duplicate operations, and abusive API usage.

Use environment variables for all private credentials.

Never print secrets in logs or reports.

---

20. PERFORMANCE REQUIREMENTS

Use Convex built-in caching and realtime capabilities.

Do not introduce Redis unless a concrete, documented requirement justifies it.

Optimize:

- Chat list queries
- Message pagination
- Unread counts
- Conversation indexes
- User lookup
- Expiration cleanup
- Voice message uploads
- Realtime subscriptions
- Call metadata updates

Avoid unbounded database scans.

Avoid loading all messages at once.

Avoid unnecessary background writes.

---

21. TESTING REQUIREMENTS

Test at least:

Authentication

- Google login
- Apple login
- Session restoration
- Sign-out
- Unauthorized access

Messaging

- Send text
- Receive text
- Send audio
- Play audio
- Pagination
- Read receipts
- Unread counts
- Realtime updates
- Duplicate send prevention

Disappearing messages

- Default disabled
- Enable
- Disable
- 30-day expiration
- Old messages unaffected
- Audio cleanup
- Expired message query filtering

Blocking

- Block
- Unblock
- Duplicate block prevention
- Messages blocked
- Calls blocked
- Friend requests blocked
- Notifications suppressed

Stream

- Start audio call
- Receive call
- Accept
- Reject
- End
- Missed call
- Call history
- Background incoming call
- Terminated-app incoming call where supported
- Blocked caller behavior

Migration

- Data integrity
- Correct user mapping
- Message ordering
- No missing conversations
- No broken authentication
- No remaining dependency on the legacy backend

---

22. AGENT EXECUTION RULES

1. Do not rewrite the whole application.
2. Do not change unrelated code.
3. Do not delete working features prematurely.
4. Do not delete production data.
5. Do not expose secrets.
6. Do not invent SDK APIs.
7. Consult official Convex, Clerk, Expo, and Stream documentation.
8. Prefer JavaScript when compatible with project tooling.
9. Use supported SDK versions.
10. Do not add unnecessary dependencies.
11. Do not introduce Redis by default.
12. Do not recreate Express inside Convex.
13. Keep text and audio messages in one table.
14. Keep Stream limited to live audio calling.
15. Keep Clerk as the authentication provider.
16. Enforce blocking on the server.
17. Make disappearing messages optional.
18. Preserve existing application UI.
19. Test every completed phase.
20. Report failures clearly.
21. Never claim a feature is complete without verification.
22. Request approval before destructive changes or production cutover.

---

23. FINAL ACCEPTANCE CRITERIA

The migration is complete only when:

- Saflal uses Convex as its backend.
- Clerk handles Google and Apple authentication.
- Text messaging works in realtime.
- Voice messages work in the same message schema.
- Stream audio calls work.
- No video calling is implemented.
- Incoming call notifications work on supported devices.
- Optional 30-day disappearing messages work.
- Block/unblock functionality works.
- Push notifications work.
- Existing user data is preserved.
- Existing UI remains functional.
- No standalone Express server is required.
- MongoDB and Socket.IO are no longer runtime dependencies.
- Security and authorization tests pass.
- Production builds have been verified.

---

24. FIRST ACTION — START HERE

Begin with PHASE 0 ONLY.

Inspect the existing project.

Do not modify application code yet.

Produce:

1. Existing architecture analysis.
2. Dependency inventory.
3. Current database models.
4. Existing API route inventory.
5. Socket.IO event inventory.
6. Authentication analysis.
7. Messaging analysis.
8. Voice message analysis.
9. Existing calling integration analysis.
10. Push notification analysis.
11. Proposed Convex schema.
12. Proposed Clerk integration.
13. Proposed Stream audio architecture.
14. Migration risk assessment.
15. Step-by-step implementation roadmap.
16. Rollback strategy.
17. Estimated complexity of each phase.

Write the results into the migration documentation.

STOP and wait for my approval before beginning implementation.

The objective is a stable, secure, production-ready Saflal application, not a rushed rewrite.