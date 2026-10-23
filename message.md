# Saflal messages and optional expiration

Updated: October 17, 2026.

## Current delivery

The local Convex schema now defines strict text/audio document shapes in one `messages` table. `chats.disappearingMessages`, optional `messages.expiresAt`, and the expiration index already existed and are preserved. New direct chats already set `disappearingMessages: false` in their creation mutation; a Convex boolean validator does not supply a default by itself.

The October 17 composer correction replaces the earlier disabled placeholder with local text sending and reactive paginated history through `messages.sendText`, `messages.listMessages`, and `messages.getSendPermission`. Sending requires an active authenticated member, accepted friendship, and no block in either direction; history access remains membership-based. The existing chat route/header/background and request consent controls are retained. New functions and schema must be published before the updated app can use them; local code generation does not publish them. No runtime deployment or live message write was performed by this correction.

Voice recording/playback, read receipts, unread counts, conversation-setting controls/notices, expiration cleanup/audio deletion, and native device verification remain separate work. New text sends honor an already-enabled chat expiration flag and reads filter expired rows; this does not complete disappearing messages. Existing push transport is enqueued by sends; end-to-end device notifications remain unverified.

## Message schema contract

Convex uses a top-level `v.union` of two `v.object` validators. Both variants share these fields:

| Field | Schema type | Contract |
| --- | --- | --- |
| `chatId` | `v.id("chats")` | Required conversation reference. |
| `senderId` | `v.id("users")` | Required sender reference; sendText derives it from authenticated identity. |
| `clientMessageId` | optional string | Existing rows remain valid; new text sends require a client-generated operation key, scoped by chat and authenticated sender for retries. |
| `status` | `"sent"`, `"delivered"`, or `"read"` | Required existing receipt field; reliable status transitions are not implemented by a schema. |
| `createdAt` | number | Required; text sends assign server time in Unix milliseconds. |
| `updatedAt` | number | Required; server-owned for text sends. |
| `expiresAt` | optional number | Optional absolute Unix-millisecond deadline, independent of subsequent setting changes. |

Convex also supplies `_id` and `_creationTime`. Use the explicit server-owned `createdAt` for the expiration calculation.

| Variant | Required payload | Excluded payload |
| --- | --- | --- |
| `type: "text"` | `text: string` | `audioStorageId`, `audioDuration` |
| `type: "audio"` | `audioStorageId: Id<"_storage">`, `audioDuration: number` | `text` |

`audioDuration` is measured in **seconds**. Audio bytes belong in storage, never ordinary message fields. Both variants use the same chronological list, membership rules, pagination, receipts, and expiration policy; there is no `voiceMessages` table.

Preserved message indexes:

| Index | Fields | Intended use |
| --- | --- | --- |
| `by_chat` | `chatId` | Conversation lookup. |
| `by_chat_created` | `chatId`, `createdAt` | Bounded chronological message pagination. |
| `by_chat_sender_client` | `chatId`, `senderId`, `clientMessageId` | Indexed retry deduplication; same key/different text is rejected. |
| `by_expires_at` | `expiresAt` | Bounded expiration cleanup. |

Schema validation enforces field presence/types and excludes the other variant's payload. `sendText` additionally validates trimmed nonempty text, a 4,000-character limit, the retry key, membership/friendship/blocking, and server-owned timestamps. Audio storage existence/ownership/metadata/size/duration checks and authorized recording/playback remain unimplemented; the structural audio variant alone does not provide those guarantees.

## Pending implementation checklist

### Sending and timestamp policy

- [x] Add Clerk-authenticated, membership-authorized, block-aware text sending with indexed retry idempotency, a 4,000-character limit, and server-owned sender/timestamps. Audio sending and broader abuse/rate controls remain pending.
- [ ] Validate nonempty text and finite positive audio duration; verify storage existence, ownership, approved file metadata, size/duration limits, and private access before inserting audio messages.
- [x] New text sends read the chat setting and insert metadata in one mutation. When enabled, assign `expiresAt = createdAt + 2_592_000_000`; otherwise omit it. Audio sending remains pending.
- [x] Authorized text retries return the original message/deadline without new writes or push jobs; changed text under the same key fails. Editing messages remains unimplemented.

### Conversation setting and system notices

- [ ] Allow either active authenticated participant in a valid one-to-one conversation to enable/disable disappearing messages. Reject outsiders; validate membership server-side on every change.
- [ ] Do not modify any existing message when enabling or disabling. Disabling affects future messages only and never clears assigned deadlines or cancels their expiration work.
- [ ] Use reactive Convex subscriptions so both participants see the authoritative setting. Preserve the current UI design when adding the toggle/status.
- [ ] Generate a server-owned system notice for each actual setting transition; repeated requests for the current value must not duplicate notices. Do not masquerade notices as ordinary client-sent text. Define their representation, ordering, and retention in the setting-mutation phase; this schema includes only text/audio variants and adds no notice type/table.

### Reads, pagination, and realtime expiration

- [ ] On every message read, hide records where `expiresAt` is present and `expiresAt <= serverNow`, regardless of cleanup progress. Check membership before returning messages or attachment access.
- [ ] Apply the same visibility policy to history, direct message lookup, search, chat previews, unread counts, and pending push eligibility. Keep reads bounded and preserve native pagination cursor/continuation metadata, including empty filtered pages with more data available.
- [ ] Do not load entire conversations or scan arbitrarily many expired rows to fill a visible page. Keep the existing chronological index and enforce a server read/page ceiling.
- [ ] Ensure messages disappear from already-open screens at the deadline. `Date.now()` in a Convex query alone does not cause a subscription to rerun when time advances; implement a deadline-aware invalidation/rendering strategy, including foreground/reconnect reconciliation. Do not rely on the cleanup cron for timely hiding.

### Cleanup and audio storage

- [ ] Add a Convex expiration cron and internal cleanup mutation with a fixed bounded batch size. Query `by_expires_at` with an explicit lower bound excluding missing values, and an upper bound at the current cutoff; never delete messages without a deadline.
- [ ] Recheck expiration before deletion, support safe retries, and drain backlogs over bounded runs. Preserve unrelated records and other existing cron jobs.
- [ ] Safely remove associated audio storage only after verifying its authorized linkage and that no surviving message or pending upload still needs the file. An ID reference alone does not prove ownership or exclusivity. Treat already-missing files as an idempotent case and avoid a failure sequence that leaves an untracked, unrecoverable orphan.
- [ ] Keep last-message references/previews and receipt/unread metadata consistent after deletion using bounded work. Suppress obsolete queued notifications. Preserve a recoverable cleanup state if storage and metadata cannot be removed atomically with supported APIs.
- [ ] Handle abandoned uploads separately from valid message expiration; do not delete arbitrary storage objects.

## Verification checklist

Schema-contract tests inspect the real installed Convex SDK's exported declarations for the two variants, required payloads, excluded opposite-type fields, optional deadlines, common fields/statuses, and existing indexes. A focused handler test checks the real direct-chat creation default. These local checks do not simulate Convex runtime database validation or prove deployment compatibility.

Current local result: **133 tests pass** (126 earlier regressions and seven new schema/default tests). Targeted ESLint, strict checking of schema/chat/push JavaScript consumers, project TypeScript, and local Convex code generation pass. Generated files were compared with the checkpoint; no generated-file content changed. Run the suite from mobile with `node --test --experimental-test-isolation=none tests/*.test.mjs` in this sandbox.

- [ ] Verify active deployed schema enforcement and compatibility with existing records before publication.
- [ ] Test default disabled, enabling/disabling by either member, outsider/anonymous rejection, no-op toggle idempotency, both-participant realtime status, and server-owned notices.
- [ ] Test before/at/after the exact 30-day boundary for both text/audio, old messages remaining unchanged, disabling preserving old deadlines, and send/toggle retries and races.
- [ ] Test expired-row filtering with delayed cleanup, paginated expired-only/sparse pages, stable chronological continuation, and already-open/reconnected screens.
- [ ] Test bounded batches, cleanup retries/backlogs, missing/shared/unauthorized audio references, storage failures, surviving file references, and consistent chat metadata.
- [ ] Verify the preserved mobile layout and real-device behavior after UI integration.

## Compatibility, rollout, and rollback

The strict union changes previously optional payload fields to required variant fields and rejects mixed payloads. Before any deployment, take a protected export and audit existing message records in bounded pages for missing required fields, mixed payloads, and invalid reference/type shapes. Report incompatible records; do not delete, fabricate, or silently rewrite them. Any data repair/migration needs a separate reviewed plan. Preserve default schema validation rather than disabling it to force publication.

No deployment is authorized in this delivery. Existing message counts/data have not been inspected remotely. Whole-directory deployment would also publish other pending local backend changes, so review the complete deployment scope before a later development release. MongoDB and all legacy records remain untouched.

Selective rollback checkpoint: `C:/Users/user/AppData/Local/Temp/saflal-message-schema-f8ed47d8fa01469985b559f71902395c`. It contains the prior schema, empty `Message.md`, both task trackers, four migration documents, generated files, and hashes for protected source/manifests. Restore only this delivery's changed paths, remove its new `mobile/tests/message-schema.test.mjs`, and restore the empty document's original capitalization if returning exactly to the checkpoint. Do not reset unrelated work, delete data, or assume this local rollback is safe over a future deployed schema/data change.

## Deletion limits

Deletion within Saflal does not remove copies outside Saflal, including screenshots, downloaded audio/files, backups, forwarded content, or other saved copies. Disappearing messages are not a guarantee that recipients cannot retain content.

## Official references

- [Convex schemas and document unions](https://docs.convex.dev/database/schemas)
- [Convex query determinism, caching, and time](https://docs.convex.dev/functions/query-functions)
- [Convex realtime subscriptions](https://docs.convex.dev/realtime)
- [Convex pagination](https://docs.convex.dev/database/pagination)
- [Convex cron jobs](https://docs.convex.dev/scheduling/cron-jobs)
- [Convex file deletion](https://docs.convex.dev/file-storage/delete-files)

## Conversation navigation delivery — October 16, 2026

Contacts name/Friends actions call the existing getOrCreateDirectChat mutation for accepted friends and open the returned chatId. The default Chats tab reads reactive 20-item Convex pages and opens the same route. New links include source=convex; existing unmarked legacy message links retain the original implementation. Explicit source=legacy retains the old Chats component during migration. Both branches remain protected by the application's authenticated routing.

The Convex message view fetches authorized getChat details instead of trusting contact/profile IDs or route-supplied name/photo fields. It offers loading/unavailable/retry/back/photo states and a disabled composer with “Messaging is not available yet.” It does not read/send legacy messages, enter socket rooms, delete conversations/messages, initiate calls, or fabricate presence/unread status. Sending/history and expiration remain pending despite the route now being reachable.

Local verification: 150 tests pass (133 prior + 17 contact/navigation checks), project TypeScript passes, and lint of new components/helpers/tests passes. Full touched-file lint still reports two pre-existing legacy-body errors (set-state-in-effect in the old Chats component and an unescaped apostrophe in the old message screen); checking the checkpoint source reproduces them. Native/device and live subscription behavior are not established by mocked rendered tests. Bundle verification results are recorded in MIGRATION_PROGRESS.md.

Android JavaScript bundle export also passes (4,698 modules, single worker, no Hermes bytecode). This is a debug validation artifact, not an APK or production release. All six protected backend/schema/manifest hashes and both legacy screen bodies match the navigation checkpoint.

Contact tap follow-up: the whole contact row is now the hit target. Photo/request/Friends buttons isolate their presses; nonfriend/pending rows show the friendship requirement instead of silently ignoring taps. Accepted-friend authorization remains unchanged on both client and server. All 152 tests, targeted contact lint, and project TypeScript pass. Actual device behavior and any separately chosen policy allowing chats before acceptance remain pending; no new bundle/deployment/data change occurred in this correction.


## Recorded voice composer - October 17, 2026

Empty text uses Mic; typed text uses Send. Hold for 200 ms, release to send, slide 100 px toward inline-start to cancel, or slide up 80 px to lock; locked Stop opens preview with playback, Delete and Send. Native completion/background/calls never automatically send. First permission grant requires a fresh deliberate hold. Clips must be 1-300 seconds and no more than 10 MiB; failed sends retain their draft and operation key while the conversation remains open.

Playback is authorized by message ID through a Clerk-authenticated Convex HTTP action and uses temporary private cache files. Existing text retry, friendship/blocking checks and keyboard behavior are preserved. Final check results and rollout limitations are tracked in docs/MIGRATION_PROGRESS.md.
