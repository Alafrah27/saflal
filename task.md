# Saflal — completed work

Updated: October 21, 2026.

## Welcome screen styling and legal links implemented — October 21, 2026

Get Started reuses the transparent outlined auth button. Privacy Policy/Terms of Service are blue underlined clickable text in grammatically corrected English/Arabic sentences; both use the user-reconfirmed temporary http://localhost:5173 URL with localized failure alerts. Welcome descriptions and English Saflal branding are corrected; login navigation is unchanged. Real-translation JSX/handler checks, 42 related tests, focused lint and project TypeScript pass. The extra JS check adds no baseline errors (one prior image declaration diagnostic). Android JavaScript/Hermes export/artifact inspection pass (5,315 modules, 49 assets, 12,462,422 bytes); native layout/link/browser/page acceptance remains pending. All four migration documents and both trackers preserve scope/evidence/rollback.

## Login provider button layout implemented — October 21, 2026

Google/Apple buttons now have provider icons, transparent backgrounds and borders, and sit in a bottom footer. Removed the message icon and corrected damaged Arabic login labels. Existing Clerk flow/session/redirect handlers and CAPTCHA are preserved. Mocked English/Arabic rendering/handler checks, all 42 related tests, focused lint, project TypeScript and targeted JSX types pass. Android JavaScript/Hermes export and icon/Arabic-label artifact inspection pass (5,315 modules, 49 assets, 12,461,091 bytes); native signed-out/large-text layout and real provider round trips remain pending. Both trackers/four documents record scope, evidence and rollback.

## Arabic app name updated — October 21, 2026

Updated Arabic branding throughout localization and the active sign-in heading to سفلال; About initial is س. Translation keys, unrelated text, English and native identifiers are preserved. Actual i18next/auth-hook checks, all 42 related tests and focused lint pass. Both trackers and all four migration documents are updated with evidence/rollback. Reload the app to see the text; native visual confirmation remains pending. No backend publication or new binary is required.

## Nickname and editable bio implemented — October 21, 2026

Added optional users.nickName and a localized Settings editor for nickname and bio. Nickname takes priority in Contacts, Calls, Chat and related profile/search/notification labels, with full-name fallback. Clerk-owned updates validate limits and allow clearing; canonical names, IDs, relationships and existing privacy rules remain intact. All 415 tests, focused lint and project TypeScript pass; broader JavaScript comparison introduces no baseline errors. Development publication and anonymous-access rejection pass without modifying real profiles. Android JavaScript/Hermes export and artifact inspection pass (5,315 modules, 49 assets, 12,461,677 bytes). All four migration documents contain evidence and selective rollback. Native editor/save/cancel, two-account realtime names/bio and incoming-call notification display remain pending; the phone inspection did not reach Saflal. Reload the development app; no new native binary or data backfill is required.

## Call UI and black-screen fix completed — October 21, 2026

Added the full-screen peer photo, top back arrow and bottom outgoing/incoming/connected call controls. Fixed the subsequent invisible-UI regression by replacing three removed StyleSheet.absoluteFillObject references with the supported absoluteFill API. Corrected the native mock and added an installed-SDK compatibility regression. All 403 tests, eight mocked call/language scenarios, focused layout/test lint, project TypeScript and actual-JSX type-check pass. The shared native frame was verified on the connected Android phone without initiating a call; the user retried and confirmed the call UI is visible. Existing call behavior/data are preserved. No backend deployment or new native binary is required. Broader control/background/production acceptance and the seven pre-existing call-route lint errors remain separate.

## Blocked Contacts Settings entry completed — October 21, 2026

Placed Blocked Contacts immediately after Notifications. It opens the existing paginated blocked-members list with confirmed Unblock actions. Updated English/Arabic labels; all 50 relevant tests and focused lint pass. Native list/unblock and two-account privacy acceptance remain pending. See the four migration documents for scope, evidence and rollback.

## Chat-header profile resumed — October 21, 2026

Recovered the saved user-profile modal from the chat [id] header, optional Clerk-verified friend email and Settings Blocked Users work. Fixed unblock actions while status loads or a row is already unblocked. Added profile interaction regressions and strengthened header-target assertions. All 402 tests, focused lint and project TypeScript pass. Development publication and read-only availability/anonymous-access checks pass. Android JavaScript/Hermes export and artifact inspection pass (5,312 modules, 49 assets, 12,449,899 bytes; private credentials absent). Physical-device/two-account acceptance remains pending. Full scope, privacy rules, evidence and selective rollback checkpoints are in docs/MIGRATION_PROGRESS.md and docs/TESTING_CHECKLIST.md. No production release or real block/account deletion was performed.

Latest status: welcome outlined-button/blue-legal-link styling and English/Arabic grammar are updated, using the confirmed temporary localhost destination. All 42 related tests, real-translation JSX/handler checks, focused lint, project TypeScript and Android JavaScript/Hermes export pass; the extra JS check adds no prior-baseline errors. Native layout/browser/page acceptance remains pending. Earlier login/nickname/call work and its broader acceptance boundaries are preserved.

## Implemented

- **Blocking:** Convex block, unblock, paginated blocked-user listing, private caller-owned status, and a server-only helper checking both block directions. Authenticated ownership, self-block prevention, and idempotent operations are enforced.
- **Friend requests:** Send, accept, reject, incoming pending-request listing, and friendship status. Only the receiver can decide; acceptance creates one friendship. Crossed requests require explicit acceptance. Rejected history is preserved when sending a new request, and blocking prevents sending/accepting.
- **Direct-chat backend:** getOrCreateDirectChat, getChat, and getMyChats create/reuse chats between accepted friends, fetch member-only details, and paginate caller-owned chats. Added an optional sorted-user pair key/index; creation inserts one chat and two memberships atomically. Blocked users cannot create/reuse chats; existing members keep read access. Private projections use fullName and optional imageUrl. Messaging and chat screens are deferred.
- **Contacts screen:** Fetches all other active Saflal users through Convex, as requested. Uses reactive 20-item pages, filters blocked users in both directions, and displays names/photos with friendship/request states. Send-request controls use Convex IDs. Includes loading, empty, refresh, retry, continuation, and English/Arabic labels.
- **Full-name profiles:** Removed username and the string userId handle from the application user schema. Profile creation now accepts only fullName. Different users may share a name; Clerk and Convex IDs identify accounts. Updated automatic onboarding, validation, and authentication tests.
- **Documentation:** Updated all four migration documents and regenerated Convex API declarations.

## Development deployment and data

- Published the final schema and backend functions to the existing **development** deployment.
- Published the chat backend after checks passed. Four simultaneous calls from both isolated test participants created exactly one chat/two memberships. Live authorization, runtime validators, cursor continuation, blocking, and inactive-account checks passed. All disposable records/internal helpers were removed, and all nine pre-existing tables were verified unchanged.
- Exported a development backup before changing profile data.
- Used a temporary optional field and an internal, bounded migration to remove two legacy username fields.
- Verified both backed-up profiles retained their IDs, full names, timestamps, and other metadata; only username was removed.
- Live discovery returned one other visible user using an administrator-issued test identity. Anonymous discovery/profile writes were rejected, and internal synchronization remained protected.
- The superseded username-based publish was rejected by automatic approval review after the user requested fullName instead. It did not run; the subsequent fullName deployment succeeded.
- Production and MongoDB data were not changed.

## Verification

- **88 tests passed:** 19 chat, 11 authentication, 14 blocking, 23 friend-request, 9 discovery, 9 Contacts screen smoke tests, and 3 migration tests.
- Targeted ESLint, strict backend JavaScript checks, and project TypeScript passed.
- Android JavaScript/Hermes bundle export passed. This does not verify a native APK or real-device behavior.
- Screen smoke tests render the actual JSX with mocked native primitives and transport; the live backend check uses an administrator-issued identity, not a real Clerk sign-in.
- Schema verification confirmed only the approved pair field/index additions; ten protected source/package/screen files remain unchanged. Chat rollback snapshots and the live baseline are recorded in the migration plan.

## Remaining work

- [ ] Real Android/iOS screen checks, Google/Apple sign-in, session restoration, account switching, refresh/retry, and live request-state updates.
- [x] Incoming-request Accept/Decline UI in Contacts and contact previews; verified locally in the consent correction below.
- [ ] Cancellation/unfriending remains a separate scope.
- [x] Local Convex text sending, retry deduplication, and paginated history (October 17 composer correction).
- [ ] Read receipts/unread counts and live device verification.
- [x] Local message history/composer integration with Convex reactive subscriptions; publication/device checks remain pending.
- [ ] Activity-based chat ordering and chat settings mutations.
- [x] Implement recorded voice messages in the shared messages table; user confirms sending works. Receiving playback remains a device check.
- [x] Repair/configure Stream audio calling and resolve the call-button failure; user confirms it works on Android.
- [x] Resolve dependency/native-manifest build blockers; user confirms the Android development build succeeds.
- [ ] Verify incoming-call notifications in background/terminated states, all call controls, missed calls/history and blocked-caller behavior on real devices.
- [ ] Complete optional expiration and remaining notification verification.
- [ ] Verified account/data migration, legacy backend removal, iOS/release builds and production acceptance checks.

The detailed checklist is maintained in [Tasks.md](Tasks.md).

Rollback instructions and backup locations are recorded in [MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md). Restore selectively; do not overwrite newer data or redeploy an incompatible old user schema.

## Resumed devices / push backend — October 16, 2026

- Recovered interrupted `devices`, `pushDeliveries`, device mutations, transport actions/crons, and friend-request push hooks that were present on disk but absent from this tracker.
- Completed local backend verification: **115 tests pass**, including 27 new device/push tests and the 88 existing regressions. Updated the friend-request fixture for the new device reads.
- Fixed already-read message suppression, receipt rate-limit resend handling, and stale receipt fencing across replacement tickets. Invalid sign-out registration versions now reject explicitly.
- Kept registration versions increasing when historical token/installation rows merge, preventing stale sign-outs from matching an older reused version.
- Targeted lint, scoped strict backend checking, project TypeScript, and local Convex code generation pass. Schema, existing friend-request hooks, crons, and generated API declarations are unchanged from the recovery checkpoint.
- Device ownership comes from Clerk; token rotation/account reassignment invalidate old queued deliveries. Push sending, receipts, bounded retries/recovery/cleanup, and both-direction blocking checks stay server-side.
- **Not deployed in this resumed session.** No production/MongoDB data changes. No real push was sent; Expo HTTP calls were mocked in tests.
- [ ] Connect the mobile installation/token lifecycle, permission/channel setup, token refresh, and sign-out/account-switch cleanup.
- [ ] Verify development deployment validators, concurrent registrations, and real scheduled jobs.
- [ ] Verify FCM/APNs credentials, notification taps, permissions, foreground/background/terminated behavior, and duplicate handling on real Android/iOS builds.
- [ ] Wire message events when Convex messaging is implemented. Stream incoming/missed-call notifications remain a separate calling task.

Backend code is locally tested; end-to-end push notifications and Phase 8 are **not complete**. See [Tasks.md](Tasks.md) and the migration documents for boundaries and rollback.

## User image persistence fix — October 16, 2026

- Fixed the existing `users.imageUrl` save path. The app displayed `clerkUser.imageUrl`, but the Convex action silently skipped saving when both CLERK_SECRET_KEY and a token picture claim were absent.
- The session now passes the matching Clerk resource's image URL as a display-only fallback. Convex derives the target from authenticated identity, validates the HTTPS URL, and saves through the existing internal mutation. Signed picture claims and the configured Clerk Backend API remain preferred sources.
- Late-loading/changing Clerk images trigger synchronization; missing image snapshots preserve saved photos. No schema, dependencies, or user-facing UI changed.
- **126 tests pass** (115 prior + 6 backend regressions + 5 provider wiring tests). Tests verify the existing users row is updated, other users/app fields are preserved, invalid/anonymous/inactive writes fail safely, and refresh/foreground/late-image callbacks carry the URL.
- Targeted ESLint, project TypeScript, and local Convex code generation pass.
- Local source fix only: no Convex deployment, live user backfill, or device verification was performed. Existing active users synchronize when the updated backend and app run; onboarding remains fullName-only.

## Message schema and documentation — October 16, 2026

- Implemented a strict text/audio union in the existing messages table. Text requires text and excludes audio payloads; audio requires storage ID/duration and excludes text. Duration is seconds. Common fields, all message indexes, optional expiresAt, and the existing chat setting are preserved.
- Case-renamed the empty Message.md to [message.md](message.md) and documented the contract, structural-versus-semantic validation, future 30-day policy, authorization, notices, reactive deadline handling, bounded pagination/cleanup, audio safety, compatibility audit, and external-copy deletion limits.
- **133 local tests pass**: all 126 earlier regressions plus seven schema/default contract tests. Targeted ESLint, scoped strict JavaScript checking of schema/chat/push consumers, project TypeScript, and local Convex code generation pass.
- No new tables, public endpoints, dependencies, UI changes, deployment, migrations, or live record writes. The rollback checkpoint and later deployment audit requirement are documented in message.md and MIGRATION_PLAN.md.
- [ ] Implement sending/content/storage authorization, setting mutations/notices, expired-message filtering, deadline-aware realtime UI, cleanup cron/audio deletion, and their runtime/device tests in later scoped phases.

This is schema readiness only; optional disappearing messages are not implemented or verified end-to-end.

## Completed tasks: conversation navigation — October 16, 2026

- [x] Complete the strict shared text/audio message schema, message.md, and migration-document updates recorded above.
- [x] Tapping an accepted contact's name or Friends badge creates/reuses the authorized Convex direct chat, then opens `/chat/[id]` with the returned conversation ID. Photo taps still open the photo viewer; pending/nonfriend contacts keep request controls.
- [x] The default Chats tab subscribes to paginated Convex getMyChats and opens the same message route when a row is tapped. Includes loading/empty/continuation/retry/refresh states and account-scoped remounts.
- [x] Add a Convex conversation view inside the existing `[id]` route using authorized getChat details. Preserve the brown header, avatar styling, chat background, back/photo navigation, and English/Arabic labels. Hide unsupported presence and keep unfinished message sending disabled with an honest unavailable state.
- [x] Preserve the original legacy message screen for existing links and the legacy Chats component behind explicit source=legacy. New links use source=convex and never pass Convex IDs into legacy REST, sockets, message deletion, or calling hooks.
- [x] Pass all 150 local tests (133 prior + 17 navigation/contact regressions) and project TypeScript. Targeted lint of the new components/helpers/tests passes; two original legacy-screen lint errors remain, verified against the pre-change snapshots.
- [x] Android JavaScript bundle export passes (4,698 modules). This was a local debug validation with Hermes bytecode disabled, not a native APK/device test.
- [ ] Verify real-device Contacts/Chats taps, loading/failure/retry, back/photo navigation, account switching, and realtime chat-list updates.
- [ ] Connect Convex message sending/history/receipts/voice messages and disappearing-message behavior in later approved phases.

No backend/schema/dependency change, deployment, live data operation, or production cutover was performed. User taps in the updated app will use the existing authorized chat-creation mutation. Selective rollback is documented in MIGRATION_PLAN.md.

## Contact row tap correction — October 16, 2026

- [x] Move the conversation press handler from the narrow name area to the full contact row, including padding and the fallback avatar.
- [x] Keep accepted-friend creation/reuse and duplicate-tap guards. Replace silent disabled nonfriend/pending rows with a clear friendship-required alert; the server's existing friendship rule is unchanged.
- [x] Stop photo/request/Friends button presses from also triggering the outer row handler.
- [x] Pass 152 tests (150 previous + two full-row/nested-button regressions), targeted lint, and project TypeScript. No backend/schema/dependency/deployment or live-data change.
- [ ] Confirm actual device taps and determine whether the selected user is an accepted friend. Opening chats before friendship acceptance is a separate privacy-rule choice; it was not silently enabled.

No new bundle export was needed for this handler/layout-only correction; the prior navigation export remains historical evidence, not a device test of this correction. Snapshot: C:/Users/user/AppData/Local/Temp/saflal-contact-tap-317934992dcb4c279382830b53acc687.

## Friend-request consent and privacy correction - October 17, 2026

- [x] Keep requests from A to B pending until B explicitly accepts or declines; only the authenticated receiver can decide.
- [x] Add Users / Requests within Contacts, defaulting to Users, with reactive 20-item incoming-request pages and loading/empty/retry/continuation states.
- [x] Reuse Accept/Decline controls in incoming contact rows, the Requests inbox, and contact/existing-chat previews, with English/Arabic accessibility labels.
- [x] Submit server request IDs, guard duplicate/opposite taps, lock both actions while submitting, allow safe retries, and isolate state by account/request; no optimistic messaging permission.
- [x] Fix legacy recipient ownership and pending-only atomic decisions, idempotent friend-cache updates, normalized self/target validation, and both-direction block checks.
- [x] Add authenticated POST /api/v1/friend/reject-request/:id and update the legacy Decline hook; preserve DELETE unfriend and request/chat history; send no decline notification.
- [x] Check accepted friendship/blocking/direct membership before legacy message/chat writes; guard socket joins/read receipts and typing. Existing call handlers are unchanged.
- [x] Pass all 179 mobile tests and 16 legacy handler/socket tests (195 total), targeted lint, and project TypeScript. Tests use mocked database/transport/native boundaries, not live services.
- [x] Update all four migration documents and both task trackers. Selective rollback snapshot: C:/Users/user/AppData/Local/Temp/saflal-friend-consent-OycJoR; delivery-files.json lists only this correction's changed/added files. Protected Convex schema/functions, providers, and package files retain their hashes.
- [x] Android JavaScript export passed: 4,701 modules, 154 assets, single worker, Hermes bytecode disabled. The sandbox attempt stopped at spawn EPERM; the same local export succeeded with process permissions (exit 0). This verifies JavaScript bundling, not a native APK or device.
- [ ] Verify two real authenticated accounts/devices: send, accept, decline, realtime state changes, offline/retry, Arabic layout, and account switching.
- [ ] Review/deploy the legacy endpoint changes and updated app to development before claiming hosted behavior is fixed; production rollout remains outside this task.

Implemented locally, not deployed. Convex text messaging still has its existing disabled placeholder composer and remains a separate approved task. No live records or production data were changed. Historical legacy acceptances were preserved; any consent audit is separate. Legacy request transitions are atomic, while profile caches/block reads remain separate Mongo operations; real Mongo concurrency and durable legacy notifications are not established by the local fixture tests.

## Editable text composer after acceptance - October 17, 2026

This follow-up supersedes earlier statements that Convex text sending/history are deliberately deferred placeholders. It does not mark the entire messaging migration complete.

- [x] Trace the cause to hardcoded editable=false / disabled placeholder controls, with no Convex message transport connected.
- [x] Replace the placeholder with an editable composer; typing valid nonempty text enables Send, while blank or submitting drafts keep it disabled.
- [x] Add messages.getSendPermission, sendText, and listMessages, with authenticated active-user identity, valid direct membership, accepted friendship, active peer, and both-direction blocking enforced server-side for sending.
- [x] Add optional clientMessageId plus an indexed chat/sender/key lookup for retry deduplication; reject changed payloads under the same key. Preserve existing text/audio rows and one shared messages table.
- [x] Save text, server timestamps, chat last-message metadata, and eligible existing push jobs in one mutation. Respect existing enabled expiration flags for new messages.
- [x] Render reactive 20-item message pages with older-page continuation, membership-only history access, expired-row filtering, and deadline-based local hiding. Audio playback remains a placeholder.
- [x] Preserve failed drafts/keys for retry, guard rapid duplicate sends, and suppress late unmounted/account-switched state updates.
- [x] Pass all 198 mobile tests, including 19 new backend/composer/navigation regressions. Regenerate local API bindings with the official read-only CLI.
- [x] Pass targeted ESLint, project TypeScript, strict annotated message-backend checking, and the final Android JavaScript export (4,703 modules, single worker, no Hermes bytecode, exit 0). Native devices remain unverified.
- [x] Update message.md and all four migration documents. Snapshot: C:/Users/user/AppData/Local/Temp/saflal-text-composer-XD8RRq; delivery-files.json lists selective rollback files.
- [ ] Publish reviewed Convex functions/schema to development, reload the updated app, and verify two actual authenticated accounts sending/receiving. Code generation does not deploy the new endpoints.
- [ ] Verify keyboard/native layout, reconnect/retry, block changes during a conversation, pagination, and account switching on devices.
- [ ] Complete receipts/unread counts, audio messages, expiration controls/notices/cleanup, and full device notifications in separate scopes.

Local implementation only: no runtime deployment or live message writes were performed. Preserve prior consent fixes during rollback. If new messages have been stored after a later deployment, keep the additive optional field/index when rolling back application code rather than restoring an incompatible strict schema.

## Keyboard visibility correction - October 17, 2026

- [x] Trace the hidden input to disabled Android keyboard avoidance and a nested custom-header offset in the active Convex chat.
- [x] Replace React Native KeyboardAvoidingView with the installed react-native-keyboard-controller component, using behavior=padding and automaticOffset for both platforms. Reuse the existing root KeyboardProvider and keep the header outside the resized message/composer area.
- [x] Adapt the navigation test boundary to the installed component and pass all 198 mobile regressions. No new implementation-mirroring test was added for this small layout correction; native animation is not simulated.
- [x] Pass targeted ESLint, project TypeScript, and Android JavaScript export (4,703 modules, single worker, no Hermes bytecode, exit 0).
- [x] Preserve the existing composer, consent/authorization, navigation, dependencies, app/native configuration, legacy chat, and backend code.
- [x] Update both trackers and the four migration documents; selective snapshot: C:/Users/user/AppData/Local/Temp/saflal-keyboard-IwvLcT.
- [ ] Verify keyboard opening/closing, multiline text, Send taps, and navigation-bar/safe-area behavior on Android and iOS devices.

This is a JavaScript layout correction. Reload the updated app to apply it. No backend deployment or native configuration change is part of this correction; previous text-endpoint publication remains a separate pending step. Native device enumeration did not provide usable test-device information, so physical keyboard behavior is not claimed as verified.


## Recorded voice messages - October 17, 2026

- [x] Implement Mic by default and Send for typed text; hold/release, cancel/lock, locked preview/delete/send, English/Arabic and accessibility.
- [x] Add private Convex audio upload ownership/leases, metadata validation, idempotent shared-message send, authenticated playback and bounded cleanup.
- [x] Preserve keyboard layout, consent checks, text retry behavior, history and unrelated edits; add selective snapshots and documentation.
- [x] Resolve development dependency/build blockers and complete automated checks; latest full suite is 268 passing tests.
- [x] User confirms recorded voice sending on October 19; Android development build succeeds and the authorized development backend is published.
- [ ] Verify receiving playback and the complete recording/playback lifecycle with two accounts on Android/iOS. No production deployment or production data change.

## Stream audio calling task - October 19, 2026

- [x] Use GetStream for audio-only calling and remove active Zegocloud dependencies/references.
- [x] Add the missing ringtone; guard missing native modules; fix EAS dependency installation and notification-manifest conflicts.
- [x] Configure private development Convex credentials, member-only audio permissions, a two-person limit, signed status webhooks and the user-approved matching Firebase provider.
- [x] Correct Stream IDs from 76 to 39 characters, preserve idempotency across retries and publish the tested development backend fix.
- [x] Pass 268 tests and focused lint; preserve existing UI, authorization and call history.
- [x] User retries the call flow and reports "its working good". The reported call-connection task is resolved.
- [ ] Verify each call control, background/terminated incoming notifications and blocking on real devices before declaring the full calling phase production-ready.

Detailed evidence and rollback: [migration progress](docs/MIGRATION_PROGRESS.md) and [testing checklist](docs/TESTING_CHECKLIST.md). No new EAS build is required for the deployed call-ID fix.

## Follow-up: sustained two-phone audio - October 19, 2026

- [x] Diagnose the later false-missed-call report: Stream accepted/two participants, Convex still ringing, real webhook 401s and server timeout at 30 seconds.
- [x] Preserve raw webhook bytes, support bounded gzip decoding with strict Stream signature verification, and publish the development backend correction.
- [x] Pass all 272 tests, project TypeScript and focused lint; live signed plain/gzip callbacks return 204.
- [ ] Confirm a new two-phone accepted call stays connected for at least 45 seconds with audio in both directions, then records a completed call on hangup.

The earlier "working good" report confirmed setup; sustained calling remains under verification after the user's new disconnect report. No further Android build is needed for this backend fix.

- [x] Live two-phone call remains accepted beyond the false-missed timeout: age 56 seconds, verified connection over 45 seconds. Real callback/server lifecycle correction confirmed.
- [ ] Confirm audible two-way audio and completed history after normal hangup with the user.

- [x] User confirms a full minute of stable two-phone calling after the webhook repair.
- [ ] Verify clean audio with the phones in separate rooms or headphones: user reports repeated speech while both phones are nearby. Acoustic feedback is the leading explanation; no code/configuration change was made for this report.
